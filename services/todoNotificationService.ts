import { todoService } from './todoService';
import { sendLocalNotification } from '@/hooks/NotificationHandler';
import { BrandColours } from '@/constants/Colours';
import { settingsService } from './settingsService';
import databaseService from './databaseService';
import { ToDoItem } from '@/types/todo';
import { UserSettingsToDo } from '@/types/settings';

class TodoNotificationService {
  /**
   * Main handler for background todo notifications
   * Call this from the background task
   */
  async handleBackgroundNotifications(userId: number, username: string): Promise<void> {
    try {
      // Check if user has any incomplete tasks
      const todos = await todoService.getToDoItems();
      const hasIncomplete = todos.some(todo => !todo.is_complete);

      if (!hasIncomplete) {
        // No incomplete tasks - send motivational "no tasks" notification
        await this.checkAndSendNoTasksNotification(userId, username);
        return;
      }

      // User has incomplete tasks - send deadline reminders
      await this.checkAndSendDeadlineReminders(userId, username);
      await this.checkAndSendOneWeekReminders(userId, username);
      await this.checkAndSendOverdueReminders(userId, username);
    } catch (error) {
      console.error('[TodoNotifications] Error in handleBackgroundNotifications:', error);
    }
  }

  /**
   * Check and send "no tasks" notification every 10 days
   */
  private async checkAndSendNoTasksNotification(userId: number, username: string): Promise<void> {
    try {
      // Get the last time we sent this notification
      const todoSettings = await settingsService.getToDoSettings();
      // const todos = await todoService.getToDoItems();
      // if (todos.length === 0) return; // No todos at all, don't notify --wth??? the whole point of this is that IF there are no todos, then you DO notify

      const lastNoTasksNotification = todoSettings.last_notification_no_tasks_sent;
      const now = new Date();

      // Check if 10 days have passed since last notification
      if (lastNoTasksNotification) {
        const lastNotificationDate = new Date(lastNoTasksNotification);
        const daysSinceLastNotification = Math.floor(
          (now.getTime() - lastNotificationDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastNotification < 10) {
          return;
        }
      }

      // Send the notification
      const message = todoService.getNoTasksMotivationalMessage(username);
      await sendLocalNotification(message.title, message.body, {
        type: 'no_tasks',
        color: BrandColours.notificationEncouragement,
      });

      // Update the timestamp on all todos for this user
      await this.updateNotificationTimestamp(userId, 'last_notification_no_tasks_sent');
    } catch (error) {
      console.error('[TodoNotifications] Error in checkAndSendNoTasksNotification:', error);
    }
  }

  /**
   * Check and send deadline reminders (1 day before & day of)
   */
  private async checkAndSendDeadlineReminders(userId: number, username: string): Promise<void> {
    try {
      // Get tasks due tomorrow
      const tasksDueTomorrow = await todoService.getTasksDueTomorrow();
      const dueTomorrowEligibleTasks: typeof tasksDueTomorrow = [];
      const now = new Date();

      for (const task of tasksDueTomorrow) {
        const lastSent = task.last_deadline_reminder_sent
          ? new Date(task.last_deadline_reminder_sent)
          : null;

        // Only send once per task per day
        if (lastSent && lastSent.toDateString() === now.toDateString()) {
          continue;
        }

        dueTomorrowEligibleTasks.push(task);
      }

      if (dueTomorrowEligibleTasks.length >= 3) {
        await sendLocalNotification(
          'Tasks Due Tomorrow',
          `You have ${dueTomorrowEligibleTasks.length} tasks due tomorrow.`,
          {
            type: 'deadline_reminder_grouped',
            daysUntilDue: 1,
            taskCount: dueTomorrowEligibleTasks.length,
            color: BrandColours.notificationDeadline,
          }
        );

        for (const task of dueTomorrowEligibleTasks) {
          await this.updateTaskNotificationTimestamp(task.id, 'last_deadline_reminder_sent');
        }
      } else {
        for (const task of dueTomorrowEligibleTasks) {
          const message = todoService.getDeadlineReminderMessage(task, 1, username);
          await sendLocalNotification(`Due Tomorrow: ${task.title}`, message.body, {
            type: 'deadline_reminder',
            taskId: task.id,
            daysUntilDue: 1,
            color: BrandColours.notificationDeadline,
          });

          // Update timestamp for this specific task
          await this.updateTaskNotificationTimestamp(task.id, 'last_deadline_reminder_sent');
        }
      }

      // Get tasks due today
      const tasksDueToday = await todoService.getTasksDueToday();
      const dueTodayEligibleTasks: typeof tasksDueToday = [];

      for (const task of tasksDueToday) {
        const lastSent = task.last_deadline_reminder_sent
          ? new Date(task.last_deadline_reminder_sent)
          : null;

        // Only send once per task per day
        if (lastSent && lastSent.toDateString() === now.toDateString()) {
          continue;
        }

        dueTodayEligibleTasks.push(task);
      }

      if (dueTodayEligibleTasks.length >= 3) {
        await sendLocalNotification(
          'Tasks Due Today',
          `You have ${dueTodayEligibleTasks.length} tasks due today.`,
          {
            type: 'deadline_reminder_grouped',
            daysUntilDue: 0,
            taskCount: dueTodayEligibleTasks.length,
            color: BrandColours.notificationOverdue,
          }
        );

        for (const task of dueTodayEligibleTasks) {
          await this.updateTaskNotificationTimestamp(task.id, 'last_deadline_reminder_sent');
        }
      } else {
        for (const task of dueTodayEligibleTasks) {
          const message = todoService.getDeadlineReminderMessage(task, 0, username);
          await sendLocalNotification(`Due Today: ${task.title}`, message.body, {
            type: 'deadline_reminder',
            taskId: task.id,
            daysUntilDue: 0,
            color: BrandColours.notificationOverdue,
          });

          // Update timestamp for this specific task
          await this.updateTaskNotificationTimestamp(task.id, 'last_deadline_reminder_sent');
        }
      }
    } catch (error) {
      console.error('[TodoNotifications] Error in checkAndSendDeadlineReminders:', error);
    }
  }

  /**
   * Check and send "one week before deadline" reminders
   */
  private async checkAndSendOneWeekReminders(userId: number, username: string): Promise<void> {
    try {
      const tasksDueInOneWeek = await todoService.getTasksDueInOneWeek();

      for (const task of tasksDueInOneWeek) {
        const lastSent = task.last_one_week_reminder_sent
          ? new Date(task.last_one_week_reminder_sent)
          : null;
        const now = new Date();

        // Only send once per task per day
        if (lastSent && lastSent.toDateString() === now.toDateString()) {
          continue;
        }

        const message = todoService.getDeadlineReminderMessage(task, 7, username);
        await sendLocalNotification(`Due In One Week: ${task.title}`, message.body, {
          type: 'one_week_reminder',
          taskId: task.id,
          color: BrandColours.notificationMotivational,
        });

        // Update timestamp for this specific task
        await this.updateTaskNotificationTimestamp(task.id, 'last_one_week_reminder_sent');
      }
    } catch (error) {
      console.error('[TodoNotifications] Error in checkAndSendOneWeekReminders:', error);
    }
  }

  /**
   * Check and send overdue task reminders every 3 days
   */
  private async checkAndSendOverdueReminders(userId: number, username: string): Promise<void> {
    try {
      const overdueTasksWithReminders = await todoService.getOverdueTasksWithReminders();

      if (overdueTasksWithReminders.length === 0) return;

      const eligibleTasks: typeof overdueTasksWithReminders = [];
      const now = new Date();

      for (const task of overdueTasksWithReminders) {
        if (!task["due_date_&_time"]) continue;

        const dueDate = new Date(task["due_date_&_time"]);
        const daysOverdue = Math.floor(
          (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Only notify exactly 1 day overdue and 3 days overdue.
        if (daysOverdue !== 1 && daysOverdue !== 3) {
          continue;
        }

        const lastSent = task.last_overdue_reminder_sent
          ? new Date(task.last_overdue_reminder_sent)
          : null;

        // Ensure one send per overdue milestone day.
        if (lastSent) {
          const lastSentOverdueDays = Math.floor(
            (lastSent.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (lastSentOverdueDays === daysOverdue) {
            continue;
          }
        }

        eligibleTasks.push(task);
      }

      if (eligibleTasks.length === 0) return;

      if (eligibleTasks.length > 1) {
        await sendLocalNotification(
          'Overdue Tasks Reminder',
          `You have ${eligibleTasks.length} tasks overdue.`,
          {
            type: 'overdue_reminder_grouped',
            taskCount: eligibleTasks.length,
            color: BrandColours.notificationOverdue,
          }
        );

        for (const task of eligibleTasks) {
          await this.updateTaskNotificationTimestamp(task.id, 'last_overdue_reminder_sent');
        }
      } else {
        const task = eligibleTasks[0];
        const message = todoService.getOverdueReminderMessage(task, username);
        await sendLocalNotification(`Overdue: ${task.title}`, message.body, {
          type: 'overdue_reminder',
          taskId: task.id,
          color: BrandColours.notificationOverdue,
        });

        // Update timestamp for this specific task
        await this.updateTaskNotificationTimestamp(task.id, 'last_overdue_reminder_sent');
      }
    } catch (error) {
      console.error('[TodoNotifications] Error in checkAndSendOverdueReminders:', error);
    }
  }

  /**
   * Update notification timestamp for all user tasks
   */
  private async updateNotificationTimestamp(
    userId: number,
    columnName:
      | 'last_notification_no_tasks_sent'
      | 'last_deadline_reminder_sent'
      | 'last_one_week_reminder_sent'
      | 'last_overdue_reminder_sent'
  ): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Update all todos for this user
      if (columnName === 'last_notification_no_tasks_sent') {
        await databaseService.updateTable<UserSettingsToDo>("UserSettings_ToDo", { [columnName]: now });
        return;
      }
      const { error } = await databaseService.updateTable<ToDoItem>("ToDoItems", { [columnName]: now });

      if (error) {
        console.error(
          `[TodoNotifications] Error updating ${columnName}:`,
          error
        );
      }
    } catch (error) {
      console.error('[TodoNotifications] Error in updateNotificationTimestamp:', error);
    }
  }

  /**
   * Update notification timestamp for a specific task
   */
  private async updateTaskNotificationTimestamp(
    taskId: number,
    columnName:
      | 'last_notification_no_tasks_sent'
      | 'last_deadline_reminder_sent'
      | 'last_one_week_reminder_sent'
      | 'last_overdue_reminder_sent'
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      if (columnName === 'last_notification_no_tasks_sent') {
        await databaseService.updateTable<UserSettingsToDo>("UserSettings_ToDo", { [columnName]: now });
        return;
      }
      const { error } = await databaseService.updateTable<ToDoItem>("ToDoItems", { [columnName]: now }, undefined, 'id', taskId);

      if (error) {
        console.error(`[TodoNotifications] Error updating task ${columnName}:`, error);
      }
    } catch (error) {
      console.error('[TodoNotifications] Error in updateTaskNotificationTimestamp:', error);
    }
  }
}

export const todoNotificationService = new TodoNotificationService();
export default todoNotificationService;
