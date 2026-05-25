import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Share, Alert, Linking, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeColour } from '@/hooks/useThemeColour';
import { useJobDetails } from '@/hooks/useJobDetails';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDate } from '@/hooks/dataHandler';
import { jobApplicationService } from '@/services/jobApplicationService';

interface SectionProps {
  title: string;
  children: React.ReactNode;
  icon?: string;
}

const Section: React.FC<SectionProps> = ({ title, children, icon }) => {
  const textColor = useThemeColour({}, 'text');

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon && <Ionicons name={icon as any} size={18} color={textColor} style={{ marginRight: 8 }} />}
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
};

interface InfoRowProps {
  label: string;
  value?: string | number;
  icon?: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, icon }) => {
  const textColor = useThemeColour({}, 'text');
  const backgroundColor = useThemeColour({}, 'background');

  if (!value) return null;

  return (
    <View style={[styles.infoRow, { backgroundColor }]}>
      {icon && <Ionicons name={icon as any} size={16} color={textColor} style={{ marginRight: 8, minWidth: 20 }} />}
      <View style={styles.infoContent}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        <ThemedText style={styles.value}>{value.toString()}</ThemedText>
      </View>
    </View>
  );
};

export default function JobDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const themeColor = useThemeColour({}, 'shadowColor');
  const textColor = useThemeColour({}, 'text');
  const jobId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : null;
  const { job, isLoading, error } = useJobDetails(jobId);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (job?.title) {
      // Update header with job title
    }
  }, [job?.title]);

  const handleApply = async () => {
    if (!job?.url) {
      Alert.alert('Unable to Apply', 'No application URL available for this job.');
      return;
    }

    setIsApplying(true);
    try {
      const canOpen = await Linking.canOpenURL(job.url);
      if (canOpen) {
        await Linking.openURL(job.url);
        await jobApplicationService.recordAppliedJob({
          job_id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          source: job.source,
          application_url: job.url,
        });
      } else {
        Alert.alert('Unable to Open', 'Could not open the job application URL.');
      }
    } catch {
      Alert.alert('Error', 'Failed to open job application.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleShare = async () => {
    if (!job) return;

    try {
      const message = `${job.title} at ${job.company}\n\n${job.url || 'Job details'}`;
      await Share.share({
        message,
        url: job.url || undefined,
        title: `Check out this job: ${job.title}`,
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  if (error && !isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="red" />
          <ThemedText style={styles.errorTitle}>Failed to Load Job Details</ThemedText>
          <ThemedText style={styles.errorMessage}>{error.message}</ThemedText>
          {error.details && <ThemedText style={styles.errorDetails}>{error.details}</ThemedText>}
          <Button onPress={() => router.back()} style={{ marginTop: 16 }} title="Go Back" />
        </View>
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <LoadingSpinner />
      </ThemedView>
    );
  }

  if (!job) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="briefcase-outline" size={48} color={textColor} />
          <ThemedText style={styles.errorTitle}>Job Not Found</ThemedText>
          <ThemedText style={styles.errorMessage}>This job is no longer available.</ThemedText>
          <Button onPress={() => router.back()} style={{ marginTop: 16 }} title="Go Back" />
        </View>
      </ThemedView>
    );
  }

  // Format salary
  const formatSalary = (min?: number, max?: number, currency?: string) => {
    const curr = currency || 'GBP';
    const currencySymbol = curr === 'GBP' ? '£' : '€';

    if (min && max) {
      return `${currencySymbol}${min.toLocaleString()} - ${currencySymbol}${max.toLocaleString()}`;
    } else if (min) {
      return `${currencySymbol}${min.toLocaleString()}+`;
    } else if (max) {
      return `Up to ${currencySymbol}${max.toLocaleString()}`;
    }
    return '';
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false} bounces={false}>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View style={styles.headerTitleSection}>
                <ThemedText style={styles.jobTitle}>{job.title}</ThemedText>
                <ThemedText style={styles.company}>{job.company}</ThemedText>
              </View>
            </View>

            {/* Job Type Badge Row */}
            <View style={styles.badgeRow}>
              {job.job_type && (
                <View style={[styles.badge, { backgroundColor: themeColor + '20', borderColor: themeColor, borderWidth: 1 }]}>
                  <Ionicons name="briefcase" size={14} color={themeColor} />
                  <ThemedText style={[styles.badgeText, { color: themeColor }]}>{job.job_type}</ThemedText>
                </View>
              )}
              {job.contract_type && (
                <View style={[styles.badge, { backgroundColor: themeColor + '20', borderColor: themeColor, borderWidth: 1 }]}>
                  <Ionicons name="document-text" size={14} color={themeColor} />
                  <ThemedText style={[styles.badgeText, { color: themeColor }]}>{job.contract_type}</ThemedText>
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* Salary & Location Section */}
        <Card style={styles.card}>
          <Section title="Compensation & Location" icon="wallet-outline">
            {formatSalary(job.salary_min, job.salary_max, job.salary_currency) && (
              <InfoRow label="Salary" value={formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                icon="cash" />
            )}
            {job.location && (
              <InfoRow label="Location" value={job.location} icon="location" />
            )}
            {job.postcode && (
              <InfoRow label="Postcode" value={job.postcode} icon="map-pin" />
            )}
          </Section>
        </Card>

        {/* Description Section */}
        {job.description && (
          <Card style={styles.card}>
            <Section title="About This Role" icon="document-text">
              <ThemedText style={styles.description}>{job.description}</ThemedText>
            </Section>
          </Card>
        )}

        {/* Job Details Section */}
        <Card style={styles.card}>
          <Section title="Job Details" icon="information-circle">
            {job.posted_date && (
              <InfoRow label="Posted" value={formatDate(job.posted_date)}
                icon="calendar" />
            )}
            <View style={{ height: 12 }} />
          </Section>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <Button onPress={handleApply}
            style={[styles.actionButton, { backgroundColor: themeColor }]}
            title={isApplying ? 'Opening...' : 'Apply Now'} />
          <TouchableOpacity onPress={handleShare}
            style={[styles.shareButton, { borderColor: themeColor, borderWidth: 1.5 }]}>
            <Ionicons name="share-social" size={20} color={themeColor} />
          </TouchableOpacity>
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerCard: {
    marginBottom: 12,
  },
  headerContent: {
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTitleSection: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  company: {
    fontSize: 16,
    opacity: 0.7,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    marginBottom: 12,
  },
  section: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionContent: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  infoContent: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    borderRadius: 8,
    flex: 1,
  },
  shareButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.7,
  },
  errorDetails: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.5,
    fontStyle: 'italic',
  },
});
