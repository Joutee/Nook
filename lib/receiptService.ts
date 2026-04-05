import { readAsStringAsync } from "expo-file-system/legacy";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/fileService";
import { ReceiptParseResponse } from "@/types/finance";
import logger from "@/lib/logger";

/**
 * Compresses an image and converts it to base64 string.
 */
const imageToBase64 = async (uri: string): Promise<string> => {
  const compressedUri = await compressImage(uri);
  const base64 = await readAsStringAsync(compressedUri, {
    encoding: "base64",
  });
  return base64;
};

/**
 * Sends a receipt image to the parse-receipt Edge Function
 * and returns structured item data.
 */
export const parseReceipt = async (
  imageUri: string,
): Promise<ReceiptParseResponse> => {
  const base64 = await imageToBase64(imageUri);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Nejste přihlášeni");
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const response = await fetch(
    `${supabaseUrl}/functions/v1/parse-receipt`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        image_base64: base64,
        currency: "CZK",
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("Edge Function error:", errorText);
    throw new Error("Nepodařilo se zpracovat účtenku");
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(
      data.error === "not_a_receipt"
        ? "Obrázek neobsahuje účtenku"
        : "Nepodařilo se rozpoznat účtenku",
    );
  }

  if (!data.items || data.items.length === 0) {
    throw new Error("Na účtence nebyly nalezeny žádné položky");
  }

  return data as ReceiptParseResponse;
};
