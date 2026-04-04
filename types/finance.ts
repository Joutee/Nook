import { Profile } from "./profile";

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
  surname: string;
  avatar_url: string | null;
  flat_id: string;
  net_balance: number;
}

export interface Settlement {
  fromName: string;
  fromSurname: string;
  toName: string;
  toSurname: string;
  toProfileId: string;
  amount: number;
}

export interface ExpenseWithDetails extends Expense {
  payer_name: string;
  payer_avatar: string | null;
}

export type RecurringInterval = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurringExpense {
  id: string;
  flat_id: string;
  created_by: string;
  payer_id: string;
  title: string;
  amount: number;
  currency: string;
  interval: RecurringInterval;
  interval_day: number | null;
  interval_month: number | null;
  next_occurrence: string;
  is_paused: boolean;
  created_at: string;
}

export interface RecurringExpenseMember {
  id: string;
  recurring_expense_id: string;
  profile_id: string;
}

export interface RecurringExpenseWithDetails extends RecurringExpense {
  payer: {
    name: string;
    surname: string;
    avatar_url: string | null;
  };
}
