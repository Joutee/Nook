export interface Message {
  id: string;
  flat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender: {
    id: string;
    name: string;
    surname: string | null;
    avatar_url: string | null;
  };
}

export interface MessageRead {
  profile_id: string;
  flat_id: string;
  last_read_at: string;
}
