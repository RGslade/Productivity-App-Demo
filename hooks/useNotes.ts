import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notesService } from '@/services/notesService';
import { CreateNoteRequest, UpdateNoteRequest } from '@/types/notes';

//
export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (filters: string) => [...noteKeys.lists(), { filters }] as const,
  details: () => [...noteKeys.all, 'detail'] as const,
  detail: (id: number) => [...noteKeys.details(), id] as const,
};

//
export const useNotes = () => {
  //
  const queryClient = useQueryClient();

  //
  const notesQuery = useQuery({
    queryKey: noteKeys.lists(),
    queryFn: () => notesService.getNotes(),
    staleTime: 2 * 60 * 1000,
  });

  //
  const createMutation = useMutation({
    mutationFn: (data: CreateNoteRequest) => notesService.createNote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to create note:', error);
    },
  });

  //
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateNoteRequest }) => notesService.updateNote(id, data),
    onSuccess: (updatedNote, { id }) => {
      queryClient.setQueryData(noteKeys.detail(id), updatedNote);
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to update note:', error);
    },
  });

  //
  const deleteMutation = useMutation({
    mutationFn: (id: number) => notesService.deleteNote(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: noteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to delete note:', error);
    },
  });

  return {
    notes: notesQuery.data || [],
    loading: notesQuery.isLoading,
    error: notesQuery.error,
    fetchNotes: notesQuery.refetch,
    createNote: createMutation.mutateAsync,
    updateNote: updateMutation.mutateAsync,
    deleteNote: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

//
export const useNote = (id: number) => {
  return useQuery({
    queryKey: noteKeys.detail(id),
    queryFn: () => notesService.getNote(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};
