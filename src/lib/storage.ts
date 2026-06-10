// @ts-nocheck
/**
 * Supabase Storage — Upload with Smart Compression
 * ─────────────────────────────────────────────────────────────────
 * All uploads compress the image client-side first, then stream
 * the reduced file to Supabase Storage.
 *
 * Bucket layout:
 *   assets/photos/{assetId}/{uuid}.webp
 *   assets/documents/{assetId}/{uuid}.webp  (invoices, warranties)
 *   avatars/{userId}/{uuid}.webp
 *   floor-plans/{roomId}/{uuid}.webp         (NOT compressed — blueprint)
 *   qr-codes/{assetId}.png                   (generated server-side)
 *
 * RLS on buckets:
 *   - assets/*      → it_support + super_admin write; authenticated read
 *   - avatars/*     → owner write; authenticated read
 *   - floor-plans/* → it_support + super_admin write; authenticated read
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "crypto"; // Next.js polyfills this
import {
  compressImage,
  compressImages,
  validateImageFile,
  formatBytes,
  type CompressionPreset,
} from "./image-compression";

// ── Helpers ───────────────────────────────────────────────────────
function randomId() {
  return typeof crypto !== "undefined"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function getPublicUrl(supabase: SupabaseClient, bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ── Upload progress callback ──────────────────────────────────────
export interface UploadProgress {
  stage:    "compressing" | "uploading" | "done" | "error";
  progress: number;   // 0-100
  message?: string;
}

// ── Single photo upload ───────────────────────────────────────────
export async function uploadAssetPhoto(
  supabase: SupabaseClient,
  assetId:  string,
  file:     File,
  onProgress?: (p: UploadProgress) => void
): Promise<string> {
  // 1. Validate
  const err = validateImageFile(file);
  if (err) throw new Error(err);

  onProgress?.({ stage: "compressing", progress: 0, message: "Compressing image…" });

  // 2. Compress — "photo" preset: max 1200px, 0.4MB, visually lossless
  const result = await compressImage(file, "photo", (p) =>
    onProgress?.({ stage: "compressing", progress: p, message: `Compressing… ${p}%` })
  );

  onProgress?.({
    stage:   "compressing",
    progress: 100,
    message: `Compressed ${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)} (${result.savedPercent}% saved)`,
  });

  // 3. Upload to Supabase Storage
  const path = `photos/${assetId}/${randomId()}.webp`;
  onProgress?.({ stage: "uploading", progress: 0, message: "Uploading…" });

  const { error } = await supabase.storage
    .from("assets")
    .upload(path, result.file, {
      contentType: "image/webp",
      upsert: false,
    });

  if (error) throw error;

  onProgress?.({ stage: "done", progress: 100 });
  return getPublicUrl(supabase, "assets", path);
}

// ── Multiple photos upload ────────────────────────────────────────
export async function uploadAssetPhotos(
  supabase:    SupabaseClient,
  assetId:     string,
  files:       File[],
  onProgress?: (index: number, p: UploadProgress) => void
): Promise<string[]> {
  const urls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const url = await uploadAssetPhoto(
      supabase,
      assetId,
      files[i],
      (p) => onProgress?.(i, p)
    );
    urls.push(url);
  }

  return urls;
}

// ── Document upload (invoice, warranty — higher quality) ──────────
export async function uploadAssetDocument(
  supabase:    SupabaseClient,
  assetId:     string,
  file:        File,
  docType:     string = "other",
  onProgress?: (p: UploadProgress) => void
): Promise<{ url: string; fileName: string; fileSize: number }> {
  const isImage = file.type.startsWith("image/");
  let uploadFile = file;
  let compressedSize = file.size;

  if (isImage) {
    const err = validateImageFile(file);
    if (err) throw new Error(err);

    onProgress?.({ stage: "compressing", progress: 0 });

    // "document" preset: max 2400px, 0.8MB — keeps text sharp on invoices
    const result = await compressImage(file, "document", (p) =>
      onProgress?.({ stage: "compressing", progress: p })
    );

    uploadFile     = result.file;
    compressedSize = result.compressedSize;

    onProgress?.({ stage: "compressing", progress: 100 });
  }

  const ext  = isImage ? "webp" : file.name.split(".").pop();
  const path = `documents/${assetId}/${docType}-${randomId()}.${ext}`;

  onProgress?.({ stage: "uploading", progress: 0 });

  const { error } = await supabase.storage
    .from("assets")
    .upload(path, uploadFile, {
      contentType: uploadFile.type,
      upsert: false,
    });

  if (error) throw error;

  onProgress?.({ stage: "done", progress: 100 });

  return {
    url:      getPublicUrl(supabase, "assets", path),
    fileName: file.name,
    fileSize: compressedSize,
  };
}

// ── Avatar upload ─────────────────────────────────────────────────
export async function uploadAvatar(
  supabase: SupabaseClient,
  userId:   string,
  file:     File,
  onProgress?: (p: UploadProgress) => void
): Promise<string> {
  const err = validateImageFile(file);
  if (err) throw new Error(err);

  onProgress?.({ stage: "compressing", progress: 0 });
  // "thumbnail" preset: max 300px — avatars don't need to be large
  const result = await compressImage(file, "thumbnail", (p) =>
    onProgress?.({ stage: "compressing", progress: p })
  );

  const path = `${userId}/${randomId()}.webp`;
  onProgress?.({ stage: "uploading", progress: 0 });

  // Upsert — always replace the avatar for the user
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, result.file, { contentType: "image/webp", upsert: true });

  if (error) throw error;
  onProgress?.({ stage: "done", progress: 100 });

  return getPublicUrl(supabase, "avatars", path);
}

// ── Floor plan blueprint upload (NO compression — needs full detail) ─
export async function uploadFloorPlan(
  supabase: SupabaseClient,
  roomId:   string,
  file:     File
): Promise<string> {
  const ALLOWED = ["image/jpeg","image/png","image/webp","image/svg+xml","application/pdf"];
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Floor plan must be JPG, PNG, WebP, SVG, or PDF.");
  }

  const ext  = file.name.split(".").pop();
  const path = `${roomId}/blueprint-${randomId()}.${ext}`;

  const { error } = await supabase.storage
    .from("floor-plans")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) throw error;
  return getPublicUrl(supabase, "floor-plans", path);
}

// ── Delete a file ─────────────────────────────────────────────────
export async function deleteStorageFile(
  supabase: SupabaseClient,
  bucket:   string,
  url:      string
) {
  // Extract path from public URL
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx    = url.indexOf(marker);
  if (idx === -1) throw new Error("Cannot parse storage path from URL");
  const path = url.slice(idx + marker.length);

  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}