insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo@example.com',
  extensions.crypt('DemoPass123!', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"first_name":"Demo","surname":"Reviewer"}'::jsonb
)
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  updated_at = now();

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'demo@example.com',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"demo@example.com","email_verified":true}'::jsonb,
  'email',
  now(),
  now(),
  now()
)
on conflict (provider, provider_id) do update set updated_at = now();

insert into public."AppConfig" (key, value) values
  ('terms_version', 'demo-2026-05'),
  ('privacy_policy_version', 'demo-2026-05'),
  ('lifenest_terms_version', 'demo-2026-05'),
  ('minimum_supported_version', '1.0.0'),
  ('latest_available_version', '1.0.0'),
  ('maintenance_mode', 'false')
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into public."Categories" (name) values
  ('Personal'),
  ('Work'),
  ('Finance'),
  ('Health'),
  ('Moving Out')
on conflict (name) do nothing;

insert into public."PremiumCategories" (name) values
  ('Moving Out'),
  ('Career Planning'),
  ('Home Setup')
on conflict (name) do nothing;

insert into public."TransactionCategories" (name, transaction_type) values
  ('Salary', 'Income'),
  ('Universal Credit', 'Income'),
  ('Rent', 'Expense'),
  ('Groceries', 'Expense'),
  ('Transport', 'Expense'),
  ('Savings', 'Expense')
on conflict (name, transaction_type) do nothing;

insert into public."Fonts" (name, display_name) values
  ('Arial', 'Arial'),
  ('System', 'System Default'),
  ('Inter', 'Inter')
on conflict (name) do nothing;

insert into public."Documents" (title, file_name, description, content) values
  (
    'Moving Out Starter Checklist',
    'moving-out-starter-checklist.md',
    'A practical checklist for preparing to move into independent accommodation.',
    E'# Moving Out Starter Checklist\n\nUse this guide to plan the first stages of moving out.\n\n## Before applying\n\n- Estimate rent, deposit, bills, council tax, food, transport, and emergency savings.\n- Gather ID, proof of income, references, and recent bank statements.\n- Check travel time to work, education, healthcare, and support networks.\n\n## Before signing\n\n- Read the tenancy agreement carefully.\n- Confirm what is included in the rent.\n- Photograph the property condition and keep copies of all documents.\n\n## First month\n\n- Register utilities and broadband where required.\n- Update addresses for bank, employer, GP, education provider, and subscriptions.\n- Build a small buffer for unexpected costs.'
  ),
  (
    'Monthly Budget Planning Notes',
    'monthly-budget-planning-notes.md',
    'A plain-English budget guide used by the demo documents screen.',
    E'# Monthly Budget Planning Notes\n\nStart with guaranteed income, then list fixed bills before flexible spending.\n\n## Useful categories\n\n- Income: salary, benefits, refunds, grants.\n- Fixed expenses: rent, bills, insurance, phone, transport pass.\n- Flexible expenses: groceries, travel, clothing, subscriptions, social spending.\n- Planning: savings, emergency fund, debt repayments.\n\nReview transactions weekly so the monthly total does not become a surprise.'
  )
on conflict (file_name) do update set
  title = excluded.title,
  description = excluded.description,
  content = excluded.content,
  updated_at = now();

insert into public."Users_Info" (
  id,
  auth_user_id,
  first_name,
  middle_names,
  surname,
  address_line_1,
  address_line_2,
  city,
  county,
  country,
  postcode,
  ethnicity,
  primary_phone_number,
  descending_access_level,
  birth_date,
  living_situation,
  job_status,
  is_premium_user,
  universal_credit,
  subscription_provider,
  subscription_product_id,
  subscription_status,
  terms_accepted,
  terms_accepted_at,
  terms_version_accepted,
  privacy_policy_accepted,
  privacy_policy_accepted_at,
  privacy_policy_version_accepted,
  lifenest_terms_accepted,
  lifenest_terms_accepted_at,
  lifenest_terms_version_accepted
) overriding system value values (
  1,
  '00000000-0000-0000-0000-000000000001',
  'Demo',
  null,
  'Reviewer',
  '12 Example Street',
  null,
  'Manchester',
  'Greater Manchester',
  'United Kingdom',
  'M1 1AE',
  null,
  7700900123,
  1,
  '2000-04-12',
  'Renting with family',
  'Employed',
  true,
  false,
  'google_play',
  'lifenest_plus_monthly',
  'active',
  true,
  now(),
  'demo-2026-05',
  true,
  now(),
  'demo-2026-05',
  true,
  now(),
  'demo-2026-05'
)
on conflict (auth_user_id) do update set
  first_name = excluded.first_name,
  surname = excluded.surname,
  updated_at = now();

select setval(pg_get_serial_sequence('public."Users_Info"', 'id'), greatest((select max(id) from public."Users_Info"), 1), true);

insert into public."UserSettings_Account" (user_id, notifications_enabled, language, session_timeout)
values (1, true, 'en', 10080)
on conflict (user_id) do update set notifications_enabled = excluded.notifications_enabled, updated_at = now();

insert into public."UserSettings_Display_&_Content" (user_id, theme, default_font)
values (1, 'system', 'Arial')
on conflict (user_id) do update set theme = excluded.theme, default_font = excluded.default_font, updated_at = now();

insert into public."UserSettings_ToDo" (user_id, todo_soon_determiner, last_notification_no_tasks_sent)
values (1, 7, null)
on conflict (user_id) do update set todo_soon_determiner = excluded.todo_soon_determiner, updated_at = now();

insert into public."UserSettings_Transactions" (user_id, preferred_currency)
values (1, '£')
on conflict (user_id) do update set preferred_currency = excluded.preferred_currency, updated_at = now();

insert into public."UserSettings_ChatBot" (user_id, preferred_model, background_colour)
values (1, 'gpt-4o-mini', '#FFFFFF')
on conflict (user_id) do update set preferred_model = excluded.preferred_model, background_colour = excluded.background_colour, updated_at = now();

insert into public."DashboardCustomizations" (user_id, layout_json)
values (1, '{"cards":["todos","budget","notes","grades","lifenest"],"hidden":[]}'::jsonb)
on conflict (user_id) do update set layout_json = excluded.layout_json, updated_at = now();

insert into public."LifeNestMonthlyUsage" (
  user_id,
  period_key,
  period_start,
  period_end,
  monthly_token_allowance,
  monthly_tokens_used,
  purchased_tokens_balance,
  purchased_tokens_used
)
values (1, '2026-05', '2026-05-01T00:00:00Z', '2026-05-31T23:59:59Z', 100000, 4250, 25000, 1000)
on conflict (user_id) do update set
  period_key = excluded.period_key,
  monthly_tokens_used = excluded.monthly_tokens_used,
  purchased_tokens_balance = excluded.purchased_tokens_balance,
  updated_at = now();

insert into public."ToDoItems" (
  id,
  user_id,
  category_id,
  title,
  description,
  "due_date_&_time",
  is_complete,
  progress,
  remind_me,
  type,
  unit,
  premium_category_id,
  item_kind
) overriding system value values
  (1, 1, (select id from public."Categories" where name = 'Moving Out'), 'Compare rental deposit costs', 'Check deposit, first month rent, and estimated moving costs before viewing properties.', now() + interval '5 days', false, 35, true, 'Percentage', '%', (select id from public."PremiumCategories" where name = 'Moving Out'), 'task'),
  (2, 1, (select id from public."Categories" where name = 'Finance'), 'Set up first-month budget', 'Prepare a budget with fixed bills, food, transport, and emergency savings.', now() + interval '10 days', false, 60, true, 'Numerical', '£', null, 'checklist'),
  (3, 1, (select id from public."Categories" where name = 'Personal'), 'Update CV and profile', 'Refresh CV with latest education and work experience.', now() - interval '2 days', true, 100, false, 'Percentage', '%', null, 'task')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  updated_at = now();

select setval(pg_get_serial_sequence('public."ToDoItems"', 'id'), greatest((select max(id) from public."ToDoItems"), 1), true);

insert into public."ToDoChecklistItems" (id, todo_id, user_id, text, is_complete, position)
overriding system value values
  (1, 2, 1, 'Add expected income', true, 1),
  (2, 2, 1, 'Add rent and bills', true, 2),
  (3, 2, 1, 'Add weekly groceries estimate', false, 3),
  (4, 2, 1, 'Set emergency savings target', false, 4)
on conflict (id) do update set
  text = excluded.text,
  is_complete = excluded.is_complete,
  position = excluded.position,
  updated_at = now();

select setval(pg_get_serial_sequence('public."ToDoChecklistItems"', 'id'), greatest((select max(id) from public."ToDoChecklistItems"), 1), true);

insert into public."Transactions" (user_id, title, description, amount, due_date, type, category_id) values
  (1, 'Monthly salary', 'Demo recurring income', 1850.00, '2026-05-28', 'Income', (select id from public."TransactionCategories" where name = 'Salary' and transaction_type = 'Income')),
  (1, 'Rent estimate', 'Target rent for moving-out planning', 725.00, '2026-05-01', 'Expense', (select id from public."TransactionCategories" where name = 'Rent' and transaction_type = 'Expense')),
  (1, 'Weekly groceries', 'Typical food shop', 55.00, '2026-05-08', 'Expense', (select id from public."TransactionCategories" where name = 'Groceries' and transaction_type = 'Expense')),
  (1, 'Bus pass', 'Monthly transport', 72.00, '2026-05-03', 'Expense', (select id from public."TransactionCategories" where name = 'Transport' and transaction_type = 'Expense'));

insert into public."Notes" (user_id, title, content) values
  (1, 'Viewing questions', 'Ask about council tax band, average utility costs, deposit protection, broadband options, and notice period.'),
  (1, 'Budget reminder', 'Review subscriptions before setting the final moving-out budget.');

insert into public."EducationGrades" (user_id, qualification_type, subject, grade, institution_name, date_achieved, notes) values
  (1, 'A Level', 'Mathematics', 'B', 'Demo Sixth Form College', '2018-08-16', 'Example academic record for reviewer data.'),
  (1, 'GCSE', 'English Language', '7', 'Demo High School', '2016-08-25', null);

insert into public."JobApplications" (user_id, job_id, title, company, location, source, application_url, applied_at) values
  (1, 'reed-demo-1001', 'Customer Support Assistant', 'Demo Employer Ltd', 'Manchester', 'reed', 'https://www.reed.co.uk/jobs/demo-1001', now() - interval '4 days');

insert into public."Notifications" (user_id, push_token, platform)
values (1, 'ExponentPushToken[demo-token]', 'android');

insert into public."Conversations" (id, user_id, openai_conversation_id, title, model, last_response_id)
overriding system value values
  (1, 1, 'demo-openai-conversation-1', 'Moving-out plan', 'gpt-4o-mini', 'demo-response-1')
on conflict (id) do update set title = excluded.title, updated_at = now();

select setval(pg_get_serial_sequence('public."Conversations"', 'id'), greatest((select max(id) from public."Conversations"), 1), true);

insert into public."ChatMessages" (id, conversation_id, message, was_edited, is_user_message)
overriding system value values
  (1, 1, 'Help me plan what to do before moving out.', false, true),
  (2, 1, 'Start with a realistic monthly budget, then collect documents, compare rents, and make a short list of areas that keep travel manageable.', false, false)
on conflict (id) do update set message = excluded.message, updated_at = now();

select setval(pg_get_serial_sequence('public."ChatMessages"', 'id'), greatest((select max(id) from public."ChatMessages"), 1), true);

insert into public."ChatbotReports" (user_id, reason, details, message_id)
values (1, 'demo_review', 'Example report row so the reporting flow has representative data.', 2)
on conflict (message_id) do update set reason = excluded.reason, details = excluded.details;

insert into public."Feedback" (user_id, subject, category, feedback_text) values
  (1, 'Demo feedback', 'General', 'This is seeded feedback data for local Supabase review.');
