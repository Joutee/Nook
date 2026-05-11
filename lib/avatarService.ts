import { readAsStringAsync } from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";
import { compressImage } from "./fileService";
import logger from "@/lib/logger";

/**
 * Uploads an avatar to Supabase Storage and updates profiles.avatar_url.
 * @returns public URL of the uploaded avatar.
 */
export const uploadAvatar = async (
  userId: string,
  imageUri: string,
): Promise<string> => {
  const compressedUri = await compressImage(imageUri);

  const base64 = await readAsStringAsync(compressedUri, {
    encoding: "base64",
  });
  const fileData = decode(base64);

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

  const publicUrl = getAvatarPublicUrl(filePath);

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
 * Deletes an avatar from storage if it is stored in the avatars bucket, then clears avatar_url.
 */
export const deleteAvatar = async (
  userId: string,
  currentUrl: string | null,
): Promise<void> => {
  // Only delete from storage for our bucket, not external Google OAuth URLs.
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
 * Returns the public avatar URL with a cache-busting parameter.
 */
export const getAvatarPublicUrl = (path: string): string => {
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
};
