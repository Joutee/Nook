import { RecurringInterval } from "@/types/finance";

/**
 * Calculate the next occurrence date for a recurring expense,
 * one interval ahead from today.
 */
export function calculateNextOccurrence(
  recurringInterval: RecurringInterval,
  intervalDay: number,
  intervalMonth: number,
): string {
  const today = new Date();
  let next: Date;

  switch (recurringInterval) {
    case "daily":
      next = new Date(today);
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next = new Date(today);
      const currentDay = next.getDay() || 7; // Convert Sunday 0 to 7
      const daysUntil =
        intervalDay > currentDay
          ? intervalDay - currentDay
          : 7 - (currentDay - intervalDay);
      next.setDate(next.getDate() + daysUntil);
      break;
    case "monthly":
      next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const lastDayOfMonth = new Date(
        next.getFullYear(),
        next.getMonth() + 1,
        0,
      ).getDate();
      next.setDate(Math.min(intervalDay, lastDayOfMonth));
      break;
    case "yearly":
      next = new Date(today.getFullYear() + 1, intervalMonth - 1, 1);
      const lastDay = new Date(
        next.getFullYear(),
        intervalMonth,
        0,
      ).getDate();
      next.setDate(Math.min(intervalDay, lastDay));
      break;
  }

  return next.toISOString().split("T")[0];
}
