create extension if not exists pgcrypto with schema extensions;

create table if not exists public."AppConfig" (
  id bigint generated always as identity primary key,
  key text not null unique,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public."Categories" (
  id bigint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public."PremiumCategories" (
  id bigint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public."TransactionCategories" (
  id bigint generated always as identity primary key,
  name text not null,
  transaction_type text not null check (transaction_type in ('Income', 'Expense')),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (name, transaction_type)
);

create table if not exists public."Fonts" (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name varchar not null unique,
  display_name varchar not null unique,
  updated_at timestamptz
);

create table if not exists public."Documents" (
  id bigint generated always as identity primary key,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  content text,
  file_name text not null unique,
  description text not null
);

create table if not exists public."Users_Info" (
  id bigint generated always as identity primary key,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  first_name text,
  middle_names text,
  surname text,
  address_line_1 text,
  address_line_2 text,
  city text,
  county text,
  country text,
  postcode text,
  ethnicity text,
  primary_phone_number numeric,
  descending_access_level smallint not null default 1,
  birth_date date,
  living_situation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  job_status text,
  is_premium_user boolean not null default false,
  universal_credit boolean not null default false,
  subscription_provider text,
  subscription_product_id text,
  subscription_status text default 'inactive',
  terms_accepted boolean not null default false,
  terms_accepted_at timestamptz,
  terms_version_accepted text,
  privacy_policy_accepted boolean default false,
  privacy_policy_accepted_at timestamptz,
  privacy_policy_version_accepted text,
  lifenest_terms_accepted boolean default false,
  lifenest_terms_accepted_at timestamptz,
  lifenest_terms_version_accepted text
);

create table if not exists public."DashboardCustomizations" (
  id bigint generated always as identity primary key,
  user_id bigint not null unique references public."Users_Info"(id) on delete cascade,
  layout_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public."EducationGrades" (
  id bigint generated always as identity primary key,
  user_id bigint not null references public."Users_Info"(id) on delete cascade,
  qualification_type text not null,
  grade text not null,
  institution_name text,
  date_achieved date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  subject text not null check (btrim(subject) <> '')
);

create table if not exists public."Feedback" (
  id bigint generated always as identity primary key,
  user_id bigint references public."Users_Info"(id) on delete set null,
  feedback_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  subject text not null default '',
  category text not null default ''
);

create table if not exists public."JobApplications" (
  id bigint generated always as identity primary key,
  user_id bigint not null references public."Users_Info"(id) on delete cascade,
  job_id text not null,
  title text not null,
  company text not null,
  location text,
  source text,
  application_url text,
  applied_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public."LifeNestMonthlyUsage" (
  id bigint generated always as identity primary key,
  user_id bigint not null unique references public."Users_Info"(id) on delete cascade,
  period_key text,
  period_start timestamptz,
  period_end timestamptz,
  monthly_token_allowance bigint not null default 0,
  monthly_tokens_used bigint not null default 0,
  purchased_tokens_balance bigint not null default 0,
  purchased_tokens_used bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public."Notes" (
  id bigint generated always as identity primary key,
  user_id bigint not null references public."Users_Info"(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  title text not null default 'Untitled note'
);

create table if not exists public."Notifications" (
  id bigint generated always as identity primary key,
  user_id bigint not null references public."Users_Info"(id) on delete cascade,
  push_token varchar not null,
  platform varchar not null,
  created_at timestamptz not null default now(),
  updated_at timestamp
);

create table if not exists public."ToDoItems" (
  id bigint generated always as identity primary key,
  user_id bigint not null references public."Users_Info"(id) on delete cascade,
  category_id bigint references public."Categories"(id) on delete set null,
  title text not null,
  description text not null,
  "due_date_&_time" timestamptz,
  is_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  progress numeric not null default 0,
  remind_me boolean not null default false,
  type varchar not null default 'Numeric',
  unit varchar,
  last_deadline_reminder_sent timestamptz,
  last_one_week_reminder_sent timestamptz,
  last_overdue_reminder_sent timestamptz,
  premium_category_id bigint references public."PremiumCategories"(id) on delete set null,
  item_kind text not null default 'task' check (item_kind in ('task', 'checklist'))
);

create table if not exists public."ToDoChecklistItems" (
  id bigint generated always as identity primary key,
  todo_id bigint not null references public."ToDoItems"(id) on delete cascade,
  user_id bigint not null references public."Users_Info"(id) on delete cascade,
  text text not null,
  is_complete boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public."Transactions" (
  id bigint generated always as identity primary key,
  user_id bigint not null references public."Users_Info"(id) on delete cascade,
  title text not null,
  description text,
  amount numeric not null,
  due_date date not null,
  type text not null check (type in ('Income', 'Expense')),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  category_id bigint references public."TransactionCategories"(id) on delete set null
);

create table if not exists public."UserSettings_Account" (
  id bigint generated always as identity primary key,
  user_id bigint not null unique references public."Users_Info"(id) on delete cascade,
  notifications_enabled boolean default true,
  language text default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  session_timeout bigint not null default 10080
);

create table if not exists public."UserSettings_ChatBot" (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  preferred_model text default 'None',
  background_colour text not null default '#FFFFFF',
  user_id bigint not null unique references public."Users_Info"(id) on delete cascade
);

create table if not exists public."UserSettings_Display_&_Content" (
  id bigint generated always as identity primary key,
  user_id bigint not null unique references public."Users_Info"(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  theme text not null default 'system',
  default_font varchar not null default 'Arial'
);

create table if not exists public."UserSettings_ToDo" (
  id bigint generated always as identity primary key,
  user_id bigint not null unique references public."Users_Info"(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  todo_soon_determiner bigint not null default 7,
  last_notification_no_tasks_sent timestamptz
);

create table if not exists public."UserSettings_Transactions" (
  id bigint generated always as identity primary key,
  user_id bigint not null unique references public."Users_Info"(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  preferred_currency text not null default 'Â£' check (preferred_currency in ('Â£', '$', 'â‚¬', 'Â¥', 'â‚¹', 'â‚¦', 'â‚©', 'â‚º', 'â‚½', 'à¸¿', 'â‚«', 'â‚±', 'â‚ª', 'R$', 'C$', 'A$', 'NZ$', 'S$', 'HK$', 'Mex$', 'Fr', 'kr', 'zÅ‚', 'KÄ', 'R', 'Ø¯.Ø¥', 'Ø±.Ø³', 'Ø±.Ù‚'))
);

create table if not exists public."Conversations" (
  user_id bigint not null references public."Users_Info"(id) on delete cascade,
  openai_conversation_id text not null unique,
  title text,
  model text not null,
  last_response_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  id bigint generated always as identity primary key
);

create table if not exists public."ChatMessages" (
  id bigint generated always as identity primary key,
  message text not null default '',
  created_at timestamptz not null default now(),
  was_edited boolean not null default false,
  updated_at timestamp,
  is_user_message boolean not null default false,
  conversation_id bigint not null references public."Conversations"(id) on delete cascade
);

create table if not exists public."ChatbotReports" (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id bigint not null references public."Users_Info"(id) on delete cascade,
  reason text not null default '',
  details text not null default '',
  message_id bigint not null unique references public."ChatMessages"(id) on delete cascade
);

create index if not exists categories_name_idx on public."Categories"(name);
create index if not exists todoitems_user_due_idx on public."ToDoItems"(user_id, "due_date_&_time");
create index if not exists checklist_todo_position_idx on public."ToDoChecklistItems"(todo_id, position);
create index if not exists transactions_user_due_idx on public."Transactions"(user_id, due_date);
create index if not exists notes_user_updated_idx on public."Notes"(user_id, updated_at desc);
create index if not exists conversations_user_updated_idx on public."Conversations"(user_id, updated_at desc);
create index if not exists chatmessages_conversation_created_idx on public."ChatMessages"(conversation_id, created_at);
create index if not exists users_info_auth_user_idx on public."Users_Info"(auth_user_id);


