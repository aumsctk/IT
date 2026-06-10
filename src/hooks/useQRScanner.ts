// @ts-nocheck
/**
 * useQRScanner Hook
 * ─────────────────────────────────────────────────────────────────
 * Wraps the device camera to decode QR codes and barcodes.
 * Uses `html5-qrcode` under the hood (battle-tested on iOS/Android).
 *
 * Features:
 *  - Requests camera permission gracefully with a fallback message
 *  - Prefers the rear ("environment") camera on mobile
 *  - Debounces results so a single scan doesn't fire 10 times
 *  - Returns the raw scanned text for parent to route accordingly
 *
 * Usage:
 *   const { ref, isScanning, lastResult, error, start, stop } = useQRScanner({
 *     onScan: (value) => router.push(`/assets?tag=${value}`)
 *   });
 *   // Attach `ref` to a <div id="qr-reader" />
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScanType, type QrcodeSuccessCallback } from "html5-qrcode";

export interface UseQRScannerOptions {
  /** Called each time a NEW code is decoded */
  onScan: (decodedText: string) => void;
  /** How many ms to wait before accepting another scan of the same value */
  debounceMs?: number;
  /** CSS id of the container div */
  containerId?: string;
}

export interface QRScannerState {
  /** Ref to attach to your container <div> */
  containerRef: React.RefObject<HTMLDivElement>;
  isScanning: boolean;
  lastResult: string | null;
  error: string | null;
  hasPermission: boolean | null;
  /** Start the camera scanner */
  start: () => Promise<void>;
  /** Stop the camera scanner */
  stop: () => Promise<void>;
  /** Toggle start/stop */
  toggle: () => Promise<void>;
}

const CONTAINER_ID = "qr-scanner-container";

export function useQRScanner({
  onScan,
  debounceMs = 1500,
  containerId = CONTAINER_ID,
}: UseQRScannerOptions): QRScannerState {
  const scannerRef   = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<string | null>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isScanning,   setIsScanning]   = useState(false);
  const [lastResult,   setLastResult]   = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Ensure the container div has the required id
  useEffect(() => {
    if (containerRef.current && !containerRef.current.id) {
      containerRef.current.id = containerId;
    }
  }, [containerId]);

  const handleSuccess: QrcodeSuccessCallback = useCallback(
    (decodedText) => {
      // Debounce: ignore if same value scanned within debounceMs
      if (decodedText === lastValueRef.current) return;

      lastValueRef.current = decodedText;
      setLastResult(decodedText);
      onScan(decodedText);

      // Reset after debounce window so the same tag can be re-scanned
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        lastValueRef.current = null;
      }, debounceMs);
    },
    [onScan, debounceMs]
  );

  const start = useCallback(async () => {
    if (isScanning) return;
    setError(null);

    try {
      // Check camera permission first
      await navigator.mediaDevices.getUserMedia({ video: true });
      setHasPermission(true);
    } catch {
      setHasPermission(false);
      setError("Camera permission denied. Please allow camera access and try again.");
      return;
    }

    // Lazily instantiate scanner
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(containerId, { verbose: false });
    }

    try {
      await scannerRef.current.start(
        { facingMode: "environment" },   // rear camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          supportedScanTypes: [
            Html5QrcodeScanType.SCAN_TYPE_CAMERA,
          ],
          // Also decode common 1D barcodes (Code128, EAN, etc.)
          formatsToSupport: undefined,  // undefined = all formats
        },
        handleSuccess,
        () => {}  // silent error (frame with no QR)
      );
      setIsScanning(true);
    } catch (err) {
      setError(`Failed to start scanner: ${(err as Error).message}`);
    }
  }, [isScanning, containerId, handleSuccess]);

  const stop = useCallback(async () => {
    if (!isScanning || !scannerRef.current) return;
    try {
      await scannerRef.current.stop();
      await scannerRef.current.clear();
    } catch { /* ignore stop errors */ }
    setIsScanning(false);
  }, [isScanning]);

  const toggle = useCallback(async () => {
    if (isScanning) await stop();
    else await start();
  }, [isScanning, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { containerRef, isScanning, lastResult, error, hasPermission, start, stop, toggle };
}