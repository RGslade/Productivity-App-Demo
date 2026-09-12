create or replace function public.current_user_info_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select id from public."Users_Info" where auth_user_id = auth.uid()
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_to_update text;
begin
  foreach table_to_update in array array[
    'AppConfig', 'Categories', 'ChatMessages', 'ChatbotReports', 'Conversations',
    'DashboardCustomizations', 'Documents', 'EducationGrades', 'Feedback', 'Fonts',
    'JobApplications', 'LifeNestMonthlyUsage', 'Notes', 'Notifications',
    'PremiumCategories', 'ToDoChecklistItems', 'ToDoItems', 'TransactionCategories',
    'Transactions', 'UserSettings_Account', 'UserSettings_ChatBot',
    'UserSettings_Display_&_Content', 'UserSettings_ToDo', 'UserSettings_Transactions',
    'Users_Info'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_to_update);
    execute format('drop trigger if exists set_updated_at on public.%I', table_to_update);
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = table_to_update
        and column_name = 'updated_at'
    ) then
      execute format('create trigger set_updated_at before update on public.%I for each row execute function public.touch_updated_at()', table_to_update);
    end if;
  end loop;
end $$;

create policy "Authenticated users can read app config"
on public."AppConfig" for select to authenticated using (true);

create policy "Authenticated users can read categories"
on public."Categories" for select to authenticated using (true);

create policy "Authenticated users can manage categories in demo"
on public."Categories" for all to authenticated using (true) with check (true);

create policy "Authenticated users can read premium categories"
on public."PremiumCategories" for select to authenticated using (true);

create policy "Authenticated users can read transaction categories"
on public."TransactionCategories" for select to authenticated using (true);

create policy "Authenticated users can read fonts"
on public."Fonts" for select to authenticated using (true);

create policy "Authenticated users can read documents"
on public."Documents" for select to authenticated using (true);

create policy "Authenticated users can manage demo documents"
on public."Documents" for all to authenticated using (true) with check (true);

create policy "Users can read own profile"
on public."Users_Info" for select to authenticated
using (auth_user_id = auth.uid());

create policy "Users can insert own profile"
on public."Users_Info" for insert to authenticated
with check (auth_user_id = auth.uid());

create policy "Users can update own profile"
on public."Users_Info" for update to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

create policy "Users can manage own account settings"
on public."UserSettings_Account" for all to authenticated
using (user_id = public.current_user_info_id())
with check (user_id = public.current_user_info_id());

create policy "Users can manage own display settings"
on public."UserSettings_Display_&_Content" for all to authenticated
using (user_id = public.current_user_info_id())
with check (user_id = public.current_user_info_id());

create policy "Users can manage own todo settings"
on public."UserSettings_ToDo" for all to authenticated
using (user_id = public.current_user_info_id())
with check (user_id = public.current_user_info_id());

create policy "Users can manage own transaction settings"
on public."UserSettings_Transactions" for all to authenticated
using (user_id = public.current_user_info_id())
with check (user_id = public.current_user_info_id());

create policy "Users can manage own chatbot settings"
on public."UserSettings_ChatBot" for all to authenticated
using (user_id = public.current_user_info_id())
with check (user_id = public.current_user_info_id());

create policy "Users can manage own dashboard customization"
on public."DashboardCustomizations" for all to authenticated
using (user_id = public.current_user_info_id())
with check (user_id = public.current_user_info_id());

create policy "Users can manage own todos"
on public."ToDoItems" for all to authenticated
using (user_id = public.current_user_info_id())
with check (user_id = public.current_user_info_id());

create policy "Users can manage own checklist items"
on public."ToDoChecklistItems" for all to authenticated
using (user_id = public.current_user_info_id())
with check (user_id = public.current_user_info_id());

create policy "Users can manage own transactions"
on public."Transactions" for all to authenticated
using (user_id = public.current_user_info_id())
with check (user_id = public.current_user_info_id());

create policy "Users can manage own notes"
on public."Notes" for all to authenticated
using (user_id = public.current_user_info_id())
with check (user_id = public.current_user_info_id());

create policy "Users can manage own education grades"
on public."EducationGrades" for all to authenticated
using (user_id = public.current_user_info_id())
with check (user_id = public.current_user_info_id());

create policy "Users can manage own job applications"
on public."JobApplications" for all to authenticated
using (user_id = public.current_user_info_id())
with check (user_id = public.current_user_info_id());

create policy "Users can manage own notifications"
on public."Notifications" for all to authenticated
using (user_id = public.current_user_info_id())
with check (user_id = public.current_user_info_id());

create policy "Users can manage own LifeNest usage"
on public."LifeNestMonthlyUsage" for all to authenticated
using (user_id = public.current_user_info_id())
with check (user_id = public.current_user_info_id());

create policy "Users can manage own conversations"
on public."Conversations" for all to authenticated
using (user_id = public.current_user_info_id())
with check (user_id = public.current_user_info_id());

create policy "Users can manage messages in own conversations"
on public."ChatMessages" for all to authenticated
using (
  exists (
    select 1 from public."Conversations"
    where "Conversations".id = "ChatMessages".conversation_id
      and "Conversations".user_id = public.current_user_info_id()
  )
)
with check (
  exists (
    select 1 from public."Conversations"
    where "Conversations".id = "ChatMessages".conversation_id
      and "Conversations".user_id = public.current_user_info_id()
  )
);

create policy "Users can manage own chatbot reports"
on public."ChatbotReports" for all to authenticated
using (user_id = public.current_user_info_id())
with check (user_id = public.current_user_info_id());

create policy "Users can insert feedback"
on public."Feedback" for insert to authenticated
with check (user_id is null or user_id = public.current_user_info_id());

create policy "Users can read own feedback"
on public."Feedback" for select to authenticated
using (user_id = public.current_user_info_id());

create or replace function public.ensure_default_categories()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public."Categories" (name)
  values ('Personal'), ('Work'), ('Finance'), ('Health'), ('Moving Out')
  on conflict (name) do nothing;
end;
$$;

grant execute on function public.ensure_default_categories() to authenticated;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile_id bigint := public.current_user_info_id();
  auth_id uuid := auth.uid();
begin
  if profile_id is null or auth_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from public."Users_Info" where id = profile_id and auth_user_id = auth_id;
  delete from auth.users where id = auth_id;
end;
$$;

grant execute on function public.delete_my_account() to authenticated;
