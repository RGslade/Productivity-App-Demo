// Import User type for navigation property
import type { RecurrenceFrequency } from './recurringTransaction';
import type { UserInfo } from './user';

export interface Transaction {
  id: number; // bigint in DB
  title: string;
  created_at: string; // timestamp with time zone
  description?: string;
  category_id?: number ;
  amount: number; // real in DB
  due_date: string; // date
  type: TransactionType | string; // varchar - Income/Expense
  user_id: number; // bigint
  recurring_transaction_id?: number | null;
  recurring_source_transaction_id?: number | null;
  recurrence_due_date?: string | null;
  is_recurring?: boolean;
  recurrence_frequency?: RecurrenceFrequency | null;
  recurrence_next_due_date?: string | null;
  recurrence_end_date?: string | null;
  //month: number;
  
  // Navigation property
  user?: UserInfo;
}

export interface TransactionCategory {
  id: number;
  name: string;
  transaction_type: TransactionType | string;
  created_at: string;
  updated_at?: string;
}

export interface CreateTransactionRequest {
  title: string;
  description?: string;
  category_id: number | 1;
  amount: number;
  due_date: string; // ISO date string format
  type: TransactionType | string;
  recurring_transaction_id?: number;
  recurring_source_transaction_id?: number;
  recurrence_due_date?: string;
  is_recurring?: boolean;
  recurrence_frequency?: RecurrenceFrequency | null;
  recurrence_next_due_date?: string | null;
  recurrence_end_date?: string | null;
  //month: number;
}

export interface UpdateTransactionRequest {
  title: string;
  description?: string;
  category_id?: number | null;
  amount: number;
  due_date: string; // date format
  type: TransactionType | string;
  is_recurring?: boolean;
  recurrence_frequency?: RecurrenceFrequency | null;
  recurrence_next_due_date?: string | null;
  recurrence_end_date?: string | null;
  //month: number;
}

// Transaction type enum - matching your database values
export enum TransactionType {
  Income = 'Income',
  Expense = 'Expense'
}

export interface TransactionStats {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
}

export interface FinancialSummary {
  currentMonth: TransactionStats;
  yearToDate: TransactionStats;
  allTime: TransactionStats;
}
