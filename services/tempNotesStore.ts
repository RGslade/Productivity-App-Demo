import { TempNote } from '@/types/notes';

//
let tempNotes: TempNote[] = [];

//
const createId = () => `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

//
const sortByUpdated = (a: TempNote, b: TempNote) => {
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
};

//
export const tempNotesStore = {
  getAll(): TempNote[] {
    return [...tempNotes].sort(sortByUpdated);
  },
  getById(id: string): TempNote | undefined {
    return tempNotes.find(note => note.id === id);
  },
  add(title: string, content: string): TempNote {
    //
    const timestamp = new Date().toISOString();
    //
    const note: TempNote = {
      id: createId(),
      title,
      content,
      created_at: timestamp,
      updated_at: timestamp,
      isTemporary: true,
    };
    tempNotes = [note, ...tempNotes];
    return note;
  },
  update(id: string, updates: { title?: string; content?: string }): TempNote | null {
    //
    const index = tempNotes.findIndex(note => note.id === id);
    //
    if (index === -1) return null;
    //
    const updated: TempNote = {
      ...tempNotes[index],
      title: updates.title ?? tempNotes[index].title,
      content: updates.content ?? tempNotes[index].content,
      updated_at: new Date().toISOString(),
      isTemporary: true,
    };
    tempNotes = tempNotes.map(note => (note.id === id ? updated : note));
    return updated;
  },
  remove(id: string): void {
    tempNotes = tempNotes.filter(note => note.id !== id);
  },
  clear(): void {
    tempNotes = [];
  },
};

//
export default tempNotesStore;
