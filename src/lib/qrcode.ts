/**
 * QR Code Generator
 * Generates a QR code PNG data-URL from an asset tag string.
 * Used when creating a new asset — the QR image is uploaded to
 * Supabase Storage and the URL saved to assets.qr_code_url.
 */

import QRCode from "qrcode";

export interface QRCodeOptions {
  /** Size in pixels (square). Default 300. */
  size?:       number;
  /** Hex color of the dark modules. Default #0f172a */
  darkColor?:  string;
  /** Hex color of the light modules. Default #ffffff */
  lightColor?: string;
  /** Error correction level. Default 'M' */
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

/**
 * Generate a QR code as a data-URL (PNG).
 * The encoded value is the asset tag — scanning navigates to
 * /assets?tag=<assetTag>
 */
export async function generateQRDataUrl(
  assetTag: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const {
    size               = 300,
    darkColor          = "#0f172a",
    lightColor         = "#ffffff",
    errorCorrectionLevel = "M",
  } = options;

  return QRCode.toDataURL(assetTag, {
    width:  size,
    margin: 2,
    color:  { dark: darkColor, light: lightColor },
    errorCorrectionLevel,
  });
}

/**
 * Generate a QR code as a Blob (for uploading to Supabase Storage).
 */
export async function generateQRBlob(
  assetTag: string,
  options: QRCodeOptions = {}
): Promise<Blob> {
  const dataUrl = await generateQRDataUrl(assetTag, options);
  const res = await fetch(dataUrl);
  return res.blob();
}

/**
 * Upload QR code PNG to Supabase Storage and return the public URL.
 * Path: qr-codes/{assetId}.png
 */
export async function uploadQRCode(
  supabase:  import("@supabase/supabase-js").SupabaseClient,
  assetId:   string,
  assetTag:  string
): Promise<string> {
  const blob = await generateQRBlob(assetTag, { size: 400, errorCorrectionLevel: "H" });
  const file = new File([blob], `${assetTag}.png`, { type: "image/png" });

  const path = `${assetId}.png`;
  const { error } = await supabase.storage
    .from("qr-codes")
    .upload(path, file, { contentType: "image/png", upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from("qr-codes").getPublicUrl(path);
  return data.publicUrl;
}
