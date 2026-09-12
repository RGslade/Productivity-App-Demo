import { TrackedTouchableOpacity as TouchableOpacity } from '@/components/ui/TrackedTouchableOpacity';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { showAlert } from '@/hooks/dataHandler';
import { useAuth } from '@/hooks/useAuth';
import { authService, getAuthErrorAlert } from '@/services/authService';

/** Renders the password change form for both in-session and recovery flows. */
export default function ChangePasswordScreen() {
  const { fromRecovery } = useLocalSearchParams<{ fromRecovery?: string }>();
  const isRecoveryFlow = fromRecovery === 'true';
  const { isAuthenticated } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  /** Validates and submits the password update payload. */
  const handleChangePassword = async () => {
    if (!isRecoveryFlow && !isAuthenticated) {
      showAlert('Sign in required', 'Please sign in first and then retry changing your password.');
      router.replace('/(auth)/login');
      return;
    }

    if (!isRecoveryFlow && !currentPassword) {
      showAlert('Missing password', 'Please enter your current password.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      showAlert('Missing information', 'Please enter and confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('Passwords do not match', 'Your new password and confirmation must match.');
      return;
    }

    try {
      setLoading(true);
      await authService.changePassword({
        currentPassword: isRecoveryFlow ? '' : currentPassword,
        newPassword,
      });
      showAlert('Password updated', 'Your password has been changed successfully.');
      router.replace(isRecoveryFlow ? '/(auth)/login' : '/settings');
    } catch (error) {
      const { title, message } = getAuthErrorAlert(error, 'changePassword');
      showAlert(title, message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView enabled={Platform.OS === 'ios'} style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>Change Password</ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>
              {isRecoveryFlow
                ? 'Set a new password for your account.'
                : 'Confirm your current password before setting a new one.'}
            </ThemedText>
          </View>

          {!isRecoveryFlow && (
            <View style={styles.passwordContainer}>
              <Input
                label="Current Password"
                placeholder="Enter current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                autoComplete="current-password"
                style={[styles.input, styles.passwordInput]}
              />
              <TouchableOpacity analyticsId="app_change_password_eye_icon_3" analyticsControlType="icon" style={styles.eyeIcon} onPress={() => setShowCurrentPassword((prev) => !prev)}>
                <Ionicons name={showCurrentPassword ? 'eye-off' : 'eye'} size={22} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.passwordContainer}>
            <Input
              label="New Password"
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              autoComplete="new-password"
              style={[styles.input, styles.passwordInput]}
            />
            <TouchableOpacity analyticsId="app_change_password_eye_icon_2" analyticsControlType="icon" style={styles.eyeIcon} onPress={() => setShowNewPassword((prev) => !prev)}>
              <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordContainer}>
            <Input
              label="Confirm New Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoComplete="new-password"
              style={[styles.input, styles.passwordInput]}
            />
            <TouchableOpacity analyticsId="app_change_password_eye_icon" analyticsControlType="icon" style={styles.eyeIcon} onPress={() => setShowConfirmPassword((prev) => !prev)}>
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <Button analyticsId="app_change_password_handle_change_password"
            title={loading ? 'Updating password...' : 'Update password'}
            onPress={handleChangePassword}
            loading={loading}
            disabled={loading}
          />
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {

    width: '100%',
    maxWidth: Platform.OS === 'web' ? '70%' : 1200,
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    gap: 10,
  },
  header: {
    marginBottom: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.75,
  },
  input: {
    marginBottom: 10,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 46,
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    top: 38,
    zIndex: 10,
  },
});
