import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { showAlert } from '@/hooks/dataHandler';
import { authService, getAuthErrorAlert } from '@/services/authService';

/** Handles sending and verifying the Supabase password recovery code flow. */
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [showCodeStep, setShowCodeStep] = useState(false);

  /** Sends a recovery email through Supabase Auth. */
  const handleSendEmail = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      showAlert('Missing Email', 'Please enter your email address.');
      return;
    }

    try {
      setIsSendingEmail(true);
      await authService.resetPassword(normalizedEmail);
      setShowCodeStep(true);
      showAlert('Recovery email sent', 'If this email exists, we sent a reset message with a verification code.');
    } catch (error) {
      const { title, message } = getAuthErrorAlert(error, 'resetPassword');
      showAlert(title, message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  /** Verifies the recovery code and moves the user to password reset. */
  const handleVerifyCode = async () => {
    const normalizedEmail = email.trim();
    const normalizedCode = code.trim();

    if (!normalizedEmail || !normalizedCode) {
      showAlert('Missing Information', 'Please enter both email and verification code.');
      return;
    }

    try {
      setIsVerifyingCode(true);
      await authService.verifyRecoveryCode(normalizedEmail, normalizedCode);
      router.replace('/(auth)/change-password?fromRecovery=true');
    } catch (error) {
      const { title, message } = getAuthErrorAlert(error, 'verifyRecoveryCode');
      showAlert(title, message);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  return (
    <KeyboardAvoidingView enabled={Platform.OS === 'ios'} style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>Forgot Password</ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>
              Enter your account email and we will send password reset instructions.
            </ThemedText>
          </View>

          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            style={styles.input}
          />

          <Button analyticsId="app_forgot_password_handle_send_email"
            title={isSendingEmail ? 'Sending...' : 'Send recovery email'}
            onPress={handleSendEmail}
            loading={isSendingEmail}
            disabled={isSendingEmail}
          />

          {showCodeStep && (
            <View style={styles.codeStep}>
              <Input
                label="Verification code"
                placeholder="Enter the code from your email"
                value={code}
                onChangeText={setCode}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
              <Button analyticsId="app_forgot_password_handle_verify_code"
                title={isVerifyingCode ? 'Verifying...' : 'Verify code'}
                onPress={handleVerifyCode}
                loading={isVerifyingCode}
                disabled={isVerifyingCode}
              />
            </View>
          )}
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
    gap: 12,
  },
  header: {
    marginBottom: 16,
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
  codeStep: {
    marginTop: 8,
    gap: 8,
  },
  linkButton: {
    marginTop: 4,
  },
});
