export interface Member {
  id: string;
  name: string;
  surname: string;
  username?: string;
  avatar_url?: string | null;
  role: string;
}
