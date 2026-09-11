import { useQuery } from '@tanstack/react-query';
import { newsService } from '@/services/newsService';

export const newsKeys = {
  all: ['news'] as const,
};

export const useNews = () => {
  const query = useQuery({
    queryKey: newsKeys.all,
    queryFn: () => newsService.getNews(),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  return {
    data: query.data,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
};
