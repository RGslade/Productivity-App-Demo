import { EmploymentStatus } from '@/constants/employment';

export type JobStatus = EmploymentStatus;

export interface UserInfo {
  id: number; // bigint in DB
  first_name: string;
  middle_names?: string;
  surname: string;
  email_address: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  country?: string;
  postcode?: string;
  ethnicity?: string;
  primary_phone_number?: number; // numeric in DB
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
  descending_access_level: number; // smallint
  birth_date?: string; // date
  living_situation?: string;
  job_status?: JobStatus;
  is_premium_user: boolean;
  universal_credit?: boolean;
  subscription_provider?: "google_play" | "apple_iap" | null;
  subscription_product_id?: string | null;
  subscription_status?: "inactive" | "active" | "cancelled" | null;

  terms_accepted?: boolean;
  terms_accepted_at?: string | null;
  terms_version_accepted?: string | null;
  terms_viewed_at?: string | null;
  terms_version_viewed?: string | null;
  privacy_policy_accepted?: boolean;
  privacy_policy_accepted_at?: string | null;
  privacy_policy_version_accepted?: string | null;
  privacy_policy_viewed_at?: string | null;
  privacy_policy_version_viewed?: string | null;
  lifenest_terms_accepted?: boolean;
  lifenest_terms_accepted_at?: string | null;
  lifenest_terms_version_accepted?: string | null;
  lifenest_terms_viewed_at?: string | null;
  lifenest_terms_version_viewed?: string | null;
}

export interface UpdateProfileRequest {
  first_name?: string;
  middle_names?: string;
  surname?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  country?: string;
  postcode?: string;
  ethnicity?: string;
  primary_phone_number?: number;
  birth_date?: string;
  living_situation?: string;
  //email_address?: string; Don't want users changing email addresses for now
  job_status?: JobStatus;
  is_premium_user?: boolean;
  universal_credit?: boolean;
  subscription_provider?: "google_play" | "apple_iap" | null;
  subscription_product_id?: string | null;
  subscription_status?: "inactive" | "active" | "cancelled" | null;

  terms_accepted?: boolean;
  terms_accepted_at?: string | null;
  terms_version_accepted?: string | null;
  terms_viewed_at?: string | null;
  terms_version_viewed?: string | null;
  privacy_policy_accepted?: boolean;
  privacy_policy_accepted_at?: string | null;
  privacy_policy_version_accepted?: string | null;
  privacy_policy_viewed_at?: string | null;
  privacy_policy_version_viewed?: string | null;
  lifenest_terms_accepted?: boolean;
  lifenest_terms_accepted_at?: string | null;
  lifenest_terms_version_accepted?: string | null;
  lifenest_terms_viewed_at?: string | null;
  lifenest_terms_version_viewed?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AccountCompletionPrefill {
  email: string;
  first_name?: string;
  surname?: string;
  middle_names?: string;
  birth_date?: string;
  job_status?: JobStatus;
  terms_accepted?: boolean;
  privacy_policy_accepted?: boolean;
  lifenest_terms_accepted?: boolean;
  terms_viewed_at?: string | null;
  terms_version_viewed?: string | null;
  privacy_policy_viewed_at?: string | null;
  privacy_policy_version_viewed?: string | null;
  lifenest_terms_viewed_at?: string | null;
  lifenest_terms_version_viewed?: string | null;
}

export interface LoginResult {
  status: 'authenticated' | 'incomplete_profile';
  prefill?: AccountCompletionPrefill;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  surname: string;
  primaryPhoneNumber?: number;
  middleNames?: string;
  addressLine1?: string;
  city?: string;
  postcode?: string;
  birthDate?: string;
  living_situation?: string;
  job_status?: JobStatus;
  is_premium_user: boolean;
  universal_credit?: boolean;
  subscription_provider?: "google_play" | "apple_iap" | null;
  subscription_product_id?: string | null;
  subscription_status?: "inactive" | "active" | "cancelled" | null;

  terms_accepted?: boolean;
  terms_accepted_at?: string | null;
  terms_version_accepted?: string | null;
  terms_viewed_at?: string | null;
  terms_version_viewed?: string | null;
  privacy_policy_accepted?: boolean;
  privacy_policy_accepted_at?: string | null;
  privacy_policy_version_accepted?: string | null;
  privacy_policy_viewed_at?: string | null;
  privacy_policy_version_viewed?: string | null;
  lifenest_terms_accepted?: boolean;
  lifenest_terms_accepted_at?: string | null;
  lifenest_terms_version_accepted?: string | null;
  lifenest_terms_viewed_at?: string | null;
  lifenest_terms_version_viewed?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface LoginResponse {
  id: string;
  email: string;
  last_sign_in_at: string;
  created_at: string;
}
