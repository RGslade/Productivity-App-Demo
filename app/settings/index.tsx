import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollView, StyleSheet, Alert, TouchableOpacity, Linking, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { useSettings, useUpdateAccountSettings, useUpdateChatBotSettings, useUpdateDisplaySettings, useUpdateToDoSettings, useUpdateTransactionSettings } from '@/hooks/useSettings';
import { userService } from '@/services/userService';
import { UpdateProfileRequest, UserInfo } from '@/types/user';
import { SettingsSection, UserSettingsAccount, UserSettingsChatBot, UserSettingsDisplay, UserSettingsToDo, UserSettingsTransactions } from '@/types/settings';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AVAILABLE_FONTS } from '@/constants/Fonts';
import { DEFAULT_CURRENCY_SYMBOL, MAJOR_CURRENCY_SYMBOLS } from '@/constants/CurrencySymbols';
import { EMPLOYMENT_STATUSES } from '@/constants/employment';
import { lifeNestService } from '@/services/lifeNestService';
import { ColourPicker } from '@/components/ui/ColourPicker';
import { useThemeColour } from '@/hooks/useThemeColour';
import { validateAuthUser } from '@/hooks/dataHandler';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { deriveSubscriptionProfile, findPackageByKind } from '@/services/subscriptionService';
import { BrandColours } from '@/constants/Colours';

export default function SettingsScreen() {
  const { userInfo, logout } = useAuth();
  const { restorePurchases, purchasePackage, customerInfo, offerings, isConfigured, configurationError, isPremium } = useSubscriptions();
  const { accountSettings, displaySettings, todoSettings, transactionSettings, chatBotSettings } = useSettings();
  const updateAccountSettings = useUpdateAccountSettings();
  const updateDisplaySettings = useUpdateDisplaySettings();
  const updateToDoSettings = useUpdateToDoSettings();
  const updateTransactionSettings = useUpdateTransactionSettings();
  const updateChatBotSettings = useUpdateChatBotSettings();
  const [loading, setLoading] = useState(false);
  const purchaseInFlightRef = useRef(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>(null);
  const [updateMessage, setUpdateMessage] = useState<{ message: string; isSuccess: boolean } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const themes = ['light', 'dark', 'system'] as const;
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const backgroundColour = useThemeColour({}, 'background');
  const cardBackgroundColour = useThemeColour({}, 'cardBackground');
  const textColour = useThemeColour({}, 'text');
  const inputBackgroundColour = useThemeColour({}, 'inputBackground');
  const inputBorderColour = useThemeColour({}, 'inputBorder');

  useEffect(() => {
    let mounted = true;

    lifeNestService.getModels()
      .then(models => {
        if (mounted) setAvailableModels(models);
      })
      .catch(err => {
        console.error('Operation failed');
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
  });
  const removeAdsPackage = findPackageByKind(offerings, 'remove_ads');
  const subscriptionProfile = deriveSubscriptionProfile(customerInfo);
  const isAdFree = subscriptionProfile.isAdFree;

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

    if (chatBotSettings) setChatBotData({ preferred_model: chatBotSettings.preferred_model, background_colour: chatBotSettings.background_colour });
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
      console.error('Profile update failed', error);
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
      console.error('Account settings update failed', error);
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
      console.error('Display settings update failed', error);
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
      console.error('Task settings update failed', error);
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
      console.error('Transaction settings update failed', error);
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
      console.error('LifeNest settings update failed', error);
      showMessage('Failed to update ChatBot settings.', false);
    } finally {
      setLoading(false);
      setActiveSection(null);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert('Delete Account', 'Are you sure you want to delete your account? You cannot get it back after deletion.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await userService.deleteAccount();
              Alert.alert('Account Deleted', 'Your account has been permanently deleted.', [{ text: 'OK', onPress: () => logout() }]);
            } catch (error) {
              console.error('Account deletion failed', error);
              Alert.alert('Delete Account Failed', 'We could not delete your account. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?',
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
      Alert.alert(
        'Purchases unavailable',
        configurationError
          ? `Purchases are not configured for this session. ${configurationError}`
          : 'Purchases are currently unavailable. Please try again shortly.'
      );
      return;
    }

    try {
      purchaseInFlightRef.current = true;
      setLoading(true);
      const restoredCustomerInfo = await restorePurchases();
      const profile = deriveSubscriptionProfile(restoredCustomerInfo);
      Alert.alert(
        profile.isAdFree ? 'Purchases restored' : 'Nothing to restore',
        profile.isAdFree
          ? 'Your subscriptions or non-consumable purchases were restored successfully on this account.'
          : 'No active subscription or non-consumable purchase was found for this store account. LifeNest token balances are synced to your signed-in account and do not need store restore.'
      );
    } catch (error) {
      console.error('Purchase restore failed', error);
      Alert.alert('Restore failed', 'We could not restore purchases. Please try again.');
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
      Alert.alert(
        'Purchases unavailable',
        configurationError
          ? `Purchases are not configured for this session. ${configurationError}`
          : 'Purchases are currently unavailable. Please try again shortly.'
      );
      return;
    }

    if (!removeAdsPackage) {
      Alert.alert('Remove Ads unavailable', 'The Remove Ads product is not currently available.');
      return;
    }

    try {
      purchaseInFlightRef.current = true;
      setLoading(true);
      const purchasedCustomerInfo = await purchasePackage(removeAdsPackage);
      const profile = deriveSubscriptionProfile(purchasedCustomerInfo);
      Alert.alert(
        profile.isAdFree ? 'Purchase successful' : 'Purchase complete',
        profile.isAdFree
          ? 'Remove Ads is now active on this account.'
          : 'Purchase completed but has not activated yet. Please restore purchases if needed.'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (message.includes('cancel')) return;
      console.error('Operation failed');
      Alert.alert('Purchase failed', 'We could not complete the Remove Ads purchase. Please try again.');
    } finally {
      purchaseInFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleUnsubscribeInfo = async () => {
    const profile = deriveSubscriptionProfile(customerInfo);
    const managementUrl = profile.managementUrl;
    const platformLabel = Platform.OS === 'ios' ? 'App Store subscriptions' : 'Google Play subscriptions';
    const instructions =
      Platform.OS === 'ios'
        ? 'Open iPhone Settings, tap your Apple ID, then Subscriptions. Select Productivity Mobile App and cancel renewal.'
        : 'Open Google Play Store, tap profile, Payments & subscriptions, then Subscriptions. Select Productivity Mobile App and cancel renewal.';

    if (managementUrl) {
      Alert.alert(
        'Manage subscription',
        `${instructions}\n\nYou can also open ${platformLabel} directly now.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open store subscriptions',
            onPress: async () => {
              try {
                await Linking.openURL(managementUrl);
              } catch (error) {
                console.error('Opening subscription management URL failed', error);
                Alert.alert('Unable to open', 'Could not open the subscription page automatically.');
              }
            },
          },
        ]
      );
      return;
    }

    Alert.alert('Manage subscription', instructions);
  };

  const formatDOBForDisplay = (isoDate?: string) => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatDOBForDB = (displayDate: string) => {
    const [day, month, year] = displayDate.split('/');
    if (!day || !month || !year) return '';
    return `${year}-${month}-${day}`;
  };

  const handleDOBChange = (text: string) => {
    // Keep only date digits so the input always formats the same way.
    let digits = text.replace(/\D/g, '');

    // DDMMYYYY is the only valid shape for this input.
    if (digits.length > 8) digits = digits.slice(0, 8);

    let formatted = digits;

    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }

    setProfileData(prev => ({ ...prev, birth_date: formatDOBForDB(formatted) }));
    setDobDisplay(formatted);
  };

  const [dobDisplay, setDobDisplay] = useState(formatDOBForDisplay(profileData.birth_date));

  useEffect(() => {
    if (profileData.birth_date) setDobDisplay(formatDOBForDisplay(profileData.birth_date));
  }, [profileData.birth_date]);

  /** Opens the Demo Publisher website from the producer card. */
  const handleOpenPublisherSite = async () => {
    const url = 'https://example.com';
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Opening publisher site failed', error);
      Alert.alert('Unable to open', 'Could not open Demo Publisher right now.');
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
    <ThemedView style={[styles.container]}>
      <ScrollView style={[styles.scrollContainer]}>
        <ThemedView style={styles.content} darkColour={backgroundColour} lightColour={backgroundColour}>
          <ThemedView style={styles.header} darkColour={backgroundColour} lightColour={backgroundColour}>
            <ThemedText type="title" style={styles.title}>
              Settings & Feedback
            </ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>
              Account, app, and purchases
            </ThemedText>
            <Button title="Grades" onPress={() => router.replace('/grades')} style={styles.gradesButton} />
          </ThemedView>

          {/* Update Message */}
          {updateMessage && (
            <ThemedView style={[styles.messageCard, { backgroundColor: updateMessage.isSuccess ? '#D1FAE5' : '#FEE2E2' }]}>
              <ThemedText style={[styles.messageText, { color: updateMessage.isSuccess ? '#065F46' : '#991B1B' }]}>
                {updateMessage.message}
              </ThemedText>
            </ThemedView>
          )}

          {/* Profile Settings */}
          <Card style={[styles.sectionCard, { backgroundColor: cardBackgroundColour }]}>
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
              <Input label="Date of Birth" value={dobDisplay} onChangeText={handleDOBChange} placeholder="DD/MM/YYYY" keyboardType="number-pad" maxLength={10} onFocus={() => setShowDatePicker(true)} />
              {showDatePicker && (<DateTimePicker value={profileData.birth_date ? new Date(profileData.birth_date) : new Date()} mode="date" display="default" maximumDate={new Date()} onChange={handleDatePick} />)}
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
            <Button title={loading && activeSection === 'profile' ? 'Updating...' : 'Save Profile'} onPress={handleProfileUpdate} disabled={loading} style={styles.updateButton} />
            <Button title="Change Password" variant="secondary" onPress={() => router.push('/(auth)/change-password')} style={styles.updateButton} />
          </Card>

          {/* Appearance Settings */}
          <Card style={[styles.sectionCard, { backgroundColor: cardBackgroundColour }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Appearance
            </ThemedText>

            <ThemedView style={styles.settingItem}>
              <ThemedText type='defaultSemiBold'>Theme</ThemedText>
              <ThemedView style={styles.themeOptions}>
                {themes.map((theme) => (
                  <TouchableOpacity key={theme} style={[styles.themeOption, displayData.theme === theme && styles.themeOptionActive, { display: 'flex' }]}
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

            <Button title={loading && activeSection === 'appearance' ? 'Updating...' : 'Save Appearance'} onPress={handleDisplaySettingsUpdate} disabled={loading} style={styles.updateButton} />
          </Card>

          {/* ToDo Settings */}
          <Card style={[styles.sectionCard, { backgroundColor: cardBackgroundColour }]}>
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

            <Button
              title={loading && activeSection === 'dashboard' ? 'Updating...' : 'Save Tasks'} onPress={handleToDoSettingsUpdate} disabled={loading} style={styles.updateButton} />
          </Card>

          {/* Transaction Settings */}
          <Card style={[styles.sectionCard, { backgroundColor: cardBackgroundColour }]}>
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

            <Button
              title={loading && activeSection === 'transactions' ? 'Updating...' : 'Save Budget'} onPress={handleTransactionSettingsUpdate} disabled={loading} style={styles.updateButton} />
          </Card>

          {/*Chatbot Settings */}
          <Card style={[styles.sectionCard, { backgroundColor: cardBackgroundColour }]}>
            <ThemedText type='subtitle' style={styles.sectionTitle}>
              LifeNest
            </ThemedText>
            {/* NEW: Color Picker */}
            <ThemedView style={styles.settingItem}>
              {chatBotData.background_colour && (
                <ColourPicker label="Chatbot Background Colour" value={chatBotData.background_colour} onChange={(colour) =>
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
            <Button title={loading && activeSection === 'chatBot' ? 'Updating...' : 'Save LifeNest'} onPress={handleChatBotSettingsUpdate} disabled={loading} style={styles.updateButton} />
          </Card>

          {/* Account Settings */}
          <Card style={[styles.sectionCard, { backgroundColor: cardBackgroundColour }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Notifications
            </ThemedText>
            <ThemedView style={[styles.settingItem]}>
              <Switch description='Receive app notifications' descriptionStyle={styles.settingDescription} label='Enable Notifications' value={accountData.notifications_enabled === true} onValueChange={(value) => setAccountData(prev => ({ ...prev, notifications_enabled: value }))} />
            </ThemedView>
            <Button title={loading && activeSection === 'account' ? 'Updating...' : 'Save Notifications'} onPress={handleAccountSettingsUpdate} disabled={loading} style={styles.updateButton} />
          </Card>

          {/* Purchasables */}
          <Card style={[styles.sectionCard, { backgroundColor: cardBackgroundColour }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Purchases
            </ThemedText>
            <Button
              title="Get Tokens"
              variant="secondary"
              onPress={() => router.push('/subscribe')}
              style={styles.actionButton}
            />
            {!isAdFree && (
              <Button
                title={loading ? 'Processing...' : 'Remove Ads'}
                variant="secondary"
                onPress={handleRemoveAdsPurchase}
                disabled={loading}
                style={styles.actionButton}
              />
            )}
            <Button
              title={loading ? 'Restoring...' : 'Restore Purchase'}
              variant="secondary"
              onPress={handleRestorePurchases}
              disabled={loading}
              style={styles.actionButton}
            />
          </Card>

          {/* Action Buttons */}
          <Card style={[styles.sectionCard, { backgroundColor: cardBackgroundColour }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              More
            </ThemedText>

            <Button title="Contact & Feedback" variant="secondary" onPress={() => router.replace('/helpAndFeedback')}
              style={styles.actionButton} />
            {isPremium && (
              <Button
                title="Unsubscribe"
                variant="secondary"
                onPress={handleUnsubscribeInfo}
                style={styles.actionButton}
              />
            )}

            <Button title={loading ? 'Deleting Account...' : 'Delete My Account'} variant="danger" onPress={handleDeleteAccount} disabled={loading} style={styles.actionButton} />
            <Button title="Logout" variant="warning" onPress={handleLogout} style={styles.actionButton} />
          </Card>

          <Card style={styles.producerCard} onPress={handleOpenPublisherSite}>
            <Image source={require('../../assets/images/icon.png')} style={styles.producerLogo} resizeMode="contain" />
            <ThemedText type="subtitle" style={styles.producerTitle}>
              Produced by Demo Publisher
            </ThemedText>
            <ThemedText style={styles.producerLink}>example.com</ThemedText>
          </Card>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
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
  gradesButton: {
    marginTop: 10,
  },
  messageCard: {
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
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
  updateButton: {
    marginTop: 8,
  },
  actionButton: {
    marginBottom: 12,
  },
  producerCard: {
    alignItems: 'center',
    gap: 8,
    padding: 18,
    backgroundColor: BrandColours.graphite,
    borderColor: BrandColours.electricBlue,
  },
  producerLogo: {
    width: '100%',
    height: 140,
  },
  producerTitle: {
    color: BrandColours.ice,
    textAlign: 'center',
  },
  producerLink: {
    color: BrandColours.cyan,
    fontWeight: '700',
    textAlign: 'center',
  },
});
