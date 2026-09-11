import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { examService } from '@/services/examService';
import { CreateExamRequest, UpdateExamRequest } from '@/types/exam';
export const useExams = () => {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['exams'], queryFn: () => examService.getExams() });
  const create = useMutation({ mutationFn: (request: CreateExamRequest) => examService.createExam(request), onSuccess: () => client.invalidateQueries({ queryKey: ['exams'] }) });
  const update = useMutation({ mutationFn: ({ id, updates }: { id: number; updates: UpdateExamRequest }) => examService.updateExam(id, updates), onSuccess: () => client.invalidateQueries({ queryKey: ['exams'] }) });
  const remove = useMutation({ mutationFn: (id: number) => examService.deleteExam(id), onSuccess: () => client.invalidateQueries({ queryKey: ['exams'] }) });
  return { exams: query.data || [], loading: query.isLoading, error: query.error, refetch: query.refetch, createExam: create.mutateAsync, updateExam: update.mutateAsync, deleteExam: remove.mutateAsync, isSaving: create.isPending || update.isPending };
};
