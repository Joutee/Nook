import { supabase } from "./supabase";
import { Chore } from "../types/chores";

/**
 * Dokončí úkol v aktuálním cyklu
 * @param chore - Úkol k dokončení
 * @param currentUserId - ID aktuálního uživatele
 * @param showToast - Funkce pro zobrazení toast notifikace
 * @returns Promise<boolean> - true pokud byl úkol úspěšně dokončen, jinak false
 */
export const completeChore = async (
  chore: Chore,
  currentUserId: string | null,
  showToast: (message: string, type: "success" | "error" | "info") => void,
): Promise<boolean> => {
  // Kontrola oprávnění
  if (chore.assignee_user_id !== currentUserId) {
    showToast("Tento úkol není přiřazen vám", "error");
    return false;
  }

  // Kontrola, jestli už není dokončeno
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
 * Zruší splnění úkolu v aktuálním cyklu (smaže záznam z chore_completions)
 * @param chore - Úkol k odznačení
 * @param currentUserId - ID aktuálního uživatele
 * @param showToast - Funkce pro zobrazení toast notifikace
 * @returns Promise<boolean> - true pokud byl úkol úspěšně odznačen
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
