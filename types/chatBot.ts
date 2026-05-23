//
export interface Conversation {
  id: string;
  openai_conversation_id: string;
  user_id: number;
  created_at: string;
  model: string;
  updated_at: string;
  title?: string | null;
  last_response_id?: string | null;
}

//
export interface ChatMessage {
  id: number;
  message: string;
  was_edited: boolean;
  created_at: string; // ISO string
  conversation_id?: string;
  updated_at?: string;
  is_user_message: boolean;
}

//
export interface SendMessageRequest {
  message: string;
  model: string;
  conversationId: string;
}

//
export interface SendMessageResponse {
  conversationId: string;
  aiResponse: ChatMessage[];
  usage?: LifeNestUsageEvent | null;
}

//
export interface ChatFeedbackReportRequest {
  conversationId: string;
  messageId: number;
  message: string;
  reason: string;
  details?: string;
}

//
export interface LifeNestUsageEvent {
  model: string;
  tokensUsed: number;
  inputCharacterCount: number;
}

//
export interface LifeNestMonthlyUsageSummary {
  periodKey: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  monthlyTokenAllowance: number;
  monthlyTokensUsed: number;
  purchasedTokensBalance: number;
  purchasedTokensUsed: number;
  totalTokensAvailable: number;
  totalTokensUsed: number;
  totalTokensRemaining: number;
}


//
export interface GeneratedChecklist {
  title: string;
  items: string[];
  usage?: LifeNestUsageEvent | null;
}
