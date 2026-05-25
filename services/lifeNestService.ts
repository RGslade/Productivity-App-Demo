import { ChatFeedbackReportRequest, ChatMessage, Conversation, GeneratedChecklist, LifeNestMonthlyUsageSummary, LifeNestUsageEvent, SendMessageRequest, SendMessageResponse } from '@/types/chatBot';
import databaseService from './databaseService';
import chatBotHook from '@/hooks/Chatbot';
import { userService } from './userService';
import { validateAuthUser } from '@/hooks/dataHandler';
import {
  calculateLifeNestTokensForMessage,
  getLifeNestUsageWindow,
  LIFENEST_MONTHLY_TOKEN_ALLOWANCE,
} from '@/constants/lifeNestUsage';
import {
  subscriptionService,
} from './subscriptionService';
import { BackendFunctions } from '@/constants/backendResources';

interface CreateConversationFunctionResponse {
  conversationId: string;
}

interface ListModelsFunctionResponse {
  models: string[];
}

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
    const remainingIncludedTokens = Math.max(monthlyTokenAllowance - monthlyTokensUsed, 0);
    const totalTokensRemaining = remainingIncludedTokens + purchasedTokensBalance;
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
   * Loads the user's total purchased-token spend across all recorded periods.
   */
  private async getLifetimePurchasedTokensUsed() {
    const { data } = await databaseService.getAll<LifeNestMonthlyUsageRow>('LifeNestMonthlyUsage', 'period_start');
    return (data ?? []).reduce((total, row) => total + Number(row.purchased_tokens_used ?? 0), 0);
  }

  /**
   * Reads the granted purchased-token balance from RevenueCat virtual currency.
   */
  private async getRevenueCatPurchasedTokenGrantBalance() {
    try {
      const virtualCurrency = await subscriptionService.getLifeNestVirtualCurrency();
      return Number(virtualCurrency?.balance ?? 0);
    } catch (error) {
      console.error('Operation failed');
      return 0;
    }
  }

  /**
   * Calls the backend AI function and returns typed payload data.
   */
  private async callLifeNestFunction<T>(payload: object): Promise<T> {
    return databaseService.executeFunction(BackendFunctions.aiAssistant, payload) as Promise<T>;
  }

  /**
   * Creates a persistent AI conversation via the backend function.
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
        Number(row.monthly_token_allowance ?? 0) !== 0 ||
        Number(row.monthly_tokens_used ?? 0) !== 0;

      if (!shouldClear) return row;

      await databaseService.updateTable('LifeNestMonthlyUsage', {
        period_key: null,
        period_start: null,
        period_end: null,
        monthly_token_allowance: 0,
        monthly_tokens_used: 0,
      }, undefined, 'id', row.id);

      return {
        ...row,
        period_key: null,
        period_start: null,
        period_end: null,
        monthly_token_allowance: 0,
        monthly_tokens_used: 0,
      };
    }

    const { periodKey, start, end } = getLifeNestUsageWindow(new Date(options.subscriptionStartedAt));
    const periodChanged = row.period_key !== periodKey;
    await databaseService.updateTable('LifeNestMonthlyUsage', {
      period_key: periodKey,
      period_start: start.toISOString(),
      period_end: end.toISOString(),
      monthly_token_allowance: LIFENEST_MONTHLY_TOKEN_ALLOWANCE,
      monthly_tokens_used: periodChanged ? 0 : row.monthly_tokens_used,
    }, undefined, 'id', row.id);

    return {
      ...row,
      period_key: periodKey,
      period_start: start.toISOString(),
      period_end: end.toISOString(),
      monthly_token_allowance: LIFENEST_MONTHLY_TOKEN_ALLOWANCE,
      monthly_tokens_used: periodChanged ? 0 : row.monthly_tokens_used,
    };
  }

  /**
   * Loads or creates the current user's monthly usage summary record.
   */
  async getCurrentMonthlyUsageSummary(): Promise<LifeNestMonthlyUsageSummary> {
    const row = await this.getOrCreateCurrentMonthlyUsageRow();
    const purchasedTokensGranted = await this.getRevenueCatPurchasedTokenGrantBalance();
    const purchasedTokensUsedLifetime = await this.getLifetimePurchasedTokensUsed();
    const purchasedTokensBalance = Math.max(purchasedTokensGranted - purchasedTokensUsedLifetime, 0);

    return this.mapUsageSummary({
      ...row,
      purchased_tokens_balance: purchasedTokensBalance,
    });
  }

  /**
   * Stores LifeNest token usage for the active month and returns the updated summary.
   */
  async recordUsage(event: LifeNestUsageEvent): Promise<LifeNestMonthlyUsageSummary> {
    const existing = await this.getOrCreateCurrentMonthlyUsageRow();
    const currentSummary = await this.getCurrentMonthlyUsageSummary();
    if (!existing?.id) {
      throw new Error('LifeNest usage summary was not found for update.');
    }

    const monthlyTokenAllowance = Number(existing.monthly_token_allowance ?? 0);
    const monthlyTokensUsed = Number(existing.monthly_tokens_used ?? 0);
    const purchasedTokensBalance = Number(currentSummary.purchasedTokensBalance ?? 0);
    const purchasedTokensUsed = Number(existing.purchased_tokens_used ?? 0);
    const remainingIncludedTokens = Math.max(monthlyTokenAllowance - monthlyTokensUsed, 0);

    if (event.tokensUsed > remainingIncludedTokens + purchasedTokensBalance) {
      throw new Error('Not enough LifeNest tokens remain for this message.');
    }

    const includedTokensToUse = Math.min(event.tokensUsed, remainingIncludedTokens);
    const purchasedTokensToUse = Math.max(event.tokensUsed - includedTokensToUse, 0);

    const updatedRow: Partial<LifeNestMonthlyUsageRow> = {
      monthly_tokens_used: monthlyTokensUsed + includedTokensToUse,
      purchased_tokens_used: purchasedTokensUsed + purchasedTokensToUse,
    };

    await databaseService.updateTable('LifeNestMonthlyUsage', {
      monthly_token_allowance: monthlyTokenAllowance,
      monthly_tokens_used: updatedRow.monthly_tokens_used,
      purchased_tokens_used: updatedRow.purchased_tokens_used,
    }, undefined, 'id', existing.id);

    return this.getCurrentMonthlyUsageSummary();
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
      model: (fallbackModel || 'gpt-4o').toLowerCase(),
      tokensUsed,
      inputCharacterCount: message.trim().length,
    };
  }


  /** Generates or enhances a checklist through LifeNest and charges one token. */
  async generateChecklist(title: string, items: string[]): Promise<GeneratedChecklist> {
    const usageEvent: LifeNestUsageEvent = {
      model: 'gpt-4o',
      tokensUsed: 1,
      inputCharacterCount: `${title}\n${items.join('\n')}`.trim().length,
    };
    const usageSummary = await this.getCurrentMonthlyUsageSummary();
    if (usageSummary.totalTokensRemaining < usageEvent.tokensUsed) {
      throw new Error('Not enough LifeNest tokens remain for this checklist.');
    }

    const openAIConversationId = await this.createOpenAIConversation();
    const response = await this.callLifeNestFunction<SendMessageFunctionResponse>({
      action: 'send_message',
      model: 'gpt-4o',
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

    await this.recordUsage(usageEvent);
    return { title: nextTitle, items: nextItems, usage: usageEvent };
  }

  async createConversation(model: string): Promise<Conversation> {
    const openaiConvId = await this.createOpenAIConversation();
    const { data, error } = await databaseService.insertAndSelect<Conversation>('Conversations', { openai_conversation_id: openaiConvId, model, });

    if (error || !data) {
      console.error('Operation failed');
      throw new Error('Could not create conversation.');
    }

    return data as Conversation;
  }

  private async getOrCreateConversation(conversationId: string, model: string): Promise<Conversation> {
    if (!model || model === 'None') {
      model = "gpt-4o";//Need a default model method for 1 place to update
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
      console.error('Operation failed');
      throw error;
    }

    if (!data || data.length === 0) {
      // let model = await settingsService.getChatBotSettings()
      //   .then(settings => settings.preferred_model)
      //   if(model === 'None' || !model) model = 'gpt-4o';
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

  async getModels() {
    try {
      const data = await this.callLifeNestFunction<ListModelsFunctionResponse>({
        action: 'list_models',
      });
      return data.models ?? ['None'];
    }
    catch (error) {
      console.error('Operation failed');
      return ['None'];
    }
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

    // Send to the backend so private keys stay server-side.
    const response = await this.callLifeNestFunction<SendMessageFunctionResponse>({
      action: 'send_message',
      model: conv.model,
      conversationId: conv.openai_conversation_id,
      message,
      instructions: chatBotHook.instructions,
    });

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

    const usageEvent = this.buildUsageEvent(message, conv.model);
    if (usageEvent) {
      await this.recordUsage(usageEvent);
    }

    return { conversationId: conv.id, aiResponse: aiMessages, usage: usageEvent };
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
