import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync, getInfoAsync } from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { supabase } from "./supabase";

export const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/webp",
];

const SAFETY_LIMIT = 20 * 1024 * 1024; // 20 MB
const SUPABASE_LIMIT = 5 * 1024 * 1024; // 5 MB

const compressImage = async (uri: string): Promise<string> => {
  try {
    const result = await manipulateAsync(uri, [{ resize: { width: 1080 } }], {
      compress: 0.6,
      format: SaveFormat.JPEG,
    });
    return result.uri;
  } catch (error) {
    console.log("Komprese selhala, používám originál:", error);
    return uri;
  }
};

export const uploadDocument = async (
  flatId: string,
  documentName: string,
  documentDescription: string,
): Promise<boolean> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return false;

    const file = result.assets[0];

    if (file.size && file.size > SAFETY_LIMIT) {
      throw new Error("Vstupní soubor je příliš velký (nad 20 MB).");
    }

    let fileName = file.name.toLowerCase();
    let mimeType = file.mimeType;
    let fileUri = file.uri;

    console.log("Vybrán soubor:", fileName, "MIME:", mimeType);

    // Oprava neznámého MIME typu (fix pro Android)
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

    // Validace typu
    if (!ALLOWED_TYPES.includes(mimeType!) && !mimeType?.startsWith("image/")) {
      throw new Error(`Typ souboru '${mimeType}' není podporován.`);
    }

    // Komprese obrázků
    if (mimeType?.startsWith("image/")) {
      console.log("Zahajuji kompresi obrázku...");
      fileUri = await compressImage(fileUri);
      mimeType = "image/jpeg";
      if (!fileName.endsWith(".jpg") && !fileName.endsWith(".jpeg")) {
        fileName = fileName.replace(/\.[^/.]+$/, "") + ".jpg";
      }
    }

    // Kontrola velikosti po kompresi
    const fileInfo = await getInfoAsync(fileUri);
    if (fileInfo.exists && fileInfo.size > SUPABASE_LIMIT) {
      const sizeInMb = (fileInfo.size / (1024 * 1024)).toFixed(2);
      throw new Error(
        `Soubor je i po zpracování příliš velký (${sizeInMb} MB). Limit je 5 MB.`,
      );
    }

    console.log("Zpracovávám pro upload:", fileName, mimeType);

    const base64 = await readAsStringAsync(fileUri, {
      encoding: "base64",
    });

    const fileData = decode(base64);
    const safeFileName = fileName.replace(/\s+/g, "_");
    const filePath = `${flatId}/${Date.now()}_${safeFileName}`;

    console.log("Nahrávám do Supabase...");

    const { data, error } = await supabase.storage
      .from("documents")
      .upload(filePath, fileData, {
        contentType: mimeType!,
        upsert: false,
      });

    if (error) {
      console.error("Supabase Storage Error:", error);
      throw error;
    }

    console.log("Nahráno do Storage:", data.path);

    // Uložení do databáze
    const { error: dbError } = await supabase.from("documents").insert({
      flat_id: flatId,
      path: data.path,
      name: documentName || fileName,
      description: documentDescription,
    });

    if (dbError) {
      console.error("Supabase DB Error:", dbError);
      throw dbError;
    }

    console.log("Dokument uložen do DB úspěšně");
    return true;
  } catch (error: any) {
    throw error;
  }
};
