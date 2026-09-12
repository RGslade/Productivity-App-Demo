import { calculateLifeNestTokensForMessage } from '@/constants/lifeNestUsage';

export type TokenFeature =
  | 'chat_message'
  | 'dashboard_customization'
  | 'checklist_enhancement'
  | 'premium_todo_category';

export const TOKEN_COSTS = {
  chatOutputReserve: 5,
  dashboardCustomization: 10,
  checklistEnhancement: 1,
  premiumTodoCategory: 2,
  maximumTransaction: 100,
} as const;

/** Calculates the complete reservation for a normal chat message. */
export function calculateChatTokenCost(message: string): number {
  return calculateLifeNestTokensForMessage(message) + TOKEN_COSTS.chatOutputReserve;
}

/** Returns the fixed client-visible price for a metered feature. */
export function getTokenCost(feature: Exclude<TokenFeature, 'chat_message'>): number {
  switch (feature) {
    case 'dashboard_customization': return TOKEN_COSTS.dashboardCustomization;
    case 'checklist_enhancement': return TOKEN_COSTS.checklistEnhancement;
    case 'premium_todo_category': return TOKEN_COSTS.premiumTodoCategory;
  }
}
