/**
 * Smart Image Compression Utility
 * ─────────────────────────────────────────────────────────────────
 * Uses `browser-image-compression` to compress images client-side
 * BEFORE uploading to Supabase Storage.
 *
 * Strategy:
 *  - Photo (asset photos)    → max 1200px, ~0.4 MB, quality 0.85
 *  - Document (receipt/invoice) → max 2400px, ~0.8 MB, quality 0.92
 *    (higher res so text stays readable)
 *  - Thumbnail               → max 300px, ~0.05 MB, quality 0.80
 *
 * All presets use "visually lossless" quality floors so text on
 * IT documents, serial number labels, and invoices remain sharp.
 */

import imageCompression from "browser-image-compression";

export type CompressionPreset = "photo" | "document" | "thumbnail";

interface CompressionResult {
  file: File;
  originalSize: number;   // bytes
  compressedSize: number; // bytes
  savedPercent: number;
}

const PRESETS: Record<
  CompressionPreset,
  Parameters<typeof imageCompression>[1]
> = {
  photo: {
    maxSizeMB: 0.4,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    initialQuality: 0.85,
    fileType: "image/webp",   // WebP = best ratio/quality
    preserveExif: false,
  },
  document: {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 2400,   // Large enough to read text on receipts
    useWebWorker: true,
    initialQuality: 0.92,     // Higher quality floor for legibility
    fileType: "image/webp",
    preserveExif: false,
  },
  thumbnail: {
    maxSizeMB: 0.05,
    maxWidthOrHeight: 300,
    useWebWorker: true,
    initialQuality: 0.80,
    fileType: "image/webp",
    preserveExif: false,
  },
};

/**
 * Compress a single image file using the specified preset.
 *
 * @example
 * const result = await compressImage(file, "document");
 * console.log(`Saved ${result.savedPercent}%`);
 * await uploadToStorage(result.file);
 */
export async function compressImage(
  file: File,
  preset: CompressionPreset = "photo",
  onProgress?: (progress: number) => void
): Promise<CompressionResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`File "${file.name}" is not an image.`);
  }

  const originalSize = file.size;
  const options = {
    ...PRESETS[preset],
    onProgress,
  };

  const compressed = await imageCompression(file, options);

  // Rename with .webp extension so MIME type matches content
  const renamedFile = new File(
    [compressed],
    file.name.replace(/\.[^.]+$/, ".webp"),
    { type: "image/webp" }
  );

  const compressedSize = renamedFile.size;
  const savedPercent = Math.round((1 - compressedSize / originalSize) * 100);

  return { file: renamedFile, originalSize, compressedSize, savedPercent };
}

/**
 * Compress multiple images in parallel (capped at 3 concurrent).
 * Returns results in the same order as input.
 */
export async function compressImages(
  files: File[],
  preset: CompressionPreset = "photo",
  onProgress?: (index: number, progress: number) => void
): Promise<CompressionResult[]> {
  const CONCURRENCY = 3;
  const results: CompressionResult[] = new Array(files.length);

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((file, batchIndex) =>
        compressImage(
          file,
          preset,
          onProgress ? (p) => onProgress(i + batchIndex, p) : undefined
        )
      )
    );
    batchResults.forEach((r, j) => { results[i + j] = r; });
  }

  return results;
}

/**
 * Validate file before compression.
 * Returns an error string or null if valid.
 */
export function validateImageFile(
  file: File,
  maxRawMB = 20
): string | null {
  const ALLOWED_TYPES = ["image/jpeg","image/png","image/webp","image/heic","image/heif"];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Unsupported type "${file.type}". Use JPG, PNG, WebP, or HEIC.`;
  }
  if (file.size > maxRawMB * 1024 * 1024) {
    return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${maxRawMB} MB.`;
  }
  return null;
}

/** Format bytes to human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
