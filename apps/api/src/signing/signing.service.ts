import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { randomBytes, createHash } from 'crypto';
import {
  EnvelopeStatus,
  SignerStatus,
  NotificationType,
} from '@prisma/client';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  CreateEnvelopeDto,
  SignEnvelopeDto,
  DeclineEnvelopeDto,
} from './dto/envelope.dto';

@Injectable()
export class SigningService {
  private readonly logger = new Logger(SigningService.name);
  private s3: S3Client;
  private bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.get('S3_BUCKET') || 'casa-meni-uploads';
    const region = this.config.get('S3_REGION') || 'us-east-1';

    this.s3 = new S3Client({
      region,
      ...(this.config.get('S3_ENDPOINT')
        ? {
            endpoint: this.config.get('S3_ENDPOINT'),
            forcePathStyle: true,
          }
        : {}),
      credentials: {
        accessKeyId: this.config.get('S3_ACCESS_KEY_ID') || '',
        secretAccessKey: this.config.get('S3_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  // ── Admin: create + send envelope ────────────────────────────
  async create(
    organizationId: string,
    userId: string,
    dto: CreateEnvelopeDto,
  ) {
    if (!dto.signers?.length) {
      throw new BadRequestException('At least one signer is required');
    }

    const expiresAt = dto.expiresInDays
      ? new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const envelope = await this.prisma.signingEnvelope.create({
      data: {
        organizationId,
        title: dto.title,
        message: dto.message,
        sourceFileUrl: dto.sourceFileUrl,
        sourceFileName: dto.sourceFileName,
        documentId: dto.documentId,
        leaseId: dto.leaseId,
        propertyId: dto.propertyId,
        createdById: userId,
        status: EnvelopeStatus.SENT,
        sentAt: new Date(),
        expiresAt,
        signers: {
          create: dto.signers.map((s) => ({
            signerName: s.name,
            signerEmail: s.email,
            signerUserId: s.userId,
            signingToken: randomBytes(24).toString('base64url'),
          })),
        },
      },
      include: {
        signers: true,
        organization: { select: { name: true } },
      },
    });

    const frontendUrl = this.getFrontendUrl();

    for (const signer of envelope.signers) {
      await this.prisma.notification.create({
        data: {
          organizationId,
          userId: signer.signerUserId,
          type: NotificationType.SIGNATURE_REQUEST,
          title: `Signature requested: ${envelope.title}`,
          message: `${dto.message ?? 'Please review and sign the document.'} Open from your dashboard or use the signing link.`,
          linkUrl: signer.signerUserId ? `/sign/${signer.signingToken}` : null,
        },
      });

      const signingUrl = `${frontendUrl}/sign/${signer.signingToken}`;
      this.email
        .sendSigningRequest(signer.signerEmail, {
          signerName: signer.signerName,
          envelopeTitle: envelope.title,
          organizationName: envelope.organization.name,
          message: envelope.message,
          signingUrl,
          expiresAt: envelope.expiresAt,
        })
        .catch((err) => this.logger.error(`Failed to send signing request email: ${err}`));
    }

    return envelope;
  }

  private getFrontendUrl(): string {
    const url =
      this.config.get<string>('FRONTEND_URL')?.split(',')[0]?.trim() ||
      'http://localhost:3000';
    return url.replace(/\/$/, '');
  }

  // ── Admin: list + get ──────────────────────────────────────
  async findAll(organizationId: string) {
    return this.prisma.signingEnvelope.findMany({
      where: { organizationId },
      include: { signers: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findOne(organizationId: string, id: string) {
    const envelope = await this.prisma.signingEnvelope.findFirst({
      where: { id, organizationId },
      include: { signers: true },
    });
    if (!envelope) throw new NotFoundException('Envelope not found');
    return envelope;
  }

  async cancel(organizationId: string, id: string) {
    const envelope = await this.findOne(organizationId, id);
    if (envelope.status === EnvelopeStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed envelope');
    }
    return this.prisma.signingEnvelope.update({
      where: { id },
      data: { status: EnvelopeStatus.CANCELLED },
    });
  }

  // ── Admin: list pending signatures for a user (tenant portal) ─
  async findPendingForUser(organizationId: string, userId: string) {
    return this.prisma.signatureRequest.findMany({
      where: {
        signerUserId: userId,
        status: { in: [SignerStatus.PENDING, SignerStatus.VIEWED] },
        envelope: { organizationId, status: EnvelopeStatus.SENT },
      },
      include: { envelope: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Public (no auth): get envelope by token ────────────────
  async getByToken(token: string) {
    const signer = await this.prisma.signatureRequest.findUnique({
      where: { signingToken: token },
      include: {
        envelope: {
          include: {
            organization: { select: { name: true, logoUrl: true } },
          },
        },
      },
    });
    if (!signer) throw new NotFoundException('Invalid signing link');

    if (signer.envelope.status === EnvelopeStatus.CANCELLED) {
      throw new BadRequestException('This signing request was cancelled');
    }
    if (
      signer.envelope.expiresAt &&
      signer.envelope.expiresAt < new Date() &&
      signer.status !== SignerStatus.SIGNED
    ) {
      throw new BadRequestException('This signing link has expired');
    }

    if (signer.status === SignerStatus.PENDING) {
      await this.prisma.signatureRequest.update({
        where: { id: signer.id },
        data: { status: SignerStatus.VIEWED, viewedAt: new Date() },
      });
    }

    let sourceFileDownloadUrl = signer.envelope.sourceFileUrl;
    if (signer.envelope.sourceFileUrl.startsWith('s3://')) {
      const key = signer.envelope.sourceFileUrl.replace('s3://', '');
      try {
        sourceFileDownloadUrl = await getSignedUrl(
          this.s3,
          new GetObjectCommand({ Bucket: this.bucket, Key: key }),
          { expiresIn: 3600 },
        );
      } catch (err) {
        this.logger.error(`Failed to presign source URL: ${err}`);
        throw new BadRequestException('Source document is not accessible');
      }
    }

    return {
      envelope: {
        id: signer.envelope.id,
        title: signer.envelope.title,
        message: signer.envelope.message,
        organizationName: signer.envelope.organization.name,
        sourceFileName: signer.envelope.sourceFileName,
        sourceFileUrl: sourceFileDownloadUrl,
        status: signer.envelope.status,
        expiresAt: signer.envelope.expiresAt,
      },
      signer: {
        id: signer.id,
        name: signer.signerName,
        email: signer.signerEmail,
        status: signer.status,
        signedAt: signer.signedAt,
      },
    };
  }

  // ── Public (no auth): submit signature ──────────────────────
  async sign(
    token: string,
    dto: SignEnvelopeDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const signer = await this.prisma.signatureRequest.findUnique({
      where: { signingToken: token },
      include: { envelope: { include: { signers: true } } },
    });
    if (!signer) throw new NotFoundException('Invalid signing link');
    if (signer.status === SignerStatus.SIGNED) {
      throw new BadRequestException('You have already signed this document');
    }
    if (signer.status === SignerStatus.DECLINED) {
      throw new BadRequestException('This signing request was declined');
    }
    if (signer.envelope.status !== EnvelopeStatus.SENT) {
      throw new BadRequestException('This envelope is not active');
    }
    if (!dto.signatureDataUrl?.startsWith('data:image/')) {
      throw new BadRequestException('Invalid signature image');
    }

    await this.prisma.signatureRequest.update({
      where: { id: signer.id },
      data: {
        status: SignerStatus.SIGNED,
        signedAt: new Date(),
        signatureDataUrl: dto.signatureDataUrl,
        ipAddress,
        userAgent,
      },
    });

    const updated = await this.prisma.signingEnvelope.findUnique({
      where: { id: signer.envelopeId },
      include: { signers: true },
    });

    const allSigned =
      updated!.signers.every((s) => s.status === SignerStatus.SIGNED);

    if (allSigned) {
      try {
        const result = await this.stampAndSavePdf(updated!.id);
        await this.prisma.signingEnvelope.update({
          where: { id: updated!.id },
          data: {
            status: EnvelopeStatus.COMPLETED,
            completedAt: new Date(),
            signedFileUrl: result.url,
            signedFileHash: result.hash,
          },
        });

        if (updated!.documentId) {
          await this.prisma.document.update({
            where: { id: updated!.documentId },
            data: { fileUrl: result.url },
          });
        }

        await this.prisma.notification.create({
          data: {
            organizationId: updated!.organizationId,
            userId: updated!.createdById,
            type: NotificationType.SIGNATURE_COMPLETED,
            title: `Signed: ${updated!.title}`,
            message: `All parties have signed "${updated!.title}". The completed PDF is available in the envelope detail page.`,
            linkUrl: `/signing/${updated!.id}`,
          },
        });

        const sender = await this.prisma.user.findUnique({
          where: { id: updated!.createdById },
          select: { email: true, name: true },
        });
        if (sender) {
          const frontendUrl = this.getFrontendUrl();
          this.email
            .sendSigningCompleted(sender.email, {
              recipientName: sender.name,
              envelopeTitle: updated!.title,
              signedAt: new Date(),
              envelopeUrl: `${frontendUrl}/signing/${updated!.id}`,
            })
            .catch((err) =>
              this.logger.error(`Failed to send completion email: ${err}`),
            );
        }
      } catch (err) {
        this.logger.error('Failed to stamp PDF', err as Error);
      }
    }

    return { ok: true, allSigned };
  }

  async decline(token: string, dto: DeclineEnvelopeDto) {
    const signer = await this.prisma.signatureRequest.findUnique({
      where: { signingToken: token },
      include: { envelope: true },
    });
    if (!signer) throw new NotFoundException('Invalid signing link');
    if (signer.status === SignerStatus.SIGNED) {
      throw new BadRequestException('Already signed');
    }

    await this.prisma.signatureRequest.update({
      where: { id: signer.id },
      data: {
        status: SignerStatus.DECLINED,
        declineReason: dto.reason,
      },
    });

    await this.prisma.signingEnvelope.update({
      where: { id: signer.envelopeId },
      data: { status: EnvelopeStatus.DECLINED },
    });

    await this.prisma.notification.create({
      data: {
        organizationId: signer.envelope.organizationId,
        userId: signer.envelope.createdById,
        type: NotificationType.SIGNATURE_COMPLETED,
        title: `Declined: ${signer.envelope.title}`,
        message: `${signer.signerName} declined to sign. Reason: ${
          dto.reason || 'no reason provided'
        }`,
        linkUrl: `/signing/${signer.envelopeId}`,
      },
    });

    const sender = await this.prisma.user.findUnique({
      where: { id: signer.envelope.createdById },
      select: { email: true, name: true },
    });
    if (sender) {
      const frontendUrl = this.getFrontendUrl();
      this.email
        .sendSigningDeclined(sender.email, {
          recipientName: sender.name,
          envelopeTitle: signer.envelope.title,
          declinedBy: signer.signerName,
          reason: dto.reason,
          envelopeUrl: `${frontendUrl}/signing/${signer.envelopeId}`,
        })
        .catch((err) =>
          this.logger.error(`Failed to send decline email: ${err}`),
        );
    }

    return { ok: true };
  }

  private async loadSourceBytes(url: string): Promise<Uint8Array> {
    if (url.startsWith('s3://')) {
      const key = url.replace('s3://', '');
      const obj = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return obj.Body!.transformToByteArray();
    }
    if (url.startsWith('data:')) {
      const base64 = url.split(',')[1];
      return new Uint8Array(Buffer.from(base64, 'base64'));
    }
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(`Failed to fetch source PDF: ${res.statusText}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  // ── PDF stamping with audit trail ──────────────────────────
  private async stampAndSavePdf(
    envelopeId: string,
  ): Promise<{ url: string; hash: string }> {
    const envelope = await this.prisma.signingEnvelope.findUniqueOrThrow({
      where: { id: envelopeId },
      include: { signers: true },
    });

    const sourceBytes = await this.loadSourceBytes(envelope.sourceFileUrl);

    const pdf = await PDFDocument.load(sourceBytes);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const lastPage = pdf.getPages()[pdf.getPageCount() - 1];
    const { width } = lastPage.getSize();

    let y = 60;
    for (const signer of envelope.signers) {
      if (signer.status !== SignerStatus.SIGNED || !signer.signatureDataUrl)
        continue;

      const base64 = signer.signatureDataUrl.split(',')[1];
      const sigBytes = Buffer.from(base64, 'base64');
      const isPng = signer.signatureDataUrl.includes('image/png');
      const sigImage = isPng
        ? await pdf.embedPng(sigBytes)
        : await pdf.embedJpg(sigBytes);

      const sigDims = sigImage.scale(120 / sigImage.height);
      lastPage.drawImage(sigImage, {
        x: 50,
        y: y,
        width: sigDims.width,
        height: sigDims.height,
      });

      lastPage.drawText(signer.signerName, {
        x: 50 + sigDims.width + 16,
        y: y + 40,
        size: 11,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      lastPage.drawText(
        `Signed ${signer.signedAt?.toISOString() ?? ''} · IP ${
          signer.ipAddress ?? 'n/a'
        }`,
        {
          x: 50 + sigDims.width + 16,
          y: y + 24,
          size: 8,
          font,
          color: rgb(0.4, 0.4, 0.4),
        },
      );
      lastPage.drawText(signer.signerEmail, {
        x: 50 + sigDims.width + 16,
        y: y + 12,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      y += sigDims.height + 30;
    }

    const auditPage = pdf.addPage();
    const { width: aw, height: ah } = auditPage.getSize();
    auditPage.drawText('Audit Trail', {
      x: 50,
      y: ah - 60,
      size: 18,
      font: fontBold,
    });
    auditPage.drawText(`Envelope: ${envelope.title}`, {
      x: 50,
      y: ah - 90,
      size: 11,
      font,
    });
    auditPage.drawText(`Envelope ID: ${envelope.id}`, {
      x: 50,
      y: ah - 108,
      size: 9,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    auditPage.drawText(`Created: ${envelope.createdAt.toISOString()}`, {
      x: 50,
      y: ah - 124,
      size: 9,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    let auditY = ah - 170;
    for (const signer of envelope.signers) {
      auditPage.drawText(`${signer.signerName} <${signer.signerEmail}>`, {
        x: 50,
        y: auditY,
        size: 11,
        font: fontBold,
      });
      auditY -= 14;
      auditPage.drawText(`Status: ${signer.status}`, {
        x: 60,
        y: auditY,
        size: 9,
        font,
      });
      auditY -= 12;
      if (signer.viewedAt) {
        auditPage.drawText(`Viewed: ${signer.viewedAt.toISOString()}`, {
          x: 60,
          y: auditY,
          size: 9,
          font,
        });
        auditY -= 12;
      }
      if (signer.signedAt) {
        auditPage.drawText(`Signed: ${signer.signedAt.toISOString()}`, {
          x: 60,
          y: auditY,
          size: 9,
          font,
        });
        auditY -= 12;
      }
      if (signer.ipAddress) {
        auditPage.drawText(`IP Address: ${signer.ipAddress}`, {
          x: 60,
          y: auditY,
          size: 9,
          font,
        });
        auditY -= 12;
      }
      if (signer.userAgent) {
        const ua = signer.userAgent.slice(0, 90);
        auditPage.drawText(`User Agent: ${ua}`, {
          x: 60,
          y: auditY,
          size: 8,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
        auditY -= 12;
      }
      auditY -= 14;
    }

    auditPage.drawText(
      'This audit trail records the IP address, user agent, viewing, and',
      { x: 50, y: 80, size: 8, font, color: rgb(0.5, 0.5, 0.5) },
    );
    auditPage.drawText(
      'signing timestamps captured by Casa Meni\'s e-signature service.',
      { x: 50, y: 68, size: 8, font, color: rgb(0.5, 0.5, 0.5) },
    );

    const finalBytes = await pdf.save();
    const hash = createHash('sha256').update(finalBytes).digest('hex');

    const key = `${envelope.organizationId}/signed/${envelope.id}.pdf`;
    let url: string;

    if (this.config.get('S3_ACCESS_KEY_ID')) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: finalBytes,
          ContentType: 'application/pdf',
        }),
      );
      url = `s3://${key}`;
    } else {
      url = `data:application/pdf;base64,${Buffer.from(finalBytes).toString('base64')}`;
      this.logger.warn(
        `Signed PDF stored inline (no S3 configured) for envelope ${envelope.id}`,
      );
    }

    return { url, hash };
  }

  async getSignedDocumentUrl(organizationId: string, envelopeId: string) {
    const envelope = await this.findOne(organizationId, envelopeId);
    if (!envelope.signedFileUrl) {
      throw new BadRequestException('Envelope not yet completed');
    }
    if (envelope.signedFileUrl.startsWith('s3://')) {
      const key = envelope.signedFileUrl.replace('s3://', '');
      const url = await getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn: 3600 },
      );
      return { url, hash: envelope.signedFileHash };
    }
    return { url: envelope.signedFileUrl, hash: envelope.signedFileHash };
  }
}
