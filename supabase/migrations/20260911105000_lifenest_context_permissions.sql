alter table public."UserSettings_ChatBot"
  add column if not exists grades_context_enabled boolean not null default true,
  add column if not exists transactions_context_enabled boolean not null default true,
  add column if not exists todos_context_enabled boolean not null default true,
  add column if not exists checklists_context_enabled boolean not null default true;

update public."UserSettings_ChatBot"
set grades_context_enabled = coalesce(grades_context_enabled, true),
    transactions_context_enabled = coalesce(transactions_context_enabled, true),
    todos_context_enabled = coalesce(todos_context_enabled, true),
    checklists_context_enabled = coalesce(checklists_context_enabled, true);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['UserSettings_ChatBot', 'EducationGrades', 'Transactions', 'ToDoItems', 'ToDoChecklistItems'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "LifeNest context own rows" on public.%I', table_name);
    execute format($policy$
      create policy "LifeNest context own rows" on public.%I
      for all to authenticated
      using (user_id in (select id from public."Users_Info" where auth_user_id = auth.uid()))
      with check (user_id in (select id from public."Users_Info" where auth_user_id = auth.uid()))
    $policy$, table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end $$;


