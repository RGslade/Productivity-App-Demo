import { Transaction, CreateTransactionRequest, TransactionCategory, UpdateTransactionRequest, TransactionType } from '../types/transaction';
import { GetCurrentYear } from '@/hooks/dataHandler';
import databaseService from './databaseService';
import { DEFAULT_CURRENCY_SYMBOL } from '@/constants/CurrencySymbols';

//
class TransactionService {
  /** Gets all available transaction categories, optionally filtered by transaction type. */
  async getTransactionCategories(type?: TransactionType | string): Promise<TransactionCategory[]> {
    //
    const { data, error } = await databaseService.getAllGlobal<TransactionCategory>('TransactionCategories', 'name');
    //
    if (error) {
      throw new Error(error.message);
    }

    //
    if (!type) {
      return data || [];
    }

    //
    return (data || []).filter(category => category.transaction_type === type);
  }

  async getTransactionCategory(id:number | undefined): Promise<TransactionCategory>{
    //
    const {data, error} = await databaseService.getSingleGlobal<TransactionCategory>('TransactionCategories', 'id', id);
    if(error){
      throw new Error(error.message)
    }
      return data;
  }

  /** Gets every transaction row for the current user ordered by due date. */
  async getTransactions(): Promise<Transaction[]> {
    //
    const { data, error } = await databaseService.getAll<Transaction>('Transactions', 'due_date');
    //
    if (error) {
      throw new Error(error.message);
    }
    return data || [];
  }

  /** Gets transaction rows for a specific month and year. */
  async getTransactionsByMonth(month: number, year: number): Promise<Transaction[]> {
    //
    const { data, error } = await databaseService.getRange<Transaction>('Transactions', 'due_date', year + "-" + month + "-01", year + "-" + month + "-" + new Date(year, month, 0).getDate(), 'due_date', 'month', month);
    //
    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  /** Gets one transaction row by id for the current user. */
  async getTransaction(id: number): Promise<Transaction | null> {//filter for user as well
    //
    const { data, error } = await databaseService.getSingle<Transaction>('Transactions', '', 'id', id);

    //
    if (error) {
      //
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(error.message);
    }
    return data;
  }

  /** Creates a transaction record for the current user. */
  async createTransaction(transactionData: CreateTransactionRequest): Promise<Transaction> {
    //
    const dbTransaction = {
      title: transactionData.title,
      description: transactionData.description || null,
      category_id: transactionData.category_id || null,
      amount: transactionData.amount,
      due_date: transactionData.due_date ? transactionData.due_date.split('T')[0] : new Date().toISOString().split('T')[0], // Convert ISO to date
      type: transactionData.type,
      updated_at: new Date().toISOString(),
    };
    //
    const { data, error } = await databaseService.insertAndSelect<Transaction>('Transactions', { ...dbTransaction });

    //
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  /** Updates a transaction record for the current user. */
  async updateTransaction(id: number, updates: UpdateTransactionRequest): Promise<Transaction> {
    //
    const updateData = {
      ...updates,
      category: updates.category_id ?? null,
      due_date: updates.due_date ? updates.due_date.split('T')[0] : undefined,
    };
    //
    const { data, error } = await databaseService.updateTable<Transaction>('Transactions', updateData, '', 'id', id);
    //
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  /** Deletes one transaction by id for the current user. */
  async deleteTransaction(id: number): Promise<void> {
    //
    const { error } = await databaseService.deleteFromTable('Transactions', 'id', id);
    //
    if (error) {
      throw new Error(error.message);
    }
  }

  // Statistics and calculations
  /** Calculates high-level stats from all or one month of transactions. */
  async getTransactionStats(year: number = GetCurrentYear(), month?: number): Promise<{totalIncome: number; totalExpenses: number; netBalance: number; transactionCount: number;}> {
    //
    let transactions: Transaction[];

    //
    if (year && month) {
      transactions = await this.getTransactionsByMonth(year, month);
    } else {
      transactions = await this.getTransactions();
    }

    //
    const income = transactions.filter(t => t.type === TransactionType.Income).reduce((sum, t) => sum + t.amount, 0);

    //
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
    //
    const now = new Date();
    //
    const currentMonth = now.getMonth();
    //
    const currentYear = now.getFullYear();

    return transactions.filter(t => {
      //
      const dueDate = new Date(t.due_date);
      return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
    });
  }

  /** Formats a number with the user's preferred currency symbol. */
  formatCurrency(amount: number, currencySymbol: string = DEFAULT_CURRENCY_SYMBOL): string {
    //
    const formattedAmount = Math.abs(amount).toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    //
    const sign = amount < 0 ? '-' : '';
    return `${sign}${currencySymbol}${formattedAmount}`;
  }
}

//
export const transactionService = new TransactionService();
//
export { TransactionType };
//
export default transactionService;
