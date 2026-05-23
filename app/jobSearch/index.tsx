import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  Alert,
} from 'react-native';
import { router, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button, Card, Input, LoadingSpinner } from '@/components/ui';
import { useThemeColour } from '@/hooks/useThemeColour';
import { useAuth } from '@/hooks/useAuth';
import { useJobs } from '@/hooks/useJobs';
import { useLocationHandler } from '@/hooks/locationHandler';
import { Job, JobSearchParams } from '@/types/job';
import { Ionicons } from '@expo/vector-icons';
import { Colours } from '@/constants/Colours';
import { Picker } from '@react-native-picker/picker';
import PageNotReadyOverlay from '@/components/pageNotReadyOverlay';

//
const UNIVERSAL_CREDIT_MAX_DISTANCE = 10; // miles
//
const UNIVERSAL_CREDIT_MAX_TRAVEL_TIME = 90; // minutes

//
interface JobCardProps {
  job: Job;
  onPress?: () => void;
}

//
const JobCard: React.FC<JobCardProps> = ({ job, onPress }) => {
  //
  const router = useRouter();
  //
  const textColor = useThemeColour({}, 'text');

  //
  const handlePress = () => {
    //
    if (onPress) {
      onPress();
    } else if (job.id) {
      router.push(`/jobDetails/${job.id}`);
    }
  };

  //
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Card style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle" style={styles.jobTitle}>
              {job.title}
            </ThemedText>
            <ThemedText style={styles.company}>{job.company}</ThemedText>
          </View>
          {job.distance_miles && (
            <View style={styles.distanceBadge}>
              <Ionicons name="location-outline" size={14} color={textColor} />
              <ThemedText style={styles.distanceText}>
                {job.distance_miles.toFixed(1)}mi
              </ThemedText>
            </View>
          )}
        </View>

        <ThemedText style={styles.description} numberOfLines={2}>
          {job.description}
        </ThemedText>

        <View style={styles.jobFooter}>
          <View style={styles.jobDetailRow}>
            <Ionicons name="briefcase-outline" size={14} color={textColor} />
            <ThemedText style={styles.detailText}>{job.job_type}</ThemedText>
          </View>

          {job.salary_min && job.salary_max && (
            <View style={styles.jobDetailRow}>
              <Ionicons name="cash-outline" size={14} color={textColor} />
              <ThemedText style={styles.detailText}>
                £{job.salary_min.toLocaleString()} - £{job.salary_max.toLocaleString()}
              </ThemedText>
            </View>
          )}

          {job.location && (
            <View style={styles.jobDetailRow}>
              <Ionicons name="map-outline" size={14} color={textColor} />
              <ThemedText style={styles.detailText} numberOfLines={1}>
                {job.location}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.viewButtonRow}>
          <ThemedText style={styles.viewButtonText}>View Details</ThemedText>
          <Ionicons name="chevron-forward" size={16} color="currentColor" />
        </View>
      </Card>
    </TouchableOpacity>
  );
};

//
export default function JobSearchScreen() {
  //
  const textColor = useThemeColour({}, 'text');
  //
  const borderColor = useThemeColour({}, 'border');

  // Auth and user info
  //
  const { userInfo } = useAuth();

  // Job search state
  //
  const { jobs, isSearching, error, searchJobs, resetSearch } = useJobs();
  //
  const {
    location,
    isLoadingLocation,
    locationError,
    requestLocationPermission,
    getLocationFromPostcode,
    clearLocation,
  } = useLocationHandler();

  // Form state
  //
  const [searchTerm, setSearchTerm] = useState('');
  //
  const [postcodeInput, setPostcodeInput] = useState('');
  //
  const [useDeviceLocation, setUseDeviceLocation] = useState(false);
  //
  const [selectedDistance, setSelectedDistance] = useState<number>(5);
  //
  const [hasAttemptedSearch, setHasAttemptedSearch] = useState(false);

  //
  const isUniversalCredit = userInfo?.universal_credit || false;
  //
  const maxDistance = isUniversalCredit ? UNIVERSAL_CREDIT_MAX_DISTANCE : undefined;

  // Distance options based on UC status
  //
  const distanceOptions = isUniversalCredit 
    ? [
        { label: '5 miles', value: 5 },
        { label: '10 miles', value: 10 },
      ]
    : [
        { label: '5 miles', value: 5 },
        { label: '10 miles', value: 10 },
        { label: '15 miles', value: 15 },
        { label: '25 miles', value: 25 },
        { label: '35 miles', value: 35 },
        { label: '50 miles', value: 50 },
        { label: '100 miles', value: 100 },
      ];

  /**
   * Handle GPS location request
   */
  const handleRequestLocation = async () => {
    //
    const result = await requestLocationPermission();
    //
    if (result) {
      setUseDeviceLocation(true);
      setPostcodeInput('');
    }
  };

  /**
   * Handle postcode lookup
   */
  const handlePostcodeLookup = async () => {
    //
    if (!postcodeInput.trim()) {
      Alert.alert('Error', 'Please enter a postcode');
      return;
    }
    //
    const result = await getLocationFromPostcode(postcodeInput);
    //
    if (result) {
      setUseDeviceLocation(false);
    }
  };

  /**
   * Validate and perform job search
   */
  const handleSearch = async () => {
    // Validation
    //
    if (!searchTerm.trim()) {
      Alert.alert('Error', 'Please enter a job description or keyword');
      return;
    }

    //
    if (!location) {
      Alert.alert('Error', 'Please provide a location (GPS or postcode)');
      return;
    }

    Keyboard.dismiss();
    setHasAttemptedSearch(true);

    //
    try {
      //
      const searchParams: JobSearchParams = {
        description: searchTerm,
        location,
        distance_miles: selectedDistance,
      };

      searchJobs(searchParams);
    } catch (err) {
      console.error('Search error:', err);
      Alert.alert('Search Error', 'Failed to search for jobs');
    }
  };

  /**
   * Handle clear search
   */
  const handleClearSearch = () => {
    resetSearch();
    setHasAttemptedSearch(false);
    setSearchTerm('');
  };

  /**
   * Render error message
   */
  const renderErrorMessage = () => {
    //
    if (locationError) {
      //
      return (
        <View style={[styles.errorContainer, { borderColor }]}>
        <Ionicons name="alert-circle-outline" size={20} color={Colours.light.danger} />
          <View style={styles.errorContent}>
            <ThemedText style={styles.errorTitle}>{locationError.message}</ThemedText>
            {locationError.details && (
              <ThemedText style={styles.errorDetails}>{locationError.details}</ThemedText>
            )}
          </View>
        </View>
      );
    }

    //
    if (error) {
      //
      return (
        <View style={[styles.errorContainer, { borderColor }]}>
        <Ionicons name="alert-circle-outline" size={20} color={Colours.light.danger} />
          <View style={styles.errorContent}>
            <ThemedText style={styles.errorTitle}>{error.message}</ThemedText>
            {error.details && (
              <ThemedText style={styles.errorDetails}>{error.details}</ThemedText>
            )}
          </View>
        </View>
      );
    }

    return null;
  };

  /**
   * Render location display
   */
  const renderLocationDisplay = () => {
    //
    if (!location) return null;
    //
    return (
      <Card style={styles.locationCard}>
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={20} color={textColor} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <ThemedText style={styles.locationLabel}>Search Location</ThemedText>
            <ThemedText style={styles.locationValue}>
              {location.postcode || location.address}
            </ThemedText>
          </View>
          <TouchableOpacity onPress={clearLocation}>
            <Ionicons name="close-circle-outline" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  /**
   * Render universal credit warning
   */
  const renderUCWarning = () => {
    //
    if (!isUniversalCredit) return null;

    //
    return (
      <View style={[styles.ucWarningContainer, { borderColor }]}>
        <Ionicons name="information-circle-outline" size={20} color={Colours.light.warning} />
        <ThemedText style={styles.ucWarningText}>
          Universal Credit distance limit: {maxDistance} miles or {UNIVERSAL_CREDIT_MAX_TRAVEL_TIME} minutes
        </ThemedText>
      </View>
    );
  };

  //
  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PageNotReadyOverlay pageName="job-search" animationType='none' onClose={() => router.back()} />
        {/* Page Title */}
        <View style={styles.header}>
          <Ionicons name="briefcase" size={32} color={textColor} />
          <ThemedText type="title" style={styles.title}>
            Job Search
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Find jobs near you in the UK
          </ThemedText>
        </View>

        {/* Search Input */}
        <Card style={styles.searchCard}>
          <ThemedText style={styles.cardLabel}>What job are you looking for?</ThemedText>
          <Input
            placeholder="Enter job title or keywords..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            editable={!isSearching}
          />
        </Card>

        {/* Location Selection */}
        <Card style={styles.locationCard}>
          <ThemedText style={styles.cardLabel}>Where do you want to work?</ThemedText>

          {/* Use Device Location Button */}
          <Button
            variant="secondary"
            size="medium"
            onPress={handleRequestLocation}
            loading={isLoadingLocation && useDeviceLocation}
            disabled={isLoadingLocation || isSearching}
            fullWidth title=""
            style={{ marginBottom: 12 }}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="location-outline" size={16} color={textColor} />
              <ThemedText style={{ marginLeft: 8, color: textColor }}>
                {isLoadingLocation && useDeviceLocation ? 'Getting Location...' : 'Use My Location'}
              </ThemedText>
            </View>
          </Button>

          <ThemedText style={styles.orText}>or</ThemedText>

          {/* Postcode Input */}
          <View style={styles.postcodeInputGroup}>
            <Input
              placeholder="Enter UK postcode..."
              value={postcodeInput}
              onChangeText={setPostcodeInput}
              editable={!isLoadingLocation && !isSearching}
              style={{ marginRight: 8, flex: 1 }}
            />
            <Button
              variant="secondary"
              size="medium" title="Search"
              onPress={handlePostcodeLookup}
              loading={isLoadingLocation && !useDeviceLocation}
              disabled={isLoadingLocation || isSearching || !postcodeInput.trim()}
            >
              <Ionicons name="search" size={16} color={textColor} />
            </Button>
          </View>
        </Card>

        {/* UC Warning */}
        {renderUCWarning()}

        {/* Location Display */}
        {renderLocationDisplay()}

        {/* Distance Range Selection */}
        {location && (
          <Card style={styles.distanceCard}>
            <ThemedText style={styles.cardLabel}>Search Distance Range</ThemedText>
            <View style={[styles.pickerContainer, { borderColor }]}>
              <Picker
                selectedValue={selectedDistance}
                onValueChange={(value) => setSelectedDistance(value)}
                enabled={!isSearching}
                style={styles.picker}
              >
                {distanceOptions.map((option) => (
                  <Picker.Item
                    key={option.value}
                    label={option.label}
                    value={option.value}
                  />
                ))}
              </Picker>
            </View>
          </Card>
        )}

        {/* Error Messages */}
        {renderErrorMessage()}

        {/* Search Button */}
        <Button
          variant="primary"
          size="medium" title="Search Jobs"
          onPress={handleSearch}
          loading={isSearching}
          disabled={!searchTerm.trim() || !location || isSearching}
          fullWidth
          style={styles.searchButton}
        >
          <Ionicons name="search" size={18} color="white" />
          <ThemedText style={{ marginLeft: 8, color: 'white', fontWeight: '600' }}>
            Search Jobs
          </ThemedText>
        </Button>

        {/* Results Section */}
        {hasAttemptedSearch && (
          <>
            {isSearching && (
              <View style={styles.loadingContainer}>
                <LoadingSpinner />
                <ThemedText style={styles.loadingText}>Searching for jobs...</ThemedText>
              </View>
            )}

            {!isSearching && jobs.length === 0 && !error && (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="briefcase-outline" size={48} color={textColor} />
                <ThemedText type="subtitle">Redirected to Indeed</ThemedText>
                <ThemedText style={styles.emptyStateText}>
                  Opening Indeed job search in your browser. Your search has been sent there with your location and job title.
                </ThemedText>
              </View>
            )}

            {!isSearching && jobs.length > 0 && (
              <>
                <View style={styles.resultsHeader}>
                  <ThemedText type="subtitle">
                    {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} found
                  </ThemedText>
                  <TouchableOpacity onPress={handleClearSearch}>
                    <ThemedText style={styles.clearButton}>Clear</ThemedText>
                  </TouchableOpacity>
                </View>

                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </>
            )}
          </>
        )}

        {/* Initial State */}
        {!hasAttemptedSearch && (
          <View style={styles.initialStateContainer}>
            <Ionicons name="search-outline" size={64} color={textColor} />
            <ThemedText type="subtitle">Start searching for jobs</ThemedText>
            <ThemedText style={styles.initialStateText}>
              Enter a job title and your location to get started
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

//
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  searchCard: {
    marginBottom: 16,
  },
  locationCard: {
    marginBottom: 16,
  },
  distanceCard: {
    marginBottom: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orText: {
    textAlign: 'center',
    marginVertical: 12,
    opacity: 0.6,
    fontSize: 13,
  },
  postcodeInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ucWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  ucWarningText: {
    marginLeft: 12,
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  locationValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  searchButton: {
    marginVertical: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  clearButton: {
    color: Colours.light.success,
    fontWeight: '600',
    fontSize: 12,
  },
  jobCard: {
    marginBottom: 12,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  company: {
    fontSize: 13,
    opacity: 0.7,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colours.light.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  distanceText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  description: {
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 10,
  },
  jobFooter: {
    gap: 6,
  },
  jobDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    opacity: 0.7,
  },
  viewButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(52, 211, 153, 0.2)',
    opacity: 0.7,
  },
  viewButtonText: {
    fontWeight: '600',
    fontSize: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  errorContent: {
    marginLeft: 12,
    flex: 1,
  },
  errorTitle: {
    fontWeight: '600',
    color: Colours.light.danger,
    marginBottom: 2,
  },
  errorDetails: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 8,
  },
  initialStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  initialStateText: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 12,
    textAlign: 'center',
  },
});
