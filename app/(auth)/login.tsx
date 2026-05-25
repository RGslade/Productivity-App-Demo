import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Linking, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { showAlert } from '@/hooks/dataHandler';
import { getAuthErrorAlert } from '@/services/authService';

//Handle the login screen.
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, startGoogleSignIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  //Called when login is pressed so handles all login operations.
  const handleLogin = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      console.warn('[Auth][LoginScreen] Validation failed before submit', {
        hasEmail: Boolean(normalizedEmail),
        hasPassword: Boolean(password),
      });
      showAlert('Missing Information', 'Please fill in both email and password');
      return;
    }

    try {
      setLoading(true);
      const result = await login({ email: normalizedEmail, password });//Call the login method which itself does a lot of verifications and backend work.

      if (result.status === 'incomplete_profile') { //If login worked but account with mandatory informaton is not completed.
        showAlert('Complete your account', 'Your email and password are valid, but your account setup was not finished. We will take you to the completion screen now.',
          [{text: 'Continue', //Takes the user to the register page automatically on press.
            onPress: () => router.replace({pathname: '/(auth)/register',
              params: {
                isCompleting: 'true',
                prefillEmail: result.prefill?.email || normalizedEmail,
                prefillFirstName: result.prefill?.first_name || '',
                prefillMiddleNames: result.prefill?.middle_names || '',
                prefillLastName: result.prefill?.surname || '',
                prefillBirthDate: result.prefill?.birth_date || '',
                prefillJobStatus: result.prefill?.job_status || '',
                prefillTermsAccepted: result.prefill?.terms_accepted ? 'true' : 'false',
                prefillPrivacyAccepted: result.prefill?.privacy_policy_accepted ? 'true' : 'false',
              },}), style: 'default', }]
        );
        return;
      }
    } catch (error: any) {
      const { title, message } = getAuthErrorAlert(error, 'login');
      showAlert(title, message);
    }
    finally {
      setLoading(false);
    }
  };

  //Handle the Google sign-in entry point.
  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      const providerUrl = await startGoogleSignIn();
      await Linking.openURL(providerUrl);
    } catch (error) {
      console.error('[Auth][LoginScreen] Google sign-in failed', error);
      showAlert('Coming Soon', 'Google sign in has not yet been implemented and will be coming soon.');
    } finally {
      setGoogleLoading(false);
    }
  };

  //Handle the register button press.
  const handleRegister = () => {
    router.push('/(auth)/register');
  };

  //Handle the forgot password button press.
  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  //Render the view.
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Welcome Back
            </ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>
              Sign in to continue your journey
            </ThemedText>
          </View>
          <View style={styles.form}>
            <Input placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address"
              autoCapitalize="none" autoCorrect={false} style={styles.input} autoComplete='email' />
            <View style={styles.passwordContainer}>
              <Input placeholder="Password" value={password} onChangeText={setPassword}
                secureTextEntry={!showPassword} style={[styles.input, styles.passwordInput]}
                autoComplete='current-password'/>
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)} >
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Button title={loading ? "Signing In..." : "Sign In"} onPress={handleLogin} loading={loading} disabled={loading} style={styles.loginButton} />
            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordLink}>
              <ThemedText style={styles.forgotPasswordText}>Forgot password?</ThemedText>
            </TouchableOpacity>
            <Button title="Create Account" onPress={handleRegister} variant="secondary" fullWidth />
            <View style={styles.separatorContainer}>
              <View style={styles.separatorLine} />
              <ThemedText style={styles.separatorText}>or sign up/in with</ThemedText>
              <View style={styles.separatorLine} />
            </View>
            <Button title={googleLoading ? 'Opening Google...' : 'Continue with Google'}
              onPress={handleGoogleSignIn} loading={googleLoading} disabled={loading || googleLoading}
              fullWidth/>
          </View>
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
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
    zIndex: 5,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 10,
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  forgotPasswordLink: {
    marginBottom: 16,
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#cbd5e1',
  },
  separatorText: {
    fontSize: 13,
    opacity: 0.7,
  }
});
