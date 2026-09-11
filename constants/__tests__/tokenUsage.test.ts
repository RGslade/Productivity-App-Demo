import { calculateChatTokenCost, getTokenCost } from '@/constants/tokenUsage';

describe('token usage pricing', () => {
  test('reserves one input token plus five output tokens for 1-100 characters', () => {
    expect(calculateChatTokenCost('a'.repeat(1))).toBe(6);
    expect(calculateChatTokenCost('a'.repeat(100))).toBe(6);
  });

  test('reserves two input tokens plus five output tokens for 101-200 characters', () => {
    expect(calculateChatTokenCost('a'.repeat(101))).toBe(7);
    expect(calculateChatTokenCost('a'.repeat(200))).toBe(7);
  });

  test('uses the approved fixed feature prices', () => {
    expect(getTokenCost('dashboard_customization')).toBe(10);
    expect(getTokenCost('checklist_enhancement')).toBe(1);
    expect(getTokenCost('premium_todo_category')).toBe(2);
  });
});


