import { AccountCompletionPrefill, UserInfo, UpdateProfileRequest } from '@/types/user';
import { getCurrentUser, supabase } from '../lib/supabase';
import databaseService from './databaseService';
import { BackendTables } from '@/constants/backendResources';

//
class UserService {

  /** Reads the most likely first name from OAuth metadata. */
  private readFirstName(metadata: Record<string, unknown>): string | undefined {
    //
    if (typeof metadata.first_name === 'string') return metadata.first_name;
    //
    if (typeof metadata.given_name === 'string') return metadata.given_name;
    //
    if (typeof metadata.name === 'string') return metadata.name.trim().split(/\s+/)[0];
    //
    if (typeof metadata.full_name === 'string') return metadata.full_name.trim().split(/\s+/)[0];
    return undefined;
  }

  /** Reads middle names from provider metadata when available. */
  private readMiddleNames(metadata: Record<string, unknown>): string | undefined {
    //
    if (typeof metadata.middle_names === 'string') return metadata.middle_names;
    //
    if (typeof metadata.middle_name === 'string') return metadata.middle_name;
    //
    const fullName = typeof metadata.name === 'string' ? metadata.name : typeof metadata.full_name === 'string' ? metadata.full_name : '';
    //
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    return parts.length > 2 ? parts.slice(1, -1).join(' ') : undefined;
  }

  /** Reads the most likely surname from OAuth metadata. */
  private readSurname(metadata: Record<string, unknown>): string | undefined {
    //
    if (typeof metadata.surname === 'string') return metadata.surname;
    //
    if (typeof metadata.last_name === 'string') return metadata.last_name;
    //
    if (typeof metadata.family_name === 'string') return metadata.family_name;
    //
    const fullName = typeof metadata.name === 'string' ? metadata.name : typeof metadata.full_name === 'string' ? metadata.full_name : '';
    //
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 1] : undefined;
  }

  /** Reads a date of birth from provider metadata if the provider supplied one. */
  private readBirthDate(metadata: Record<string, unknown>): string | undefined {
    //
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
  private mapUserInfo(data: any, user: { email?: string | null; last_sign_in_at?: string | null } | null | undefined): UserInfo {
    return {
      id: data.id,
      email_address: user?.email || '',
      first_name: data.first_name,
      middle_names: data.middle_names,
      surname: data.surname,
      phone: data.primary_phone_number?.toString(),
      address_line_1: data.address_line_1,
      address_line_2: data.address_line_2,
      city: data.city,
      county: data.county,
      country: data.country,
      postcode: data.postcode,
      birth_date: data.birth_date,
      created_at: data.created_at,
      updated_at: data.updated_at,
      last_logged_in: user?.last_sign_in_at,
      ethnicity: data.ethnicity,
      primary_phone_number: data.primary_phone_number,
      descending_access_level: data.descending_access_level,
      living_situation: data.living_situation,
      job_status: data.job_status,
      is_premium_user: data.is_premium_user,
      universal_credit: data.universal_credit || false,
      subscription_provider: data.subscription_provider || null,
      subscription_product_id: data.subscription_product_id || null,
      subscription_status: data.subscription_status || null,
      terms_accepted: data.terms_accepted,
      terms_accepted_at: data.terms_accepted_at,
      terms_version_accepted: data.terms_version_accepted,
      privacy_policy_accepted: data.privacy_policy_accepted,
      privacy_policy_accepted_at: data.privacy_policy_accepted_at,
      privacy_policy_version_accepted: data.privacy_policy_version_accepted,
      lifenest_terms_accepted: data.lifenest_terms_accepted,
      lifenest_terms_accepted_at: data.lifenest_terms_accepted_at,
      lifenest_terms_version_accepted: data.lifenest_terms_version_accepted,
    } as UserInfo;
  }

  /** Loads one profile row by auth user id or returns null when no row exists yet. */
  async getProfileByAuthUserId(authUserId: string): Promise<UserInfo | null> {
    //
    const { data, error } = await databaseService.getSingleGlobal<UserInfo>(BackendTables.userProfiles, 'auth_user_id', authUserId);
    //
    if (error || !data?.id) {
      return null;
    }

    return data;
  }

  /** Builds the best available prefill payload for an authenticated but incomplete account. */
  async getCurrentAccountCompletionPrefill(): Promise<AccountCompletionPrefill> {
    //
    const { data: { user }, error } = await getCurrentUser();
    //
    if (error || !user?.id || !user.email) {
      throw new Error('Not authenticated');
    }

    //
    const profile = await this.getProfileByAuthUserId(user.id);
    //
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
    //
    const { data: { user }, error: userError } = await getCurrentUser();

    //
    if (userError || !user) {
      //console.error('userService.getUserProfileError', userError);
      //throw new Error('Not authenticated');
      
    }
    //This runs indefinly until changed I assume
      //
      const { data, error } = await databaseService.getSingleGlobal<UserInfo>(BackendTables.userProfiles, "auth_user_id", user?.id);

      //
      if (error || !data) {
        console.error('userService.getUserProfile', error);
        //
        if (error?.code === 'PGRST116') {
          throw new Error('Profile Error: ' + error.message);
        }
      }
    return this.mapUserInfo(data, user);
  }

  async updateProfile(updates: UpdateProfileRequest): Promise<UserInfo> {
    //
    const updateData: any = {};
    //
    if (updates.first_name) updateData.first_name = updates.first_name;
    //
    if (updates.middle_names) updateData.middle_names = updates.middle_names;
    //
    if (updates.surname) updateData.surname = updates.surname;
    //
    if (updates.primary_phone_number) updateData.primary_phone_number = updates.primary_phone_number;
    //
    if (updates.address_line_1) updateData.address_line_1 = updates.address_line_1;
    //
    if (updates.address_line_2) updateData.address_line_2 = updates.address_line_2;
    //
    if (updates.city) updateData.city = updates.city;
    //
    if (updates.county) updateData.county = updates.county;
    //
    if (updates.country) updateData.country = updates.country;
    //
    if (updates.postcode) updateData.postcode = updates.postcode;
    //
    if (updates.birth_date) updateData.birth_date = updates.birth_date;
    //
    if (updates.job_status) updateData.job_status = updates.job_status;
    //
    if (updates.living_situation) updateData.living_situation = updates.living_situation;
    //
    if (updates.universal_credit !== undefined) updateData.universal_credit = updates.universal_credit;
    //
    if (updates.is_premium_user !== undefined) {
      updateData.is_premium_user = updates.is_premium_user;
    }
    //
    if (updates.subscription_provider !== undefined) updateData.subscription_provider = updates.subscription_provider;
    //
    if (updates.subscription_product_id !== undefined) updateData.subscription_product_id = updates.subscription_product_id;
    //
    if (updates.subscription_status !== undefined) updateData.subscription_status = updates.subscription_status;

    //
    if (updates.terms_accepted !== undefined) updateData.terms_accepted = updates.terms_accepted;
    //
    if (updates.terms_accepted_at !== undefined) updateData.terms_accepted_at = updates.terms_accepted_at;
    //
    if (updates.terms_version_accepted !== undefined) updateData.terms_version_accepted = updates.terms_version_accepted;
    //
    if (updates.privacy_policy_accepted !== undefined) updateData.privacy_policy_accepted = updates.privacy_policy_accepted;
    //
    if (updates.privacy_policy_accepted_at !== undefined) updateData.privacy_policy_accepted_at = updates.privacy_policy_accepted_at;
    //
    if (updates.privacy_policy_version_accepted !== undefined) updateData.privacy_policy_version_accepted = updates.privacy_policy_version_accepted;
    //
    if (updates.lifenest_terms_accepted !== undefined) updateData.lifenest_terms_accepted = updates.lifenest_terms_accepted;
    //
    if (updates.lifenest_terms_accepted_at !== undefined) updateData.lifenest_terms_accepted_at = updates.lifenest_terms_accepted_at;
    //
    if (updates.lifenest_terms_version_accepted !== undefined) updateData.lifenest_terms_version_accepted = updates.lifenest_terms_version_accepted;

    //
    const { data: { user } } = await getCurrentUser();
    //
    const { data, error } = await databaseService.updateTableGlobal<UserInfo>(BackendTables.userProfiles, updateData, undefined, 'auth_user_id', user?.id)
    //
    if (error) {
      console.error('userService.updateProfile', error);
      throw new Error(error.message);
    }

    return this.mapUserInfo(data, user);
  }

  /** Creates or updates the current auth user's profile row. */
  async upsertCurrentUserProfile(updates: UpdateProfileRequest): Promise<UserInfo> {
    //
    const { data: { user }, error: userError } = await getCurrentUser();
    //
    if (userError || !user?.id) {
      console.error('userService.upsertCurrentUserProfile', userError);
      throw new Error('Not authenticated');
    }

    //
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

    //
    const { data, error } = await supabase
      .from(BackendTables.userProfiles)
      .upsert(payload, { onConflict: 'auth_user_id' })
      .select()
      .single();

    //
    if (error || !data) {
      console.error('userService.upsertCurrentUserProfile', error);
      throw new Error(error?.message || 'Unable to save user profile');
    }

    return this.mapUserInfo(data, user);
  }

  async deleteAccount(): Promise<void> {
    //
    const { data: { user }, error: userError } = await getCurrentUser();
    //
    if (userError || !user) {
      console.error('userService.deleteAccount', userError);
      throw new Error('Not authenticated');
    }

    //
    try {
      await databaseService.executeRpc('delete_my_account');
      //
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
    //
    const parts = [profile.first_name, profile.middle_names, profile.surname].filter(Boolean);
    return parts.join(' ');
  }

  getInitials(profile: UserInfo): string { //Do I want to include Middle names with option to do so?
    //
    const firstName = profile.first_name?.charAt(0) || '';
    //
    const lastName = profile.surname?.charAt(0) || '';
    //
    return (firstName + lastName).toUpperCase();
  }

  formatAddress(profile: UserInfo): string {
    //
    const parts = [profile.address_line_1, profile.address_line_2, profile.city, profile.county, profile.country, profile.postcode, ].filter(Boolean);
    return parts.join(', ');
  }

  calculateAge(birthDate?: string): number | null {
    //
    if (!birthDate) return null;
    //
    const birth = new Date(birthDate);
    //
    const today = new Date();
    //
    let age = today.getFullYear() - birth.getFullYear();
    //
    const monthDiff = today.getMonth() - birth.getMonth();

    //
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  // Additional methods expected by hooks/components
  async updateUser(updates: UpdateProfileRequest): Promise<UserInfo> { //What is the point of this? It just calls an existing method on the same page???
    //
    try {
      return await this.updateProfile(updates);
    } catch (error) {
      console.error('userService.updateUser', error);
      throw error;
    }
  }

  async deleteAllUserData(): Promise<void> {
    //
    try {
      await this.deleteAccount();
    } catch (error) {
      console.error('userService.deleteAllUserData', error);
      throw error;
    }
  }
}

//
export const userService = new UserService();
//
export default userService;
