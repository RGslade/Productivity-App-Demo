import databaseService from '@/services/databaseService';
import { FeedbackForm } from '@/types/feedback';
import { AllSettings, UserSettingsAccount, UserSettingsChatBot, UserSettingsDisplay, UserSettingsToDo, UserSettingsTransactions } from '@/types/settings';
import { AVAILABLE_FONTS } from '@/constants/Fonts';
import { ThemeMode } from '@/types/theme';
import { DEFAULT_CURRENCY_SYMBOL, MAJOR_CURRENCY_SYMBOLS } from '@/constants/CurrencySymbols';
import { BackendTables } from '@/constants/backendResources';

class SettingsService {
  /**
   * Returns a global app config value by key.
   */
  async getBackendConfigValue(key: string): Promise<string> {
    const { data } = await databaseService.getSingleGlobal<{ value: string }>(BackendTables.appConfig, 'key', key);
    return data?.value;
  }

  /**
   * Returns the current legal-document versions from app config.
   */
  async getLegalDocumentVersions(): Promise<{ terms: string; privacy: string; lifenest: string }> {
    const [terms, privacy, lifenest] = await Promise.all([
      this.getBackendConfigValue('terms_version').catch(() => 'v1'),
      this.getBackendConfigValue('privacy_policy_version').catch(() => 'v1'),
      this.getBackendConfigValue('lifenest_terms_version').catch(() => 'v1'),
    ]);

    return {
      terms: terms || 'v1',
      privacy: privacy || 'v1',
      lifenest: lifenest || 'v1',
    };
  }

  /**
   * Returns the current LifeNest terms version from app config.
   */
  async getLifeNestTermsVersion(): Promise<string> {
    const { lifenest } = await this.getLegalDocumentVersions();
    return lifenest;
  }

  async getAccountSettings(): Promise<UserSettingsAccount> {
    const { data } = await databaseService.getSingleOrCreate<UserSettingsAccount>('UserSettings_Account');
    return data;
  }

  async updateAccountSettings(updates: Partial<Omit<UserSettingsAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<UserSettingsAccount> {
    try {
      const { data } = await databaseService.updateTable<UserSettingsAccount>('UserSettings_Account', updates);
      return data;
    } catch (error) {
      console.error('settingsService.updateAccountSettings', error);
      throw error;
    }
  }

  async getDisplaySettings(mainCall: boolean): Promise<UserSettingsDisplay> {
    const { data } = mainCall === false ? await databaseService.getSingleOrCreate<UserSettingsDisplay>('UserSettings_Display_&_Content') : await databaseService.getSingle<UserSettingsDisplay>('UserSettings_Display_&_Content');
    return data;
  }

  async updateDisplaySettings(updates: Partial<Omit<UserSettingsDisplay, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<UserSettingsDisplay> {
    try {
      const { data } = await databaseService.updateTable<UserSettingsDisplay>('UserSettings_Display_&_Content', updates);
      return data;
    } catch (error) {
      console.error('settingsService.updateDisplaySettings', error);
      throw error;
    }
  }

  async getToDoSettings(): Promise<UserSettingsToDo> {
    const { data } = await databaseService.getSingleOrCreate<UserSettingsToDo>('UserSettings_ToDo');
    return data;
  }

  async updateToDoSettings(updates: Partial<Omit<UserSettingsToDo, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<UserSettingsToDo> {
    try {
      const { data } = await databaseService.updateTable<UserSettingsToDo>('UserSettings_ToDo', updates);
      return data;
    } catch (error) {
      console.error('settingsService.updateToDoSettings', error);
      throw error;
    }
  }

  async getTransactionSettings(): Promise<UserSettingsTransactions> {
    const { data } = await databaseService.getSingleOrCreate<UserSettingsTransactions>('UserSettings_Transactions');
    return data;
  }

  async updateTransactionSettings(updates: Partial<Omit<UserSettingsTransactions, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<UserSettingsTransactions> {
    try {
      if (updates.preferred_currency && !MAJOR_CURRENCY_SYMBOLS.some(currency => currency.value === updates.preferred_currency)) {
        throw new Error('Invalid currency symbol');
      }

      const { data } = await databaseService.updateTable<UserSettingsTransactions>('UserSettings_Transactions', updates);
      return data;
    } catch (error) {
      console.error('settingsService.updateTransactionSettings', error);
      throw error;
    }
  }

  async getChatBotSettings(): Promise<UserSettingsChatBot> {
    const { data } = await databaseService.getSingleOrCreate<UserSettingsChatBot>('UserSettings_ChatBot');
    return data;
  }

  async updateChatBotSettings(updates: Partial<Omit<UserSettingsChatBot, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<UserSettingsChatBot> {
    try {
      const { data } = await databaseService.updateTable<UserSettingsChatBot>('UserSettings_ChatBot', updates);
      return data;
    } catch (error) {
      console.error('settingsService.updateChatBotSettings', error);
      throw error;
    }
  }

  // Combined Settings
  async getAllSettings(): Promise<AllSettings | null> {
    try {
      const [account, display, todo, transactions, chatBot] = await Promise.all([
        this.getAccountSettings(),
        this.getDisplaySettings(true),
        this.getToDoSettings(),
        this.getTransactionSettings(),
        this.getChatBotSettings(),
      ]);

      if (!account || !display || !todo || !transactions || !chatBot) {
        console.error('settingsService.getAllSettings', { account, display, todo, transactions, chatBot });
        throw new Error('Failed to load some settings');
      }
      const result = { account, display, todo, transactions, chatBot };
      return result;
    } catch (error) {
      console.error('settingsService.getAllSettings', error);
      throw error;
    }
  }

  // Convenience methods for common settings
  async getTheme(): Promise<ThemeMode> {
    const theme = (await this.getDisplaySettings(false)).theme;
    return theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system';
  }

  async setTheme(theme: ThemeMode): Promise<void> {
    await this.updateDisplaySettings({ theme });
  }

  async getDefaultFont(): Promise<string | undefined> {
    const displaySettings = await this.getDisplaySettings(false);
    const font = displaySettings?.default_font;
    const isValid = AVAILABLE_FONTS.some(f => f.value === font);
    return isValid ? font! : undefined;
  }

  async setDefaultFont(font: string): Promise<void> {
    await this.updateDisplaySettings({ default_font: font });
  }

  async getToDoSoonDays(): Promise<number> {
    return (await this.getToDoSettings()).todo_soon_determiner;
  }

  async setToDoSoonDays(days: number): Promise<void> {
    await this.updateToDoSettings({ todo_soon_determiner: days });
  }

  /** Returns the user's preferred currency symbol for budget displays. */
  async getPreferredCurrency(): Promise<string> {
    const symbol = (await this.getTransactionSettings()).preferred_currency;
    const isValid = MAJOR_CURRENCY_SYMBOLS.some(currency => currency.value === symbol);
    return isValid ? symbol : DEFAULT_CURRENCY_SYMBOL;
  }

  /** Saves the user's preferred currency symbol for budget displays. */
  async setPreferredCurrency(symbol: string): Promise<void> {
    await this.updateTransactionSettings({ preferred_currency: symbol });
  }

  async getSessionTimeout(): Promise<number> {
    return (await this.getAccountSettings()).session_timeout;
  }

  async insertFeedback(formData: FeedbackForm): Promise<void> {
    await databaseService.insertToTable("Feedback", formData)
  }
}

export const settingsService = new SettingsService();
export default settingsService;
