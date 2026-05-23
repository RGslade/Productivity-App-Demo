import databaseService from '@/services/databaseService';
import { Note, CreateNoteRequest, UpdateNoteRequest } from '@/types/notes';

//
class NotesService {
  /** Gets all saved notes for the current user ordered by most recently updated. */
  async getNotes(): Promise<Note[]> {
    //
    const { data } = await databaseService.getAll<Note>('Notes', 'updated_at');
    return data;
  }

  /** Gets one saved note by id for the current user. */
  async getNote(id: number): Promise<Note | null> {
    //
    const { data, error } = await databaseService.getSingle<Note>('Notes', undefined, 'id', id);
    //
    if (error) {
      //
      if (error.code === 'PGRST116' || error.details?.includes(' 0 rows')) return null;
      console.error('notesService.getNote', error);
      throw error;
    }
    return data;
  }

  /** Creates a saved note record for the current user. */
  async createNote(request: CreateNoteRequest): Promise<Note> {
    //
    const { data, error } = await databaseService.insertAndSelect<Note>('Notes', { title: request.title, content: request.content });
    //
    if (error) {
      console.error('notesService.createNote', error);
      throw error;
    }
    return data;
  }

  /** Updates an existing saved note for the current user. */
  async updateNote(id: number, updates: UpdateNoteRequest): Promise<Note> {
    //
    const { data } = await databaseService.updateTable<Note>('Notes', updates, undefined, 'id', id);
    return data;
  }

  /** Deletes a saved note by id for the current user. */
  async deleteNote(id: number): Promise<void> {
    await databaseService.deleteFromTable('Notes', 'id', id);
  }
}

//
export const notesService = new NotesService();
//
export default notesService;
