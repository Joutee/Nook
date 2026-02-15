export interface Chore {
  id: string;
  flat_id: string;
  name: string;
  description: string | null;
  interval_days: number;
  current_cycle_index: number;
  current_assignee_id: string | null;
  assignee_name: string | null;
  assignee_surname: string | null;
  assignee_avatar: string | null;
  assignee_user_id: string | null;
  is_completed_current_cycle: boolean;
  start_date: string | null;
}

export interface HistoryItem {
  chore_id: string;
  flat_id: string;
  cycle_index: number;
  cycle_start_date: string;
  expected_profile_id: string | null;
  expected_profile_name: string | null;
  expected_profile_surname: string | null;
  expected_profile_avatar: string | null;
  is_done: boolean;
  completed_by_profile_id: string | null;
  completed_by_name: string | null;
  completed_by_surname: string | null;
  completed_at: string | null;
}
