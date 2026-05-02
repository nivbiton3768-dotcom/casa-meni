import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Logger,
  Module,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EmailService } from '../email/email.service';

interface IssueCodeDto {
  reservationId?: string;
  guestName?: string;
  validFrom: string;
  validUntil: string;
  emailTo?: string;
}

/**
 * Provider-agnostic adapter. Currently a stub that generates a 6-digit code locally.
 * To plug in real hardware, extend this with calls to August/Schlage/Yale/Igloo APIs.
 */
@Injectable()
export class SmartLockProviderAdapter {
  private readonly logger = new Logger(SmartLockProviderAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async issueCode(input: {
    provider: string;
    deviceId: string;
    code: string;
    validFrom: Date;
    validUntil: Date;
  }): Promise<{ externalId?: string }> {
    const apiKey = this.config.get<string>(`SMARTLOCK_${input.provider.toUpperCase()}_API_KEY`);
    if (!apiKey) {
      this.logger.warn(
        `No SMARTLOCK_${input.provider.toUpperCase()}_API_KEY set — code stored locally only. Set this env var to enable real device sync.`,
      );
      return { externalId: undefined };
    }
    // Real implementation goes here per provider.
    return { externalId: undefined };
  }

  async revokeCode(_input: { provider: string; externalId?: string }) {
    // No-op stub
  }
}

@Injectable()
export class SmartLocksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapter: SmartLockProviderAdapter,
    private readonly email: EmailService,
  ) {}

  async listForAsset(organizationId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, organizationId },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return this.prisma.smartLockCode.findMany({
      where: { assetId },
      orderBy: { validFrom: 'desc' },
    });
  }

  async issue(organizationId: string, assetId: string, dto: IssueCodeDto) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, organizationId, type: 'SMART_LOCK' },
    });
    if (!asset) throw new NotFoundException('Smart lock asset not found');

    const code = String(Math.floor(Math.random() * 900000) + 100000); // 6-digit
    const result = await this.adapter.issueCode({
      provider: asset.smartLockProvider ?? 'manual',
      deviceId: asset.smartLockDeviceId ?? '',
      code,
      validFrom: new Date(dto.validFrom),
      validUntil: new Date(dto.validUntil),
    });

    const created = await this.prisma.smartLockCode.create({
      data: {
        assetId,
        reservationId: dto.reservationId,
        code,
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
        guestName: dto.guestName,
        externalId: result.externalId,
      },
    });

    if (dto.emailTo) {
      await this.email.sendNotification(dto.emailTo, {
        recipientName: dto.guestName ?? 'Guest',
        notificationTitle: `Your access code for ${asset.name}`,
        notificationBody: `Code: ${code}\nValid from ${new Date(dto.validFrom).toLocaleString()} to ${new Date(dto.validUntil).toLocaleString()}.`,
      });
    }
    return created;
  }

  async revoke(organizationId: string, codeId: string) {
    const code = await this.prisma.smartLockCode.findFirst({
      where: { id: codeId, asset: { organizationId } },
      include: { asset: true },
    });
    if (!code) throw new NotFoundException('Code not found');
    await this.adapter.revokeCode({
      provider: code.asset.smartLockProvider ?? 'manual',
      externalId: code.externalId ?? undefined,
    });
    return this.prisma.smartLockCode.update({
      where: { id: codeId },
      data: { status: 'REVOKED' },
    });
  }
}

@Controller('smart-locks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'PROPERTY_MANAGER')
export class SmartLocksController {
  constructor(private readonly service: SmartLocksService) {}

  @Get('asset/:assetId/codes')
  list(
    @CurrentUser('organizationId') organizationId: string,
    @Param('assetId') assetId: string,
  ) {
    return this.service.listForAsset(organizationId, assetId);
  }

  @Post('asset/:assetId/codes')
  issue(
    @CurrentUser('organizationId') organizationId: string,
    @Param('assetId') assetId: string,
    @Body() dto: IssueCodeDto,
  ) {
    return this.service.issue(organizationId, assetId, dto);
  }

  @Delete('codes/:id')
  revoke(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.revoke(organizationId, id);
  }
}

@Module({
  controllers: [SmartLocksController],
  providers: [SmartLocksService, SmartLockProviderAdapter],
})
export class SmartLocksModule {}
