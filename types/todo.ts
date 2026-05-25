import type { UserInfo } from './user';

export type ToDoItemKind = 'task' | 'checklist';

export interface ChecklistItem {
  id: number;
  todo_id: number;
  user_id: number;
  text: string;
  is_complete: boolean;
  position: number;
  created_at: string;
  updated_at?: string;
}

export interface ToDoItem {
  id: number; // bigint in DB
  created_at: string; // timestamp with time zone
  title: string;
  description: string;
  is_complete: boolean;
  "due_date_&_time": string | null; // timestamp without time zone - note the special column name
  category_id: number | null; // bigint
  premium_category_id?: number | null;
  user_id: number; // bigint
  progress: number; // float between 0 and 100
  item_kind?: ToDoItemKind;
  checklist_items?: ChecklistItem[];
  // Navigation properties
  category?: Category;
  user?: UserInfo;
  remind_me: boolean;
  unit?: string;
  type: string;
  last_deadline_reminder_sent?: string;
  last_one_week_reminder_sent?: string;
  last_overdue_reminder_sent?: string;
}

export const ToDoTypes = [
  'Numerical', 'Percentage', 'Text/non-quantifiable', 'Yes/No | True/False'
];

export interface Category {
  id: number; // bigint in DB
  created_at: string; // timestamp with time zone
  name: string; // unique constraint, max 100 chars
  // Navigation properties
  todos?: ToDoItem[];
}

export interface CreateToDoRequest {
  title: string;
  description: string;
  due_date_time?: string;
  category_id?: number | null;
  remind_me: boolean;
  unit?: string;
  type: string;
  premium_category_id?: number | null;
  item_kind?: ToDoItemKind;
  checklist_items?: string[];
}

export interface UpdateToDoRequest {
  title?: string;
  description?: string;
  is_complete?: boolean;
  due_date_time?: string;
  category_id?: number | null;
  remind_me?: boolean;
  unit?: string;
  progress?: number;
  premium_category_id?: number | null;
  checklist_items?: Array<Pick<ChecklistItem, 'id' | 'is_complete'>>;
  last_deadline_reminder_sent?: string;
  last_one_week_reminder_sent?: string;
  last_overdue_reminder_sent?: string;
}

export interface CreateCategoryRequest {
  name: string;
}

export interface UpdateCategoryRequest {
  name: string;
}

export interface TodoStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

export interface PremiumCategory {
  id: number;
  name: string;
  created_at: string;
  updated_at?: string;
}
