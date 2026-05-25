import { LocationData } from '@/types/job';

export interface HousingListing {
  id: string;
  title: string;
  address: string;
  priceLabel: string;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  imageUrl?: string;
  detailsUrl?: string;
  source: 'zoopla';
}

export interface HousingSearchParams {
  query?: string;
  location: LocationData;
  distanceMiles?: number;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  propertyType?: 'Any' | 'House' | 'Apartment' | 'Studio' | 'Shared';
  listingStatus?: 'for-sale' | 'to-rent';
}

export interface HousingSearchError {
  message: string;
  code: 'LOCATION_ERROR' | 'API_ERROR' | 'VALIDATION_ERROR' | 'PERMISSION_ERROR';
  details?: string;
}
