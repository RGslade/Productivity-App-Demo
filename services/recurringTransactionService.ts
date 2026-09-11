import databaseService from './databaseService';
import { transactionService } from './transactionService';
import { Transaction } from '@/types/transaction';
import { CreateRecurringTransactionRequest, RecurrenceFrequency, RecurringTransaction, UpdateRecurringTransactionRequest } from '@/types/recurringTransaction';

/** Formats a date as YYYY-MM-DD for database date columns. */
const toDateString = (date: Date) => date.toISOString().slice(0, 10);

/** Advances a date by one supported recurrence interval. */
function addFrequency(dateString: string, frequency: RecurrenceFrequency) {
  const date = new Date(`${dateString}T12:00:00`);
  if (frequency === 'weekly') date.setDate(date.getDate() + 7);
  else {
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + 1);
    date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
  }
  return toDateString(date);
}

class RecurringTransactionService {
  /** Gets transaction rows that act as recurring sources for future generated rows. */
  private async getRecurringTransactionSources() {
    const { data } = await databaseService.getAll<Transaction>('Transactions', 'recurrence_next_due_date', true);
    return (data || []).filter((transaction) => (
      transaction.is_recurring &&
      !transaction.recurring_source_transaction_id &&
      transaction.recurrence_frequency &&
      transaction.recurrence_next_due_date
    ));
  }

  /** Gets legacy recurring templates ordered by next due date. */
  async getTemplates() {
    const { data } = await databaseService.getAll<RecurringTransaction>('RecurringTransactions', 'next_due_date');
    return data || [];
  }

  /** Creates a legacy recurring template and immediately catches up any due rows. */
  async createTemplate(request: CreateRecurringTransactionRequest) {
    const { data, error } = await databaseService.insertAndSelect<RecurringTransaction>('RecurringTransactions', {
      ...request, description: request.description || '', category_id: request.category_id ?? null,
      next_due_date: request.start_date, is_active: true,
    });
    if (error || !data) throw new Error(error?.message || 'Could not create recurring transaction.');
    await this.generateDueTransactions([data]);
    return data;
  }

  /** Updates a legacy recurring template. */
  async updateTemplate(id: number, updates: UpdateRecurringTransactionRequest) {
    const { data, error } = await databaseService.updateTable<RecurringTransaction>('RecurringTransactions', updates, undefined, 'id', id);
    if (error || !data) throw new Error(error?.message || 'Could not update recurring transaction.');
    return data;
  }

  /** Deletes a legacy recurring template. */
  async deleteTemplate(id: number) { await databaseService.deleteFromTable('RecurringTransactions', 'id', id); }

  /** Generates due transactions from new transaction sources and legacy templates. */
  async generateDueTransactions(templates?: RecurringTransaction[]) {
    const generatedFromTransactions = await this.generateDueTransactionsFromSources();
    const rows = templates || await this.getTemplates();
    const today = toDateString(new Date());
    let generated = 0;
    for (const template of rows) {
      if (!template.is_active) continue;
      let dueDate = template.next_due_date;
      let count = 0;
      const defaultCategory = template.category_id || (await transactionService.getTransactionCategories(template.type))[0]?.id || 1;
      while (dueDate <= today && count < 120 && (!template.end_date || dueDate <= template.end_date)) {
        try {
          await transactionService.createTransaction({
            title: template.title, description: template.description, category_id: defaultCategory,
            amount: template.type === 'Expense' ? -Math.abs(template.amount) : Math.abs(template.amount), due_date: dueDate, type: template.type,
            recurring_transaction_id: template.id, recurrence_due_date: dueDate,
          });
          generated += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
          if (!message.includes('duplicate') && !message.includes('unique')) throw error;
        }
        dueDate = addFrequency(dueDate, template.frequency);
        count += 1;
      }
      if (dueDate !== template.next_due_date) {
        await databaseService.updateTable('RecurringTransactions', { next_due_date: dueDate }, undefined, 'id', template.id);
      }
    }
    return generated + generatedFromTransactions;
  }

  /** Generates missed child rows from recurring income and expense transactions. */
  async generateDueTransactionsFromSources(sources?: Transaction[]) {
    const rows = sources || await this.getRecurringTransactionSources();
    const today = toDateString(new Date());
    let generated = 0;

    for (const source of rows) {
      if (!source.recurrence_frequency || !source.recurrence_next_due_date) continue;
      let dueDate = source.recurrence_next_due_date;
      let count = 0;

      while (dueDate <= today && count < 120 && (!source.recurrence_end_date || dueDate <= source.recurrence_end_date)) {
        try {
          await transactionService.createTransaction({
            title: source.title,
            description: source.description || '',
            category_id: source.category_id || 1,
            amount: source.type === 'Expense' ? -Math.abs(source.amount) : Math.abs(source.amount),
            due_date: dueDate,
            type: source.type,
            recurring_source_transaction_id: source.id,
            recurrence_due_date: dueDate,
            is_recurring: false,
          });
          generated += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
          if (!message.includes('duplicate') && !message.includes('unique')) throw error;
        }

        dueDate = addFrequency(dueDate, source.recurrence_frequency);
        count += 1;
      }

      if (dueDate !== source.recurrence_next_due_date) {
        await databaseService.updateTable('Transactions', { recurrence_next_due_date: dueDate }, undefined, 'id', source.id);
      }
    }

    return generated;
  }
}

export const recurringTransactionService = new RecurringTransactionService();
export const __recurrence = { addFrequency, toDateString };
