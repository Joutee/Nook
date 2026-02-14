export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface Expense {
  id: string;
  created_at: string;
  happened_at: string;
  flat_id: string;
  payer_id: string;
  title: string;
  amount: number;
  is_settlement: boolean;
}

export interface ExpenseShare {
  id: string;
  expense_id: string;
  profile_id: string;
  owed_amount: number;
}

export interface Balance {
  profile_id: string;
  name: string;
  avatar_url: string | null;
  flat_id: string;
  net_balance: number;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export interface ExpenseWithDetails extends Expense {
  payer_name: string;
  payer_avatar: string | null;
}
