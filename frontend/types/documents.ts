export interface Document {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  document_path: string;
}
