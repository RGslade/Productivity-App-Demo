import { HousingListing, HousingSearchParams } from '@/types/housing';
import { supabase } from '@/lib/supabase';

//
const DEFAULT_ZOOPLA_RAPIDAPI_HOST = 'zoopla.p.rapidapi.com';

//
const FALLBACK_LISTINGS: HousingListing[] = [
  {
    id: 'sample-1',
    title: '2-bed apartment near city centre',
    address: 'Manchester M1',
    priceLabel: 'GBP 1,150 pcm',
    bedrooms: 2,
    bathrooms: 1,
    propertyType: 'Apartment',
    source: 'zoopla',
  },
  {
    id: 'sample-2',
    title: '3-bed terraced house with garden',
    address: 'Leeds LS6',
    priceLabel: 'GBP 1,450 pcm',
    bedrooms: 3,
    bathrooms: 2,
    propertyType: 'House',
    source: 'zoopla',
  },
  {
    id: 'sample-3',
    title: '1-bed studio flat',
    address: 'Birmingham B1',
    priceLabel: 'GBP 875 pcm',
    bedrooms: 1,
    bathrooms: 1,
    propertyType: 'Studio',
    source: 'zoopla',
  },
  {
    id: 'sample-4',
    title: 'Shared housing room',
    address: 'Bristol BS1',
    priceLabel: 'GBP 650 pcm',
    bedrooms: 1,
    bathrooms: 1,
    propertyType: 'Shared',
    source: 'zoopla',
  },
];

/**
 * Reads optional local RapidAPI housing config for development builds only.
 */
function getLocalDevelopmentHousingConfig() {
  //
  if (!__DEV__) return null;

  //
  const apiKey = process.env.EXPO_PUBLIC_RAPIDAPI_KEY?.trim() ?? '';
  //
  if (!apiKey) return null;

  return {
    apiKey,
    host: process.env.EXPO_PUBLIC_ZOOPLA_RAPIDAPI_HOST?.trim() || DEFAULT_ZOOPLA_RAPIDAPI_HOST,
  };
}

/**
 * Maps a Zoopla/RapidAPI payload item into the app's housing listing shape.
 */
function mapRemoteHousingListing(item: any, index: number): HousingListing {
  return {
    id: String(item?.listing_id || item?.id || `remote-${index}`),
    title: item?.title || item?.displayable_address || 'Property listing',
    address: item?.displayable_address || item?.address || 'UK',
    priceLabel: item?.price || item?.price_label || 'Price on request',
    bedrooms: item?.num_bedrooms,
    bathrooms: item?.num_bathrooms,
    propertyType: item?.property_type,
    imageUrl: item?.image_url || item?.image_urls?.[0],
    detailsUrl: item?.details_url || item?.listing_url,
    source: 'zoopla',
  };
}

//
class HousingService {
  private filterFallbackListings(listings: HousingListing[], params: HousingSearchParams): HousingListing[] {
    return listings.filter((listing) => {
      //
      if (params.bedrooms && (listing.bedrooms || 0) < params.bedrooms) return false;
      //
      if (params.propertyType && params.propertyType !== 'Any') {
        //
        const propertyType = listing.propertyType?.toLowerCase() || '';
        //
        if (!propertyType.includes(params.propertyType.toLowerCase())) return false;
      }
      //
      if (params.query) {
        //
        const target = `${listing.title} ${listing.address}`.toLowerCase();
        //
        if (!target.includes(params.query.toLowerCase())) return false;
      }
      return true;
    });
  }

  async searchListings(params: HousingSearchParams): Promise<HousingListing[]> {
    //
    try {
      //
      const locationText = params.location.postcode || params.location.address || `${params.location.latitude},${params.location.longitude}`;
      //
      const localHousingConfig = getLocalDevelopmentHousingConfig();
      //
      if (localHousingConfig) {
        //
        const endpoint = `https://${localHousingConfig.host}/properties/v2/${params.listingStatus === 'for-sale' ? 'list-for-sale' : 'list-for-rent'}`;
        //
        const query = new URLSearchParams({
          location: locationText || 'uk',
          page: '1',
        });

        //
        if (params.query) query.set('keywords', params.query);
        //
        if (params.minPrice) query.set('min_price', String(params.minPrice));
        //
        if (params.maxPrice) query.set('max_price', String(params.maxPrice));
        //
        if (params.bedrooms) query.set('bedrooms_min', String(params.bedrooms));
        //
        if (params.distanceMiles) query.set('radius', String(params.distanceMiles));
        //
        if (params.propertyType && params.propertyType !== 'Any') query.set('property_type', params.propertyType.toLowerCase());

        //
        const response = await fetch(`${endpoint}?${query.toString()}`, {
          headers: {
            'x-rapidapi-key': localHousingConfig.apiKey,
            'x-rapidapi-host': localHousingConfig.host,
          },
        });

        //
        if (!response.ok) {
          //
          const details = await response.text();
          console.error('housingService.searchListings local API error', response.status, details);
          return this.filterFallbackListings(FALLBACK_LISTINGS, params);
        }

        //
        const payload = await response.json();
        //
        const results = Array.isArray(payload?.data) ? payload.data : [];
        //
        const mapped = results.map(mapRemoteHousingListing);
        //
        if (mapped.length > 0) return mapped;
      }

      //
      const { data, error } = await supabase.functions.invoke('housing-search', {
        body: {
          ...params,
          locationText,
        },
      });

      //
      if (error) {
        console.error('housingService.searchListings function error', error);
        return this.filterFallbackListings(FALLBACK_LISTINGS, params);
      }

      //
      const listings = Array.isArray(data?.listings) ? data.listings as HousingListing[] : [];
      //
      if (listings.length > 0) return listings;
      return this.filterFallbackListings(FALLBACK_LISTINGS, params);
    } catch (error) {
      console.error('housingService.searchListings', error);
      return this.filterFallbackListings(FALLBACK_LISTINGS, params);
    }
  }
}

//
export const housingService = new HousingService();
//
export default housingService;
