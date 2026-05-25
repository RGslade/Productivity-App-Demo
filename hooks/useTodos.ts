import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { todoService } from '../services/todoService';
import { ToDoItem, CreateToDoRequest, UpdateToDoRequest, CreateCategoryRequest, UpdateCategoryRequest } from '../types/todo';

// Query keys for React Query cache management
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: string) => [...todoKeys.lists(), { filters }] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
  categories: () => [...todoKeys.all, 'categories'] as const,
  premiumCategories: () => [...todoKeys.all, 'premium-categories'] as const,
};

// Hook for getting all ToDo items
export const useTodos = () => {
  const queryClient = useQueryClient();

  const todosQuery = useQuery({
    queryKey: todoKeys.lists(),
    queryFn: () => todoService.getToDoItems(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const categoriesQuery = useQuery({
    queryKey: todoKeys.categories(),
    queryFn: () => todoService.getCategories(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const premiumCategoriesQuery = useQuery({
    queryKey: todoKeys.premiumCategories(),
    queryFn: () => todoService.getPremiumCategories(),
    staleTime: 10 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateToDoRequest) => todoService.createToDoItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to create todo:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateToDoRequest }) =>
      todoService.updateToDoItem(id, data),
    onSuccess: (updatedTodo, { id }) => {
      queryClient.setQueryData(todoKeys.detail(id), updatedTodo);
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to update todo:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id:number) => todoService.deleteToDoItem(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: todoKeys.detail(id) });

      // Invalidate todos list to refetch
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
        },
    onError: (error) => {
      console.error('Failed to delete todo:', error);
    },
  });

  return {
    todos: todosQuery.data || [],
    categories: categoriesQuery.data || [],
    premiumCategories: premiumCategoriesQuery.data || [],
    loading: todosQuery.isLoading,
    error: todosQuery.error,
    fetchTodos: todosQuery.refetch,
    fetchCategories: categoriesQuery.refetch,
    createTodo: createMutation.mutateAsync,
    updateTodo: updateMutation.mutateAsync,
    isRefetching: todosQuery.isRefetching,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    deleteToDo: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};

// Hook for getting specific ToDo item
export const useTodo = (id: number) => {
  return useQuery({
    queryKey: todoKeys.detail(id),
    queryFn: () => todoService.getToDoItem(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for getting categories
export const useCategories = () => {
  return useQuery({
    queryKey: todoKeys.categories(),
    queryFn: () => todoService.getCategories(),
    staleTime: 10 * 60 * 1000, // 10 minutes (categories don't change often)
  });
};

// Hook for creating ToDo item
export const useCreateTodo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateToDoRequest) => todoService.createToDoItem(data),
    onSuccess: () => {
      // Invalidate todos list to refetch with new item
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to create todo:', error);
    },
  });
};

// Hook for updating ToDo item
export const useUpdateTodo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateToDoRequest }) =>
      todoService.updateToDoItem(id, data),
    onSuccess: (updatedTodo, { id }) => {
      // Update the specific todo in cache
      queryClient.setQueryData(todoKeys.detail(id), updatedTodo);

      // Invalidate todos list to refetch
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to update todo:', error);
    },
  });
};

// Hook for deleting ToDo item
export const useDeleteTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => todoService.deleteToDoItem(id),
    onSuccess: (_, id) => {
      // Remove the specific todo from cache
      queryClient.removeQueries({ queryKey: todoKeys.detail(id) });

      // Invalidate todos list to refetch
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to delete todo:', error);
    },
  });
};

// Hook for creating category
export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryRequest) => todoService.createCategory(data),
    onSuccess: () => {
      // Invalidate categories to refetch with new category
      queryClient.invalidateQueries({ queryKey: todoKeys.categories() });
    },
    onError: (error) => {
      console.error('Failed to create category:', error);
    },
  });
};

// Hook for updating category
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCategoryRequest }) =>
      todoService.updateCategory(id, data.name),
    onSuccess: () => {
      // Invalidate categories and todos to refetch
      queryClient.invalidateQueries({ queryKey: todoKeys.categories() });
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to update category:', error);
    },
  });
};

// Hook for deleting category
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => todoService.deleteCategory(id),
    onSuccess: () => {
      // Invalidate categories and todos to refetch
      queryClient.invalidateQueries({ queryKey: todoKeys.categories() });
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to delete category:', error);
    },
  });
};

// Hook for ensuring default categories exist
export const useEnsureDefaultCategories = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => todoService.ensureDefaultCategories(),
    onSuccess: () => {
      // Invalidate categories to refetch with defaults
      queryClient.invalidateQueries({ queryKey: todoKeys.categories() });
    },
    onError: (error) => {
      console.error('Failed to ensure default categories:', error);
    },
  });
};

// Hook for ToDo statistics (derived from todos data)
export const useTodoStats = () => {
  const { todos: todos = [] } = useTodos();

  return {
    total: todos.length,
    completed: todoService.getCompletedCount(todos),
    outstanding: todoService.getOutstandingCount(todos),
    overdue: todoService.getOverdueItems(todos).length,
    dueSoon: (days: number) => todoService.getItemsDueSoon(todos, days).length,
    earliestDueDate: todoService.getEarliestDueDate(todos),
  };
};

// Hook for toggling todo completion status
export const useToggleTodo = () => {
  const updateTodo = useUpdateTodo();

  return useMutation({
    mutationFn: (todo: ToDoItem) => {
      const updatedData: UpdateToDoRequest = {
        title: todo.title,
        description: todo.description,
        due_date_time: todo['due_date_&_time'] || undefined,
        category_id: todo.category_id,
        is_complete: !todo.is_complete,
        remind_me: todo.remind_me,
        progress: todo.progress,
      };

      return updateTodo.mutateAsync({ id: todo.id, data: updatedData });
    },
  });
};
