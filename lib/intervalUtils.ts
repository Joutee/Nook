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

export function buildIntervalPayload(
  intervalType: RecurringInterval,
  intervalDay: number,
  intervalMonth: number,
  customDays: number,
) {
  return {
    type: intervalType,
    interval_day:
      intervalType === "weekly" || intervalType === "monthly" || intervalType === "yearly"
        ? intervalDay
        : null,
    interval_month: intervalType === "yearly" ? intervalMonth : null,
    custom_days: intervalType === "custom" ? customDays : null,
  };
}

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
 * Calculate the nearest future (or today) occurrence of the interval's
 * matching day. Used to auto-set start_date when creating/editing chores.
 * If today matches, returns today. Otherwise returns the next matching date.
 */
export function calculateIntervalStartDate(
  intervalType: RecurringInterval,
  intervalDay?: number | null,
  intervalMonth?: number | null,
  customDays?: number | null,
): string {
  const now = new Date();
  // Work with UTC dates to avoid timezone shift when saving to DB
  const todayYear = now.getUTCFullYear();
  const todayMonth = now.getUTCMonth(); // 0-indexed
  const todayDate = now.getUTCDate();
  const todayDow = now.getUTCDay() || 7; // Convert Sunday 0 to 7 (ISO: 1=Mon..7=Sun)

  function toDateString(y: number, m: number, d: number): string {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  switch (intervalType) {
    case "daily":
    case "custom":
      return toDateString(todayYear, todayMonth, todayDate);

    case "weekly": {
      const targetDay = intervalDay ?? 1;
      if (todayDow === targetDay) return toDateString(todayYear, todayMonth, todayDate);
      const diff = targetDay - todayDow;
      const daysForward = diff > 0 ? diff : diff + 7;
      const d = new Date(Date.UTC(todayYear, todayMonth, todayDate + daysForward));
      return toDateString(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }

    case "monthly": {
      const targetDom = intervalDay ?? 1;
      if (todayDate === targetDom) return toDateString(todayYear, todayMonth, todayDate);
      if (todayDate < targetDom) {
        // Later this month (clamp to last day of month)
        const lastDay = new Date(Date.UTC(todayYear, todayMonth + 1, 0)).getUTCDate();
        const day = Math.min(targetDom, lastDay);
        return toDateString(todayYear, todayMonth, day);
      }
      // Next month
      const next = new Date(Date.UTC(todayYear, todayMonth + 1, 1));
      const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
      const day = Math.min(targetDom, lastDay);
      return toDateString(next.getUTCFullYear(), next.getUTCMonth(), day);
    }

    case "yearly": {
      const targetDay = intervalDay ?? 1;
      const targetMonth = (intervalMonth ?? 1) - 1;
      const todayUtc = new Date(Date.UTC(todayYear, todayMonth, todayDate));
      const thisYear = new Date(Date.UTC(todayYear, targetMonth, targetDay));
      if (thisYear >= todayUtc) {
        return toDateString(todayYear, targetMonth, targetDay);
      }
      return toDateString(todayYear + 1, targetMonth, targetDay);
    }

    default:
      return toDateString(todayYear, todayMonth, todayDate);
  }
}
