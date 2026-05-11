import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { readAsStringAsync, getInfoAsync } from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { supabase } from "./supabase";
import logger from "@/lib/logger";

const SAFETY_LIMIT = 20 * 1024 * 1024; // 20 MB
const SUPABASE_LIMIT = 5 * 1024 * 1024; // 5 MB

/**
 * Vyfotí fotografii pomocí kamery
 * @returns URI vyfocené fotografie nebo null pokud bylo zrušeno
 */
export const takePhoto = async (): Promise<string | null> => {
  try {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      throw new Error("Přístup k fotoaparátu byl odepřen");
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled) return null;

    const photo = result.assets[0];
    logger.log("Vyfoceno:", photo.uri);
    return photo.uri;
  } catch (error: any) {
    throw error;
  }
};

/**
 * Zkomprimuje obrázek na šířku 1080px, 60% kvalita, JPEG formát
 * @param uri - URI obrázku k zkomprimování
 * @returns URI zkomprimovaného obrázku
 */
export const compressImage = async (uri: string): Promise<string> => {
  try {
    const result = await manipulateAsync(uri, [{ resize: { width: 1080 } }], {
      compress: 0.6,
      format: SaveFormat.JPEG,
    });
    return result.uri;
  } catch (error) {
    logger.log("Komprese selhala, používám originál:", error);
    return uri;
  }
};

/**
 * Vybere fotografii z galerie
 * @returns URI vybrané fotografie nebo null pokud bylo zrušeno
 */
export const pickGalleryPhoto = async (): Promise<string | null> => {
  try {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      throw new Error("Přístup k fotkám byl odepřen");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images" as ImagePicker.MediaTypeOptions,
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled) return null;

    const photo = result.assets[0];
    logger.log("Vybrán obrázek:", photo.uri);
    return photo.uri;
  } catch (error: any) {
    throw error;
  }
};

/**
 * Vybere soubor (PDF nebo obrázek) z úložiště
 * @returns Informace o vybraném souboru nebo null pokud bylo zrušeno
 */
export const pickFile = async (): Promise<{
  uri: string;
  name: string;
  mimeType: string;
  size: number;
} | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return null;

    const file = result.assets[0];

    if (file.size && file.size > SAFETY_LIMIT) {
      throw new Error("Vstupní soubor je příliš velký (nad 20 MB).");
    }

    let fileName = file.name.toLowerCase();
    let mimeType = file.mimeType;

    // Fix unknown MIME type on Android.
    if (!mimeType || mimeType === "application/octet-stream") {
      if (fileName.endsWith(".pdf")) mimeType = "application/pdf";
      else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg"))
        mimeType = "image/jpeg";
      else if (fileName.endsWith(".png")) mimeType = "image/png";
      else if (fileName.endsWith(".heic")) mimeType = "image/heic";
      else {
        throw new Error(
          "Nepodporovaný typ souboru. Nahrajte prosím PDF nebo obrázek.",
        );
      }
    }

    logger.log("Vybrán soubor:", fileName, "MIME:", mimeType);

    return {
      uri: file.uri,
      name: fileName,
      mimeType: mimeType!,
      size: file.size || 0,
    };
  } catch (error: any) {
    throw error;
  }
};

interface UploadFileParams {
  bucket: string;
  flatId: string;
  fileUri: string;
  fileName: string;
  mimeType: string;
}

/**
 * Nahraje soubor nebo fotku do Supabase Storage
 * @param bucket - název storage bucketu
 * @param flatId - ID bytu pro organizaci souborů
 * @param fileUri - URI souboru k nahrání
 * @param fileName - název souboru
 * @param mimeType - MIME typ souboru
 * @returns path v storage
 */
export const uploadFile = async ({
  bucket,
  flatId,
  fileUri,
  fileName,
  mimeType,
}: UploadFileParams): Promise<string> => {
  let processedUri = fileUri;
  let processedMimeType = mimeType;
  let processedFileName = fileName;

  if (mimeType.startsWith("image/")) {
    logger.log("Zahajuji kompresi obrázku...");
    processedUri = await compressImage(fileUri);
    processedMimeType = "image/jpeg";
    if (!fileName.endsWith(".jpg") && !fileName.endsWith(".jpeg")) {
      processedFileName = fileName.replace(/\.[^/.]+$/, "") + ".jpg";
    }
  }

  const fileInfo = await getInfoAsync(processedUri);
  if (fileInfo.exists && fileInfo.size && fileInfo.size > SUPABASE_LIMIT) {
    const sizeInMb = (fileInfo.size / (1024 * 1024)).toFixed(2);
    throw new Error(`Soubor je příliš velký (${sizeInMb} MB). Limit je 5 MB.`);
  }

  logger.log("Zpracovávám pro upload:", processedFileName, processedMimeType);

  const base64 = await readAsStringAsync(processedUri, {
    encoding: "base64",
  });

  const fileData = decode(base64);
  const safeFileName = processedFileName.replace(/\s+/g, "_");
  const filePath = `${flatId}/${Date.now()}_${safeFileName}`;

  logger.log("Nahrávám do Supabase...");

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, fileData, {
      contentType: processedMimeType,
      upsert: false,
    });

  if (error) {
    logger.error("Supabase Storage Error:", error);
    throw error;
  }

  logger.log("Nahráno do Storage:", data.path);
  return data.path;
};

interface DeleteFileParams {
  bucket: string;
  path: string;
  tableName: string;
  recordId: string;
}

/**
 * Smaže soubor nebo fotku z Supabase Storage a odstraní záznam z databáze
 * @param bucket - název storage bucketu
 * @param path - cesta k souboru v storage
 * @param tableName - název tabulky
 * @param recordId - ID záznamu v tabulce
 */
export const deleteFile = async ({
  bucket,
  path,
  tableName,
  recordId,
}: DeleteFileParams): Promise<void> => {
  const { error: storageError } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (storageError) throw storageError;

  const { error: dbError } = await supabase
    .from(tableName)
    .delete()
    .eq("id", recordId);

  if (dbError) throw dbError;

  logger.log("Soubor a záznam úspěšně smazány");
};
