import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { readAsStringAsync, getInfoAsync } from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { supabase } from "./supabase";

const ALLOWED_TYPES = [
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

interface UploadFileParams {
  flatId: string;
  fileUri: string;
  fileName: string;
  mimeType: string;
  documentName: string;
  documentDescription: string;
}

const uploadFileToStorage = async ({
  flatId,
  fileUri,
  fileName,
  mimeType,
  documentName,
  documentDescription,
}: UploadFileParams): Promise<boolean> => {
  // Komprese obrázků
  let processedUri = fileUri;
  let processedMimeType = mimeType;
  let processedFileName = fileName;

  if (mimeType.startsWith("image/")) {
    console.log("Zahajuji kompresi obrázku...");
    processedUri = await compressImage(fileUri);
    processedMimeType = "image/jpeg";
    if (!fileName.endsWith(".jpg") && !fileName.endsWith(".jpeg")) {
      processedFileName = fileName.replace(/\.[^/.]+$/, "") + ".jpg";
    }
  }

  // Kontrola velikosti
  const fileInfo = await getInfoAsync(processedUri);
  if (fileInfo.exists && fileInfo.size > SUPABASE_LIMIT) {
    const sizeInMb = (fileInfo.size / (1024 * 1024)).toFixed(2);
    throw new Error(`Soubor je příliš velký (${sizeInMb} MB). Limit je 5 MB.`);
  }

  console.log("Zpracovávám pro upload:", processedFileName, processedMimeType);

  // Konverze na base64
  const base64 = await readAsStringAsync(processedUri, {
    encoding: "base64",
  });

  const fileData = decode(base64);
  const safeFileName = processedFileName.replace(/\s+/g, "_");
  const filePath = `${flatId}/${Date.now()}_${safeFileName}`;

  console.log("Nahrávám do Supabase...");

  // Upload do storage
  const { data, error } = await supabase.storage
    .from("documents")
    .upload(filePath, fileData, {
      contentType: processedMimeType,
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
    name: documentName || processedFileName,
    description: documentDescription,
  });

  if (dbError) {
    console.error("Supabase DB Error:", dbError);
    throw dbError;
  }

  console.log("Dokument uložen do DB úspěšně");
  return true;
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
    const fileUri = file.uri;

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

    return await uploadFileToStorage({
      flatId,
      fileUri,
      fileName,
      mimeType: mimeType!,
      documentName,
      documentDescription,
    });
  } catch (error: any) {
    throw error;
  }
};

export const takePhotoAndUpload = async (
  flatId: string,
  documentName: string,
  documentDescription: string,
): Promise<boolean> => {
  try {
    // Požádat o oprávnění ke kameře
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      throw new Error("Přístup k fotoaparátu byl odepřen");
    }

    // Vyfotit obrázek
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return false;

    const photo = result.assets[0];
    const fileUri = photo.uri;
    const fileName = `photo_${Date.now()}.jpg`;
    const mimeType = "image/jpeg";

    console.log("Vyfoceno:", fileUri);

    return await uploadFileToStorage({
      flatId,
      fileUri,
      fileName,
      mimeType,
      documentName,
      documentDescription,
    });
  } catch (error: any) {
    throw error;
  }
};
