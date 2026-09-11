alter table public."Transactions"
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurrence_frequency text check (recurrence_frequency in ('weekly', 'monthly')),
  add column if not exists recurrence_next_due_date date,
  add column if not exists recurrence_end_date date,
  add column if not exists recurring_source_transaction_id bigint references public."Transactions"(id) on delete cascade;

create index if not exists transactions_recurring_sources_idx
  on public."Transactions"(user_id, is_recurring, recurrence_next_due_date)
  where is_recurring = true;

create unique index if not exists transactions_recurring_source_due_unique
  on public."Transactions"(recurring_source_transaction_id, recurrence_due_date)
  where recurring_source_transaction_id is not null and recurrence_due_date is not null;


