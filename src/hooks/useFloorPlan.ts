"use client";

/**
 * useFloorPlan — Central state for the floor plan canvas
 * ─────────────────────────────────────────────────────────────────
 * Manages:
 *  - Viewport (pan/zoom) with auto-focus-to-seat animation
 *  - Selected seat(s) — single click or lasso multi-select
 *  - Layer visibility toggles
 *  - Tool mode (select | pan | draw)
 *  - Real-time seat data via useRoomSeats
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Konva from "konva";
import { useRoomSeats } from "./useSeats";

// ── Types ─────────────────────────────────────────────────────────
export type ToolMode = "select" | "pan" | "draw";

export interface LayerVisibility {
  showVacant:    boolean;
  showOccupied:  boolean;
  showMaintenance: boolean;
  showBroken:    boolean;
  showNetwork:   boolean;  // RJ45 port labels
  showNames:     boolean;  // Employee name labels
}

export interface ViewTransform {
  x:     number;
  y:     number;
  scale: number;
}

export interface LassoRect {
  x: number; y: number; width: number; height: number;
}

const DEFAULT_LAYERS: LayerVisibility = {
  showVacant:      true,
  showOccupied:    true,
  showMaintenance: true,
  showBroken:      true,
  showNetwork:     false,
  showNames:       true,
};

const MIN_SCALE = 0.1;
const MAX_SCALE = 4.0;
const ZOOM_STEP = 0.15;
const FOCUS_SCALE = 1.8;
const ANIM_DURATION_MS = 350;

export function useFloorPlan(roomId: string | null, canvasRef: React.RefObject<Konva.Stage>) {
  const { seats, setSeats, isLoading, refetch } = useRoomSeats(roomId);

  // ── Viewport ──────────────────────────────────────────────────
  const [transform, setTransform] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const animRef = useRef<number | null>(null);

  // ── Tool & selection ──────────────────────────────────────────
  const [tool,         setTool]         = useState<ToolMode>("select");
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [hoveredId,    setHoveredId]    = useState<string | null>(null);
  const [lassoRect,    setLassoRect]    = useState<LassoRect | null>(null);
  const [isLassoing,   setIsLassoing]   = useState(false);
  const lassoStartRef  = useRef<{ x: number; y: number } | null>(null);

  // ── Layers ────────────────────────────────────────────────────
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYERS);

  // ── Filtered seats for rendering ──────────────────────────────
  const visibleSeats = seats.filter((s) => {
    if (!layers.showVacant      && s.status === "available")    return false;
    if (!layers.showOccupied    && s.status === "occupied")     return false;
    if (!layers.showMaintenance && s.status === "maintenance")  return false;
    if (!layers.showBroken      && s.condition === "broken")    return false;
    return true;
  });

  // ── Zoom helpers ──────────────────────────────────────────────
  const zoom = useCallback((delta: number, pivotX?: number, pivotY?: number) => {
    setTransform((prev) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale + delta));
      const ratio    = newScale / prev.scale;
      const cx       = pivotX ?? 0;
      const cy       = pivotY ?? 0;
      return {
        scale: newScale,
        x:     cx - (cx - prev.x) * ratio,
        y:     cy - (cy - prev.y) * ratio,
      };
    });
  }, []);

  const zoomIn  = useCallback(() => zoom(ZOOM_STEP), [zoom]);
  const zoomOut = useCallback(() => zoom(-ZOOM_STEP), [zoom]);
  const resetView = useCallback(() => setTransform({ x: 0, y: 0, scale: 1 }), []);
  const fitToScreen = useCallback((canvasW: number, canvasH: number, contentW: number, contentH: number) => {
    const scaleX = canvasW / contentW;
    const scaleY = canvasH / contentH;
    const scale  = Math.min(scaleX, scaleY, 1) * 0.9;
    setTransform({
      scale,
      x: (canvasW - contentW * scale) / 2,
      y: (canvasH - contentH * scale) / 2,
    });
  }, []);

  // ── Auto-focus to a specific seat (animated pan+zoom) ─────────
  const focusOnSeat = useCallback(
    (seatId: string, canvasW: number, canvasH: number) => {
      const seat = seats.find((s) => s.id === seatId);
      if (!seat) return;

      const targetScale = FOCUS_SCALE;
      const targetX     = canvasW  / 2 - (seat.pos_x + seat.width_px  / 2) * targetScale;
      const targetY     = canvasH  / 2 - (seat.pos_y + seat.height_px / 2) * targetScale;

      // Smooth animation using requestAnimationFrame
      const start = performance.now();
      if (animRef.current) cancelAnimationFrame(animRef.current);

      const from = { ...transform };

      const animate = (now: number) => {
        const t = Math.min((now - start) / ANIM_DURATION_MS, 1);
        const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic

        setTransform({
          scale: from.scale + (targetScale - from.scale) * ease,
          x:     from.x     + (targetX     - from.x)     * ease,
          y:     from.y     + (targetY     - from.y)     * ease,
        });

        if (t < 1) animRef.current = requestAnimationFrame(animate);
        else setSelectedIds(new Set([seatId]));
      };

      animRef.current = requestAnimationFrame(animate);
    },
    [seats, transform]
  );

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  // ── Konva wheel handler (pinch-zoom on mobile, scroll on desktop)
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const delta = e.evt.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      zoom(delta, pointer.x, pointer.y);
    },
    [zoom]
  );

  // ── Selection helpers ─────────────────────────────────────────
  const selectSeat = useCallback((id: string, multi = false) => {
    setSelectedIds((prev) => {
      if (multi) {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }
      return new Set([id]);
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectedSeats = seats.filter((s) => selectedIds.has(s.id));

  // ── Lasso multi-select ────────────────────────────────────────
  const startLasso = useCallback((x: number, y: number) => {
    setIsLassoing(true);
    lassoStartRef.current = { x, y };
    setLassoRect({ x, y, width: 0, height: 0 });
  }, []);

  const updateLasso = useCallback((x: number, y: number) => {
    if (!lassoStartRef.current) return;
    const { x: sx, y: sy } = lassoStartRef.current;
    setLassoRect({
      x:      Math.min(x, sx),
      y:      Math.min(y, sy),
      width:  Math.abs(x - sx),
      height: Math.abs(y - sy),
    });
  }, []);

  const endLasso = useCallback(() => {
    if (!lassoRect) return;
    setIsLassoing(false);
    lassoStartRef.current = null;

    // Convert lasso rect from canvas coords to world coords
    const { x: lx, y: ly, width: lw, height: lh } = lassoRect;
    const worldRect = {
      x:      (lx - transform.x) / transform.scale,
      y:      (ly - transform.y) / transform.scale,
      right:  (lx + lw - transform.x) / transform.scale,
      bottom: (ly + lh - transform.y) / transform.scale,
    };

    const caught = seats
      .filter((s) => {
        const cx = s.pos_x + s.width_px  / 2;
        const cy = s.pos_y + s.height_px / 2;
        return (
          cx >= worldRect.x  && cx <= worldRect.right &&
          cy >= worldRect.y  && cy <= worldRect.bottom
        );
      })
      .map((s) => s.id);

    setSelectedIds(new Set(caught));
    setLassoRect(null);
  }, [lassoRect, seats, transform]);

  // ── Layer toggle ──────────────────────────────────────────────
  const toggleLayer = useCallback((key: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return {
    // Data
    seats, visibleSeats, isLoading, refetch, setSeats,
    // Viewport
    transform, setTransform, zoom, zoomIn, zoomOut, resetView, fitToScreen, focusOnSeat,
    handleWheel,
    // Tool
    tool, setTool,
    // Selection
    selectedIds, selectedSeats, selectSeat, clearSelection,
    hoveredId, setHoveredId,
    // Lasso
    isLassoing, lassoRect, startLasso, updateLasso, endLasso,
    // Layers
    layers, toggleLayer,
    // Constants
    MIN_SCALE, MAX_SCALE,
  };
}
