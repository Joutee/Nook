export interface Issue {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  image_path: string | null;
  status: string;
  profile_id: string;
  flat_id: string;
}
