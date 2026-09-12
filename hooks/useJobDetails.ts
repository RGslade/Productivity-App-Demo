/**
 * useJobDetails Hook
 * React Query wrapper for fetching and managing job details
 */

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import jobDetailsService from '@/services/jobDetailsService';
import { JobSearchError } from '@/types/job';

export function useJobDetails(jobId: string | number | null) {
  const [error, setError] = useState<JobSearchError | null>(null);

  const { data: job, isLoading, refetch } = useQuery({
    queryKey: ['jobDetails', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      try {
        setError(null);
        const result = await jobDetailsService.getJobDetails(jobId);
        return result;
      } catch (err: any) {
        const jobError: JobSearchError = {
          message: err?.message || 'Failed to fetch job details',
          code: err?.code || 'FETCH_ERROR',
          details: err?.details,
        };
        setError(jobError);
        throw jobError;
      }
    },
    enabled: !!jobId,
    retry: 1,
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    job: job || null,
    isLoading,
    error,
    refetch,
  };
}
