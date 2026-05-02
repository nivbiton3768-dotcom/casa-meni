import {
  Body,
  Controller,
  Get,
  Global,
  Injectable,
  Module,
  OnModuleInit,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AICategorizationService, RuleHit } from './ai-categorization.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
class AIInit implements OnModuleInit {
  constructor(
    private readonly queue: QueueService,
    private readonly ai: AICategorizationService,
  ) {}

  onModuleInit() {
    this.queue.registerWorker('ai-categorize-transaction', async ({ transactionId }) => {
      await this.ai.categorizeTransaction(transactionId);
    });
  }
}

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'PROPERTY_MANAGER', 'ACCOUNTANT')
export class AICategorizationController {
  constructor(
    private readonly ai: AICategorizationService,
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  @Post('categorize')
  async classify(
    @Body()
    body: { description: string; amountCents: number; vendorName?: string },
  ): Promise<RuleHit> {
    return this.ai.suggest(body);
  }

  @Post('categorize/backfill')
  async backfill(@CurrentUser('organizationId') organizationId: string) {
    const txs = await this.prisma.transaction.findMany({
      where: { organizationId, aiCategorized: false },
      select: { id: true },
      take: 1000,
    });
    for (const tx of txs) {
      await this.queue.enqueue(
        'ai-categorize-transaction',
        { transactionId: tx.id },
        undefined,
        async ({ transactionId }) => this.ai.categorizeTransaction(transactionId),
      );
    }
    return { queued: txs.length };
  }

  @Get('stats')
  async stats(@CurrentUser('organizationId') organizationId: string) {
    const [total, ai] = await Promise.all([
      this.prisma.transaction.count({ where: { organizationId } }),
      this.prisma.transaction.count({
        where: { organizationId, aiCategorized: true },
      }),
    ]);
    return { total, aiCategorized: ai, percent: total ? Math.round((ai / total) * 100) : 0 };
  }
}

@Global()
@Module({
  controllers: [AICategorizationController],
  providers: [AICategorizationService, AIInit],
  exports: [AICategorizationService],
})
export class AIModule {}
