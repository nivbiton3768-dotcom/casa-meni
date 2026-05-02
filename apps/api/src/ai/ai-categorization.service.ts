import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const CATEGORIES = [
  'rent',
  'security_deposit',
  'maintenance',
  'utilities',
  'insurance',
  'taxes',
  'mortgage',
  'hoa',
  'cleaning',
  'supplies',
  'office',
  'travel',
  'professional_fees',
  'marketing',
  'capex',
  'distribution',
  'capital_contribution',
  'bank_fees',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface RuleHit {
  category: Category;
  confidence: number;
  reason: string;
}

const RULES: Array<{ pattern: RegExp; category: Category; confidence: number }> = [
  { pattern: /home depot|lowes|ace hardware|menards/i, category: 'maintenance', confidence: 0.9 },
  { pattern: /sherwin|behr|paint/i, category: 'maintenance', confidence: 0.85 },
  { pattern: /comed|conedison|duke energy|pge|gas company|utilit/i, category: 'utilities', confidence: 0.9 },
  { pattern: /water|sewer|trash/i, category: 'utilities', confidence: 0.85 },
  { pattern: /at&t|verizon|comcast|spectrum|xfinity|t-mobile|fiber/i, category: 'utilities', confidence: 0.85 },
  { pattern: /allstate|state farm|geico|insurance/i, category: 'insurance', confidence: 0.9 },
  { pattern: /property tax|county treasurer|assessor/i, category: 'taxes', confidence: 0.95 },
  { pattern: /chase mortgage|wells fargo home|mortgage|amortiz/i, category: 'mortgage', confidence: 0.9 },
  { pattern: /hoa|condo association|homeowners association/i, category: 'hoa', confidence: 0.95 },
  { pattern: /cleaning|maid|janitorial|housekeep/i, category: 'cleaning', confidence: 0.9 },
  { pattern: /staples|office depot|amazon business/i, category: 'office', confidence: 0.7 },
  { pattern: /uber|lyft|airline|hotel|gasoline|shell|exxon|chevron/i, category: 'travel', confidence: 0.7 },
  { pattern: /attorney|cpa|accountant|legal|consult/i, category: 'professional_fees', confidence: 0.85 },
  { pattern: /facebook ads|google ads|zillow|trulia|apartment|listing/i, category: 'marketing', confidence: 0.8 },
  { pattern: /rent payment|monthly rent/i, category: 'rent', confidence: 0.95 },
  { pattern: /security deposit/i, category: 'security_deposit', confidence: 0.95 },
  { pattern: /distribution|payout to investor/i, category: 'distribution', confidence: 0.9 },
  { pattern: /capital contribution|investor funding/i, category: 'capital_contribution', confidence: 0.9 },
  { pattern: /service fee|wire fee|nsf|overdraft/i, category: 'bank_fees', confidence: 0.95 },
  { pattern: /plumber|electrician|hvac|roof|carpentry|remodel|contractor/i, category: 'maintenance', confidence: 0.85 },
];

@Injectable()
export class AICategorizationService {
  private readonly logger = new Logger(AICategorizationService.name);
  private readonly openAiKey: string | undefined;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.openAiKey = this.config.get<string>('OPENAI_API_KEY');
  }

  /**
   * Suggest a category from description + amount + (optional) vendor name.
   * Pure rules first; falls back to OpenAI if a key is configured.
   */
  async suggest(input: {
    description: string;
    amountCents: number;
    vendorName?: string;
  }): Promise<RuleHit> {
    const haystack = `${input.description} ${input.vendorName ?? ''}`;
    for (const rule of RULES) {
      if (rule.pattern.test(haystack)) {
        return {
          category: rule.category,
          confidence: rule.confidence,
          reason: `rule:${rule.pattern.source}`,
        };
      }
    }
    if (this.openAiKey) {
      const llm = await this.askOpenAI(haystack, input.amountCents);
      if (llm) return llm;
    }
    return { category: 'other', confidence: 0.3, reason: 'fallback' };
  }

  private async askOpenAI(text: string, amountCents: number): Promise<RuleHit | null> {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openAiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a property-management bookkeeper. Classify the transaction into ONE of: ${CATEGORIES.join(', ')}. Reply ONLY with JSON: {"category":"...","confidence":0..1}.`,
            },
            {
              role: 'user',
              content: `${text}\nAmount: $${(amountCents / 100).toFixed(2)}`,
            },
          ],
          temperature: 0,
          response_format: { type: 'json_object' },
        }),
      });
      if (!res.ok) {
        this.logger.warn(`OpenAI error: ${res.status}`);
        return null;
      }
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;
      const parsed = JSON.parse(content) as { category?: string; confidence?: number };
      if (!parsed.category || !CATEGORIES.includes(parsed.category as Category)) return null;
      return {
        category: parsed.category as Category,
        confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.5)),
        reason: 'openai',
      };
    } catch (err) {
      this.logger.warn(`OpenAI request failed: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }

  /** Persist the suggestion onto a transaction row. */
  async categorizeTransaction(transactionId: string): Promise<void> {
    const tx = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { vendor: true },
    });
    if (!tx) return;
    if (tx.aiCategorized) return;
    const hit = await this.suggest({
      description: tx.description,
      amountCents: tx.amountCents,
      vendorName: tx.vendor?.name,
    });
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        category: hit.category,
        aiCategorized: true,
        aiConfidence: hit.confidence,
      },
    });
  }
}
