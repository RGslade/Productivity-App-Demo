//
export interface Document {
  id: number;
  title: string;
  description?: string;
  file_name: string;
  content?: string;
  created_at: string;
  updated_at: string;
  is_builtin?: boolean;
}
