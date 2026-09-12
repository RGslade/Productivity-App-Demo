import { ChatFeedbackReportRequest, ChatMessage, Conversation, GeneratedChecklist, LifeNestMonthlyUsageSummary, LifeNestUsageEvent, SendMessageRequest, SendMessageResponse } from '@/types/chatBot';
import databaseService from './databaseService';
import { userService } from './userService';
import { validateAuthUser } from '@/hooks/dataHandler';
import {
  calculateLifeNestTokensForMessage,
  getLifeNestUsageWindow,
} from '@/constants/lifeNestUsage';
import { calculateChatTokenCost, getTokenCost } from '@/constants/tokenUsage';
import { logError } from './crashLogger';
import { createTokenOperationId, tokenUsageService, TokenSpendReceipt } from './tokenUsageService';

interface CreateConversationFunctionResponse {
  conversationId: string;
}

interface ListModelsFunctionResponse {
  models: string[];
}

type LifeNestModelOptions = {
  models: string[];
  isFunctionAvailable: boolean;
  errorMessage?: string;
};

interface SendMessageFunctionResponse {
  id: string;
  created_at?: number;
  model?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  output?: [{
    type: string;
    role?: string;
    content?: [{
      type: string;
      text?: string;
      refusal?: string;
    }];
  }];
}

type LifeNestMonthlyUsageRow = {
  id: number;
  period_key: string | null;
  period_start: string | null;
  period_end: string | null;
  monthly_token_allowance: number;
  monthly_tokens_used: number;
  purchased_tokens_balance: number;
  purchased_tokens_used: number;
};

const DEFAULT_LIFENEST_MODEL = 'gpt-5.6-luna';
const FALLBACK_LIFENEST_MODELS = [DEFAULT_LIFENEST_MODEL];

class LifeNestService {
  /**
   * Loads the current user's single monthly usage row.
   */
  private async getCurrentUserMonthlyUsageRow(): Promise<LifeNestMonthlyUsageRow | null> {
    const { data } = await databaseService.getAll<LifeNestMonthlyUsageRow>('LifeNestMonthlyUsage', 'period_start');
    return data?.[0] ?? null;
  }

  /**
   * Converts a persisted monthly usage row into the app summary shape.
   */
  private mapUsageSummary(row: LifeNestMonthlyUsageRow): LifeNestMonthlyUsageSummary {
    const monthlyTokenAllowance = Number(row.monthly_token_allowance ?? 0);
    const monthlyTokensUsed = Number(row.monthly_tokens_used ?? 0);
    const purchasedTokensBalance = Number(row.purchased_tokens_balance ?? 0);
    const purchasedTokensUsed = Number(row.purchased_tokens_used ?? 0);
    const totalTokensRemaining = purchasedTokensBalance;
    const totalTokensUsed = monthlyTokensUsed + purchasedTokensUsed;
    const totalTokensAvailable = totalTokensUsed + totalTokensRemaining;

    return {
      periodKey: row.period_key,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      monthlyTokenAllowance,
      monthlyTokensUsed,
      purchasedTokensBalance,
      purchasedTokensUsed,
      totalTokensAvailable,
      totalTokensUsed,
      totalTokensRemaining,
    };
  }

  /**
   * Calls the LifeNest Edge Function and returns typed payload data.
   */
  private async callLifeNestFunction<T>(payload: object): Promise<T> {
    return databaseService.executeFunction('lifenest-ai', payload) as Promise<T>;
  }

  /**
   * Detects network/CORS-style Edge Function failures that should be shown as availability problems.
   */
  private isLifeNestFunctionUnavailable(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    const normalisedMessage = message.toLowerCase();

    return normalisedMessage.includes('failed to fetch')
      || normalisedMessage.includes('failed to send a request to the edge function')
      || normalisedMessage.includes('functionsfetcherror')
      || normalisedMessage.includes('network request failed')
      || normalisedMessage.includes('load failed');
  }

  /**
   * Creates a persistent OpenAI conversation via the LifeNest Edge Function.
   */
  private async createOpenAIConversation(): Promise<string> {
    const data = await this.callLifeNestFunction<CreateConversationFunctionResponse>({
      action: 'create_conversation',
    });
    return data.conversationId;
  }

  /**
   * Loads or creates the current user's monthly usage row.
   */
  private async getOrCreateCurrentMonthlyUsageRow(): Promise<LifeNestMonthlyUsageRow> {
    const existing = await this.getCurrentUserMonthlyUsageRow();
    if (existing) {
      return existing;
    }

    try {
      await databaseService.insertToTable('LifeNestMonthlyUsage', {
        period_key: null,
        period_start: null,
        period_end: null,
        monthly_token_allowance: 0,
        monthly_tokens_used: 0,
        purchased_tokens_balance: 0,
        purchased_tokens_used: 0,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('lifenest_monthly_usage_user_unique') && !message.includes('duplicate key')) {
        throw error;
      }
    }

    const created = await this.getCurrentUserMonthlyUsageRow();
    if (!created) {
      throw new Error('LifeNest usage summary was not created.');
    }
    return created;
  }

  /**
   * Syncs the included-token period to the current subscription lifecycle.
   */
  async syncSubscriptionUsagePeriod(options: {
    isSubscriptionActive: boolean;
    subscriptionStartedAt?: string | null;
  }): Promise<LifeNestMonthlyUsageRow> {
    const row = await this.getOrCreateCurrentMonthlyUsageRow();

    if (!options.isSubscriptionActive || !options.subscriptionStartedAt) {
      const shouldClear =
        row.period_key !== null ||
        row.period_start !== null ||
        row.period_end !== null ||
        row.period_key !== null ||
        row.period_start !== null ||
        row.period_end !== null ||
        Number(row.monthly_token_allowance ?? 0) !== 0;

      if (!shouldClear) return row;

      await databaseService.updateTable('LifeNestMonthlyUsage', {
        period_key: null,
        period_start: null,
        period_end: null,
        monthly_token_allowance: 0,
      }, undefined, 'id', row.id);

      return {
        ...row,
        period_key: null,
        period_start: null,
        period_end: null,
        monthly_token_allowance: 0,
      };
    }

    const { periodKey, start, end } = getLifeNestUsageWindow(new Date(options.subscriptionStartedAt));
    await databaseService.updateTable('LifeNestMonthlyUsage', {
      period_key: periodKey,
      period_start: start.toISOString(),
      period_end: end.toISOString(),
      monthly_token_allowance: 0,
    }, undefined, 'id', row.id);

    return {
      ...row,
      period_key: periodKey,
      period_start: start.toISOString(),
      period_end: end.toISOString(),
      monthly_token_allowance: 0,
    };
  }

  /**
   * Loads or creates the current user's monthly usage summary record.
   */
  async getCurrentMonthlyUsageSummary(): Promise<LifeNestMonthlyUsageSummary> {
    const row = await this.getOrCreateCurrentMonthlyUsageRow();
    const revenueCatTokenBalance = await tokenUsageService.getBalance();

    return this.mapUsageSummary({
      ...row,
      monthly_token_allowance: 0,
      monthly_tokens_used: 0,
      purchased_tokens_balance: revenueCatTokenBalance,
    });
  }

  /**
   * Converts a sent prompt into a LifeNest token usage event.
   */
  private buildUsageEvent(message: string, fallbackModel: string): LifeNestUsageEvent | null {
    const tokensUsed = calculateLifeNestTokensForMessage(message);
    if (tokensUsed <= 0) {
      return null;
    }
    return {
      model: (fallbackModel || DEFAULT_LIFENEST_MODEL).toLowerCase(),
      tokensUsed: calculateChatTokenCost(message),
      inputCharacterCount: message.trim().length,
      feature: 'chat_message',
    };
  }


  /** Generates or enhances a checklist through LifeNest and charges one token. */
  async generateChecklist(title: string, items: string[]): Promise<GeneratedChecklist> {
    const usageEvent: LifeNestUsageEvent = {
      model: DEFAULT_LIFENEST_MODEL,
      tokensUsed: getTokenCost('checklist_enhancement'),
      inputCharacterCount: `${title}\n${items.join('\n')}`.trim().length,
      feature: 'checklist_enhancement',
    };
    const usageSummary = await this.getCurrentMonthlyUsageSummary();
    if (usageSummary.totalTokensRemaining < usageEvent.tokensUsed) {
      throw new Error('Not enough LifeNest tokens remain for this checklist.');
    }

    const spend = await tokenUsageService.spend({ feature: 'checklist_enhancement', operationId: createTokenOperationId('checklist'), inputCharacterCount: usageEvent.inputCharacterCount, model: usageEvent.model });

    let response: SendMessageFunctionResponse;
    try {
      const openAIConversationId = await this.createOpenAIConversation();
      response = await this.callLifeNestFunction<SendMessageFunctionResponse>({
        action: 'send_message',
        mode: 'checklist',
        model: DEFAULT_LIFENEST_MODEL,
        conversationId: openAIConversationId,
        message: JSON.stringify({ title: title.trim(), items: items.map((item) => item.trim()).filter(Boolean) }),
        instructions: [
          'You create practical checklists for young adults preparing for independent living.',
          'Return only JSON with a string title and an items string array.',
          'If the user gives no useful input, choose a helpful independent-living checklist topic.',
          'If the user gives a title or items, infer their intent and complete the checklist.',
          'Keep each item short, actionable, UK-aware where relevant, and avoid duplicates.',
          'Return 8 to 14 items.',
        ].join(' '),
      });
    } catch (error) {
      await tokenUsageService.refund(spend).catch((refundError) => {
        logError('LifeNestService.generateChecklist.refundFailed', refundError, {
          spendIdempotencyKey: spend.idempotencyKey,
        });
      });
      throw error;
    }

    let outputText = '';
    for (const output of response.output || []) {
      if (output.type === 'message' && output.role === 'assistant' && output.content?.[0]) {
        outputText = output.content[0].text || output.content[0].refusal || '';
      }
    }

    const jsonMatch = outputText.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : outputText) as { title?: unknown; items?: unknown };
    const nextTitle = typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : title.trim() || 'Independent living checklist';
    const nextItems = Array.isArray(parsed.items)
      ? parsed.items.map((item) => String(item).trim()).filter(Boolean)
      : items.map((item) => item.trim()).filter(Boolean);

    return { title: nextTitle, items: nextItems, usage: usageEvent };
  }

  async createConversation(model: string): Promise<Conversation> {
    const openaiConvId = await this.createOpenAIConversation();
    const { data, error } = await databaseService.insertAndSelect<Conversation>('Conversations', { openai_conversation_id: openaiConvId, model, });

    if (error || !data) {
      logError('LifeNestService.createConversation', error, { model });
      throw new Error('Could not create conversation.');
    }

    return data as Conversation;
  }

  private async getOrCreateConversation(conversationId: string, model: string): Promise<Conversation> {
    if (!model || model === 'None') {
      model = DEFAULT_LIFENEST_MODEL;
    }
    if (!conversationId || conversationId === '') {
      return this.createConversation(model);
    }

    const { data, error } = await databaseService.getSingle<Conversation>('Conversations', '', 'id', conversationId);
    if (error || !data) {
      return this.createConversation(model);
    }

    return data as Conversation;
  }

  async getUserConversations(): Promise<Conversation[]> {
    const { data, error } = await databaseService.getAll<Conversation>('Conversations', 'updated_at');

    if (error) {
      logError('LifeNestService.getUserConversations', error);
      throw error;
    }

    if (!data || data.length === 0) {
      // let model = await settingsService.getChatBotSettings()
      //   .then(settings => settings.preferred_model)
      //   if(model === 'None' || !model) model = DEFAULT_LIFENEST_MODEL;
      // const newConv = await this.createConversation(model);                Decided to go in a different direction for this feature scenario. This helps the dashboard but also
      // return [newConv];                                                    makes more sense. if no chats, the user creates one by sending a message
    }

    const rows = (data) as Conversation[];
    rows.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return rows;
  }

  async getRecentConversations(limit: number = 3): Promise<Conversation[]> {
    const conversations = await this.getUserConversations();
    return conversations.slice(0, Math.max(limit, 0));
  }

  async getChatHistory(conversationId: string): Promise<ChatMessage[]> {
    const { data, error } = await databaseService.getAllWithFilter<ChatMessage>('ChatMessages', 'conversation_id', conversationId.toString(), 'created_at', false);

    if (!data || data.length === 0 || error) {
      return [];
    }

    return data.map((msg: any) => ({
      id: msg.id, message: msg.message, was_edited: msg.was_edited || false, created_at: msg.created_at, conversation_id: msg.conversation_id, updated_at: msg.updated_at, is_user_message: msg.is_user_message,
    }));
  }

  async getModelOptions(): Promise<LifeNestModelOptions> {
    try {
      const data = await this.callLifeNestFunction<ListModelsFunctionResponse>({
        action: 'list_models',
      });

      return {
        models: data.models?.length ? data.models : FALLBACK_LIFENEST_MODELS,
        isFunctionAvailable: true,
      };
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (this.isLifeNestFunctionUnavailable(error)) {
        console.warn('LifeNest model list unavailable; using fallback model until the Edge Function is reachable.', {
          message,
        });
      } else {
        logError('LifeNestService.getModelOptions', error, { message });
      }

      return {
        models: FALLBACK_LIFENEST_MODELS,
        isFunctionAvailable: false,
        errorMessage: 'LifeNest is temporarily unavailable. Please try again shortly.',
      };
    }
  }

  async getModels() {
    const options = await this.getModelOptions();
    return options.models;
  }

  async sendMessage(request: SendMessageRequest): Promise<Conversation> {
    const { message, model, conversationId } = request;
    let conv = await this.getOrCreateConversation(conversationId, model);
    // Save user message to DB
    await databaseService.insertToTable('ChatMessages', { conversation_id: conv.id, message, was_edited: false, is_user_message: true });
    // Update conversation
    await databaseService.updateTable('Conversations', { updated_at: new Date().toISOString(), title: conv.title ?? message.slice(0, 30), }, undefined, 'id', conv.id.toString());
    return conv;
  }

  async receiveMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const { message, model, conversationId } = request;
    let conv = await this.getOrCreateConversation(conversationId, model);
    const usageEvent = this.buildUsageEvent(message, conv.model);
    let spend: TokenSpendReceipt | null = null;

    if (usageEvent) {
      spend = await tokenUsageService.spend({
        feature: 'chat_message',
        operationId: createTokenOperationId(`message-${conv.id}`),
        inputCharacterCount: usageEvent.inputCharacterCount,
        model: usageEvent.model,
      });
    }

    // Send to OpenAI via Edge Function so private keys stay server-side.
    let response: SendMessageFunctionResponse;
    try {
      response = await this.callLifeNestFunction<SendMessageFunctionResponse>({
        action: 'send_message',
        model: conv.model,
        conversationId: conv.openai_conversation_id,
        message,
      });
    } catch (error) {
      if (usageEvent && spend) {
        await tokenUsageService.refund(spend).catch((refundError) => {
          logError('LifeNestService.receiveMessage.refundFailed', refundError, {
            conversationId: conv.id,
            spendIdempotencyKey: spend?.idempotencyKey,
          });
        });
      }
      throw error;
    }

    try {
    const responseTimestamp = typeof response?.created_at === 'number'
      ? new Date(response.created_at * 1000).toISOString()
      : new Date().toISOString();

    const aiMessages: ChatMessage[] = [];
    let fallbackMessageId = Date.now() * -1;

    // Save AI message to DB
    if (response && response.output && Array.isArray(response.output)) {
      for (const output of response.output) {
        if (output.type === 'message' && output.role === 'assistant' && output.content) {
          const assistantMessage = output.content[0].type === 'output_text'
            ? output.content[0].text ?? ''
            : output.content[0].refusal ?? '';
          await databaseService.insertToTable('ChatMessages', {
            conversation_id: conv.id, message: assistantMessage, was_edited: false,
            is_user_message: false,
          });
          aiMessages.push({
            id: fallbackMessageId--,
            conversation_id: conv.id,
            message: assistantMessage,
            was_edited: false,
            created_at: responseTimestamp,
            updated_at: responseTimestamp,
            is_user_message: false,
          });
        }
      }
    }
    // Update conversation
    await databaseService.updateTable('Conversations', { updated_at: responseTimestamp, last_response_id: response.id, title: conv.title ?? message.slice(0, 30) }, undefined, 'id', conv.id.toString());

    return { conversationId: conv.id, aiResponse: aiMessages, usage: usageEvent };
    } catch (error) {
      if (usageEvent && spend) {
        await tokenUsageService.refund(spend).catch((refundError) => {
          logError('LifeNestService.receiveMessage.responseFlowRefundFailed', refundError, { conversationId: conv.id, spendIdempotencyKey: spend?.idempotencyKey });
        });
      }
      throw error;
    }
  }

  async deleteConversation(conversationId: number): Promise<void> {
    await databaseService.deleteFromTable('ChatMessages', 'conversation_id', conversationId);
    await databaseService.deleteFromTable('Conversations', 'id', conversationId);
  }

  async reportAssistantMessage(request: ChatFeedbackReportRequest): Promise<void> {

    if (!validateAuthUser()) {
      const user = await userService.getUserProfile();

      const details = [`reported_message: ${request.message}`, `details: ${request.details || 'none'}`,].join('\n');

      await databaseService.insertToTable('ChatbotReports', {
        user_id: Number(user.id),
        reason: request.reason,
        details,
        message_id: request.messageId,
      });
    }
  }
}

export const lifeNestService = new LifeNestService();
export default lifeNestService;
