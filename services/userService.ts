import { AccountCompletionPrefill, UserInfo, UpdateProfileRequest } from '@/types/user';
import { getCurrentUser, supabase } from '../lib/supabase';
import databaseService from './databaseService';
import { BackendTables } from '@/constants/backendResources';

class UserService {

  /** Reads the most likely first name from OAuth metadata. */
  private readFirstName(metadata: Record<string, unknown>): string | undefined {
    if (typeof metadata.first_name === 'string') return metadata.first_name;
    if (typeof metadata.given_name === 'string') return metadata.given_name;
    if (typeof metadata.name === 'string') return metadata.name.trim().split(/\s+/)[0];
    if (typeof metadata.full_name === 'string') return metadata.full_name.trim().split(/\s+/)[0];
    return undefined;
  }

  /** Reads middle names from provider metadata when available. */
  private readMiddleNames(metadata: Record<string, unknown>): string | undefined {
    if (typeof metadata.middle_names === 'string') return metadata.middle_names;
    if (typeof metadata.middle_name === 'string') return metadata.middle_name;
    const fullName = typeof metadata.name === 'string' ? metadata.name : typeof metadata.full_name === 'string' ? metadata.full_name : '';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    return parts.length > 2 ? parts.slice(1, -1).join(' ') : undefined;
  }

  /** Reads the most likely surname from OAuth metadata. */
  private readSurname(metadata: Record<string, unknown>): string | undefined {
    if (typeof metadata.surname === 'string') return metadata.surname;
    if (typeof metadata.last_name === 'string') return metadata.last_name;
    if (typeof metadata.family_name === 'string') return metadata.family_name;
    const fullName = typeof metadata.name === 'string' ? metadata.name : typeof metadata.full_name === 'string' ? metadata.full_name : '';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 1] : undefined;
  }

  /** Reads a date of birth from provider metadata if the provider supplied one. */
  private readBirthDate(metadata: Record<string, unknown>): string | undefined {
    const value = metadata.birth_date || metadata.birthdate || metadata.birthday || metadata.date_of_birth;
    return typeof value === 'string' ? value : undefined;
  }

  /** Returns true only when the minimum required onboarding fields are present. */
  isProfileComplete(profile: Partial<UserInfo> | null | undefined): boolean {
    return Boolean(
      profile?.id &&
      profile.first_name?.trim() &&
      profile.surname?.trim() &&
      profile.birth_date
    );
  }

  /** Maps a profile row plus auth user data into the app's `UserInfo` shape. */
  private mapUserInfo(profileRow: any, authUser: { email?: string | null; last_sign_in_at?: string | null } | null | undefined): UserInfo {
    return {
      id: profileRow.id,
      email_address: authUser?.email || '',
      first_name: profileRow.first_name,
      middle_names: profileRow.middle_names,
      surname: profileRow.surname,
      phone: profileRow.primary_phone_number?.toString(),
      address_line_1: profileRow.address_line_1,
      address_line_2: profileRow.address_line_2,
      city: profileRow.city,
      county: profileRow.county,
      country: profileRow.country,
      postcode: profileRow.postcode,
      birth_date: profileRow.birth_date,
      created_at: profileRow.created_at,
      updated_at: profileRow.updated_at,
      last_logged_in: authUser?.last_sign_in_at,
      ethnicity: profileRow.ethnicity,
      primary_phone_number: profileRow.primary_phone_number,
      descending_access_level: profileRow.descending_access_level,
      living_situation: profileRow.living_situation,
      job_status: profileRow.job_status,
      is_premium_user: profileRow.is_premium_user,
      universal_credit: profileRow.universal_credit || false,
      subscription_provider: profileRow.subscription_provider || null,
      subscription_product_id: profileRow.subscription_product_id || null,
      subscription_status: profileRow.subscription_status || null,
      terms_accepted: profileRow.terms_accepted,
      terms_accepted_at: profileRow.terms_accepted_at,
      terms_version_accepted: profileRow.terms_version_accepted,
      privacy_policy_accepted: profileRow.privacy_policy_accepted,
      privacy_policy_accepted_at: profileRow.privacy_policy_accepted_at,
      privacy_policy_version_accepted: profileRow.privacy_policy_version_accepted,
      lifenest_terms_accepted: profileRow.lifenest_terms_accepted,
      lifenest_terms_accepted_at: profileRow.lifenest_terms_accepted_at,
      lifenest_terms_version_accepted: profileRow.lifenest_terms_version_accepted,
    } as UserInfo;
  }

  /** Loads one profile row by auth user id or returns null when no row exists yet. */
  async getProfileByAuthUserId(authUserId: string): Promise<UserInfo | null> {
    const { data: profileRow, error } = await databaseService.getSingleGlobal<UserInfo>(BackendTables.userProfiles, 'auth_user_id', authUserId);
    if (error || !profileRow?.id) {
      return null;
    }

    return profileRow;
  }

  /** Builds the best available prefill payload for an authenticated but incomplete account. */
  async getCurrentAccountCompletionPrefill(): Promise<AccountCompletionPrefill> {
    const { data: { user }, error } = await getCurrentUser();
    if (error || !user?.id || !user.email) {
      throw new Error('Not authenticated');
    }

    const profile = await this.getProfileByAuthUserId(user.id);
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;

    return {
      email: user.email,
      first_name: profile?.first_name || this.readFirstName(metadata),
      middle_names: profile?.middle_names || this.readMiddleNames(metadata),
      surname: profile?.surname || this.readSurname(metadata),
      birth_date: profile?.birth_date || this.readBirthDate(metadata),
      job_status: profile?.job_status || (typeof metadata.job_status === 'string' ? metadata.job_status as any : undefined),
      terms_accepted: profile?.terms_accepted ?? (typeof metadata.terms_accepted === 'boolean' ? metadata.terms_accepted : undefined),
      privacy_policy_accepted: profile?.privacy_policy_accepted ?? (typeof metadata.privacy_policy_accepted === 'boolean' ? metadata.privacy_policy_accepted : undefined),
    };
  }

  async getUserProfile(): Promise<UserInfo> {
    const { data: { user }, error: userError } = await getCurrentUser();

    if (userError || !user) {
      //console.error('userService.getUserProfileError', userError);
      //throw new Error('Not authenticated');
      
    }
      const { data: profileRow, error } = await databaseService.getSingleGlobal<UserInfo>(BackendTables.userProfiles, "auth_user_id", user?.id);

      if (error || !profileRow) {
        console.error('userService.getUserProfile', error);
        if (error?.code === 'PGRST116') {
          throw new Error('Profile Error: ' + error.message);
        }
      }
    return this.mapUserInfo(profileRow, user);
  }

  async updateProfile(updates: UpdateProfileRequest): Promise<UserInfo> {
    const updateData: any = {};
    if (updates.first_name) updateData.first_name = updates.first_name;
    if (updates.middle_names) updateData.middle_names = updates.middle_names;
    if (updates.surname) updateData.surname = updates.surname;
    if (updates.primary_phone_number) updateData.primary_phone_number = updates.primary_phone_number;
    if (updates.address_line_1) updateData.address_line_1 = updates.address_line_1;
    if (updates.address_line_2) updateData.address_line_2 = updates.address_line_2;
    if (updates.city) updateData.city = updates.city;
    if (updates.county) updateData.county = updates.county;
    if (updates.country) updateData.country = updates.country;
    if (updates.postcode) updateData.postcode = updates.postcode;
    if (updates.birth_date) updateData.birth_date = updates.birth_date;
    if (updates.job_status) updateData.job_status = updates.job_status;
    if (updates.living_situation) updateData.living_situation = updates.living_situation;
    if (updates.universal_credit !== undefined) updateData.universal_credit = updates.universal_credit;
    if (updates.is_premium_user !== undefined) {
      updateData.is_premium_user = updates.is_premium_user;
    }
    if (updates.subscription_provider !== undefined) updateData.subscription_provider = updates.subscription_provider;
    if (updates.subscription_product_id !== undefined) updateData.subscription_product_id = updates.subscription_product_id;
    if (updates.subscription_status !== undefined) updateData.subscription_status = updates.subscription_status;

    if (updates.terms_accepted !== undefined) updateData.terms_accepted = updates.terms_accepted;
    if (updates.terms_accepted_at !== undefined) updateData.terms_accepted_at = updates.terms_accepted_at;
    if (updates.terms_version_accepted !== undefined) updateData.terms_version_accepted = updates.terms_version_accepted;
    if (updates.privacy_policy_accepted !== undefined) updateData.privacy_policy_accepted = updates.privacy_policy_accepted;
    if (updates.privacy_policy_accepted_at !== undefined) updateData.privacy_policy_accepted_at = updates.privacy_policy_accepted_at;
    if (updates.privacy_policy_version_accepted !== undefined) updateData.privacy_policy_version_accepted = updates.privacy_policy_version_accepted;
    if (updates.lifenest_terms_accepted !== undefined) updateData.lifenest_terms_accepted = updates.lifenest_terms_accepted;
    if (updates.lifenest_terms_accepted_at !== undefined) updateData.lifenest_terms_accepted_at = updates.lifenest_terms_accepted_at;
    if (updates.lifenest_terms_version_accepted !== undefined) updateData.lifenest_terms_version_accepted = updates.lifenest_terms_version_accepted;

    const { data: { user } } = await getCurrentUser();
    const { data: updatedProfileRow, error } = await databaseService.updateTableGlobal<UserInfo>(BackendTables.userProfiles, updateData, undefined, 'auth_user_id', user?.id)
    if (error) {
      console.error('userService.updateProfile', error);
      throw new Error(error.message);
    }

    return this.mapUserInfo(updatedProfileRow, user);
  }

  /** Creates or updates the current auth user's profile row. */
  async upsertCurrentUserProfile(updates: UpdateProfileRequest): Promise<UserInfo> {
    const { data: { user }, error: userError } = await getCurrentUser();
    if (userError || !user?.id) {
      console.error('userService.upsertCurrentUserProfile', userError);
      throw new Error('Not authenticated');
    }

    const payload = {
      auth_user_id: user.id,
      first_name: updates.first_name,
      middle_names: updates.middle_names,
      surname: updates.surname,
      address_line_1: updates.address_line_1,
      address_line_2: updates.address_line_2,
      city: updates.city,
      county: updates.county,
      country: updates.country,
      postcode: updates.postcode,
      ethnicity: updates.ethnicity,
      primary_phone_number: updates.primary_phone_number,
      birth_date: updates.birth_date,
      living_situation: updates.living_situation,
      job_status: updates.job_status,
      is_premium_user: updates.is_premium_user ?? false,
      universal_credit: updates.universal_credit ?? false,
      subscription_provider: updates.subscription_provider ?? null,
      subscription_product_id: updates.subscription_product_id ?? null,
      subscription_status: updates.subscription_status ?? 'inactive',
      terms_accepted: updates.terms_accepted,
      terms_accepted_at: updates.terms_accepted_at,
      terms_version_accepted: updates.terms_version_accepted,
      privacy_policy_accepted: updates.privacy_policy_accepted,
      privacy_policy_accepted_at: updates.privacy_policy_accepted_at,
      privacy_policy_version_accepted: updates.privacy_policy_version_accepted,
      lifenest_terms_accepted: updates.lifenest_terms_accepted,
      lifenest_terms_accepted_at: updates.lifenest_terms_accepted_at,
      lifenest_terms_version_accepted: updates.lifenest_terms_version_accepted,
      updated_at: new Date().toISOString(),
    };

    const { data: savedProfileRow, error } = await supabase
      .from(BackendTables.userProfiles)
      .upsert(payload, { onConflict: 'auth_user_id' })
      .select()
      .single();

    if (error || !savedProfileRow) {
      console.error('userService.upsertCurrentUserProfile', error);
      throw new Error(error?.message || 'Unable to save user profile');
    }

    return this.mapUserInfo(savedProfileRow, user);
  }

  async deleteAccount(): Promise<void> {
    const { data: { user }, error: userError } = await getCurrentUser();
    if (userError || !user) {
      console.error('userService.deleteAccount', userError);
      throw new Error('Not authenticated');
    }

    try {
      await databaseService.executeRpc('delete_my_account');
      try {
        await databaseService.signOut();
      } catch (error) {
        console.warn('userService.deleteAccount.signOut', error);
      }
    } catch (error) {
      console.error('userService.deleteAccount', error);
      throw error;
    }
  }

  // Utility methods
  getFullName(profile: UserInfo): string {
    const parts = [profile.first_name, profile.middle_names, profile.surname].filter(Boolean);
    return parts.join(' ');
  }

  getInitials(profile: UserInfo): string { //Do I want to include Middle names with option to do so?
    const firstName = profile.first_name?.charAt(0) || '';
    const lastName = profile.surname?.charAt(0) || '';
    return (firstName + lastName).toUpperCase();
  }

  formatAddress(profile: UserInfo): string {
    const parts = [profile.address_line_1, profile.address_line_2, profile.city, profile.county, profile.country, profile.postcode, ].filter(Boolean);
    return parts.join(', ');
  }

  calculateAge(birthDate?: string): number | null {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  // Backwards-compatible alias used by existing screens and hooks.
  async updateUser(updates: UpdateProfileRequest): Promise<UserInfo> {
    try {
      return await this.updateProfile(updates);
    } catch (error) {
      console.error('userService.updateUser', error);
      throw error;
    }
  }

  async deleteAllUserData(): Promise<void> {
    try {
      await this.deleteAccount();
    } catch (error) {
      console.error('userService.deleteAllUserData', error);
      throw error;
    }
  }
}

export const userService = new UserService();
export default userService;
