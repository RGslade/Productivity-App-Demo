import { supabase, getSession } from '../lib/supabase';
import { ToDoItem, Category, CreateToDoRequest, UpdateToDoRequest, CreateCategoryRequest, PremiumCategory, ChecklistItem } from '../types/todo';
import databaseService from '@/services/databaseService';

class TodoService {
  private async attachChecklistItems(todos: ToDoItem[]): Promise<ToDoItem[]> {
    const checklistTodos = todos.filter((todo) => todo.item_kind === 'checklist');
    if (checklistTodos.length === 0) return todos;

    const checklistIds = checklistTodos.map((todo) => todo.id);
    const { data, error } = await supabase
      .from('ToDoChecklistItems')
      .select('*')
      .in('todo_id', checklistIds)
      .order('position');

    if (error) {
      throw new Error(error.message);
    }

    const itemsByTodoId = (data || []).reduce<Record<number, ChecklistItem[]>>((groups, item) => {
      const todoId = Number(item.todo_id);
      groups[todoId] = groups[todoId] || [];
      groups[todoId].push(item as ChecklistItem);
      return groups;
    }, {});

    return todos.map((todo) => ({
      ...todo,
      checklist_items: todo.item_kind === 'checklist' ? itemsByTodoId[todo.id] || [] : todo.checklist_items,
    }));
  }

  async getToDoItems(): Promise<ToDoItem[]> {
    getSession();
    const { data, error } = await databaseService.getAll<ToDoItem>('ToDoItems')
    if (error) {
      throw new Error(error.message);
    }
    return this.attachChecklistItems(data || []);
  }

  async getToDoItem(id: number): Promise<ToDoItem> {
    getSession();
    const { data, error } = await databaseService.getSingleGlobal<ToDoItem>('ToDoItems', 'id', id);//Can use GetSingleGlobal as it uses the unique ID and its a single item
    if (error) {
      if (error.code === 'PGRST116' && error.details.includes(" 0 rows"))
        throw new Error(error.message);
    }
    const [todo] = await this.attachChecklistItems(data ? [data] : []);
    return todo;
  }

  async getTodosDueToday(): Promise<ToDoItem[]> {
    const todos = await this.getToDoItems();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return todos.filter(todo => {
      if (!todo["due_date_&_time"]) return false;
      const dueDate = new Date(todo["due_date_&_time"]);
      return dueDate >= today && dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
    });
  }

  async getTodosDueSoon(todoSoonDeterminer: number): Promise<ToDoItem[]> {
    const todos = await this.getToDoItems();
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + todoSoonDeterminer);

    return todos.filter(todo => {
      if (!todo["due_date_&_time"]) return false;
      const dueDate = new Date(todo["due_date_&_time"]);
      return dueDate >= now && dueDate <= futureDate;
    });
  }

  async createToDoItem(todoData: CreateToDoRequest): Promise<ToDoItem> {
    const isChecklist = todoData.item_kind === 'checklist';
    const item = {
      title: todoData.title,
      description: isChecklist ? '' : todoData.description,
      ["due_date_&_time"]: isChecklist ? todoData.due_date_time || null : todoData.due_date_time || new Date().toISOString(),
      category_id: isChecklist ? null : todoData.category_id,
      premium_category_id: isChecklist ? null : todoData.premium_category_id ?? null,
      is_complete: false,
      remind_me: isChecklist ? false : todoData.remind_me,
      unit: isChecklist ? null : todoData.unit || null,
      type: isChecklist ? 'Checklist' : todoData.type,
      item_kind: isChecklist ? 'checklist' : 'task',
      progress: 0,
    }
    const { data, error } = await databaseService.insertAndSelect<ToDoItem>("ToDoItems", item);
    if (error || !data) {
      throw new Error(error?.message || 'Could not create task.');
    }

    if (isChecklist) {
      const checklistItems = (todoData.checklist_items || [])
        .map((text) => text.trim())
        .filter(Boolean)
        .map((text, index) => ({ todo_id: data.id, text, position: index, is_complete: false }));

      if (checklistItems.length > 0) {
        const userId = data.user_id;
        const { error: itemsError } = await supabase
          .from('ToDoChecklistItems')
          .insert(checklistItems.map((item) => ({ ...item, user_id: userId })));
        if (itemsError) {
          throw new Error(itemsError.message);
        }
      }
    }

    const [createdTodo] = await this.attachChecklistItems([data]);
    return createdTodo;
  }

  async updateToDoItem(id: number, updates: UpdateToDoRequest): Promise<ToDoItem> {
    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.is_complete !== undefined) updateData.is_complete = updates.is_complete;
    if (updates.due_date_time !== undefined) updateData["due_date_&_time"] = updates.due_date_time;
    if (updates.category_id !== undefined) updateData.category_id = updates.category_id;
    if (updates.remind_me !== undefined) updateData.remind_me = updates.remind_me;
    if (updates.unit !== undefined) updateData.unit = updates.unit;
    if (updates.progress !== undefined) updateData.progress = updates.progress;
    if (updates.premium_category_id !== undefined) updateData.premium_category_id = updates.premium_category_id;
    const { data, error } = await databaseService.updateTable<ToDoItem>("ToDoItems", updateData, "category:Categories(*)", 'id', id);
    if (error) {
      throw new Error(error.message);
    }

    if (updates.checklist_items) {
      for (const item of updates.checklist_items) {
        await supabase
          .from('ToDoChecklistItems')
          .update({ is_complete: item.is_complete, updated_at: new Date().toISOString() })
          .eq('id', item.id)
          .eq('todo_id', id);
      }
    }

    const [updatedTodo] = await this.attachChecklistItems([data]);
    return updatedTodo;
  }

  async deleteToDoItem(id: number): Promise<void> {
    getSession();
    await supabase.from('ToDoChecklistItems').delete().eq('todo_id', id);
    await databaseService.deleteFromTable("ToDoItems", 'id', id);
  }

  async toggleToDoItem(id: number): Promise<ToDoItem> {
    const todo = await this.getToDoItem(id);
    if (!todo) throw new Error('Todo not found');

    return this.updateToDoItem(id, { is_complete: !todo.is_complete, description: todo.description, remind_me: todo.remind_me, progress: todo.progress });
  }

  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase.from("Categories").select('*').order("name");

    if (error) {
      console.error('settingsService.getOrCreateDefault', error, data);
      throw new Error(error.message);
    }
    return data || [];
  }



  async getPremiumCategories(): Promise<PremiumCategory[]> {
    const { data, error } = await supabase.from('PremiumCategories').select('*').order('name');
    if (error) {
      throw new Error(error.message);
    }
    return data || [];
  }

  async createCategory(categoryData: CreateCategoryRequest): Promise<Category> {
    const { data, error } = await databaseService.insertToTable<Category>("Categories", categoryData.name)

    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  async updateCategory(id: number, name: string): Promise<Category> {
    const { data, error } = await supabase.from("Categories").insert(name).eq("id", id).select().single();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  async deleteCategory(id: number): Promise<void> { //Change this so that if there is more than 1 category in a todo then fail else succeeed.
    //Fetch To do items with this category
    const { data: todos, error: fetchError } = await databaseService.getAllWithFilter<ToDoItem[]>("ToDoItems", 'category_id', id);
    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (todos.length > 1) {
      throw new Error('Cannot delete category with multiple todo items');
    }

    const { error } = await supabase.from("ToDoItems").delete().eq("category_id", id);

    // Then delete the category
    const { error: error2 } = await supabase.from("Categories").delete().eq("id", id);

    if (error || error2) {
      throw new Error(error?.message + '' + error2);
    }
  }

  // Statistics and utility methods
  async getTodoStats(): Promise<{
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  }> {
    const todos = await this.getToDoItems();
    const completed = todos.filter(todo => todo.is_complete).length;
    const pending = todos.filter(todo => !todo.is_complete).length;
    const overdue = todos.filter(todo =>
      !todo.is_complete && todo["due_date_&_time"] && new Date(todo["due_date_&_time"]) < new Date()).length;

    return { total: todos.length, completed, pending, overdue };
  }

  // Utility methods for hooks
  getCompletedCount(todos: ToDoItem[]): number {
    return todos.filter(todo => todo.is_complete).length;
  }

  getOutstandingCount(todos: ToDoItem[]): number {
    return todos.filter(todo => !todo.is_complete).length;
  }

  getOverdueItems(todos: ToDoItem[]): ToDoItem[] {
    const now = new Date();
    return todos.filter(todo =>
      !todo.is_complete && todo["due_date_&_time"] && new Date(todo["due_date_&_time"]) < now
    );
  }

  getItemsDueSoon(todos: ToDoItem[], days: number = 7): ToDoItem[] {
    const futureDate = new Date();
    futureDate.setDate(new Date().getDate() + days);

    return todos.filter(todo =>
      !todo.is_complete && todo["due_date_&_time"] && new Date(todo["due_date_&_time"]) >= new Date() && new Date(todo["due_date_&_time"]) <= futureDate
    );
  }

  getEarliestDueDate(todos: ToDoItem[]): Date | null {
    const incompleteTodos = todos.filter(todo =>
      !todo.is_complete && todo["due_date_&_time"]
    );

    if (incompleteTodos.length === 0) return null;

    const earliestDate = incompleteTodos.reduce((earliest, todo) => {
      const todoDate = new Date(todo["due_date_&_time"]!);
      return todoDate < earliest ? todoDate : earliest;
    }, new Date(incompleteTodos[0]["due_date_&_time"]!));

    return earliestDate;
  }

  async ensureDefaultCategories(): Promise<void> {
    // Use the database function to ensure default categories
    const { error } = await supabase.rpc('ensure_default_categories');
    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Get all tasks with reminders enabled
   */
  async getTasksWithReminders(): Promise<ToDoItem[]> {
    const todos = await this.getToDoItems();
    return todos.filter(todo => todo.remind_me);
  }

  /**
   * Get incomplete tasks with reminders that are due tomorrow (1 day before deadline)
   */
  async getTasksDueTomorrow(): Promise<ToDoItem[]> {
    const todos = await this.getTasksWithReminders();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    return todos.filter(todo => {
      if (todo.is_complete || !todo["due_date_&_time"]) return false;
      const dueDate = new Date(todo["due_date_&_time"]);
      return dueDate >= tomorrow && dueDate < tomorrowEnd;
    });
  }

  /**
   * Get incomplete tasks with reminders that are due today
   */
  async getTasksDueToday(): Promise<ToDoItem[]> {
    const todos = await this.getTasksWithReminders();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return todos.filter(todo => {
      if (todo.is_complete || !todo["due_date_&_time"]) return false;
      const dueDate = new Date(todo["due_date_&_time"]);
      return dueDate >= today && dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
    });
  }

  /**
   * Get incomplete tasks with reminders due more than 1 week away (for 1 week prior reminder)
   */
  async getTasksDueMoreThanOneWeekAway(): Promise<ToDoItem[]> {
    const todos = await this.getTasksWithReminders();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    return todos.filter(todo => {
      if (todo.is_complete || !todo["due_date_&_time"]) return false;
      const dueDate = new Date(todo["due_date_&_time"]);
      return dueDate > oneWeekFromNow;
    });
  }

  /**
   * Get incomplete tasks with reminders that are 1 week before deadline
   */
  async getTasksDueInOneWeek(): Promise<ToDoItem[]> {
    const todos = await this.getTasksWithReminders();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    oneWeekFromNow.setHours(0, 0, 0, 0);

    const oneWeekAndDayFromNow = new Date(oneWeekFromNow);
    oneWeekAndDayFromNow.setDate(oneWeekAndDayFromNow.getDate() + 1);

    return todos.filter(todo => {
      if (todo.is_complete || !todo["due_date_&_time"]) return false;
      const dueDate = new Date(todo["due_date_&_time"]);
      return dueDate >= oneWeekFromNow && dueDate < oneWeekAndDayFromNow;
    });
  }

  /**
   * Get overdue incomplete tasks with reminders
   */
  async getOverdueTasksWithReminders(): Promise<ToDoItem[]> {
    const todos = await this.getTasksWithReminders();
    const now = new Date();

    return todos.filter(todo => {
      if (todo.is_complete || !todo["due_date_&_time"]) return false;
      const dueDate = new Date(todo["due_date_&_time"]);
      return dueDate < now;
    });
  }

  /**
   * Check if user has any incomplete tasks
   */
  async hasIncompleteTasks(): Promise<boolean> {
    const todos = await this.getToDoItems();
    return todos.some(todo => !todo.is_complete);
  }

  /**
   * Generate motivational message for task based on progress
   */
  getTaskMotivationalMessage(task: ToDoItem, username?: string): {
    title: string;
    body: string;
  } {
    const addressUser = username ? `${username}, ` : '';
    const progress = task.progress || 0;

    // Not started (0%)
    if (progress === 0) {
      return {
        title: 'Ready to Get Started? 🚀',
        body: `${addressUser}${task.title} is waiting for you! Starting now will help you build momentum. You've got this!`,
      };
    }

    // Just started (1-25%)
    if (progress < 25) {
      return {
        title: 'Great Start! ✨',
        body: `${addressUser}keep that momentum going on ${task.title}! You're off to a good beginning.`,
      };
    }

    // Making progress (25-50%)
    if (progress < 50) {
      return {
        title: 'Halfway There! 💪',
        body: `${addressUser}you're doing awesome on ${task.title}! You're over 1/4 of the way through.`,
      };
    }

    // More than halfway (50-75%)
    if (progress < 75) {
      return {
        title: 'Almost Halfway! 🎯',
        body: `${addressUser}${task.title} is taking shape! You're past the midpoint – keep pushing!`,
      };
    }

    // Almost done (75-99%)
    if (progress < 100) {
      return {
        title: 'So Close! 🏁',
        body: `${addressUser}you're nearly there on ${task.title}! Just a little more and you'll cross the finish line.`,
      };
    }

    // Completed (shouldn't happen but just in case)
    return {
      title: '🎉 Task Complete!',
      body: `${addressUser}amazing work on ${task.title}! You did it!`,
    };
  }

  /**
   * Generate deadline reminder message
   */
  getDeadlineReminderMessage(
    task: ToDoItem,
    daysUntilDue: number,
    username?: string
  ): { title: string; body: string } {
    const addressUser = username ? `${username}, ` : '';

    if (daysUntilDue === 0) {
      return {
        title: '⏰ Due Today!',
        body: `${addressUser}${task.title} is due today! Time to bring it home!`,
      };
    }

    if (daysUntilDue === 1) {
      return {
        title: '⏱️ Due Tomorrow',
        body: `${addressUser}${task.title} is due tomorrow! Get ready to finish strong!`,
      };
    }

    if (daysUntilDue === 7) {
      return {
        title: '📅 One Week Left',
        body: `${addressUser}${task.title} is due in one week. Perfect time to plan your approach!`,
      };
    }

    return {
      title: '📋 Coming Up',
      body: `${addressUser}don't forget about ${task.title}! Due in ${daysUntilDue} days.`,
    };
  }

  /**
   * Generate overdue reminder message
   */
  getOverdueReminderMessage(task: ToDoItem, username?: string): {
    title: string;
    body: string;
  } {
    const addressUser = username ? `${username}, ` : '';
    const daysOverdue = Math.floor(
      (Date.now() - new Date(task["due_date_&_time"] || Date.now()).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      title: '⚠️ Task Overdue',
      body: `${addressUser}${task.title} is ${daysOverdue} day${
        daysOverdue === 1 ? '' : 's'
      } overdue. Let's get it done!`,
    };
  }

  /**
   * Generate no tasks motivational message
   */
  getNoTasksMotivationalMessage(username?: string): {
    title: string;
    body: string;
  } {
    const addressUser = username ? `${username}, ` : '';
    const messages = [
      {
        title: '✨ No Tasks? Great Job!',
        body: `${addressUser}you're all caught up! Time to relax or add a new goal to work towards.`,
      },
      {
        title: '🌟 Clear Slate!',
        body: `${addressUser}no tasks on your list! How about creating one to keep yourself moving forward?`,
      },
      {
        title: '🎯 Ready for a Challenge?',
        body: `${addressUser}you've finished everything! Add a new task and keep that momentum going!`,
      },
      {
        title: '💡 Time to Dream Big',
        body: `${addressUser}all clear! What's something new you want to accomplish? Start here!`,
      },
      {
        title: '🚀 Onward and Upward',
        body: `${addressUser}no pending tasks – perfect moment to plan your next big move!`,
      },
    ];

    // Return a random message for variety
    return messages[Math.floor(Math.random() * messages.length)];
  }
}

export const todoService = new TodoService();
export default todoService;
