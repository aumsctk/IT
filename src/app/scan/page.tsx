"use client";

/**
 * /scan — Full-screen QR / Barcode Scanner page
 * Mobile-optimised. Tapping a result navigates to Asset or Seat detail.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ScanLine, X, Flashlight, Info } from "lucide-react";
import { useQRScanner } from "@/hooks/useQRScanner";
import { cn } from "@/lib/utils";

export default function ScanPage() {
  const router = useRouter();

  const { containerRef, isScanning, lastResult, error, hasPermission, start, stop } =
    useQRScanner({
      onScan: (value) => {
        // Asset tags follow pattern: IT-XX-NNNNN
        // Seats use UUID format or SEAT-XXX
        if (/^IT-[A-Z]+-\d+$/.test(value)) {
          router.push(`/assets?tag=${encodeURIComponent(value)}`);
        } else if (/^[0-9a-f-]{36}$/i.test(value)) {
          router.push(`/assets/${value}`);
        } else {
          router.push(`/assets?tag=${encodeURIComponent(value)}`);
        }
      },
    });

  // Auto-start on mount
  useEffect(() => { start(); return () => { stop(); }; }, []); // eslint-disable-line

  return (
    <div className="flex flex-col h-dvh bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe-top py-3">
        <button
          onClick={() => { stop(); router.back(); }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur"
        >
          <X size={18} />
        </button>
        <span className="text-sm font-medium">Scan Asset or Desk</span>
        <div className="w-9" /> {/* spacer */}
      </div>

      {/* Scanner viewfinder */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Camera feed container */}
        <div
          ref={containerRef}
          id="qr-scanner-container"
          className="w-full h-full"
        />

        {/* Overlay — corner brackets */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-64 h-64">
              {/* Top-left */}
              <span className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-sm" />
              {/* Top-right */}
              <span className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-sm" />
              {/* Bottom-left */}
              <span className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-sm" />
              {/* Bottom-right */}
              <span className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-sm" />
              {/* Scanning line animation */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-primary animate-pulse-soft" />
            </div>
          </div>
        )}

        {/* Permission denied state */}
        {hasPermission === false && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center bg-black/80">
            <ScanLine size={48} className="text-white/40" />
            <p className="text-sm text-white/70">{error}</p>
            <button
              onClick={start}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Bottom sheet — last result or instructions */}
      <div className={cn(
        "px-4 pb-safe-bottom py-4 bg-black/70 backdrop-blur",
        "min-h-[100px] flex flex-col items-center justify-center gap-2"
      )}>
        {lastResult ? (
          <div className="w-full max-w-sm rounded-xl bg-white/10 px-4 py-3 text-center">
            <p className="text-xs text-white/60 mb-1">Last Scanned</p>
            <p className="text-sm font-mono font-medium truncate">{lastResult}</p>
            <p className="text-xs text-primary mt-1 animate-pulse-soft">Navigating…</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Info size={14} />
            <span>Point camera at QR code or barcode on asset label</span>
          </div>
        )}
      </div>
    </div>
  );
}
