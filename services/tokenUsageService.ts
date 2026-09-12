import { getTokenCost, calculateChatTokenCost, TokenFeature } from '@/constants/tokenUsage';
import { subscriptionService } from '@/services/subscriptionService';
import databaseService from '@/services/databaseService';
import { logError } from '@/services/crashLogger';

type SpendOptions = {
  feature: TokenFeature;
  operationId: string;
  inputCharacterCount?: number;
  model?: string;
};

export type TokenSpendReceipt = {
  feature: TokenFeature;
  tokens: number;
  idempotencyKey: string;
  balance: number;
};

type TokenFunctionResponse = { balance?: number };

/** Generates a stable operation id for one user action and its retries. */
export function createTokenOperationId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `lifenest-${prefix}-${random}`;
}

class TokenUsageService {
  /** Reads the spendable TKN balance from RevenueCat. */
  async getBalance(): Promise<number> {
    try {
      const currency = await subscriptionService.getLifeNestVirtualCurrency();
      return Number(currency?.balance ?? 0);
    } catch (error) {
      logError('TokenUsageService.getBalance', error);
      throw new Error('Token balance is temporarily unavailable. Please try again.');
    }
  }

  /** Returns the expected client-side price for display and preflight checks. */
  getCost(feature: TokenFeature, inputCharacterCount = 0): number {
    return feature === 'chat_message'
      ? calculateChatTokenCost('x'.repeat(Math.max(0, inputCharacterCount)))
      : getTokenCost(feature);
  }

  /** Spends the server-authoritative price for one operation. */
  async spend(options: SpendOptions): Promise<TokenSpendReceipt> {
    const idempotencyKey = options.operationId;
    const tokens = options.feature === 'chat_message'
      ? this.getCost(options.feature, options.inputCharacterCount)
      : getTokenCost(options.feature);
    const response = await databaseService.executeFunction('lifenest-token-spend', {
      action: 'spend',
      feature: options.feature,
      inputCharacterCount: options.inputCharacterCount,
      reference: idempotencyKey,
      idempotencyKey,
      context: { model: options.model, inputCharacterCount: options.inputCharacterCount },
    }) as TokenFunctionResponse;
    return { feature: options.feature, tokens, idempotencyKey, balance: Number(response.balance ?? 0) };
  }

  /** Refunds the exact original spend, validated by the Edge Function. */
  async refund(receipt: TokenSpendReceipt): Promise<void> {
    await databaseService.executeFunction('lifenest-token-spend', {
      action: 'refund',
      feature: receipt.feature,
      originalIdempotencyKey: receipt.idempotencyKey,
      reference: `refund:${receipt.idempotencyKey}`,
      idempotencyKey: createTokenOperationId(`refund-${receipt.feature}`),
      context: { feature: receipt.feature, refundOf: receipt.idempotencyKey },
    });
  }
}

export const tokenUsageService = new TokenUsageService();
