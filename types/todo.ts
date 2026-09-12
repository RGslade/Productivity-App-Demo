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

export const ToDoTypes = ['123', '%', 'Abc', 'âœ“ / âœ•', 'Â£$â‚¬'] as const;
export type ToDoMeasurementType = typeof ToDoTypes[number];

/** Maps legacy stored measurement labels to the current compact labels. */
export function normalizeToDoMeasurementType(value: string): ToDoMeasurementType {
  switch (value) {
    case 'Numerical': return '123';
    case 'Percentage': return '%';
    case 'Text/non-quantifiable': return 'Abc';
    case 'Yes/No | True/False': return 'âœ“ / âœ•';
    default: return ToDoTypes.includes(value as ToDoMeasurementType) ? value as ToDoMeasurementType : '123';
  }
}

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
  checklist_items?: Array<Pick<ChecklistItem, 'is_complete'> & Partial<Pick<ChecklistItem, 'id' | 'text' | 'position'>>>;
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
