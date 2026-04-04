import { RecurringInterval } from "@/types/finance";

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
