type HousingSearchRequest = {
  query?: string;
  locationText?: string;
  distanceMiles?: number;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  propertyType?: string;
  listingStatus?: 'for-sale' | 'to-rent';
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function mapListing(item: any, index: number) {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const params = (await req.json().catch(() => ({}))) as HousingSearchRequest;
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY')?.trim() ?? '';
    const zooplaHost = Deno.env.get('ZOOPLA_RAPIDAPI_HOST')?.trim() || 'zoopla.p.rapidapi.com';

    if (!rapidApiKey) {
      return new Response(JSON.stringify({ listings: [], error: 'RAPIDAPI_KEY_MISSING' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const endpoint = `https://${zooplaHost}/properties/v2/${params.listingStatus === 'for-sale' ? 'list-for-sale' : 'list-for-rent'}`;
    const query = new URLSearchParams({
      location: params.locationText || 'uk',
      page: '1',
    });

    if (params.query) query.set('keywords', params.query);
    if (params.minPrice) query.set('min_price', String(params.minPrice));
    if (params.maxPrice) query.set('max_price', String(params.maxPrice));
    if (params.bedrooms) query.set('bedrooms_min', String(params.bedrooms));
    if (params.distanceMiles) query.set('radius', String(params.distanceMiles));
    if (params.propertyType && params.propertyType !== 'Any') query.set('property_type', params.propertyType.toLowerCase());

    const response = await fetch(`${endpoint}?${query.toString()}`, {
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': zooplaHost,
      },
    });

    if (!response.ok) {
      const details = await response.text();
      return new Response(JSON.stringify({ listings: [], error: 'HOUSING_API_ERROR', details }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await response.json();
    const results = Array.isArray(payload?.data) ? payload.data : [];
    const listings = results.map(mapListing);

    return new Response(JSON.stringify({ listings }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        listings: [],
        error: error instanceof Error ? error.message : 'HOUSING_SEARCH_ERROR',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
