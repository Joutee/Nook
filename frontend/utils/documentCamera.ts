import * as ImagePicker from "expo-image-picker";
import { readAsStringAsync, getInfoAsync } from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { supabase } from "./supabase";

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
    let fileUri = photo.uri;

    console.log("Vyfoceno:", fileUri);

    // Komprese obrázku
    fileUri = await compressImage(fileUri);

    // Kontrola velikosti
    const fileInfo = await getInfoAsync(fileUri);
    if (fileInfo.exists && fileInfo.size > SUPABASE_LIMIT) {
      const sizeInMb = (fileInfo.size / (1024 * 1024)).toFixed(2);
      throw new Error(`Foto je příliš velké (${sizeInMb} MB). Limit je 5 MB.`);
    }

    console.log("Zpracovávám pro upload...");

    // Konverze na base64
    const base64 = await readAsStringAsync(fileUri, {
      encoding: "base64",
    });

    const fileData = decode(base64);
    const fileName = `photo_${Date.now()}.jpg`;
    const filePath = `${flatId}/${fileName}`;

    console.log("Nahrávám do Supabase...");

    // Upload do storage
    const { data, error } = await supabase.storage
      .from("documents")
      .upload(filePath, fileData, {
        contentType: "image/jpeg",
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
