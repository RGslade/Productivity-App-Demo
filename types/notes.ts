//
export interface Note {
  id: number;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

//
export interface TempNote {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  isTemporary: true;
}

//
export interface CreateNoteRequest {
  title: string;
  content: string;
}

//
export interface UpdateNoteRequest {
  title?: string;
  content: string;
}

//
export interface NotesListItem {
  id: string | number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  isTemporary: boolean;
};
