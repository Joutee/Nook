import { supabase } from "./supabase";
import { Chore } from "../types/chores";

/**
 * Completes a chore in the current cycle.
 * @param chore - Chore to complete.
 * @param currentUserId - Current user ID.
 * @param showToast - Toast notification callback.
 * @returns Promise<boolean> - true when the chore was completed successfully.
 */
export const completeChore = async (
  chore: Chore,
  currentUserId: string | null,
  showToast: (message: string, type: "success" | "error" | "info") => void,
): Promise<boolean> => {
  if (chore.assignee_user_id !== currentUserId) {
    showToast("Tento úkol není přiřazen vám", "error");
    return false;
  }

  if (chore.is_completed_current_cycle) {
    showToast("Tento úkol je již dokončen", "info");
    return false;
  }

  try {
    const { error } = await supabase.from("chore_completions").insert({
      chore_id: chore.id,
      profile_id: currentUserId,
      cycle_index: chore.current_cycle_index,
    });

    if (error) {
      showToast("Nepodařilo se označit jako hotové: " + error.message, "error");
      return false;
    }

    showToast("Úkol dokončen!", "success");
    return true;
  } catch (error: any) {
    showToast("Nepodařilo se označit jako hotové: " + error.message, "error");
    return false;
  }
};

/**
 * Reverts chore completion in the current cycle by deleting the chore_completions row.
 * @param chore - Chore to uncomplete.
 * @param currentUserId - Current user ID.
 * @param showToast - Toast notification callback.
 * @returns Promise<boolean> - true when the chore was uncompleted successfully.
 */
export const uncompleteChore = async (
  chore: Chore,
  currentUserId: string | null,
  showToast: (message: string, type: "success" | "error" | "info") => void,
): Promise<boolean> => {
  if (chore.assignee_user_id !== currentUserId) {
    showToast("Tento úkol není přiřazen vám", "error");
    return false;
  }

  if (!chore.is_completed_current_cycle) {
    showToast("Tento úkol ještě není dokončen", "info");
    return false;
  }

  try {
    const { error } = await supabase
      .from("chore_completions")
      .delete()
      .eq("chore_id", chore.id)
      .eq("cycle_index", chore.current_cycle_index);

    if (error) {
      showToast("Nepodařilo se odznačit úkol: " + error.message, "error");
      return false;
    }

    showToast("Úkol odznačen", "success");
    return true;
  } catch (error: any) {
    showToast("Nepodařilo se odznačit úkol: " + error.message, "error");
    return false;
  }
};
