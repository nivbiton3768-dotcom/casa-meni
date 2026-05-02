import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadsService {
  private s3: S3Client;
  private bucket: string;

  constructor(
    private readonly prisma: PrismaService,
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

  async getPresignedUploadUrl(
    organizationId: string,
    userId: string,
    filename: string,
    mimeType: string,
    entityType: string,
    entityId: string,
  ) {
    const key = `${organizationId}/${entityType}/${entityId}/${randomUUID()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn: 600 });

    return { url, key, bucket: this.bucket };
  }

  async confirmUpload(
    organizationId: string,
    userId: string,
    dto: {
      key: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      entityType: string;
      entityId: string;
    },
  ) {
    return this.prisma.upload.create({
      data: {
        organizationId,
        uploadedById: userId,
        storageKey: dto.key,
        filename: dto.filename,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
    });
  }

  async getDownloadUrl(organizationId: string, id: string) {
    const upload = await this.prisma.upload.findFirst({
      where: { id, organizationId },
    });
    if (!upload) throw new NotFoundException('File not found');

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: upload.storageKey,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    return { url, filename: upload.filename, mimeType: upload.mimeType };
  }

  async findByEntity(
    organizationId: string,
    entityType: string,
    entityId: string,
  ) {
    return this.prisma.upload.findMany({
      where: { organizationId, entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(organizationId: string, id: string) {
    const upload = await this.prisma.upload.findFirst({
      where: { id, organizationId },
    });
    if (!upload) throw new NotFoundException('File not found');

    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: upload.storageKey,
        }),
      );
    } catch {
      // S3 deletion is best-effort; DB record is still removed
    }

    await this.prisma.upload.delete({ where: { id } });
    return { deleted: true };
  }
}
