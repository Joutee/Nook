import { readAsStringAsync } from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";
import { compressImage } from "./fileService";
import logger from "@/lib/logger";

/**
 * Nahraje avatar do Supabase Storage a aktualizuje profiles.avatar_url
 * @returns veřejná URL nahraného avataru
 */
export const uploadAvatar = async (
  userId: string,
  imageUri: string,
): Promise<string> => {
  // Komprese
  const compressedUri = await compressImage(imageUri);

  // Konverze na base64
  const base64 = await readAsStringAsync(compressedUri, {
    encoding: "base64",
  });
  const fileData = decode(base64);

  // Upload do storage s upsert
  const filePath = `${userId}/avatar.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, fileData, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    logger.error("Avatar upload error:", uploadError);
    throw uploadError;
  }

  // Získat veřejnou URL s cache-busting parametrem
  const publicUrl = getAvatarPublicUrl(filePath);

  // Update profilu
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId);

  if (updateError) {
    logger.error("Avatar URL update error:", updateError);
    throw updateError;
  }

  logger.log("Avatar nahrán:", publicUrl);
  return publicUrl;
};

/**
 * Smaže avatar ze storage (pokud je uložen v avatars bucketu) a vymaže avatar_url z profilu
 */
export const deleteAvatar = async (
  userId: string,
  currentUrl: string | null,
): Promise<void> => {
  // Smazat ze storage jen pokud je to náš bucket (ne externí URL z Google OAuth)
  if (currentUrl && currentUrl.includes("/storage/v1/object/public/avatars/")) {
    const filePath = `${userId}/avatar.jpg`;
    const { error: removeError } = await supabase.storage
      .from("avatars")
      .remove([filePath]);

    if (removeError) {
      logger.error("Avatar delete error:", removeError);
      throw removeError;
    }
  }

  // Vymazat z profilu
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", userId);

  if (updateError) {
    logger.error("Avatar URL clear error:", updateError);
    throw updateError;
  }

  logger.log("Avatar smazán pro uživatele:", userId);
};

/**
 * Vrátí veřejnou URL avataru s cache-busting parametrem
 */
export const getAvatarPublicUrl = (path: string): string => {
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
};
