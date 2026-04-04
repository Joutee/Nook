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
