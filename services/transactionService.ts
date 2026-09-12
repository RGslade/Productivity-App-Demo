import { Transaction, CreateTransactionRequest, TransactionCategory, UpdateTransactionRequest, TransactionType } from '../types/transaction';
import { GetCurrentYear } from '@/hooks/dataHandler';
import databaseService from './databaseService';
import { DEFAULT_CURRENCY_SYMBOL } from '@/constants/CurrencySymbols';
import { RecurrenceFrequency } from '@/types/recurringTransaction';
import { isValidCurrencyAmount } from '@/lib/currencyAmount';
import { getStaticCached } from '@/services/staticCache';

/** Returns an ISO date string without timezone-sensitive midnight drift. */
const toDateString = (value: Date | string): string => {
  if (typeof value === 'string') {
    return value.split('T')[0];
  }

  return value.toISOString().slice(0, 10);
};

/** Advances a due date by the selected recurrence frequency. */
const addFrequency = (dateString: string, frequency: RecurrenceFrequency): string => {
  const date = new Date(`${dateString}T12:00:00`);
  if (frequency === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else {
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + 1);
    date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
  }

  return toDateString(date);
};

class TransactionService {
  /** Gets all available transaction categories, optionally filtered by transaction type. */
  async getTransactionCategories(type?: TransactionType | string): Promise<TransactionCategory[]> {
    const data = await getStaticCached('transaction-categories', async () => {
      const { data: rows, error } = await databaseService.getAllGlobal<TransactionCategory>('TransactionCategories', 'name');
      if (error) throw new Error(error.message);
      return rows || [];
    });

    if (!type) {
      return data;
    }

    return data.filter(category => category.transaction_type === type);
  }

  async getTransactionCategory(id:number | undefined): Promise<TransactionCategory>{
    const {data, error} = await databaseService.getSingleGlobal<TransactionCategory>('TransactionCategories', 'id', id);
    if(error){
      throw new Error(error.message)
    }
      return data;
  }

  /** Gets every transaction row for the current user ordered by due date. */
  async getTransactions(): Promise<Transaction[]> {
    const { data, error } = await databaseService.getAll<Transaction>('Transactions', 'due_date');
    if (error) {
      throw new Error(error.message);
    }
    return data || [];
  }

  /** Gets transaction rows for a specific month and year. */
  async getTransactionsByMonth(month: number, year: number): Promise<Transaction[]> {
    const { data, error } = await databaseService.getRange<Transaction>('Transactions', 'due_date', year + "-" + month + "-01", year + "-" + month + "-" + new Date(year, month, 0).getDate(), 'due_date', 'month', month);
    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  /** Gets one transaction row by id for the current user. */
  async getTransaction(id: number): Promise<Transaction | null> {//filter for user as well
    const { data, error } = await databaseService.getSingle<Transaction>('Transactions', '', 'id', id);

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(error.message);
    }
    return data;
  }

  /** Creates a transaction record for the current user. */
  async createTransaction(transactionData: CreateTransactionRequest): Promise<Transaction> {
    if (!isValidCurrencyAmount(String(Math.abs(transactionData.amount)))) {
      throw new Error('Transaction amount must be positive, use no more than two decimal places, and contain no more than 9 significant digits.');
    }

    const dueDate = transactionData.due_date ? toDateString(transactionData.due_date) : toDateString(new Date());
    const recurrenceFrequency = transactionData.is_recurring ? transactionData.recurrence_frequency ?? 'monthly' : null;
    const dbTransaction = {
      title: transactionData.title,
      description: transactionData.description || null,
      category_id: transactionData.category_id || null,
      amount: transactionData.amount,
      due_date: dueDate,
      type: transactionData.type,
      recurring_transaction_id: transactionData.recurring_transaction_id ?? null,
      recurring_source_transaction_id: transactionData.recurring_source_transaction_id ?? null,
      recurrence_due_date: transactionData.recurrence_due_date ?? null,
      is_recurring: transactionData.is_recurring ?? false,
      recurrence_frequency: recurrenceFrequency,
      recurrence_next_due_date: transactionData.recurrence_next_due_date ?? (recurrenceFrequency ? addFrequency(dueDate, recurrenceFrequency) : null),
      recurrence_end_date: transactionData.recurrence_end_date ?? null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await databaseService.insertAndSelect<Transaction>('Transactions', { ...dbTransaction });

    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  /** Updates a transaction record for the current user. */
  async updateTransaction(id: number, updates: UpdateTransactionRequest): Promise<Transaction> {
    if (!isValidCurrencyAmount(String(Math.abs(updates.amount)))) {
      throw new Error('Transaction amount must be positive, use no more than two decimal places, and contain no more than 9 significant digits.');
    }

    const dueDate = updates.due_date ? toDateString(updates.due_date) : undefined;
    const recurrenceFrequency = updates.is_recurring ? updates.recurrence_frequency ?? 'monthly' : null;
    const updateData = {
      ...updates,
      category_id: updates.category_id ?? null,
      due_date: dueDate,
      recurrence_frequency: recurrenceFrequency,
      recurrence_next_due_date: updates.is_recurring && dueDate ? addFrequency(dueDate, recurrenceFrequency ?? 'monthly') : null,
      recurrence_end_date: updates.is_recurring ? updates.recurrence_end_date ?? null : null,
    };
    const { data, error } = await databaseService.updateTable<Transaction>('Transactions', updateData, '', 'id', id);
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  /** Deletes one transaction by id for the current user. */
  async deleteTransaction(id: number): Promise<void> {
    const { error } = await databaseService.deleteFromTable('Transactions', 'id', id);
    if (error) {
      throw new Error(error.message);
    }
  }

  // Statistics and calculations
  /** Calculates high-level stats from all or one month of transactions. */
  async getTransactionStats(year: number = GetCurrentYear(), month?: number): Promise<{totalIncome: number; totalExpenses: number; netBalance: number; transactionCount: number;}> {
    let transactions: Transaction[];

    if (year && month) {
      transactions = await this.getTransactionsByMonth(year, month);
    } else {
      transactions = await this.getTransactions();
    }

    const income = transactions.filter(t => t.type === TransactionType.Income).reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions.filter(t => t.type === TransactionType.Expense).reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      totalIncome: income,
      totalExpenses: expenses,
      netBalance: income - expenses,
      transactionCount: transactions.length,
    };
  }

  // Utility methods for transaction calculations
  
  /** Totals only income transaction amounts. */
  getTotalIncome(transactions: Transaction[]): number {
    return transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }

  /** Totals only expense transaction amounts. */
  getTotalExpenses(transactions: Transaction[]): number {
    return transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }

  /** Calculates net total from income minus expenses. */
  getNetTotal(transactions: Transaction[]): number {
    return this.getTotalIncome(transactions) - this.getTotalExpenses(transactions);
  }

  /** Filters transactions due during the current month. */
  getTransactionsDueThisMonth(transactions: Transaction[]): Transaction[] {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.filter(t => {
      const dueDate = new Date(t.due_date);
      return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
    });
  }

  /** Formats a number with the user's preferred currency symbol. */
  formatCurrency(amount: number, currencySymbol: string = DEFAULT_CURRENCY_SYMBOL): string {
    const formattedAmount = Math.abs(amount).toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sign = amount < 0 ? '-' : '';
    return `${sign}${currencySymbol}${formattedAmount}`;
  }
}

export const transactionService = new TransactionService();
export { TransactionType };
export default transactionService;
