// @ts-nocheck
"use client";

/**
 * useUpload — File upload hook with compression progress UI
 */

import { useState, useCallback } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  uploadAssetPhoto,
  uploadAssetPhotos,
  uploadAssetDocument,
  type UploadProgress,
} from "@/lib/storage";

interface UploadState {
  stage:    UploadProgress["stage"] | "idle";
  progress: number;
  message:  string;
  urls:     string[];
  error:    string | null;
}

export function useAssetPhotoUpload(assetId: string) {
  const supabase = getSupabaseBrowser();
  const [state, setState] = useState<UploadState>({
    stage: "idle", progress: 0, message: "", urls: [], error: null,
  });

  const upload = useCallback(
    async (files: File[]): Promise<string[]> => {
      setState({ stage: "compressing", progress: 0, message: "Starting…", urls: [], error: null });

      try {
        const urls = await uploadAssetPhotos(
          supabase,
          assetId,
          files,
          (index, p) =>
            setState((prev) => ({
              ...prev,
              stage:    p.stage,
              progress: p.progress,
              message:  `[${index + 1}/${files.length}] ${p.message ?? ""}`,
            }))
        );

        setState({ stage: "done", progress: 100, message: `${urls.length} photo(s) uploaded`, urls, error: null });
        return urls;
      } catch (e) {
        const msg = (e as Error).message;
        setState((prev) => ({ ...prev, stage: "error", error: msg }));
        throw e;
      }
    },
    [supabase, assetId]
  );

  const reset = () =>
    setState({ stage: "idle", progress: 0, message: "", urls: [], error: null });

  return { ...state, upload, reset };
}

export function useAssetDocumentUpload(assetId: string) {
  const supabase = getSupabaseBrowser();
  const [state, setState] = useState<UploadState>({
    stage: "idle", progress: 0, message: "", urls: [], error: null,
  });

  const upload = useCallback(
    async (file: File, docType = "other"): Promise<string> => {
      setState({ stage: "compressing", progress: 0, message: "Starting…", urls: [], error: null });

      try {
        const result = await uploadAssetDocument(supabase, assetId, file, docType, (p) =>
          setState((prev) => ({
            ...prev,
            stage:    p.stage,
            progress: p.progress,
            message:  p.message ?? "",
          }))
        );

        setState({ stage: "done", progress: 100, message: "Uploaded", urls: [result.url], error: null });
        return result.url;
      } catch (e) {
        const msg = (e as Error).message;
        setState((prev) => ({ ...prev, stage: "error", error: msg }));
        throw e;
      }
    },
    [supabase, assetId]
  );

  const reset = () =>
    setState({ stage: "idle", progress: 0, message: "", urls: [], error: null });

  return { ...state, upload, reset };
}