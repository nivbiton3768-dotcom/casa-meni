import { Injectable, Logger } from '@nestjs/common';

export interface MatchableTransaction {
  amountCents: number;
  description: string;
  counterpartyName: string | null;
  date: Date;
}

export interface MatchablePayment {
  id: string;
  amountCents: number;
  dueDate: Date;
  tenantName: string;
  tenantEmail: string;
  unitNumber: string;
  propertyName: string;
}

export interface MatchResult {
  payment: MatchablePayment;
  score: number;
  reasons: string[];
}

const NORMALIZE = (s: string | null | undefined) =>
  (s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const TOKENIZE = (s: string) =>
  NORMALIZE(s)
    .split(' ')
    .filter((t) => t.length >= 2);

/**
 * Returns the longest substring two strings share (fast for short names).
 */
function nameOverlap(a: string, b: string): number {
  if (!a || !b) return 0;
  const tokensA = new Set(TOKENIZE(a));
  const tokensB = TOKENIZE(b);
  let hits = 0;
  for (const t of tokensB) {
    if (tokensA.has(t)) hits += 1;
  }
  return hits;
}

@Injectable()
export class TransactionMatcherService {
  private readonly logger = new Logger(TransactionMatcherService.name);

  /**
   * Extract the real human/business counterparty from a bank memo.
   *
   * Bank feeds (esp. Zelle/Venmo/Cash App via the bank) bury the actual
   * sender in the description while Plaid's structured counterparty is just
   * the payment app ("Zelle"). e.g.
   *   "TD ZELLE RECEIVED 615600N0EGYM Zelle KAREN EDWARDS" -> "Karen Edwards"
   *   "ZELLE PAYMENT FROM JOHN DOE 12345"                  -> "John Doe"
   *   "VENMO CASHOUT"                                       -> falls back
   *
   * Falls back to a provided structured counterparty / merchant name when no
   * person can be parsed.
   */
  extractCounterparty(
    description: string | null | undefined,
    fallback?: string | null,
  ): string | null {
    const desc = (description ?? '').trim();
    if (!desc) return this.titleCase(fallback) ?? null;

    const isNoise = (s: string) =>
      !s ||
      s.trim().length < 3 ||
      !/[a-z]{2,}/i.test(s) ||
      /^(zelle|venmo|cash\s*app|cashapp|chime|payment|received|sent|recv|from|to|ref|id|transfer|deposit|withdrawal|debit|credit|ach|web|pmt|trnsfr|online|mobile)$/i.test(
        s.trim(),
      );

    const clean = (s: string) => s.trim().replace(/\s+/g, ' ');

    // 1) Name explicitly after "from"/"to" (e.g. "ZELLE PAYMENT FROM JOHN DOE 12").
    const fromMatch = desc.match(
      /\b(?:from|to)\s+([a-z][a-z'.\- ]{2,40}?)(?=\s+\d|\s*$)/i,
    );
    if (fromMatch && !isNoise(fromMatch[1])) {
      return this.titleCase(clean(fromMatch[1]));
    }

    // 2) Name after a payment-app token. Bank Zelle memos repeat the token:
    //    "TD ZELLE RECEIVED <ref> Zelle KAREN EDWARDS" -> take the LAST match,
    //    skipping captures that are themselves noise words like "received".
    const appMatches = [
      ...desc.matchAll(
        /(?:zelle|venmo|cash\s*app|cashapp|chime)\*?(?:\s+payment)?\s+([a-z][a-z'.\- ]{2,40}?)(?=\s+\d|\s*$)/gi,
      ),
    ];
    for (let i = appMatches.length - 1; i >= 0; i--) {
      const cand = appMatches[i][1];
      if (!isNoise(cand)) return this.titleCase(clean(cand));
    }

    return this.titleCase(fallback) ?? null;
  }

  private titleCase(s: string | null | undefined): string | null {
    if (!s) return null;
    const cleaned = s.trim().replace(/\s+/g, ' ');
    if (!cleaned) return null;
    // Leave acronyms/short codes alone; title-case word-like tokens.
    return cleaned
      .split(' ')
      .map((w) =>
        /^[A-Za-z][A-Za-z'.-]*$/.test(w)
          ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
          : w,
      )
      .join(' ');
  }

  /**
   * Score a single candidate payment against an incoming transaction.
   * Higher = better. Returns null if it's not even worth considering.
   *
   * Components:
   *  - amount match (exact = +60, within $1 = +50, within $5 = +20)
   *  - date proximity (within 5 days = +25, within 15 days = +15, within 30 = +5)
   *  - tenant name in counterparty/description (each token hit = +15)
   *  - first-name only hit = +5
   */
  scoreCandidate(
    txn: MatchableTransaction,
    payment: MatchablePayment,
  ): MatchResult | null {
    const reasons: string[] = [];
    let score = 0;

    const amountDiff = Math.abs(txn.amountCents - payment.amountCents);
    if (amountDiff === 0) {
      score += 60;
      reasons.push('Exact amount match');
    } else if (amountDiff <= 100) {
      score += 50;
      reasons.push('Amount within $1');
    } else if (amountDiff <= 500) {
      score += 20;
      reasons.push('Amount within $5');
    } else if (amountDiff <= 2000) {
      score += 5;
      reasons.push('Amount within $20');
    } else {
      // amount way off — bail
      return null;
    }

    const dayDiff = Math.abs(
      (txn.date.getTime() - payment.dueDate.getTime()) / 86400000,
    );
    if (dayDiff <= 5) {
      score += 25;
      reasons.push(`Date within ${Math.round(dayDiff)} days of due`);
    } else if (dayDiff <= 15) {
      score += 15;
      reasons.push(`Date within ${Math.round(dayDiff)} days of due`);
    } else if (dayDiff <= 30) {
      score += 5;
      reasons.push(`Date within ${Math.round(dayDiff)} days of due`);
    } else if (dayDiff > 60) {
      // Too far away
      return null;
    }

    const haystack = `${txn.counterpartyName ?? ''} ${txn.description}`;
    const overlap = nameOverlap(payment.tenantName, haystack);
    if (overlap >= 2) {
      score += 30;
      reasons.push(`Tenant name match: ${payment.tenantName}`);
    } else if (overlap === 1) {
      score += 15;
      reasons.push(`Partial tenant name match`);
    }

    // Email username hint (e.g., john.doe@gmail.com → "john doe")
    const emailUsername = payment.tenantEmail.split('@')[0];
    if (emailUsername && nameOverlap(emailUsername, haystack) >= 1) {
      score += 5;
      reasons.push('Email handle matches');
    }

    if (score === 0) return null;
    return { payment, score, reasons };
  }

  /**
   * Pick the best match from candidates. Auto-match only if:
   *  - top score >= MIN_AUTO_SCORE (75)
   *  - top score is meaningfully higher than runner-up (+15)
   * Otherwise returns the top candidate as a "review" suggestion.
   */
  pickBestMatch(
    txn: MatchableTransaction,
    payments: MatchablePayment[],
  ): {
    autoMatch: MatchResult | null;
    suggestion: MatchResult | null;
    allCandidates: MatchResult[];
  } {
    const scored = payments
      .map((p) => this.scoreCandidate(txn, p))
      .filter((m): m is MatchResult => m !== null)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      return { autoMatch: null, suggestion: null, allCandidates: [] };
    }

    const top = scored[0];
    const runnerUp = scored[1];
    const MIN_AUTO_SCORE = 75;
    const SEPARATION_THRESHOLD = 15;

    const isClearWinner =
      top.score >= MIN_AUTO_SCORE &&
      (!runnerUp || top.score - runnerUp.score >= SEPARATION_THRESHOLD);

    return {
      autoMatch: isClearWinner ? top : null,
      suggestion: top,
      allCandidates: scored.slice(0, 5),
    };
  }
}
