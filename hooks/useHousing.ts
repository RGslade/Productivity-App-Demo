import { useMutation } from '@tanstack/react-query';
import housingService from '@/services/housingService';
import { HousingListing, HousingSearchError, HousingSearchParams } from '@/types/housing';

export function useHousing() {
  const searchMutation = useMutation<HousingListing[], HousingSearchError, HousingSearchParams>({
    mutationFn: (params: HousingSearchParams) => housingService.searchListings(params),
    onError: (error) => {
      console.error('Housing search mutation error:', error);
    },
  });

  return {
    listings: searchMutation.data || [],
    isSearching: searchMutation.isPending,
    isError: searchMutation.isError,
    error: searchMutation.error,
    searchListings: (params: HousingSearchParams) => searchMutation.mutate(params),
    resetSearch: () => searchMutation.reset(),
  };
}
