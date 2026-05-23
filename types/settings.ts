import { ThemeMode } from "./theme";

//
export interface UserSettingsAccount {
  id: string;
  user_id: string;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
  session_timeout: number;
}

//
export interface UserSettingsDisplay {
  id: string;
  user_id: string;
  theme: ThemeMode;
  default_font: string;
  created_at: string;
  updated_at: string;
}

//
export interface UserSettingsToDo {
  id: string;
  user_id: string;
  todo_soon_determiner: number;
  created_at: string;
  updated_at: string;
  last_notification_no_tasks_sent?: string;
}

//
export interface UserSettingsTransactions {
  id: string;
  user_id: string;
  preferred_currency: string;
  created_at: string;
  updated_at: string;
}

//
export interface UserSettingsChatBot {
  id: string;
  user_id: string;
  preferred_model: string;
  background_colour: string;
  created_at: string;
  updated_at: string;
}

//
export interface AllSettings {
  account: UserSettingsAccount;
  display: UserSettingsDisplay;
  todo: UserSettingsToDo;
  transactions: UserSettingsTransactions;
  chatBot: UserSettingsChatBot;
}

// Theme enum for consistency
//
export enum AppTheme {
  System = 'system',
  Light = 'light',
  Dark = 'dark'
}

//
export type SettingsSection = 'profile' | 'appearance' | 'dashboard' | 'transactions' | 'lifenest' | 'account' | 'chatBot' | 'subscription' | null;
