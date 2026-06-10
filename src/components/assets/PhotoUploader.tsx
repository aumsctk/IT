"use client";

/**
 * PhotoUploader
 * Drag-and-drop / click-to-select image uploader.
 * Shows compression progress bar, then thumbnails of uploaded photos.
 * Max 5 photos per asset.
 */

import { useCallback, useRef, useState } from "react";
import { Upload, X, ImageIcon, Loader2, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { validateImageFile, formatBytes } from "@/lib/image-compression";

interface PhotoUploaderProps {
  /** Already-saved photo URLs (from DB) */
  existingPhotos?: string[];
  /** Max number of photos allowed */
  maxPhotos?: number;
  /** Called after compression+upload completes with all new URLs */
  onUpload: (files: File[]) => Promise<string[]>;
  /** Called when user removes an existing photo */
  onRemove?: (url: string) => void;
  /** Upload state from useAssetPhotoUpload */
  uploadStage?: "idle" | "compressing" | "uploading" | "done" | "error";
  uploadProgress?: number;
  uploadMessage?: string;
  uploadError?: string | null;
}

export function PhotoUploader({
  existingPhotos = [],
  maxPhotos = 5,
  onUpload,
  onRemove,
  uploadStage = "idle",
  uploadProgress = 0,
  uploadMessage,
  uploadError,
}: PhotoUploaderProps) {
  const inputRef    = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { locale } = useLanguage();
  const isTh = locale === "th";

  const remaining = maxPhotos - existingPhotos.length;

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      setValidationError(null);
      const arr = Array.from(files).slice(0, remaining);

      for (const file of arr) {
        const err = validateImageFile(file);
        if (err) { setValidationError(err); return; }
      }

      await onUpload(arr);
    },
    [onUpload, remaining]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const isUploading = uploadStage === "compressing" || uploadStage === "uploading";

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {remaining > 0 && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed",
            "cursor-pointer px-4 py-8 text-center transition-colors select-none",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-accent/50",
            isUploading && "pointer-events-none opacity-60"
          )}
        >
          {isUploading ? (
            <Loader2 size={28} className="animate-spin text-primary" />
          ) : (
            <Upload size={28} className="text-muted-foreground" />
          )}

          <div>
            <p className="text-sm font-medium text-foreground">
              {isUploading ? uploadMessage : (isTh ? "วางรูปที่นี่ หรือคลิกเพื่อเลือก" : "Drop photos here or click to browse")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              JPG, PNG, HEIC · {isTh ? `ไม่เกิน 20 MB ต่อไฟล์ · เหลืออีก ${remaining} ช่อง` : `Max 20 MB each · ${remaining} slot${remaining !== 1 ? "s" : ""} left`}
            </p>
          </div>

          {/* Progress bar */}
          {isUploading && (
            <div className="w-full max-w-xs h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {uploadStage === "done" && (
            <div className="flex items-center gap-1.5 text-green-600 text-sm">
              <CheckCircle2 size={16} />
              <span>{uploadMessage}</span>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && processFiles(e.target.files)}
      />

      {/* Errors */}
      {(validationError || uploadError) && (
        <p className="text-xs text-destructive">{validationError ?? uploadError}</p>
      )}

      {/* Thumbnails grid */}
      {existingPhotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {existingPhotos.map((url) => (
            <div key={url} className="group relative aspect-square rounded-lg overflow-hidden bg-muted">
              <Image
                src={url}
                alt="Asset photo"
                fill
                className="object-cover"
                sizes="120px"
              />
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(url)}
                  className={cn(
                    "absolute top-1 right-1 flex h-5 w-5 items-center justify-center",
                    "rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100",
                    "transition-opacity"
                  )}
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {existingPhotos.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {existingPhotos.map((url, i) => (
            <div key={i} className="relative group w-16 h-16 rounded-lg overflow-hidden bg-muted">
              <img src={url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
