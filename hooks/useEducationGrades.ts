import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { educationGradeService } from '@/services/educationGradeService';
import { CreateEducationGradeRequest, UpdateEducationGradeRequest } from '@/types/educationGrade';

//
export const educationGradeKeys = {
  all: ['educationGrades'] as const,
  list: () => [...educationGradeKeys.all, 'list'] as const,
  detail: (id: number) => [...educationGradeKeys.all, 'detail', id] as const,
};

//
export const useEducationGrades = () => {
  //
  const queryClient = useQueryClient();
  //
  const query = useQuery({
    queryKey: educationGradeKeys.list(),
    queryFn: () => educationGradeService.getGrades(),
  });

  //
  const createMutation = useMutation({
    mutationFn: (payload: CreateEducationGradeRequest) => educationGradeService.createGrade(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: educationGradeKeys.all }),
  });

  //
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateEducationGradeRequest }) => educationGradeService.updateGrade(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: educationGradeKeys.all });
      queryClient.invalidateQueries({ queryKey: educationGradeKeys.detail(variables.id) });
    },
  });

  //
  const deleteMutation = useMutation({
    mutationFn: (id: number) => educationGradeService.deleteGrade(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: educationGradeKeys.all }),
  });

  return {
    grades: query.data || [],
    loading: query.isLoading,
    error: query.error,
    fetchGrades: query.refetch,
    createGrade: createMutation.mutateAsync,
    updateGrade: updateMutation.mutateAsync,
    deleteGrade: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

//
export const useEducationGrade = (id: number) => useQuery({
  queryKey: educationGradeKeys.detail(id),
  queryFn: () => educationGradeService.getGrade(id),
  enabled: !!id,
});
