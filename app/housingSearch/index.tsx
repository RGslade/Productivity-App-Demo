import React, { useState } from 'react';
import { Alert, Keyboard, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button, Card, Input, LoadingSpinner } from '@/components/ui';
import { useThemeColour } from '@/hooks/useThemeColour';
import { useLocationHandler } from '@/hooks/locationHandler';
import { useHousing } from '@/hooks/useHousing';
import { HousingListing, HousingSearchParams } from '@/types/housing';
import { Colours } from '@/constants/Colours';
import PageNotReadyOverlay from '@/components/pageNotReadyOverlay';

//
interface HousingCardProps {
  listing: HousingListing;
}

//
const HousingCard: React.FC<HousingCardProps> = ({ listing }) => {
  //
  const textColor = useThemeColour({}, 'text');

  //
  const handleOpen = async () => {
    //
    if (!listing.detailsUrl) {
      Alert.alert('Unavailable', 'No listing URL is available for this property.');
      return;
    }

    //
    const canOpen = await Linking.canOpenURL(listing.detailsUrl);
    //
    if (!canOpen) {
      Alert.alert('Unable to Open', 'Could not open this property listing.');
      return;
    }
    await Linking.openURL(listing.detailsUrl);
  };

  //
  return (
    <TouchableOpacity onPress={handleOpen} activeOpacity={0.7}>
      <Card style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle" style={styles.jobTitle}>
              {listing.title}
            </ThemedText>
            <ThemedText style={styles.company}>{listing.address}</ThemedText>
          </View>
          <View style={styles.distanceBadge}>
            <Ionicons name="home-outline" size={14} color={textColor} />
            <ThemedText style={styles.distanceText}>{listing.propertyType || 'Property'}</ThemedText>
          </View>
        </View>

        <View style={styles.jobFooter}>
          <View style={styles.jobDetailRow}>
            <Ionicons name="cash-outline" size={14} color={textColor} />
            <ThemedText style={styles.detailText}>{listing.priceLabel}</ThemedText>
          </View>

          <View style={styles.jobDetailRow}>
            <Ionicons name="bed-outline" size={14} color={textColor} />
            <ThemedText style={styles.detailText}>{listing.bedrooms ?? '-'} bedrooms</ThemedText>
          </View>

          <View style={styles.jobDetailRow}>
            <Ionicons name="water-outline" size={14} color={textColor} />
            <ThemedText style={styles.detailText}>{listing.bathrooms ?? '-'} bathrooms</ThemedText>
          </View>
        </View>

        <View style={styles.viewButtonRow}>
          <ThemedText style={styles.viewButtonText}>View Listing</ThemedText>
          <Ionicons name="chevron-forward" size={16} color="currentColor" />
        </View>
      </Card>
    </TouchableOpacity>
  );
};

//
export default function HousingScreen() {
  //
  const textColor = useThemeColour({}, 'text');
  //
  const borderColor = useThemeColour({}, 'border');
  //
  const { listings, isSearching, error, searchListings, resetSearch } = useHousing();
  //
  const {
    location,
    isLoadingLocation,
    locationError,
    requestLocationPermission,
    getLocationFromPostcode,
    clearLocation,
  } = useLocationHandler();

  //
  const [searchTerm, setSearchTerm] = useState('');
  //
  const [postcodeInput, setPostcodeInput] = useState('');
  //
  const [useDeviceLocation, setUseDeviceLocation] = useState(false);
  //
  const [selectedDistance, setSelectedDistance] = useState<number>(5);
  //
  const [selectedBedrooms, setSelectedBedrooms] = useState<number>(1);
  //
  const [selectedPropertyType, setSelectedPropertyType] = useState<HousingSearchParams['propertyType']>('Any');
  //
  const [listingStatus, setListingStatus] = useState<HousingSearchParams['listingStatus']>('to-rent');
  //
  const [minPrice, setMinPrice] = useState('');
  //
  const [maxPrice, setMaxPrice] = useState('');
  //
  const [hasAttemptedSearch, setHasAttemptedSearch] = useState(false);

  //
  const distanceOptions = [
    { label: '1 mile', value: 1 },
    { label: '3 miles', value: 3 },
    { label: '5 miles', value: 5 },
    { label: '10 miles', value: 10 },
    { label: '20 miles', value: 20 },
    { label: '35 miles', value: 35 },
  ];

  //
  const propertyTypeOptions: NonNullable<HousingSearchParams['propertyType']>[] = ['Any', 'House', 'Apartment', 'Studio', 'Shared'];

  //
  const handleRequestLocation = async () => {
    //
    const result = await requestLocationPermission();
    //
    if (result) {
      setUseDeviceLocation(true);
      setPostcodeInput('');
    }
  };

  //
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

  //
  const handleSearch = async () => {
    //
    if (!location) {
      Alert.alert('Error', 'Please provide a location (GPS or postcode)');
      return;
    }

    Keyboard.dismiss();
    setHasAttemptedSearch(true);

    //
    const parsePrice = (value: string) => {
      //
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    };

    //
    try {
      //
      const params: HousingSearchParams = {
        query: searchTerm.trim() || undefined,
        location,
        distanceMiles: selectedDistance,
        bedrooms: selectedBedrooms,
        minPrice: parsePrice(minPrice),
        maxPrice: parsePrice(maxPrice),
        propertyType: selectedPropertyType,
        listingStatus,
      };
      searchListings(params);
    } catch (err) {
      console.error('Housing search error:', err);
      Alert.alert('Search Error', 'Failed to search for properties');
    }
  };

  //
  const handleClearSearch = () => {
    resetSearch();
    setHasAttemptedSearch(false);
    setSearchTerm('');
    setMinPrice('');
    setMaxPrice('');
  };

  //
  const renderErrorMessage = () => {
    //
    if (locationError) {
      //
      return (
        <View style={[styles.errorContainer, { borderColor }]}>
          <Ionicons name="alert-circle-outline" size={20} color={Colours.light.danger} />
          <View style={styles.errorContent}>
            <ThemedText style={styles.errorTitle}>{locationError.message}</ThemedText>
            {locationError.details && <ThemedText style={styles.errorDetails}>{locationError.details}</ThemedText>}
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
            {error.details && <ThemedText style={styles.errorDetails}>{error.details}</ThemedText>}
          </View>
        </View>
      );
    }

    return null;
  };

  //
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
            <ThemedText style={styles.locationValue}>{location.postcode || location.address}</ThemedText>
          </View>
          <TouchableOpacity onPress={clearLocation}>
            <Ionicons name="close-circle-outline" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  //
  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <PageNotReadyOverlay pageName="housing-search" animationType="none" onClose={() => router.back()} />
        <View style={styles.header}>
          <Ionicons name="business" size={32} color={textColor} />
          <ThemedText type="title" style={styles.title}>Housing Search</ThemedText>
          <ThemedText style={styles.subtitle}>Find places to rent or buy near you in the UK</ThemedText>
        </View>

        <Card style={styles.searchCard}>
          <ThemedText style={styles.cardLabel}>What are you looking for?</ThemedText>
          <Input placeholder="Keywords (optional): e.g. furnished, city centre" value={searchTerm} onChangeText={setSearchTerm} editable={!isSearching} />
        </Card>

        <Card style={styles.locationCard}>
          <ThemedText style={styles.cardLabel}>Where do you want to live?</ThemedText>
          <Button
            variant="secondary"
            size="medium"
            onPress={handleRequestLocation}
            loading={isLoadingLocation && useDeviceLocation}
            disabled={isLoadingLocation || isSearching}
            fullWidth
            title=""
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
              size="medium"
              title="Search"
              onPress={handlePostcodeLookup}
              loading={isLoadingLocation && !useDeviceLocation}
              disabled={isLoadingLocation || isSearching || !postcodeInput.trim()}
            >
              <Ionicons name="search" size={16} color={textColor} />
            </Button>
          </View>
        </Card>

        {renderLocationDisplay()}

        {location && (
          <Card style={styles.distanceCard}>
            <ThemedText style={styles.cardLabel}>Listing Type</ThemedText>
            <View style={[styles.pickerContainer, { borderColor }]}>
              <Picker selectedValue={listingStatus} onValueChange={value => setListingStatus(value)} enabled={!isSearching} style={styles.picker}>
                <Picker.Item label="To Rent" value="to-rent" />
                <Picker.Item label="For Sale" value="for-sale" />
              </Picker>
            </View>

            <ThemedText style={[styles.cardLabel, { marginTop: 12 }]}>Search Distance Range</ThemedText>
            <View style={[styles.pickerContainer, { borderColor }]}>
              <Picker selectedValue={selectedDistance} onValueChange={value => setSelectedDistance(value)} enabled={!isSearching} style={styles.picker}>
                {distanceOptions.map(option => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>

            <ThemedText style={[styles.cardLabel, { marginTop: 12 }]}>Property Type</ThemedText>
            <View style={[styles.pickerContainer, { borderColor }]}>
              <Picker selectedValue={selectedPropertyType} onValueChange={value => setSelectedPropertyType(value)} enabled={!isSearching} style={styles.picker}>
                {propertyTypeOptions.map(option => (
                  <Picker.Item key={option} label={option} value={option} />
                ))}
              </Picker>
            </View>

            <ThemedText style={[styles.cardLabel, { marginTop: 12 }]}>Bedrooms (minimum)</ThemedText>
            <View style={[styles.pickerContainer, { borderColor }]}>
              <Picker selectedValue={selectedBedrooms} onValueChange={value => setSelectedBedrooms(value)} enabled={!isSearching} style={styles.picker}>
                <Picker.Item label="1+" value={1} />
                <Picker.Item label="2+" value={2} />
                <Picker.Item label="3+" value={3} />
                <Picker.Item label="4+" value={4} />
              </Picker>
            </View>
          </Card>
        )}

        <Card style={styles.searchCard}>
          <ThemedText style={styles.cardLabel}>Price Range (optional)</ThemedText>
          <View style={styles.postcodeInputGroup}>
            <Input
              placeholder="Min price"
              value={minPrice}
              onChangeText={setMinPrice}
              editable={!isSearching}
              keyboardType="numeric"
              style={{ marginRight: 8, flex: 1 }}
            />
            <Input
              placeholder="Max price"
              value={maxPrice}
              onChangeText={setMaxPrice}
              editable={!isSearching}
              keyboardType="numeric"
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        {renderErrorMessage()}

        <Button
          variant="primary"
          size="medium"
          title="Search Properties"
          onPress={handleSearch}
          loading={isSearching}
          disabled={!location || isSearching}
          fullWidth
          style={styles.searchButton}
        >
          <Ionicons name="search" size={18} color="white" />
          <ThemedText style={{ marginLeft: 8, color: 'white', fontWeight: '600' }}>Search Properties</ThemedText>
        </Button>

        {hasAttemptedSearch && (
          <>
            {isSearching && (
              <View style={styles.loadingContainer}>
                <LoadingSpinner />
                <ThemedText style={styles.loadingText}>Searching for properties...</ThemedText>
              </View>
            )}

            {!isSearching && listings.length === 0 && !error && (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="home-outline" size={48} color={textColor} />
                <ThemedText type="subtitle">No properties found</ThemedText>
                <ThemedText style={styles.emptyStateText}>Try a larger distance or wider filters.</ThemedText>
              </View>
            )}

            {!isSearching && listings.length > 0 && (
              <>
                <View style={styles.resultsHeader}>
                  <ThemedText type="subtitle">
                    {listings.length} {listings.length === 1 ? 'property' : 'properties'} found
                  </ThemedText>
                  <TouchableOpacity onPress={handleClearSearch}>
                    <ThemedText style={styles.clearButton}>Clear</ThemedText>
                  </TouchableOpacity>
                </View>

                {listings.map(listing => (
                  <HousingCard key={listing.id} listing={listing} />
                ))}
              </>
            )}
          </>
        )}

        {!hasAttemptedSearch && (
          <View style={styles.initialStateContainer}>
            <Ionicons name="search-outline" size={64} color={textColor} />
            <ThemedText type="subtitle">Start searching for housing</ThemedText>
            <ThemedText style={styles.initialStateText}>Set your location and filters to get started</ThemedText>
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
    textAlign: 'center',
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
