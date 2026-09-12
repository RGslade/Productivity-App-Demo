import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '../services/transactionService';
import { CreateTransactionRequest, UpdateTransactionRequest} from '../types/transaction';
import { GetCurrentMonth, GetCurrentYear } from './dataHandler';

// Query keys for React Query cache management
export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters?: { month?: number; year?: number }) => 
    [...transactionKeys.lists(), { filters }] as const,
  details: () => [...transactionKeys.all, 'detail'] as const,
  detail: (id: number) => [...transactionKeys.details(), id] as const,
  monthly: (month: number) => [...transactionKeys.all, 'monthly', month] as const,
  categories: () => [...transactionKeys.all, 'categories'] as const,
};

// Hook for getting all transactions with mutation methods
export const useTransactions = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: transactionKeys.lists(),
    queryFn: () => transactionService.getTransactions(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
  const categoriesQuery = useQuery({
    queryKey: transactionKeys.categories(),
    queryFn: () => transactionService.getTransactionCategories(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000,
  });

  const updateMutation = useMutation({
      mutationFn: ({ id, data }: { id: number; data: UpdateTransactionRequest }) =>
        transactionService.updateTransaction(id, data),
      onSuccess: (updatedTransaction, { id }) => {
        // Update the specific transaction in cache
        queryClient.setQueryData(transactionKeys.detail(id), updatedTransaction);
        queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
        queryClient.invalidateQueries({ queryKey: [...transactionKeys.all, 'monthly'] });
      },
      onError: (error) => {
        console.error('Failed to update transaction:', error);
      }
    });

    const createMutation = useMutation({
      mutationFn: (data: CreateTransactionRequest) => 
        transactionService.createTransaction(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
        queryClient.invalidateQueries({ queryKey: [...transactionKeys.all, 'monthly'] });
      },
      onError: (error) => {
        console.error('Failed to create transaction:', error);
      },
    });

    const deleteMutation = useMutation({
      mutationFn: (id: number) => transactionService.deleteTransaction(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
        queryClient.invalidateQueries({ queryKey: [...transactionKeys.all, 'monthly'] });
      },
      onError: (error) => {
        console.error('Failed to delete transaction:', error);
      },
    });

  return {
    transactions: query.data || [],
    categories: categoriesQuery.data || [],
    categoriesLoading: categoriesQuery.isLoading,
    categoriesError: categoriesQuery.error,
    loading: query.isLoading,
    error: query.error,
    fetchTransactions: query.refetch,
    fetchCategories: categoriesQuery.refetch,
    isRefetching: query.isRefetching,
    createTransaction: createMutation.mutateAsync,
    updateTransaction: updateMutation.mutateAsync,
    deleteTransaction: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

/** Gets transaction categories filtered by transaction type when provided. */
export const useTransactionCategories = (type?: string) => {
  return useQuery({
    queryKey: [...transactionKeys.categories(), type || 'all'],
    queryFn: () => transactionService.getTransactionCategories(type),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000,
  });
};

// Hook for getting transactions by month
export const useTransactionsByMonth = (month: number, year: number) => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: transactionKeys.monthly(month),
    queryFn: () => transactionService.getTransactionsByMonth(month, year),
    enabled: !!month && month >= 1 && month <= 12,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTransactionRequest) => 
      transactionService.createTransaction(data),
      onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...transactionKeys.all, 'monthly'] });
    },
    onError: (error) => {
      console.error('Failed to create transaction:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => transactionService.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...transactionKeys.all, 'monthly'] });
    },
    onError: (error) => {
      console.error('Failed to delete transaction:', error);
    },
  });

  return {
    transactions: query.data || [],
    loading: query.isLoading,
    error: query.error,
    fetchTransactions: query.refetch,
    isRefetching: query.isRefetching,
    createTransaction: createMutation.mutateAsync,
    deleteTransaction: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

// Hook for getting specific transaction
export const useTransaction = (id: number) => {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => transactionService.getTransaction(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for creating transaction
export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransactionRequest) => 
      transactionService.createTransaction(data),
    onSuccess: (newTransaction) => {
      // Invalidate transactions list to refetch with new item
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      
      // Invalidate monthly data if we know the month
      const month = new Date(newTransaction.due_date).getMonth() + 1;
      queryClient.invalidateQueries({ queryKey: transactionKeys.monthly(month) });
    },
    onError: (error) => {
      console.error('Failed to create transaction:', error);
    },
  });
};

// Hook for updating transaction
export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTransactionRequest }) =>
      transactionService.updateTransaction(id, data),
    onSuccess: (updatedTransaction, { id }) => {
      // Update the specific transaction in cache
      queryClient.setQueryData(transactionKeys.detail(id), updatedTransaction);
      
      // Invalidate transactions list to refetch
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      
      // Invalidate monthly data
      const month = new Date(updatedTransaction.due_date).getMonth() + 1;
      queryClient.invalidateQueries({ queryKey: transactionKeys.monthly(month) });
    },
    onError: (error) => {
      console.error('Failed to update transaction:', error);
    },
  });
};

// Hook for deleting transaction
export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => transactionService.deleteTransaction(id),
      onSuccess: (_, id) => {
      // Remove the specific transaction from cache
      queryClient.removeQueries({ queryKey: transactionKeys.detail(id) });
      
      // Invalidate transactions list to refetch
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...transactionKeys.all, 'monthly'] });
      
      // Invalidate all monthly data (we don't know which month it was from)
      queryClient.invalidateQueries({ 
        queryKey: [...transactionKeys.all, 'monthly']
      });
    },
    onError: (error) => {
      console.error('Failed to delete transaction:', error);
    },
  });
};

// Hook for transaction statistics (derived from transactions data)
export const useTransactionStats = (month?: number, year?: number) => {
  const { transactions: allTransactions = [] } = useTransactions();
  const { transactions: monthlyTransactions = [] } = useTransactionsByMonth(month || new Date().getMonth() + 1, year || new Date().getFullYear());
  const transactions = month ? monthlyTransactions : allTransactions;
  
  return {
    total: transactions.length,
    totalIncome: transactionService.getTotalIncome(transactions),
    totalExpenses: transactionService.getTotalExpenses(transactions),
    netTotal: transactionService.getNetTotal(transactions),
    thisMonthCount: transactionService.getTransactionsDueThisMonth(allTransactions).length,
  };
};

// Hook for current month transactions
export const useCurrentMonthTransactions = () => {
  const month = GetCurrentMonth();
  const year = GetCurrentYear();
  return useTransactionsByMonth(month, year);
};

// Hook for financial summary
export const useFinancialSummary = () => {
  const month = GetCurrentMonth();
  const year = GetCurrentYear();
  const { transactions: allTransactions = [] } = useTransactions();
  const { transactions: monthlyTransactions = [] } = useTransactionsByMonth(month, year);

  return {
    thisMonth: {
      income: transactionService.getTotalIncome(monthlyTransactions),
      expenses: transactionService.getTotalExpenses(monthlyTransactions),
      net: transactionService.getNetTotal(monthlyTransactions),
      count: monthlyTransactions.length,
    },
    allTime: {
      income: transactionService.getTotalIncome(allTransactions),
      expenses: transactionService.getTotalExpenses(allTransactions),
      net: transactionService.getNetTotal(allTransactions),
      count: allTransactions.length,
    },
  };
};
