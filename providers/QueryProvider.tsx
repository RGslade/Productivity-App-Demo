import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client
//
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        //
        if (error?.message?.includes('401') || error?.message?.includes('403')) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});

//
interface QueryProviderProps {
  children: React.ReactNode;
}

//
export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  //
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

//
export default QueryProvider;
