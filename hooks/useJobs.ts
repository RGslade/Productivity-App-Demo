/**
 * useJobs Hook
 * Provides job search functionality with React Query caching
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import jobService from '@/services/jobService';
import { Job, JobSearchParams, JobSearchError } from '@/types/job';

export function useJobs() {
  // Mutation for searching jobs
  const searchMutation = useMutation<Job[], JobSearchError, JobSearchParams>({
    mutationFn: (params: JobSearchParams) => jobService.searchJobs(params),
    onError: (error) => {
      console.error('Job search mutation error:', error);
    },
  });

  return {
    // Search mutation state and functions
    jobs: searchMutation.data || [],
    isSearching: searchMutation.isPending,
    isError: searchMutation.isError,
    error: searchMutation.error,
    searchJobs: (params: JobSearchParams) => searchMutation.mutate(params),

    // Reset mutation
    resetSearch: () => searchMutation.reset(),
  };
}
