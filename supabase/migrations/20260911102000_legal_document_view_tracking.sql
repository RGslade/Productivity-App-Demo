ALTER TABLE public.Users_Info
  ADD COLUMN IF NOT EXISTS terms_viewed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS terms_version_viewed text,
  ADD COLUMN IF NOT EXISTS privacy_policy_viewed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS privacy_policy_version_viewed text,
  ADD COLUMN IF NOT EXISTS lifenest_terms_viewed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS lifenest_terms_version_viewed text;


