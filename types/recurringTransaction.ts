import { TransactionType } from './transaction';
export type RecurrenceFrequency = 'weekly' | 'monthly';
export interface RecurringTransaction { id: number; user_id: number; type: TransactionType; title: string; description: string; category_id: number | null; amount: number; frequency: RecurrenceFrequency; start_date: string; next_due_date: string; end_date: string | null; is_active: boolean; created_at: string; updated_at: string; }
export interface CreateRecurringTransactionRequest { type: TransactionType; title: string; description?: string; category_id?: number | null; amount: number; frequency: RecurrenceFrequency; start_date: string; end_date?: string | null; }
export type UpdateRecurringTransactionRequest = Partial<CreateRecurringTransactionRequest> & { is_active?: boolean };
