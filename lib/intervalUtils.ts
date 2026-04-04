import { RecurringInterval } from "@/types/finance";
import { Chore } from "@/types/chores";

const DAY_NAMES = ["", "Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const MONTH_NAMES = [
  "",
  "ledna",
  "února",
  "března",
  "dubna",
  "května",
  "června",
  "července",
  "srpna",
  "září",
  "října",
  "listopadu",
  "prosince",
];

export function formatInterval(
  type: RecurringInterval,
  intervalDay?: number | null,
  intervalMonth?: number | null,
  customDays?: number | null,
): string {
  switch (type) {
    case "daily":
      return "Denně";
    case "weekly":
      return `Týdně, ${DAY_NAMES[intervalDay ?? 1]}`;
    case "monthly":
      return `Měsíčně, ${intervalDay ?? 1}. dne`;
    case "yearly":
      return `Ročně, ${intervalDay ?? 1}. ${MONTH_NAMES[intervalMonth ?? 1]}`;
    case "custom":
      if (!customDays || customDays === 1) return "Každý den";
      return `Každých ${customDays} dní`;
    default:
      return "";
  }
}

export function calculateNextCycleDate(chore: Chore): Date | null {
  if (!chore.start_date) return null;

  const startDate = new Date(chore.start_date);
  const nextCycle = chore.current_cycle_index + 1;

  switch (chore.interval_type) {
    case "daily": {
      const next = new Date(startDate);
      next.setDate(next.getDate() + nextCycle);
      return next;
    }
    case "weekly": {
      const next = new Date(startDate);
      next.setDate(next.getDate() + nextCycle * 7);
      return next;
    }
    case "monthly": {
      const next = new Date(startDate);
      next.setMonth(next.getMonth() + nextCycle);
      return next;
    }
    case "yearly": {
      const next = new Date(startDate);
      next.setFullYear(next.getFullYear() + nextCycle);
      return next;
    }
    case "custom": {
      const days = chore.custom_days ?? 1;
      const next = new Date(startDate);
      next.setDate(next.getDate() + nextCycle * days);
      return next;
    }
    default:
      return null;
  }
}

/**
 * Calculate the most recent past (or today) occurrence of the interval's
 * matching day. Used to auto-set start_date when creating/editing chores.
 * The DB view uses start_date to compute current_cycle_index, so start_date
 * must never be in the future.
 */
export function calculateIntervalStartDate(
  intervalType: RecurringInterval,
  intervalDay?: number | null,
  intervalMonth?: number | null,
  customDays?: number | null,
): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (intervalType) {
    case "daily":
    case "custom":
      return today;

    case "weekly": {
      // intervalDay: 1=Mon..7=Sun
      const targetDay = intervalDay ?? 1;
      const currentDay = today.getDay() || 7; // Convert Sunday 0 to 7 (ISO)
      if (currentDay === targetDay) return today;
      // Find the most recent past occurrence of targetDay
      const diff = currentDay - targetDay;
      const result = new Date(today);
      result.setDate(today.getDate() - (diff > 0 ? diff : diff + 7));
      return result;
    }

    case "monthly": {
      // intervalDay: 1-31
      const targetDayOfMonth = intervalDay ?? 1;
      const currentDate = today.getDate();
      if (currentDate === targetDayOfMonth) return today;
      // Find the most recent occurrence of this day-of-month
      if (currentDate > targetDayOfMonth) {
        // It's this month
        const result = new Date(today.getFullYear(), today.getMonth(), targetDayOfMonth);
        return result;
      } else {
        // It was last month
        const result = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
        result.setDate(Math.min(targetDayOfMonth, lastDay));
        return result;
      }
    }

    case "yearly": {
      // intervalDay: 1-31, intervalMonth: 1-12
      const targetDay = intervalDay ?? 1;
      const targetMonth = (intervalMonth ?? 1) - 1; // JS months are 0-indexed
      const thisYearDate = new Date(today.getFullYear(), targetMonth, targetDay);
      if (thisYearDate <= today) return thisYearDate;
      // Last year's occurrence
      return new Date(today.getFullYear() - 1, targetMonth, targetDay);
    }

    default:
      return today;
  }
}

/**
 * Calculate the number of days for a given interval type.
 * Used for next-cycle-date calculations in client code.
 */
export function intervalToDays(
  type: RecurringInterval,
  customDays?: number | null,
): number {
  switch (type) {
    case "daily":
      return 1;
    case "weekly":
      return 7;
    case "monthly":
      return 30;
    case "yearly":
      return 365;
    case "custom":
      return customDays ?? 1;
    default:
      return 1;
  }
}
