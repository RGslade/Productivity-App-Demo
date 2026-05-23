/**
 * Location Handler Hook
 * Manages device location acquisition with GPS and postcode fallback
 */

import * as Location from 'expo-location';
import { LocationData, JobSearchError } from '@/types/job';
import { useState, useCallback } from 'react';

//
export function useLocationHandler() {
  //
  const [location, setLocation] = useState<LocationData | null>(null);
  //
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  //
  const [locationError, setLocationError] = useState<JobSearchError | null>(null);

  /**
   * Request location permission and get current position
   */
  const requestLocationPermission = useCallback(async (): Promise<LocationData | null> => {
    //
    try {
      setIsLoadingLocation(true);
      setLocationError(null);

      // Request permission
      //
      const { status } = await Location.requestForegroundPermissionsAsync();

      //
      if (status !== 'granted') {
        setLocationError({
          message: 'Location permission denied',
          code: 'PERMISSION_ERROR',
          details: 'Please grant location permission to use proximity search, or enter a postcode manually.',
        });
        return null;
      }

      // Get current location
      //
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        mayShowUserSettingsDialog: true,
      });

      //
      const locationData: LocationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        postcode: '',
        address: `${currentLocation.coords.latitude}, ${currentLocation.coords.longitude}`,
      };

      // Try to get reverse geocode to get postcode
      //
      try {
        //
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });

        //
        if (reverseGeocode.length > 0) {
          //
          const address = reverseGeocode[0];
          locationData.postcode = address.postalCode || '';
          locationData.address = `${address.city || ''} ${address.region || ''} ${address.country || ''}`.trim();
        }
      } catch (geocodeError) {
        console.warn('Reverse geocoding failed:', geocodeError);
        // Continue with just coordinates
      }

      setLocation(locationData);
      return locationData;
    } catch (error) {
      console.error('Location permission error:', error);
      setLocationError({
        message: 'Failed to get location',
        code: 'LOCATION_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  /**
   * Get location from postcode (UK geocoding)
   * Uses a free postcode geocoding service
   */
  const getLocationFromPostcode = useCallback(async (postcode: string): Promise<LocationData | null> => {
    //
    try {
      setIsLoadingLocation(true);
      setLocationError(null);

      //
      const normalizedPostcode = postcode.toUpperCase().replace(/\s+/g, '');

      // Use UK postcode API - free service
      //
      const response = await fetch(`https://api.postcodes.io/postcodes/${normalizedPostcode}`);

      //
      if (!response.ok) {
        setLocationError({
          message: 'Invalid UK postcode',
          code: 'LOCATION_ERROR',
          details: `Could not find location for postcode: ${postcode}`,
        });
        return null;
      }

      //
      const data = await response.json();

      //
      if (!data.result) {
        setLocationError({
          message: 'Postcode not found',
          code: 'LOCATION_ERROR',
          details: `No location data found for postcode: ${postcode}`,
        });
        return null;
      }

      //
      const locationData: LocationData = {
        latitude: data.result.latitude,
        longitude: data.result.longitude,
        postcode: data.result.postcode,
        address: `${data.result.admin_district || ''} ${data.result.region || ''}`.trim(),
      };

      setLocation(locationData);
      return locationData;
    } catch (error) {
      console.error('Postcode lookup error:', error);
      setLocationError({
        message: 'Postcode lookup failed',
        code: 'LOCATION_ERROR',
        details: error instanceof Error ? error.message : 'Failed to look up postcode',
      });
      return null;
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  /**
   * Clear location and errors
   */
  const clearLocation = useCallback(() => {
    setLocation(null);
    setLocationError(null);
  }, []);

  return {
    location,
    isLoadingLocation,
    locationError,
    requestLocationPermission,
    getLocationFromPostcode,
    clearLocation,
  };
}

// Legacy service for backward compatibility
//
class LocationService {
  async PostCode(): Promise<string | null> {
    //
    const { status } = await Location.requestForegroundPermissionsAsync();
    //
    if (status !== 'granted') {
      console.error('Permission to access location was denied');
      return null;
    }
    //
    const location = await Location.getCurrentPositionAsync({});
    //
    const { latitude, longitude } = location.coords;
    //
    const address = await Location.reverseGeocodeAsync({ latitude, longitude });
    //
    const postcode = address[0]?.postalCode || null;
    return postcode;
  }
}

//
export const locationService = new LocationService();
//
export default locationService;
