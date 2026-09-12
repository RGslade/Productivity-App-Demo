import { TrackedTouchableOpacity as TouchableOpacity } from '@/components/ui/TrackedTouchableOpacity';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Platform, Linking } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import * as settingsService from '@/services/settingsService';
import { FEEDBACK_CATEGORIES, FeedbackForm } from '@/types/feedback';
import { useThemeColour } from '@/hooks/useThemeColour';
import { showAlert } from '@/hooks/dataHandler';
import { PROJECT_OWNER_NAME, PROJECT_SUPPORT_EMAIL, PROJECT_WEBSITE_LABEL } from '@/constants/ProjectInfo';

export default function FeedbackScreen() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FeedbackForm>({
    subject: '',
    feedback_text: '',
    category: FEEDBACK_CATEGORIES[0],
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const isIOS = Platform.OS === 'ios';
  const appVersion = Constants.expoConfig?.version || '1.0.2';
  const androidPackageId = Constants.expoConfig?.android?.package || 'com.example.productivityapp';
  const storeButtonText = isIOS ? 'Rate us on App Store' : 'Rate us on Google Play';
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.feedback_text.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.feedback_text.length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await settingsService.settingsService.insertFeedback(formData);

      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      showAlert(
        'Feedback Sent!',
        'Thank you for your feedback. We appreciate you taking the time to help us improve the app.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setFormData({
                subject: '',
                feedback_text: '',
                category: FEEDBACK_CATEGORIES[0],
                updated_at: new Date().toISOString(),
                created_at: new Date().toISOString()
              });
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error submitting feedback:', error);
      showAlert(
        'Error',
        'Failed to send feedback. Please try again later or contact support directly.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof FeedbackForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleStoreRatingPress = async () => {
    const storeUrl = isIOS ? null : `https://play.google.com/store/apps/details?id=${androidPackageId}`;
    if (!storeUrl) {
      showAlert('App Store link pending', 'Add your iOS App Store URL before enabling this button for iOS builds.');
      return;
    }

    try {
      await Linking.openURL(storeUrl);
    } catch (error) {
      console.error('Error opening store URL:', error);
      showAlert('Unable to open store', 'Please try again later.');
    }
  };

  const backgroundColour = useThemeColour({}, 'background');
  const textColour = useThemeColour({}, 'text');

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <ThemedView style={styles.content} lightColour={backgroundColour} darkColour={backgroundColour}>
          <ThemedView style={styles.header} lightColour={backgroundColour} darkColour={backgroundColour}>
            <ThemedText type="title" style={styles.title}>
              Help, Contacts & Feedback
            </ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>
              We value your feedback and are here to help
            </ThemedText>
          </ThemedView>

          {/* App Information */}
          <Card style={styles.infoCard}>
            <ThemedText type="defaultSemiBold" style={styles.infoTitle}>
              About Productivity App
            </ThemedText>

            <ThemedView style={styles.appInfo} lightColour='transparent' darkColour='transparent'>
              <ThemedView style={styles.infoRow} lightColour='transparent' darkColour='transparent'>
                <ThemedText style={styles.infoLabel}>Version:</ThemedText>
                <ThemedText style={styles.infoValue}>{appVersion}</ThemedText>
              </ThemedView>
            </ThemedView>

            <ThemedText style={styles.appDescription}>
              Productivity App is a personal portfolio project by {PROJECT_OWNER_NAME}, designed to help young adults navigate the challenges of independent living.
              We`&apos;re committed to providing helpful tools and resources for managing finances, tasks, and life transitions.
            </ThemedText>

            {Platform.OS !== 'web' && (
            <TouchableOpacity analyticsId="app_helpandfeedback_index_store_button" analyticsControlType="button" style={styles.storeButton} onPress={handleStoreRatingPress} activeOpacity={0.8}>
              <Ionicons
                name={isIOS ? 'logo-apple-appstore' : 'logo-google-playstore'}
                size={20}
                color="#FFFFFF"
                style={styles.storeIcon}
              />
              <ThemedText style={styles.storeButtonText}>{storeButtonText}</ThemedText>
            </TouchableOpacity>
            )}
          </Card>

          {/* Feedback Form */}
          <ThemedText type="subtitle" style={styles.formTitle}>
            Send Feedback
          </ThemedText>

          {/* Category Selection */}
          <ThemedView style={styles.fieldContainer} lightColour={backgroundColour} darkColour={backgroundColour}>
            <ThemedText style={styles.label}>Category *</ThemedText>
            <ThemedView style={styles.categoryGrid} lightColour={backgroundColour} darkColour={backgroundColour}>
              {FEEDBACK_CATEGORIES.map((category) => (
                <Button analyticsId="app_helpandfeedback_index_update_field" key={category} title={category} variant={formData.category === category ? 'primary' : 'secondary'} size="small" onPress={() => updateField('category', category)}
                  style={styles.categoryButton} />
              ))}
            </ThemedView>
          </ThemedView>

          {/* Subject */}
          <ThemedView style={styles.fieldContainer} lightColour={backgroundColour} darkColour={backgroundColour}>
            <ThemedText style={styles.label}>Subject *</ThemedText>
            <Input placeholder="Brief description of your feedback" value={formData.subject} onChangeText={(text) => updateField('subject', text)} error={errors.subject} maxLength={100} />
            <ThemedText style={styles.charCount}>
              {formData.subject.length}/100 characters
            </ThemedText>
          </ThemedView>

          {/* Message */}
          <ThemedView style={styles.fieldContainer} lightColour={backgroundColour} darkColour={backgroundColour}>
            <ThemedText style={styles.label}>Message *</ThemedText>
            <Input placeholder="Please provide detailed feedback, including any steps to reproduce issues..." value={formData.feedback_text} onChangeText={(text) => updateField('feedback_text', text)}
              multiline numberOfLines={6} error={errors.message} maxLength={1000} style={styles.textArea} />
            <ThemedText style={styles.charCount}>
              {formData.feedback_text.length}/1000 characters
            </ThemedText>
          </ThemedView>

          {/* Submit Button */}
          <ThemedView style={styles.submitContainer} lightColour={backgroundColour} darkColour={backgroundColour}>
            {loading ? (
              <ThemedView style={styles.loadingContainer}>
                <LoadingSpinner />
                <ThemedText style={styles.loadingText}>Sending feedback...</ThemedText>
              </ThemedView>
            ) : (
              <Button analyticsId="app_helpandfeedback_index_send_feedback" title="Send Feedback" variant="primary" onPress={handleSubmit} style={styles.submitButton} />
            )}
          </ThemedView>

          {/* Alternative Contact Methods */}
          <Card style={styles.contactCard}>
            <ThemedText type="defaultSemiBold" style={styles.contactTitle}>
              Other Ways to Reach Us
            </ThemedText>

            <ThemedView style={styles.contactMethods}>
              <ThemedView style={styles.contactMethod}>
                <ThemedText style={styles.contactIcon}>ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€šÃ‚Â§</ThemedText>
                <ThemedView style={styles.contactDetails}>
                  <ThemedText style={styles.contactMethodTitle}>Email Support</ThemedText>
                  <ThemedText style={styles.contactMethodText}>{PROJECT_SUPPORT_EMAIL}</ThemedText>
                  <ThemedText style={styles.contactMethodSubtext}>
                    Response within 24-48 hours
                  </ThemedText>
                </ThemedView>
              </ThemedView>

              <ThemedView style={styles.contactMethod}>
                <ThemedText style={styles.contactIcon}>ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã¢â‚¬â„¢Ãƒâ€šÃ‚Â</ThemedText>
                <ThemedView style={styles.contactDetails}>
                  <ThemedText style={styles.contactMethodTitle}>{PROJECT_OWNER_NAME}</ThemedText>
                  <ThemedText style={styles.contactMethodText}>{PROJECT_WEBSITE_LABEL}</ThemedText>
                  <ThemedText style={styles.contactMethodSubtext}>
                    Personal portfolio and contact information
                  </ThemedText>
                </ThemedView>
              </ThemedView>

              <ThemedView style={styles.contactMethod}>
                <ThemedText style={styles.contactIcon}>ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚ÂÃƒâ€šÃ‚Â¦</ThemedText>
                <ThemedView style={styles.contactDetails}>
                  <ThemedText style={styles.contactMethodTitle}>Social Media</ThemedText>
                  <ThemedText style={styles.contactMethodText}>Personal project updates</ThemedText>
                  <ThemedText style={styles.contactMethodSubtext}>
                    Updates and community
                  </ThemedText>
                </ThemedView>
              </ThemedView>
            </ThemedView>
          </Card>

          {/* Privacy Notice */}
          <Card style={[styles.privacyCard, {backgroundColor: backgroundColour}]}>
            <ThemedText type="defaultSemiBold" style={[styles.privacyTitle, { color: textColour }]}>
              Privacy & Data
            </ThemedText>
            <ThemedText style={[styles.privacyText, { color: textColour }]}>
              Your feedback helps us improve the app. We handle all feedback in accordance with our privacy policy.
              Personal information is only used to respond to your feedback and is not shared with third parties.
            </ThemedText>
            <ThemedText style={[styles.privacyText, { color: textColour }]}>
              By submitting feedback, you agree to our terms of service and privacy policy.
            </ThemedText>
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

    width: '100%',
    maxWidth: Platform.OS === 'web' ? '100%' : 1200,
    alignSelf: 'center',
    flex: 1,
  },
  content: {
    flex: 1,
    width: Platform.OS === 'web' ? '70%' : undefined,
    alignSelf: 'center',
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
  infoCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#F0F9FF',
  },
  infoTitle: {
    fontSize: 16,
    marginBottom: 16,
    color: '#0369A1',
  },
  appInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#075985',
  },
  infoValue: {
    fontSize: 14,
    color: '#0C4A6E',
    fontFamily: 'monospace',
  },
  appDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#075985',
    marginBottom: 12,
  },
  storeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    backgroundColor: '#C7654B',
  },
  storeIcon: {
    marginRight: 8,
  },
  storeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  formCard: {
    padding: 20,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    minWidth: 100,
    marginBottom: 4,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'right',
    marginTop: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    minWidth: 40,
    marginRight: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    flex: 1,
  },
  contactInfo: {
    fontSize: 12,
    opacity: 0.7,
    marginLeft: 52,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  submitContainer: {
    marginTop: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 16,
  },
  submitButton: {
    paddingVertical: 16,
  },
  contactCard: {
    padding: 16,
    marginBottom: 16,
  },
  contactTitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  contactMethods: {
    gap: 16,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  contactIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  contactDetails: {
    flex: 1,
  },
  contactMethodTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactMethodText: {
    fontSize: 14,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  contactMethodSubtext: {
    fontSize: 12,
    opacity: 0.7,
  },
  privacyCard: {
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  privacyTitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  privacyText: {
    fontSize: 12,
    opacity: 0.8,
    lineHeight: 18,
    marginBottom: 8,
  },
});
