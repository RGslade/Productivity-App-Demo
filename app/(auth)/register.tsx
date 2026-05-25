import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, showAlert } from '@/hooks/dataHandler';
import { getAuthErrorAlert } from '@/services/authService';
import { EMPLOYMENT_STATUSES, EmploymentStatus } from '@/constants/employment';

//Returns the arrays first value if the param is an array (and an empty string if the array is empty) or the value itself if its a string (or an empty string if its undefined).
function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

//Handle Register Screen
export default function RegisterScreen() {
  const params = useLocalSearchParams();
  const isCompleting = readParam(params.isCompleting) === 'true';
  const prefillBirthDate = readParam(params.prefillBirthDate);
  const authProvider = readParam(params.authProvider);
  const isThirdPartyCompletion = Boolean(authProvider);
  const [firstName, setFirstName] = useState(readParam(params.prefillFirstName));
  const [middleNames, setMiddleNames] = useState(readParam(params.prefillMiddleNames));
  const [lastName, setLastName] = useState(readParam(params.prefillLastName));
  const [email, setEmail] = useState(readParam(params.prefillEmail));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthdate, setBirthdate] = useState(prefillBirthDate ? new Date(prefillBirthDate) : new Date());
  const [jobStatus, setJobStatus] = useState<EmploymentStatus | undefined>((readParam(params.prefillJobStatus) as EmploymentStatus) || undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, completeAccount, logout, user } = useAuth();
  const [is_premium_user] = useState(false);
  const [loading, setLoading] = useState(false);
  const canSubmitCompletion = useMemo(() => !isCompleting || Boolean(user?.id), [isCompleting, user]);

  const isEmailValid = (value: string) => {
    const emailRule = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRule.test(value.trim()); //Checks if the value matches the pattern of a valid email address.
  };

  const isPasswordValid = (value: string) => {
    const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    return passwordRule.test(value); //Checks if the password matches the characters, which matches the supabase requirements for a strong password.
  };

  //Handles the register button press.
  const handleRegister = async () => {
    try {
      setLoading(true);

      if (!firstName || !lastName || !email || !birthdate) {
        showAlert('Missing Information', 'Please fill in all non-Optional information');
        return;
      }

      if (!isEmailValid(email)) {
        showAlert('Invalid Email', 'Please enter a valid email address.');
        return;
      }

      if (!isCompleting) {
        if (!password || !confirmPassword) {
          showAlert('Missing Information', 'Please enter and confirm your password.');
          return;
        }

        if (!isPasswordValid(password)) {
          showAlert('Invalid Password', 'Password must be at least 8 characters and include 1 lowercase letter, 1 uppercase letter, 1 number, and 1 symbol.');
          return;
        }

        if (password !== confirmPassword) {
          showAlert('Passwords Do Not Match', 'Please re-enter your password and confirm password so they match.');
          return;
        }
      }

      // The Payload which will be submitted for registering.
      const submission = {firstName, surname: lastName, middleNames, email, password, birthDate: birthdate.toISOString(), job_status: jobStatus, is_premium_user, };

      if (isCompleting) {await completeAccount(submission);} else {await register(submission);}
      
    } catch (error: any) {
      const { title, message } = getAuthErrorAlert(error, 'register');
      showAlert(title, message);
    }
    finally {
      setLoading(false);
    }
  };

  //Handles the login routing.
  const handleGoToLogin = async () => {
    if (isCompleting && user) {
      await logout();
      return;
    }

    router.replace('/(auth)/login');
  };

  //Handles date validation on change of birthdate.
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {setBirthdate(selectedDate);}
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              {isCompleting ? 'Complete Your Account' : 'Create Account'}
            </ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>
              {isCompleting ? 'Fill in your details to complete setup' : 'Start your journey to independence'}
            </ThemedText>
          </View>
          <View style={styles.form}>
            <Input placeholder="First Name" required={true} value={firstName} onChangeText={setFirstName} autoCapitalize="words" style={styles.input} autoComplete='given-name' />
            <Input placeholder="Middle Names (Optional)" value={middleNames} onChangeText={setMiddleNames} autoCapitalize="words" style={styles.input} autoComplete='additional-name' />
            <Input placeholder="Last Name" required={true} value={lastName} onChangeText={setLastName} autoCapitalize="words" style={styles.input} autoComplete='family-name' />
            <Input placeholder="Email" required={true} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete='email' autoCorrect={false} editable={!isCompleting}
              style={[styles.input, isCompleting && styles.disabledInput]} />
            <View style={styles.passwordContainer}>
              <Input placeholder="Password" required={!isCompleting} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} editable={!isCompleting}
                style={[styles.input, styles.passwordInput, isCompleting && styles.disabledInput]} autoComplete='new-password' />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)} disabled={isCompleting}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color={isCompleting ? "#ccc" : "#666"} />
              </TouchableOpacity>
              {isThirdPartyCompletion && <ThemedText style={styles.passwordProviderText}>Signing up through {authProvider}</ThemedText>}
            </View>
            <View style={styles.passwordContainer}>
              <Input placeholder="Confirm Password" required={!isCompleting} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword}
                editable={!isCompleting} style={[styles.input, styles.passwordInput, isCompleting && styles.disabledInput]} autoComplete='new-password' />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)} disabled={isCompleting} >
                <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={24} color={isCompleting ? "#ccc" : "#666"} />
              </TouchableOpacity>
              {isThirdPartyCompletion && <ThemedText style={styles.passwordProviderText}>Signing up through {authProvider}</ThemedText>}
            </View>

            <Button title={`Date of Birth: ${formatDate(birthdate.toString())}`} onPress={() => setShowDatePicker(true)} variant="secondary" fullWidth style={styles.dateButton} />
            {showDatePicker && (<DateTimePicker value={birthdate} mode="date" display="default" onChange={handleDateChange} maximumDate={new Date()} />)}
            <ThemedText style={styles.pickerLabel}>Employment Status (Optional)</ThemedText>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={jobStatus} onValueChange={(value) => setJobStatus(value)}>
                <Picker.Item label="Select status..." value={undefined} />
                {EMPLOYMENT_STATUSES.map((status) => (
                  <Picker.Item key={status} label={status} value={status} />
                ))}
              </Picker>
            </View>

            <Button title={loading ? (isCompleting ? "Completing Account..." : "Creating Account...") : (isCompleting ? "Complete Account" : "Create Account")} onPress={handleRegister} loading={loading} disabled={loading || !canSubmitCompletion} fullWidth style={styles.registerButton} />

            <View style={styles.loginSection}>
              <ThemedText style={styles.loginText}>
                Already have an account?
              </ThemedText>
              <Button title="Sign In" onPress={handleGoToLogin} variant="secondary" fullWidth style={styles.loginButton} />
            </View>
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
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
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
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    opacity: 0.7,
  },
  passwordProviderText: {
    position: 'absolute',
    left: 16,
    right: 50,
    top: 15,
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.72,
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
    zIndex: 1,
  },
  dateButton: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 14,
    marginBottom: 6,
    opacity: 0.8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#DEE2E6',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  registerButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  loginSection: {
    alignItems: 'center',
  },
  loginText: {
    marginBottom: 12,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: 8,
  },
});
