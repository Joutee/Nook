export interface Key {
  id: string;
  flat_id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
  assigned_to: string | null;
}

export interface KeyWithAssignee extends Key {
  assignee: {
    id: string;
    name: string;
    surname: string;
    avatar_url: string | null;
  } | null;
}
