import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CapitalCallStatus, CommitmentStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EmailService } from '../email/email.service';

interface CreateCallDto {
  propertyId?: string;
  title: string;
  description?: string;
  totalCents: number;
  dueDate: string;
  dealPackageUrl?: string;
  commitments: Array<{ investorUserId: string; amountCents: number }>;
}

interface RespondCommitmentDto {
  status: CommitmentStatus;
  notes?: string;
}

@Injectable()
export class CapitalCallsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async list(organizationId: string) {
    return this.prisma.capitalCall.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        commitments: {
          include: {
            investor: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        property: { select: { id: true, name: true } },
      },
    });
  }

  async create(organizationId: string, dto: CreateCallDto) {
    const sumCommit = dto.commitments.reduce((s, c) => s + c.amountCents, 0);
    if (sumCommit !== dto.totalCents) {
      throw new BadRequestException(
        `Commitments ($${sumCommit / 100}) must equal total ($${dto.totalCents / 100})`,
      );
    }
    return this.prisma.capitalCall.create({
      data: {
        organizationId,
        propertyId: dto.propertyId,
        title: dto.title,
        description: dto.description,
        totalCents: dto.totalCents,
        dueDate: new Date(dto.dueDate),
        dealPackageUrl: dto.dealPackageUrl,
        commitments: {
          create: dto.commitments.map((c) => ({
            investorUserId: c.investorUserId,
            amountCents: c.amountCents,
          })),
        },
      },
      include: { commitments: true },
    });
  }

  async send(organizationId: string, id: string) {
    const call = await this.prisma.capitalCall.findFirst({
      where: { id, organizationId },
      include: {
        commitments: {
          include: {
            investor: { select: { id: true, name: true, email: true } },
          },
        },
        property: { select: { name: true } },
      },
    });
    if (!call) throw new NotFoundException('Capital call not found');

    await this.prisma.capitalCall.update({
      where: { id },
      data: { status: CapitalCallStatus.SENT, sentAt: new Date() },
    });

    for (const c of call.commitments) {
      await this.prisma.notification.create({
        data: {
          organizationId,
          userId: c.investorUserId,
          type: NotificationType.CAPITAL_CALL_INVITED,
          title: `Capital call: ${call.title}`,
          message: `You've been invited to commit $${(c.amountCents / 100).toLocaleString()} by ${call.dueDate.toLocaleDateString()}.`,
          linkUrl: `/investor/capital-calls/${id}`,
        },
      });
      await this.email.sendNotification(c.investor.email, {
        recipientName: c.investor.name,
        notificationTitle: `Capital Call: ${call.title}`,
        notificationBody: `You've been invited to participate in "${call.title}"${call.property ? ` for ${call.property.name}` : ''}.\n\nRequested amount: $${(c.amountCents / 100).toLocaleString()}\nDue date: ${call.dueDate.toLocaleDateString()}\n\n${call.description ?? ''}\n\nDeal package: ${call.dealPackageUrl ?? 'Available in your investor portal.'}\n\nReply via the investor portal to commit, decline, or fund.`,
      });
    }
    return { ok: true };
  }

  async respond(
    organizationId: string,
    callId: string,
    investorUserId: string,
    dto: RespondCommitmentDto,
  ) {
    const commit = await this.prisma.capitalCallCommitment.findFirst({
      where: {
        capitalCallId: callId,
        investorUserId,
        capitalCall: { organizationId },
      },
    });
    if (!commit) throw new NotFoundException('Commitment not found');
    return this.prisma.capitalCallCommitment.update({
      where: { id: commit.id },
      data: {
        status: dto.status,
        respondedAt: new Date(),
        ...(dto.status === 'FUNDED' ? { fundedAt: new Date() } : {}),
        notes: dto.notes,
      },
    });
  }

  async close(organizationId: string, id: string) {
    const call = await this.prisma.capitalCall.findFirst({ where: { id, organizationId } });
    if (!call) throw new NotFoundException('Capital call not found');
    return this.prisma.capitalCall.update({
      where: { id },
      data: { status: CapitalCallStatus.CLOSED, closedAt: new Date() },
    });
  }
}

@Controller('capital-calls')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ACCOUNTANT')
export class CapitalCallsController {
  constructor(private readonly service: CapitalCallsService) {}

  @Get()
  list(@CurrentUser('organizationId') organizationId: string) {
    return this.service.list(organizationId);
  }

  @Post()
  create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateCallDto,
  ) {
    return this.service.create(organizationId, dto);
  }

  @Post(':id/send')
  send(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.send(organizationId, id);
  }

  @Patch(':id/close')
  close(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.close(organizationId, id);
  }
}

/** Investor-facing endpoint to respond to a commitment. */
@Controller('investor/capital-calls')
@UseGuards(JwtAuthGuard)
export class InvestorCapitalCallsController {
  constructor(private readonly service: CapitalCallsService) {}

  @Get()
  async mine(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    const all = await this.service.list(organizationId);
    return all
      .map((call) => ({
        ...call,
        myCommitment:
          call.commitments.find((c) => c.investorUserId === userId) ?? null,
      }))
      .filter((c) => c.myCommitment);
  }

  @Patch(':id/respond')
  respond(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: RespondCommitmentDto,
  ) {
    return this.service.respond(organizationId, id, userId, dto);
  }
}

@Module({
  controllers: [CapitalCallsController, InvestorCapitalCallsController],
  providers: [CapitalCallsService],
})
export class CapitalCallsModule {}
