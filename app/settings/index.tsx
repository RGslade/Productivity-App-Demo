import { TrackedTouchableOpacity as TouchableOpacity } from '@/components/ui/TrackedTouchableOpacity';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, ScrollView, StyleSheet, Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Chip, Eyebrow, HeroCard, StatTile, useHeroSurface } from '@/components/ui/Surfaces';
import { useAuth } from '@/hooks/useAuth';
import { useSettings, useUpdateAccountSettings, useUpdateChatBotSettings, useUpdateDisplaySettings, useUpdateToDoSettings, useUpdateTransactionSettings } from '@/hooks/useSettings';
import { userService } from '@/services/userService';
import { UpdateProfileRequest, UserInfo } from '@/types/user';
import { SettingsSection, UserSettingsAccount, UserSettingsChatBot, UserSettingsDisplay, UserSettingsToDo, UserSettingsTransactions } from '@/types/settings';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@/components/ui/AppDatePicker';
import { AVAILABLE_FONTS } from '@/constants/Fonts';
import { DEFAULT_CURRENCY_SYMBOL, MAJOR_CURRENCY_SYMBOLS } from '@/constants/CurrencySymbols';
import { EMPLOYMENT_STATUSES } from '@/constants/employment';
import { lifeNestService } from '@/services/lifeNestService';
import { ColourPicker } from '@/components/ui/ColourPicker';
import { useThemeColour } from '@/hooks/useThemeColour';
import { showAlert, validateAuthUser } from '@/hooks/dataHandler';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { deriveSubscriptionProfile, findPackageByKind, getRevenueCatProductKind } from '@/services/subscriptionService';
import { addCrashBreadcrumb, logError } from '@/services/crashLogger';
import { openRevenueCatHostedPurchases } from '@/services/revenueCatWebPurchaseLinkService';
import { BrandColours } from '@/constants/Colours';
import { PROJECT_OWNER_NAME, PROJECT_SUPPORT_EMAIL, PROJECT_WEBSITE, PROJECT_WEBSITE_LABEL } from '@/constants/ProjectInfo';
import { REQUIRED_LEGAL_DOCUMENTS } from '@/constants/LegalDocuments';

/** Returns customer-facing purchase outage guidance without exposing provider details. */
function getPurchaseUnavailableMessage() {
  return `Purchases are temporarily unavailable. Please try again later. If this keeps happening, contact support at ${PROJECT_SUPPORT_EMAIL}.`;
}

/** Formats RevenueCat subscription status for account settings. */
function getSubscriptionStatusLabel(status?: string | null) {
  if (status === 'active') return 'Active';
  if (status === 'cancelled') return 'Active until the current paid period ends';
  return 'No active subscription';
}

/** Formats the current premium plan without exposing provider product ids to users. */
function getSubscriptionPlanLabel(productId?: string | null) {
  if (!productId) return 'Premium';
  const kind = getRevenueCatProductKind(productId);
  if (kind === 'yearly') return 'Annual Premium';
  if (kind === 'monthly') return 'Monthly Premium';
  return 'Premium';
}

/** Formats ISO purchase dates for the account summary. */
function formatPurchaseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

const SETTINGS_BOOKMARKS = [
  { key: 'profile', label: 'Profile' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'budget', label: 'Budget' },
  { key: 'lifenest', label: 'LifeNest' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'more', label: 'More' },
] as const;

export default function SettingsScreen() {
  const { user, userInfo, logout } = useAuth();
  const { restorePurchases, purchasePackage, customerInfo, offerings, isConfigured, isPremium, lifeNestTokenBalance } = useSubscriptions();
  const { accountSettings, displaySettings, todoSettings, transactionSettings, chatBotSettings } = useSettings();
  const updateAccountSettings = useUpdateAccountSettings();
  const updateDisplaySettings = useUpdateDisplaySettings();
  const updateToDoSettings = useUpdateToDoSettings();
  const updateTransactionSettings = useUpdateTransactionSettings();
  const updateChatBotSettings = useUpdateChatBotSettings();
  const [loading, setLoading] = useState(false);
  const purchaseInFlightRef = useRef(false);
  const settingsScrollRef = useRef<ScrollView>(null);
  const sectionOffsetsRef = useRef<Record<string, number>>({});
  const [activeSection, setActiveSection] = useState<SettingsSection>(null);
  const [updateMessage, setUpdateMessage] = useState<{ message: string; isSuccess: boolean } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showWebPurchaseChoice, setShowWebPurchaseChoice] = useState(false);
  const themes = ['light', 'dark', 'system'] as const;
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const backgroundColour = useThemeColour({}, 'background');
  const cardBackgroundColour = useThemeColour({}, 'cardBackground');
  const textColour = useThemeColour({}, 'text');
  const inputBackgroundColour = useThemeColour({}, 'inputBackground');
  const inputBorderColour = useThemeColour({}, 'inputBorder');
  const hero = useHeroSurface();

  const registerBookmarkSection = useCallback((key: string) => (event: { nativeEvent: { layout: { y: number } } }) => {
    sectionOffsetsRef.current[key] = event.nativeEvent.layout.y;
  }, []);

  const scrollToBookmark = useCallback((key: string) => {
    const offset = sectionOffsetsRef.current[key];
    if (offset === undefined) return;
    settingsScrollRef.current?.scrollTo({ y: Math.max(0, offset - 72), animated: true });
  }, []);

  useEffect(() => {
    let mounted = true;

    lifeNestService.getModels()
      .then(models => {
        if (mounted) setAvailableModels(models);
      })
      .catch(err => {
        logError('SettingsScreen.loadModels', err, { route: '/settings' });
        if (mounted) setAvailableModels([]);
      })
      .finally(() => {
        if (mounted) setModelsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const [profileData, setProfileData] = useState<UpdateProfileRequest>({
    first_name: userInfo?.first_name || '',
    middle_names: userInfo?.middle_names || '',
    surname: userInfo?.surname || '',
    primary_phone_number: userInfo?.primary_phone_number || undefined,
    birth_date: userInfo?.birth_date ? userInfo.birth_date.split('T')[0] : '',
    address_line_1: userInfo?.address_line_1 || '',
    address_line_2: userInfo?.address_line_2 || '',
    city: userInfo?.city || '',
    county: userInfo?.county || '',
    country: userInfo?.country || '',
    postcode: userInfo?.postcode || '',
    ethnicity: userInfo?.ethnicity || '',
    living_situation: userInfo?.living_situation || '',
    job_status: userInfo?.job_status,
  });

  const [accountData, setAccountData] = useState<Partial<UserSettingsAccount>>({
    notifications_enabled: accountSettings?.notifications_enabled,
  });

  const [displayData, setDisplayData] = useState<Partial<UserSettingsDisplay>>({
    theme: displaySettings?.theme,
    default_font: displaySettings?.default_font,
  });

  const [todoData, setToDoData] = useState<Partial<UserSettingsToDo>>({
    todo_soon_determiner: todoSettings?.todo_soon_determiner,
  });

  const [transactionData, setTransactionData] = useState<Partial<UserSettingsTransactions>>({
    preferred_currency: transactionSettings?.preferred_currency || DEFAULT_CURRENCY_SYMBOL,
  });

  const [chatBotData, setChatBotData] = useState<Partial<UserSettingsChatBot>>({
    preferred_model: chatBotSettings?.preferred_model,
    background_colour: chatBotSettings?.background_colour,
    grades_context_enabled: chatBotSettings?.grades_context_enabled ?? true,
    transactions_context_enabled: chatBotSettings?.transactions_context_enabled ?? true,
    todos_context_enabled: chatBotSettings?.todos_context_enabled ?? true,
    checklists_context_enabled: chatBotSettings?.checklists_context_enabled ?? true,
  });
  const removeAdsPackage = findPackageByKind(offerings, 'remove_ads');
  const subscriptionProfile = deriveSubscriptionProfile(customerInfo);
  const isAdFree = subscriptionProfile.isAdFree;
  const subscriptionStartedAtLabel = formatPurchaseDate(subscriptionProfile.subscriptionStartedAt);
  const hasKnownActivePurchases = subscriptionProfile.isPremium || subscriptionProfile.hasRemoveAds || lifeNestTokenBalance > 0;
  const fullName = [profileData.first_name, profileData.surname].filter(Boolean).join(' ') || userInfo?.email_address || 'You';
  const initials = [profileData.first_name, profileData.surname].filter((part): part is string => Boolean(part)).map(part => part.charAt(0).toUpperCase()).join('').slice(0, 2) || 'YN';
  const profileFields = [profileData.first_name,profileData.surname,profileData.primary_phone_number,profileData.birth_date,profileData.address_line_1,profileData.city,profileData.postcode,profileData.living_situation,profileData.job_status,];
  const completedProfileFields = profileFields.filter(value => Boolean(value)).length;
  const profileCompletion = Math.round((completedProfileFields / profileFields.length) * 100);

  const handleDatePick = (_: any, selected?: Date) => {
    setShowDatePicker(false);
    if (!selected) return;

    const day = String(selected.getDate()).padStart(2, '0');
    const month = String(selected.getMonth() + 1).padStart(2, '0');
    const year = selected.getFullYear();

    const display = `${day}/${month}/${year}`;
    const dbValue = `${year}-${month}-${day}`;

    setDobDisplay(display);
    setProfileData(prev => ({ ...prev, birth_date: dbValue }));
  };

  const handleSetProfileData = useCallback(async (user: UserInfo) => {
    if(validateAuthUser()) {user = await userService.getUserProfile()};
    setProfileData({
      first_name: user.first_name || '',
      middle_names: user.middle_names || '',
      surname: user.surname || '',
      primary_phone_number: user.primary_phone_number || undefined,
      birth_date: user.birth_date ? user.birth_date.split('T')[0] : '',
      address_line_1: user.address_line_1 || '',
      address_line_2: user.address_line_2 || '',
      city: user.city || '',
      county: user.county || '',
      country: user.country || '',
      postcode: user.postcode || '',
      ethnicity: user.ethnicity || '',
      living_situation: user.living_situation || '',
      job_status: user?.job_status || 'Unemployed',
    });
  }, []);

  useEffect(() => {
    if (userInfo) handleSetProfileData(userInfo);

    if (accountSettings) setAccountData({ notifications_enabled: accountSettings.notifications_enabled });

    if (displaySettings) setDisplayData({ theme: displaySettings.theme, default_font: displaySettings.default_font, });

    if (todoSettings) setToDoData({ todo_soon_determiner: todoSettings.todo_soon_determiner, });

    if (transactionSettings) setTransactionData({ preferred_currency: transactionSettings.preferred_currency || DEFAULT_CURRENCY_SYMBOL });

    if (chatBotSettings) setChatBotData({
      preferred_model: chatBotSettings.preferred_model,
      background_colour: chatBotSettings.background_colour,
      grades_context_enabled: chatBotSettings.grades_context_enabled ?? true,
      transactions_context_enabled: chatBotSettings.transactions_context_enabled ?? true,
      todos_context_enabled: chatBotSettings.todos_context_enabled ?? true,
      checklists_context_enabled: chatBotSettings.checklists_context_enabled ?? true,
    });
  }, [userInfo, accountSettings, displaySettings, todoSettings, transactionSettings, chatBotSettings, handleSetProfileData]);

  const showMessage = (message: string, isSuccess: boolean = true) => {
    setUpdateMessage({ message, isSuccess });
    setTimeout(() => setUpdateMessage(null), 3000);
  };

  const handleProfileUpdate = async () => {
    if (!userInfo) return;
    setLoading(true);
    setActiveSection('profile');
    try {
      const updatedUser = await userService.updateUser(profileData);
      await handleSetProfileData(updatedUser);
      showMessage('Profile updated.');
    } catch (error) {
      logError('SettingsScreen.handleProfileUpdate', error, { userId: userInfo.id });
      showMessage('Failed to update profile. Please try again.', false);
    } finally {
      setLoading(false);
      setActiveSection(null);
    }
  };

  const handleAccountSettingsUpdate = async () => {
    setLoading(true);
    setActiveSection('account');

    try {
      await updateAccountSettings.mutateAsync(accountData);
      showMessage('Account updated.');
    } catch (error) {
      logError('SettingsScreen.handleAccountSettingsUpdate', error, { accountData });
      showMessage('Failed to update account settings. Please try again.', false);
    } finally {
      setLoading(false);
      setActiveSection(null);
    }
  };

  const handleDisplaySettingsUpdate = async () => {
    setLoading(true);
    setActiveSection('appearance');

    try {
      await updateDisplaySettings.mutateAsync(displayData);
      showMessage('Appearance updated.');
    } catch (error) {
      logError('SettingsScreen.handleDisplaySettingsUpdate', error, { displayData });
      showMessage('Failed to update display settings. Please try again.', false);
    } finally {
      setLoading(false);
      setActiveSection(null);
    }
  };

  const handleToDoSettingsUpdate = async () => {
    setLoading(true);
    setActiveSection('dashboard');

    try {
      await updateToDoSettings.mutateAsync(todoData);
      showMessage('Tasks updated.');
    } catch (error) {
      logError('SettingsScreen.handleToDoSettingsUpdate', error, { todoData });
      showMessage('Failed to update ToDo settings.', false);
    } finally {
      setLoading(false);
      setActiveSection(null);
    }
  };

  const handleTransactionSettingsUpdate = async () => {
    setLoading(true);
    setActiveSection('transactions');

    try {
      await updateTransactionSettings.mutateAsync(transactionData);
      showMessage('Budget updated.');
    } catch (error) {
      logError('SettingsScreen.handleTransactionSettingsUpdate', error, { transactionData });
      showMessage('Failed to update transaction settings.', false);
    } finally {
      setLoading(false);
      setActiveSection(null);
    }
  };

  const handleChatBotSettingsUpdate = async () => {
    setLoading(true);
    setActiveSection('chatBot');

    try {
      await updateChatBotSettings.mutateAsync(chatBotData);
      showMessage('LifeNest updated.');
    } catch (error) {
      logError('SettingsScreen.handleChatBotSettingsUpdate', error, { chatBotData });
      showMessage('Failed to update ChatBot settings.', false);
    } finally {
      setLoading(false);
      setActiveSection(null);
    }
  };

  const handleDeleteAccount = async () => {
    showAlert('Delete Account', 'Are you sure you want to delete your account? You cannot get it back after deletion.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await userService.deleteAccount();
              showAlert('Account Deleted', 'Your account has been permanently deleted.', [{ text: 'OK', onPress: () => logout() }]);
            } catch (error) {
              logError('SettingsScreen.handleDeleteAccount', error, { userId: userInfo?.id });
              showAlert('Delete Account Failed', 'We could not delete your account. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    showAlert('Logout', 'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => { logout(); } }
      ]
    );
  };

  const handleRestorePurchases = async () => {
    if (purchaseInFlightRef.current) {
      return;
    }

    if (!isConfigured) {
      showAlert(
        'Purchases unavailable',
        getPurchaseUnavailableMessage()
      );
      return;
    }

    try {
      purchaseInFlightRef.current = true;
      setLoading(true);
      addCrashBreadcrumb('settings_restore_start', undefined, '/settings');
      const info = await restorePurchases();
      const profile = deriveSubscriptionProfile(info);
      addCrashBreadcrumb('settings_restore_result', {
        isPremium: profile.isPremium,
        isAdFree: profile.isAdFree,
        hasRemoveAds: profile.hasRemoveAds,
      }, '/settings');
      showAlert(
        profile.isAdFree ? 'Purchases restored' : 'Nothing to restore',
        profile.isAdFree
          ? 'Your subscriptions or one-time purchases were restored successfully on this account.'
          : 'No active subscription or one-time purchase was found for this store account. LifeNest token balances are synced to your signed-in account and do not need store restore.'
      );
    } catch (error) {
      addCrashBreadcrumb('settings_restore_error', {
        message: error instanceof Error ? error.message : String(error),
      }, '/settings');
      logError('SettingsScreen.handleRestorePurchases', error);
      showAlert('Restore failed', 'We could not restore purchases. Please try again.');
    } finally {
      purchaseInFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleRemoveAdsPurchase = async () => {
    if (purchaseInFlightRef.current) {
      return;
    }

    if (!isConfigured) {
      showAlert(
        'Purchases unavailable',
        getPurchaseUnavailableMessage()
      );
      return;
    }

    if (!removeAdsPackage) {
      showAlert('Remove Ads unavailable', 'The Remove Ads product is not currently available.');
      return;
    }

    try {
      purchaseInFlightRef.current = true;
      setLoading(true);
      addCrashBreadcrumb('settings_remove_ads_start', undefined, '/settings');
      const info = await purchasePackage(removeAdsPackage);
      const profile = deriveSubscriptionProfile(info);
      addCrashBreadcrumb('settings_remove_ads_result', {
        isPremium: profile.isPremium,
        isAdFree: profile.isAdFree,
        hasRemoveAds: profile.hasRemoveAds,
      }, '/settings');
      showAlert(
        profile.isAdFree ? 'Purchase successful' : 'Purchase complete',
        profile.isAdFree
          ? 'Remove Ads is now active on this account.'
          : `Your purchase completed, but we could not confirm access yet. Please try restoring purchases. If this keeps happening, contact support at ${PROJECT_SUPPORT_EMAIL}.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (message.includes('cancel')) return;
      addCrashBreadcrumb('settings_remove_ads_error', { message }, '/settings');
      logError('SettingsScreen.handleRemoveAdsPurchase', error, { productId: removeAdsPackage?.product.identifier });
      showAlert('Purchase failed', 'We could not complete the Remove Ads purchase. Please try again.');
    } finally {
      purchaseInFlightRef.current = false;
      setLoading(false);
    }
  };

  /** Opens hosted RevenueCat Remove Ads checkout on web and native checkout elsewhere. */
  const handleRemoveAdsEntry = async () => {
    const didOpenHostedPurchases = await openRevenueCatHostedPurchases({
      appUserId: user?.id,
      email: userInfo?.email_address || user?.email,
      screen: 'remove_ads',
      source: 'settings_remove_ads',
    });

    if (!didOpenHostedPurchases) {
      await handleRemoveAdsPurchase();
    }
  };

  /** Opens the web purchase choice popup while preserving the native purchase route. */
  const handleGetMore = () => {
    if (Platform.OS !== 'web') {
      router.push('/subscribe');
      return;
    }

    setShowWebPurchaseChoice(true);
  };

  /** Opens the selected RevenueCat hosted purchase screen from the web-only choice popup. */
  const handleWebPurchaseChoice = async (screen: 'tokens' | 'subscriptions') => {
    setShowWebPurchaseChoice(false);
    await openRevenueCatHostedPurchases({
      appUserId: user?.id,
      email: userInfo?.email_address || user?.email,
      screen,
      source: `settings_get_more_${screen}`,
    });
  };

  const handleUnsubscribeInfo = async () => {
    const profile = deriveSubscriptionProfile(customerInfo);
    const managementUrl = profile.managementUrl;
    const platformLabel =
      Platform.OS === 'ios'
        ? 'App Store subscriptions'
        : Platform.OS === 'android'
          ? 'Google Play subscriptions'
          : 'your RevenueCat Billing subscription email';
    const instructions =
      Platform.OS === 'ios'
        ? 'Open iPhone Settings, tap your Apple ID, then Subscriptions. Select the demo product and cancel renewal.'
        : Platform.OS === 'android'
          ? 'Open Google Play Store, tap profile, Payments & subscriptions, then Subscriptions. Select the demo product and cancel renewal.'
          : 'On web, use the subscription email you received after checkout to update or cancel your subscription.';

    if (managementUrl) {
      showAlert(
        'Manage subscription',
        `${instructions}\n\nYou can also open ${platformLabel} directly now.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: Platform.OS === 'web' ? 'Open subscription page' : 'Open store subscriptions',
            onPress: async () => {
              try {
                await Linking.openURL(managementUrl);
              } catch (error) {
                logError('SettingsScreen.openSubscriptionManagement', error, { managementUrl });
                showAlert('Unable to open', 'Could not open the subscription page automatically.');
              }
            },
          },
        ]
      );
      return;
    }

    showAlert('Manage subscription', instructions);
  };

  const formatDOBForDisplay = (isoDate?: string) => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  };

  const [dobDisplay, setDobDisplay] = useState(formatDOBForDisplay(profileData.birth_date));

  useEffect(() => {
    if (profileData.birth_date) setDobDisplay(formatDOBForDisplay(profileData.birth_date));
  }, [profileData.birth_date]);

  /** Opens the personal portfolio website from the project card. */
  const handleOpenProjectWebsite = async () => {
    try {
      await Linking.openURL(PROJECT_WEBSITE);
    } catch (error) {
      logError('SettingsScreen.handleOpenProjectWebsite', error, { url: PROJECT_WEBSITE });
      showAlert('Unable to open', `Could not open ${PROJECT_OWNER_NAME} right now.`);
    }
  };

  if (!userInfo || modelsLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.loadingContainer}>
          <LoadingSpinner />
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: backgroundColour }]}>
      <ScrollView ref={settingsScrollRef} style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.content} darkColour={backgroundColour} lightColour={backgroundColour}>
          <ThemedView style={styles.header} darkColour={backgroundColour} lightColour={backgroundColour}>
            <ThemedView style={styles.brandRow} darkColour={backgroundColour} lightColour={backgroundColour}>
              <ThemedView style={styles.brandMark}>
                <ThemedText style={styles.brandMarkText}>LTN</ThemedText>
              </ThemedView>
              <Eyebrow>Productivity App</Eyebrow>
            </ThemedView>
            <HeroCard style={styles.profileHero}>
              <ThemedView style={[styles.avatar, { backgroundColor: BrandColours.brand }]}>
                <ThemedText style={styles.avatarText}>{initials}</ThemedText>
              </ThemedView>
              <Eyebrow tone="hero">Your place</Eyebrow>
              <ThemedText style={[styles.profileHeroTitle, { color: hero.text }]}>{fullName}</ThemedText>
              <ThemedText style={[styles.profileHeroSubtitle, { color: hero.textSecondary }]}>
                Manage the details that keep your Productivity App account working across the app.
              </ThemedText>
            </HeroCard>
            <ThemedView style={styles.statGrid} darkColour={backgroundColour} lightColour={backgroundColour}>
              <StatTile label="Profile" value={`${profileCompletion}%`} meta={`${completedProfileFields} of ${profileFields.length} set`} />
              <StatTile label="LifeNest" value={`${lifeNestTokenBalance}`} meta="tokens available" />
            </ThemedView>
          </ThemedView>

          {/* Profile Settings */}
          <Card onLayout={registerBookmarkSection('profile')} style={[styles.sectionCard, { backgroundColor: cardBackgroundColour }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Profile
            </ThemedText>

            <ThemedView style={styles.formField}>
              <Input label='First Name' value={profileData.first_name} onChangeText={(text) => setProfileData(prev => ({ ...prev, first_name: text }))} placeholder="Enter first name" />
            </ThemedView>
            <ThemedView style={styles.formField}>
              <Input label='Middle Names' value={profileData.middle_names} onChangeText={(text) => setProfileData(prev => ({ ...prev, middle_names: text }))} placeholder="Enter middle names" />
            </ThemedView>

            <ThemedView style={styles.formField}>
              <Input label='Last Name' value={profileData.surname} onChangeText={(text) => setProfileData(prev => ({ ...prev, surname: text }))} placeholder="Enter last name" />
            </ThemedView>

            <ThemedView style={styles.formField}>
              <Input label='Email' value={userInfo?.email_address} editable={false} placeholder='Email Address - read only' style={styles.emailInput} />
              <ThemedText style={styles.helper}>Email cannot be changed</ThemedText>
            </ThemedView>

            <ThemedView style={styles.formField}>
              <Input label='Phone Number' value={profileData.primary_phone_number?.toString()} onChangeText={(text) => setProfileData(prev => ({ ...prev, primary_phone_number: Number.parseInt(text) }))}
                placeholder="Enter phone number" keyboardType="phone-pad" />
            </ThemedView>

            <ThemedView style={styles.formField}>
              <Button analyticsId="app_settings_set_date_of_birth" title={dobDisplay ? `Date of Birth: ${dobDisplay}` : 'Set Date of Birth'} variant="secondary" fullWidth onPress={() => setShowDatePicker(true)} />
              {showDatePicker && (<DateTimePicker value={profileData.birth_date ? new Date(profileData.birth_date) : new Date()} mode="date" display="default" maximumDate={new Date()} onValueChange={handleDatePick} />)}
            </ThemedView>

            <ThemedView style={styles.formField}>
              <Input label='Address Line 1' value={profileData.address_line_1} onChangeText={(text) => setProfileData(prev => ({ ...prev, address_line_1: text }))} placeholder="Enter address line 1" />
            </ThemedView>

            <ThemedView style={styles.formField}>
              <Input label='Address Line 2' value={profileData.address_line_2} onChangeText={(text) => setProfileData(prev => ({ ...prev, address_line_2: text }))} placeholder="Enter address line 2" />
            </ThemedView>

            <ThemedView style={styles.formField}>
              <Input label='City' value={profileData.city} onChangeText={(text) => setProfileData(prev => ({ ...prev, city: text }))} placeholder="Enter city" />
            </ThemedView>

            <ThemedView style={styles.formField}>
              <Input label='County' value={profileData.county} onChangeText={(text) => setProfileData(prev => ({ ...prev, county: text }))} placeholder="Enter county" />
            </ThemedView>

            <ThemedView style={styles.formField}>
              <Input label='Country' value={profileData.country} onChangeText={(text) => setProfileData(prev => ({ ...prev, country: text }))} placeholder="Enter country" />
            </ThemedView>

            <ThemedView style={styles.formField}>
              <Input label='Postcode' value={profileData.postcode} onChangeText={(text) => setProfileData(prev => ({ ...prev, postcode: text }))} placeholder="Enter postcode" />
            </ThemedView>

            <ThemedView style={styles.formField}>
              <Input label='Living Situation' value={profileData.living_situation} onChangeText={(text) => setProfileData(prev => ({ ...prev, living_situation: text }))} placeholder="Describe your living situation" />
            </ThemedView>

            <ThemedView style={styles.formField}>
              <ThemedText type="defaultSemiBold">Job Status</ThemedText>
              <Picker
                selectedValue={profileData.job_status}
                onValueChange={(value) => setProfileData(prev => ({ ...prev, job_status: value, }))}
                style={[styles.picker, { color: textColour, backgroundColor: inputBackgroundColour, borderColor: inputBorderColour }]}
                dropdownIconColor={textColour}
              >
                <Picker.Item label={'Pick a status...'} value={undefined} color={textColour} />
                {EMPLOYMENT_STATUSES.map((status) => (
                  <Picker.Item key={status} label={status} value={status} color={textColour} />
                ))}
              </Picker>
            </ThemedView>
            <Button analyticsId="app_settings_index_handle_profile_update" title={loading && activeSection === 'profile' ? 'Updating...' : 'Save Profile'} onPress={handleProfileUpdate} disabled={loading} style={styles.updateButton} />
            <Button analyticsId="app_settings_index_change_password" title="Change Password" variant="secondary" onPress={() => router.push('/(auth)/change-password')} style={styles.updateButton} />
          </Card>

          {/* Appearance Settings */}
          <Card onLayout={registerBookmarkSection('appearance')} style={[styles.sectionCard, { backgroundColor: cardBackgroundColour }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Appearance
            </ThemedText>

            <ThemedView style={styles.settingItem}>
              <ThemedText type='defaultSemiBold'>Theme</ThemedText>
              <ThemedView style={styles.themeOptions}>
                {themes.map((theme) => (
                  <TouchableOpacity analyticsId="app_settings_index_theme_option" analyticsControlType="filter" key={theme} style={[styles.themeOption, displayData.theme === theme && styles.themeOptionActive, { display: 'flex' }]}
                    onPress={() => setDisplayData(prev => ({ ...prev, theme }))}>
                    <ThemedText style={[styles.themeOptionText, displayData.theme === theme && styles.themeOptionTextActive]}>
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.settingItem}>
              <ThemedText type="defaultSemiBold">Default Font</ThemedText>
              <Picker
                selectedValue={displayData.default_font}
                onValueChange={(value) => setDisplayData(prev => ({ ...prev, default_font: value }))}
                style={[styles.picker, { color: textColour, backgroundColor: inputBackgroundColour, borderColor: inputBorderColour }]}
                dropdownIconColor={textColour}
              >
                {AVAILABLE_FONTS.map(font => (
                  <Picker.Item key={font.value} label={font.label} value={font.value} color={textColour} />
                ))}
              </Picker>
            </ThemedView>

            <Button analyticsId="app_settings_index_handle_display_settings_update" title={loading && activeSection === 'appearance' ? 'Updating...' : 'Save Appearance'} onPress={handleDisplaySettingsUpdate} disabled={loading} style={styles.updateButton} />
          </Card>

          {/* ToDo Settings */}
          <Card onLayout={registerBookmarkSection('tasks')} style={[styles.sectionCard, { backgroundColor: cardBackgroundColour }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Tasks
            </ThemedText>

            <ThemedView style={styles.settingItem}>
              <Input label="Due Soon Period (Days)" value={todoData.todo_soon_determiner === undefined ? '' : todoData.todo_soon_determiner.toString()} onChangeText={(text) => {
                if (text === '') {
                  setToDoData(prev => ({ ...prev, todo_soon_determiner: undefined }));
                  return;
                }

                const parsed = Number(text);
                if (!Number.isNaN(parsed)) {
                  setToDoData(prev => ({ ...prev, todo_soon_determiner: parsed }));
                }
              }}
                keyboardType="numeric" />
            </ThemedView>

            <Button analyticsId="app_settings_index_handle_to_do_settings_update"
              title={loading && activeSection === 'dashboard' ? 'Updating...' : 'Save Tasks'} onPress={handleToDoSettingsUpdate} disabled={loading} style={styles.updateButton} />
          </Card>

          {/* Transaction Settings */}
          <Card onLayout={registerBookmarkSection('budget')} style={[styles.sectionCard, { backgroundColor: cardBackgroundColour }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Budget
            </ThemedText>

            <ThemedView style={styles.settingItem}>
              <ThemedText type="defaultSemiBold">Preferred Currency Symbol</ThemedText>
              <Picker
                selectedValue={transactionData.preferred_currency || DEFAULT_CURRENCY_SYMBOL}
                onValueChange={(value) => setTransactionData(prev => ({ ...prev, preferred_currency: value }))}
                style={[styles.picker, { color: textColour, backgroundColor: inputBackgroundColour, borderColor: inputBorderColour }]}
                dropdownIconColor={textColour}
              >
                {MAJOR_CURRENCY_SYMBOLS.map(currency => (
                  <Picker.Item key={currency.label} label={currency.label} value={currency.value} color={textColour} />
                ))}
              </Picker>
              <ThemedText style={styles.helper}>
                Current symbol: {transactionData.preferred_currency || DEFAULT_CURRENCY_SYMBOL}
              </ThemedText>
            </ThemedView>

            <Button analyticsId="app_settings_index_handle_transaction_settings_update"
              title={loading && activeSection === 'transactions' ? 'Updating...' : 'Save Budget'} onPress={handleTransactionSettingsUpdate} disabled={loading} style={styles.updateButton} />
          </Card>

          {/*Chatbot Settings */}
          <Card onLayout={registerBookmarkSection('lifenest')} style={[styles.sectionCard, { backgroundColor: cardBackgroundColour }]}>
            <ThemedText type='subtitle' style={styles.sectionTitle}>
              LifeNest
            </ThemedText>
            {/* NEW: Color Picker */}
            <ThemedView style={styles.settingItem}>
              {chatBotData.background_colour && (
                <ColourPicker analyticsId="settings_chatbot_background_colour" label="Chatbot Background Colour" value={chatBotData.background_colour} onChange={(colour) =>
                  setChatBotData(prev => ({ ...prev, background_colour: colour }))
                } helperText="Used for chat background." />
              )}
            </ThemedView>
            <ThemedView style={styles.settingItem}>
              <ThemedText type='defaultSemiBold'>Preferred Model</ThemedText>
              <Picker
                selectedValue={chatBotData.preferred_model}
                onValueChange={(value) => setChatBotData(prev => ({ ...prev, preferred_model: value }))}
                style={[styles.picker, { color: textColour, backgroundColor: inputBackgroundColour, borderColor: inputBorderColour }]}
                dropdownIconColor={textColour}
              >
                {availableModels.map((model) => (
                  <Picker.Item key={model} label={model} value={model} color={textColour} />
                ))}
              </Picker>
            </ThemedView>
            <ThemedText style={styles.helper}>
              LifeNest reads enabled information live when answering each message. You can change these permissions at any time.
            </ThemedText>
            <Switch
              label="Grades"
              description="Allow LifeNest to use your saved grades, including for CV-ready education sections."
              value={chatBotData.grades_context_enabled ?? true}
              onValueChange={(value) => setChatBotData((previous) => ({ ...previous, grades_context_enabled: value }))}
            />
            <Switch
              label="Transactions"
              description="Allow LifeNest to use your saved income and spending records."
              value={chatBotData.transactions_context_enabled ?? true}
              onValueChange={(value) => setChatBotData((previous) => ({ ...previous, transactions_context_enabled: value }))}
            />
            <Switch
              label="Tasks"
              description="Allow LifeNest to use your ordinary task records."
              value={chatBotData.todos_context_enabled ?? true}
              onValueChange={(value) => setChatBotData((previous) => ({ ...previous, todos_context_enabled: value }))}
            />
            <Switch
              label="Checklists"
              description="Allow LifeNest to use checklist records and checklist items."
              value={chatBotData.checklists_context_enabled ?? true}
              onValueChange={(value) => setChatBotData((previous) => ({ ...previous, checklists_context_enabled: value }))}
            />
            <Button analyticsId="app_settings_index_handle_chat_bot_settings_update" title={loading && activeSection === 'chatBot' ? 'Updating...' : 'Save LifeNest'} onPress={handleChatBotSettingsUpdate} disabled={loading} style={styles.updateButton} />
          </Card>

          {/* Account Settings */}
          <Card onLayout={registerBookmarkSection('notifications')} style={[styles.sectionCard, { backgroundColor: cardBackgroundColour }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Notifications
            </ThemedText>
            <ThemedView style={[styles.settingItem]}>
              <Switch
                description={Platform.OS === 'web' ? 'Background notifications are available in the iOS and Android apps.' : 'Receive app notifications'}
                descriptionStyle={styles.settingDescription}
                label='Enable Notifications'
                value={Platform.OS === 'web' ? false : accountData.notifications_enabled === true}
                disabled={Platform.OS === 'web'}
                onValueChange={(value) => setAccountData(prev => ({ ...prev, notifications_enabled: value }))}
              />
            </ThemedView>
            <Button analyticsId="app_settings_index_handle_account_settings_update" title={loading && activeSection === 'account' ? 'Updating...' : 'Save Notifications'} onPress={handleAccountSettingsUpdate} disabled={loading || Platform.OS === 'web'} style={styles.updateButton} />
          </Card>

          {/* Purchasables */}
          <Card onLayout={registerBookmarkSection('purchases')} style={[styles.sectionCard, { backgroundColor: cardBackgroundColour }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Subscriptions and purchases
            </ThemedText>
            <ThemedView style={styles.purchaseSummary}>
              <ThemedView style={styles.purchaseStatusRow}>
                <ThemedText style={styles.purchaseStatusLabel}>Subscription</ThemedText>
                <ThemedText style={styles.purchaseStatusValue}>
                  {subscriptionProfile.isPremium
                    ? `${getSubscriptionPlanLabel(subscriptionProfile.entitlementProductId)} - ${getSubscriptionStatusLabel(subscriptionProfile.status)}`
                    : getSubscriptionStatusLabel(subscriptionProfile.status)}
                </ThemedText>
              </ThemedView>
              {subscriptionStartedAtLabel && (
                <ThemedView style={styles.purchaseStatusRow}>
                  <ThemedText style={styles.purchaseStatusLabel}>Started</ThemedText>
                  <ThemedText style={styles.purchaseStatusValue}>{subscriptionStartedAtLabel}</ThemedText>
                </ThemedView>
              )}
              <ThemedView style={styles.purchaseStatusRow}>
                <ThemedText style={styles.purchaseStatusLabel}>Ad-free access</ThemedText>
                <ThemedText style={styles.purchaseStatusValue}>{isAdFree ? 'Active' : 'Not active'}</ThemedText>
              </ThemedView>
              <ThemedView style={styles.purchaseStatusRow}>
                <ThemedText style={styles.purchaseStatusLabel}>LifeNest tokens</ThemedText>
                <ThemedText style={styles.purchaseStatusValue}>{`${lifeNestTokenBalance} token${lifeNestTokenBalance === 1 ? '' : 's'} available`}</ThemedText>
              </ThemedView>
              <Button
                analyticsId="app_settings_index_get_more"
                title="Get More"
                variant="secondary"
                onPress={handleGetMore}
                style={styles.actionButton}
              />
              <ThemedView style={styles.activePurchaseList}>
                <ThemedText type="defaultSemiBold">Active purchases</ThemedText>
                {hasKnownActivePurchases ? (
                  <>
                    {subscriptionProfile.isPremium && (
                      <ThemedText style={styles.purchaseNote}>{getSubscriptionPlanLabel(subscriptionProfile.entitlementProductId)}</ThemedText>
                    )}
                    {subscriptionProfile.hasRemoveAds && (
                      <ThemedText style={styles.purchaseNote}>Remove Ads</ThemedText>
                    )}
                    {lifeNestTokenBalance > 0 && (
                      <ThemedText style={styles.purchaseNote}>{`${lifeNestTokenBalance} LifeNest tokens remaining`}</ThemedText>
                    )}
                  </>
                ) : (
                  <ThemedText style={styles.purchaseNote}>No active subscription or one-time purchase found on this account.</ThemedText>
                )}
              </ThemedView>
            </ThemedView>
            {!isAdFree && (
              <Button analyticsId="app_settings_index_handle_remove_ads_purchase"
                title={loading ? 'Processing...' : 'Remove Ads'}
                variant="secondary"
                onPress={handleRemoveAdsEntry}
                disabled={loading}
                style={styles.actionButton}
              />
            )}
            <Button analyticsId="app_settings_index_handle_restore_purchases"
              title={loading ? 'Restoring...' : 'Restore purchases'}
              variant="secondary"
              onPress={handleRestorePurchases}
              disabled={loading}
              style={styles.actionButton}
            />
            {(isPremium || subscriptionProfile.status === 'cancelled' || subscriptionProfile.managementUrl) && (
              <Button analyticsId="app_settings_index_manage_subscription"
                title="Manage subscription"
                variant="secondary"
                onPress={handleUnsubscribeInfo}
                disabled={loading}
                style={styles.actionButton}
              />
            )}
          </Card>

          {/* Action Buttons */}
          <Card onLayout={registerBookmarkSection('more')} style={[styles.sectionCard, { backgroundColor: cardBackgroundColour }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              More
            </ThemedText>

            <Button analyticsId="app_settings_index_contact_feedback" title="Contact & Feedback" variant="secondary" onPress={() => router.replace('/helpAndFeedback')}
              style={styles.actionButton} />
            {REQUIRED_LEGAL_DOCUMENTS.map((document) => (
              <Button
                key={document.key}
                analyticsId={`app_settings_index_open_${document.key}`}
                title={document.shortTitle}
                variant="secondary"
                onPress={() => router.push(document.route as any)}
                style={styles.actionButton}
              />
            ))}

            <Button analyticsId="app_settings_index_handle_delete_account" title={loading ? 'Deleting Account...' : 'Delete My Account'} variant="danger" onPress={handleDeleteAccount} disabled={loading} style={styles.actionButton} />
            <Button analyticsId="app_settings_index_logout" title="Logout" variant="warning" onPress={handleLogout} style={styles.actionButton} />
          </Card>

          <Card analyticsId="settings_open_project_website" style={styles.producerCard} onPress={handleOpenProjectWebsite}>
            {/* <Image source={require('../../assets/images/icon.png')} style={styles.producerLogo} resizeMode="contain" /> */}
            <ThemedText type="subtitle" style={styles.producerTitle}>
              Personal portfolio project
            </ThemedText>
            <ThemedText style={styles.producerLink}>{PROJECT_WEBSITE_LABEL}</ThemedText>
            <ThemedText style={styles.producerEmail}>{PROJECT_SUPPORT_EMAIL}</ThemedText>
          </Card>
        </ThemedView>
      </ScrollView>
      <ThemedView style={[styles.bookmarkBar, { backgroundColor: cardBackgroundColour, borderColor: inputBorderColour }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bookmarkRow}>
          {SETTINGS_BOOKMARKS.map(bookmark => (
            <TouchableOpacity key={bookmark.key} analyticsId="app_settings_bookmark" analyticsControlType="filter" onPress={() => scrollToBookmark(bookmark.key)}>
              <Chip label={bookmark.label} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ThemedView>
      {updateMessage && (
        <ThemedView style={[styles.fixedMessageCard, { backgroundColor: updateMessage.isSuccess ? '#D1FAE5' : '#FEE2E2' }]}>
          <ThemedText style={[styles.messageText, { color: updateMessage.isSuccess ? '#065F46' : '#991B1B' }]}>{updateMessage.message}</ThemedText>
        </ThemedView>
      )}
      {Platform.OS === 'web' && (
        <Modal transparent visible={showWebPurchaseChoice} animationType="fade"
          onRequestClose={() => setShowWebPurchaseChoice(false)}>
          <ThemedView style={styles.purchaseChoiceBackdrop}>
            <ThemedView style={[styles.purchaseChoiceCard, { backgroundColor: cardBackgroundColour, borderColor: inputBorderColour }]}>
              <ThemedText type="subtitle" style={styles.purchaseChoiceTitle}>Get more LifeNest tokens</ThemedText>
              <ThemedText style={styles.purchaseChoiceMessage}>
                Choose a one-time token bundle, or subscribe for 500 tokens every month while your subscription is active.
              </ThemedText>
              <Button analyticsId="app_settings_index_get_more_tokens" title="Buy a token bundle"
                variant="secondary" onPress={() => void handleWebPurchaseChoice('tokens')}
                style={styles.actionButton}               />
              <Button
                analyticsId="app_settings_index_get_more_subscription" title="Subscribe - 500 tokens monthly"
                variant="primary" onPress={() => void handleWebPurchaseChoice('subscriptions')}
                style={styles.actionButton} />
              <Button analyticsId="app_settings_index_get_more_cancel"
                title="Cancel" variant="secondary" onPress={() => setShowWebPurchaseChoice(false)}
                style={styles.purchaseChoiceCancel} />
            </ThemedView>
          </ThemedView>
        </Modal>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
        width: Platform.OS === 'web' ? '70%' : '100%',
    alignSelf: 'center',
  },
  header: {
    gap: 13,
    marginBottom: 22,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColours.brandDark,
  },
  brandMarkText: {
    color: BrandColours.ice,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0,
  },
  profileHero: {
    gap: 10,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    color: BrandColours.ice,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0,
  },
  profileHeroTitle: {
    fontSize: 34,
    lineHeight: 37,
    fontWeight: '700',
    letterSpacing: 0,
  },
  profileHeroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 420,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 13,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  fixedMessageCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 78,
    padding: 12,
    borderRadius: 8,
    zIndex: 20,
    ...Platform.select({ web: { boxShadow: '0 2px 10px rgba(30, 28, 25, 0.16)' } as object, default: { elevation: 6 } }),
  },
  messageText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  bookmarkBar: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 18,
    zIndex: 20,
  },
  bookmarkRow: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  sectionCard: {
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  formField: {
    marginBottom: 20,
  },
  emailInput: {
    backgroundColor: '#F8F9FA',
    color: '#272626ff',
    opacity: 1,
  },
  disabledInput: {
    opacity: 0.6,
  },
  helper: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  settingItem: {
    marginBottom: 12,
  },
  picker: {
    minHeight: 52,
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
  },
  settingMain: {
    marginRight: 16,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 6,
  },
  themeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: BrandColours.brandLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeOptionActive: {
    backgroundColor: BrandColours.electricBlue,
    borderColor: BrandColours.cyan,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  themeOptionTextActive: {
    color: 'white',
  },
  numberInput: {
    maxWidth: 100,
    alignSelf: 'flex-end',
  },
  fontInput: {
    maxWidth: 200,
  },
  updateButton: {
    marginTop: 8,
  },
  actionButton: {
    marginBottom: 12,
  },
  purchaseChoiceBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(20, 18, 15, 0.46)',
  },
  purchaseChoiceCard: {
    width: '100%',
    maxWidth: 460,
    padding: 20,
    borderWidth: 1,
    borderRadius: 18,
    ...Platform.select({ web: { boxShadow: '0 8px 30px rgba(30, 28, 25, 0.22)' } as object, default: { elevation: 8 } }),
  },
  purchaseChoiceTitle: {
    marginBottom: 8,
  },
  purchaseChoiceMessage: {
    lineHeight: 21,
    marginBottom: 16,
  },
  purchaseChoiceCancel: {
    marginTop: 2,
  },
  purchaseSummary: {
    gap: 10,
    marginBottom: 16,
  },
  purchaseStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  purchaseStatusLabel: {
    flex: 1,
    fontSize: 14,
    opacity: 0.72,
  },
  purchaseStatusValue: {
    flex: 1.4,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  activePurchaseList: {
    gap: 4,
    marginTop: 4,
  },
  purchaseNote: {
    fontSize: 14,
    lineHeight: 20,
  },
  purchaseFinePrint: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.68,
    marginTop: 4,
  },
  producerCard: {
    alignItems: 'center',
    gap: 8,
    padding: 1,
    backgroundColor: BrandColours.graphite,
    borderColor: BrandColours.electricBlue,
  },
  // producerLogo: {
  //   width: '100%',
  //   height: 140,
  // },
  producerTitle: {
    color: BrandColours.ice,
    textAlign: 'center',
  },
  producerLink: {
    color: BrandColours.cyan,
    fontWeight: '700',
    textAlign: 'center',
  },
  producerEmail: {
    color: BrandColours.ice,
    fontWeight: '600',
    textAlign: 'center',
  },
  dangerCard: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  dangerTitle: {
    color: '#DC2626',
  },
  dangerWarning: {
    fontSize: 14,
    color: '#991B1B',
    marginBottom: 16,
    lineHeight: 20,
  },
  dangerButton: {
    backgroundColor: '#DC2626',
  },
});
