// @ts-nocheck
"use client";

/**
 * FloorPlanCanvas — Main react-konva Stage
 * ─────────────────────────────────────────────────────────────────
 * Features:
 *  - Blueprint image background
 *  - Seat nodes with status colors
 *  - Pan via drag on empty space
 *  - Pinch-to-zoom (mobile) + scroll-to-zoom (desktop)
 *  - Lasso multi-select (drag on empty canvas in select mode)
 *  - Snap-to-grid while dragging desks
 *  - Lasso rectangle overlay (dashed)
 */

import { useEffect, useRef, useCallback } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Group } from "react-konva";
import useImage from "use-image";
import Konva from "konva";
import { SeatNode } from "./SeatNode";
import type { useFloorPlan } from "@/hooks/useFloorPlan";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { updateSeatPosition, bulkUpdateSeatPositions } from "@/lib/queries/seats";

const GRID_SIZE = 10; // snap grid in world-pixels

function snapToGrid(v: number): number {
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

interface FloorPlanCanvasProps {
  fp:            ReturnType<typeof useFloorPlan>;
  blueprintUrl?: string | null;
  planWidth:     number;
  planHeight:    number;
  containerW:    number;
  containerH:    number;
  onSeatClick:   (seatId: string) => void;
  canEdit:       boolean;
}

export function FloorPlanCanvas({
  fp, blueprintUrl, planWidth, planHeight,
  containerW, containerH, onSeatClick, canEdit,
}: FloorPlanCanvasProps) {
  const stageRef    = useRef<Konva.Stage>(null);
  const supabase    = getSupabaseBrowser();
  const isPanning   = useRef(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  const [bgImage] = useImage(blueprintUrl ?? "", "anonymous");

  // Fit to screen on first load
  useEffect(() => {
    if (planWidth && planHeight && containerW && containerH) {
      fp.fitToScreen(containerW, containerH, planWidth, planHeight);
    }
  }, [planWidth, planHeight, containerW, containerH]); // eslint-disable-line

  // ── Stage event handlers ──────────────────────────────────────
  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const target = e.target;
      const isCanvas = target === e.target.getStage() || target.hasName("bg");

      if (!isCanvas) return;

      if (fp.tool === "pan") {
        isPanning.current = true;
        const pos = stageRef.current?.getPointerPosition();
        if (pos) lastPointer.current = pos;
      } else if (fp.tool === "select") {
        fp.clearSelection();
        const pos = stageRef.current?.getPointerPosition();
        if (pos) {
          // Start lasso
          fp.startLasso(pos.x, pos.y);
        }
      }
    },
    [fp]
  );

  const handleStageMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (fp.tool === "pan" && isPanning.current) {
        const pos = stageRef.current?.getPointerPosition();
        if (!pos || !lastPointer.current) return;
        fp.setTransform((prev) => ({
          ...prev,
          x: prev.x + (pos.x - lastPointer.current!.x),
          y: prev.y + (pos.y - lastPointer.current!.y),
        }));
        lastPointer.current = pos;
      } else if (fp.tool === "select" && fp.isLassoing) {
        const pos = stageRef.current?.getPointerPosition();
        if (pos) fp.updateLasso(pos.x, pos.y);
      }
    },
    [fp]
  );

  const handleStageMouseUp = useCallback(() => {
    isPanning.current = false;
    lastPointer.current = null;
    if (fp.isLassoing) fp.endLasso();
  }, [fp]);

  // ── Touch pinch-zoom ──────────────────────────────────────────
  const lastDist = useRef<number | null>(null);

  const handleTouchMove = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      if (touches.length === 2) {
        e.evt.preventDefault();
        const dx    = touches[0].clientX - touches[1].clientX;
        const dy    = touches[0].clientY - touches[1].clientY;
        const dist  = Math.sqrt(dx * dx + dy * dy);
        const midX  = (touches[0].clientX + touches[1].clientX) / 2;
        const midY  = (touches[0].clientY + touches[1].clientY) / 2;

        if (lastDist.current !== null) {
          const delta = (dist - lastDist.current) * 0.008;
          fp.zoom(delta, midX, midY);
        }
        lastDist.current = dist;
      }
    },
    [fp]
  );

  const handleTouchEnd = useCallback(() => { lastDist.current = null; }, []);

  // ── Drag end: snap to grid and persist ───────────────────────
  const handleSeatDragEnd = useCallback(
    async (seatId: string, rawX: number, rawY: number) => {
      const snappedX = snapToGrid(rawX);
      const snappedY = snapToGrid(rawY);

      // Optimistic local update
      fp.setSeats((prev) =>
        prev.map((s) => s.id === seatId ? { ...s, pos_x: snappedX, pos_y: snappedY } : s)
      );

      // Persist to DB
      try {
        await updateSeatPosition(supabase, seatId, { pos_x: snappedX, pos_y: snappedY });
      } catch (err) {
        console.error("Failed to save seat position:", err);
        fp.refetch(); // rollback via refetch
      }
    },
    [fp, supabase]
  );

  // ── Bulk drag: multi-selected seats move together ────────────
  const handleBulkDragEnd = useCallback(
    async (leadId: string, rawX: number, rawY: number) => {
      if (fp.selectedIds.size <= 1) {
        handleSeatDragEnd(leadId, rawX, rawY);
        return;
      }
      const lead = fp.seats.find((s) => s.id === leadId);
      if (!lead) return;

      const deltaX = snapToGrid(rawX) - lead.pos_x;
      const deltaY = snapToGrid(rawY) - lead.pos_y;

      const updates = fp.selectedSeats.map((s) => ({
        id:    s.id,
        pos_x: snapToGrid(s.pos_x + deltaX),
        pos_y: snapToGrid(s.pos_y + deltaY),
      }));

      fp.setSeats((prev) =>
        prev.map((s) => {
          const u = updates.find((u) => u.id === s.id);
          return u ? { ...s, pos_x: u.pos_x, pos_y: u.pos_y } : s;
        })
      );

      try {
        await bulkUpdateSeatPositions(supabase, updates);
      } catch {
        fp.refetch();
      }
    },
    [fp, supabase, handleSeatDragEnd]
  );

  return (
    <Stage
      ref={stageRef}
      width={containerW}
      height={containerH}
      x={fp.transform.x}
      y={fp.transform.y}
      scaleX={fp.transform.scale}
      scaleY={fp.transform.scale}
      onWheel={fp.handleWheel}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        cursor: fp.tool === "pan" ? (isPanning.current ? "grabbing" : "grab") :
                fp.isLassoing   ? "crosshair" : "default",
        touchAction: "none",
      }}
    >
      {/* ── Background Layer ── */}
      <Layer>
        {/* White floor base */}
        <Rect
          name="bg"
          x={0} y={0}
          width={planWidth || 1200}
          height={planHeight || 800}
          fill="#f8fafc"
          stroke="#e2e8f0"
          strokeWidth={1}
        />

        {/* Blueprint image */}
        {bgImage && (
          <KonvaImage
            name="bg"
            image={bgImage}
            x={0} y={0}
            width={planWidth}
            height={planHeight}
            opacity={0.35}
          />
        )}

        {/* Grid dots (visible when zoomed in) */}
        {fp.transform.scale > 0.8 && (
          <GridDots
            width={planWidth || 1200}
            height={planHeight || 800}
            step={GRID_SIZE}
            opacity={Math.min(1, (fp.transform.scale - 0.8) * 2)}
          />
        )}
      </Layer>

      {/* ── Seats Layer ── */}
      <Layer>
        {fp.visibleSeats.map((seat) => (
          <SeatNode
            key={seat.id}
            seat={seat}
            isSelected={fp.selectedIds.has(seat.id)}
            isHovered={fp.hoveredId === seat.id}
            showNetwork={fp.layers.showNetwork}
            showNames={fp.layers.showNames}
            scale={fp.transform.scale}
            onSelect={(id, multi) => {
              fp.selectSeat(id, multi);
              if (!multi) onSeatClick(id);
            }}
            onHover={fp.setHoveredId}
            onDragEnd={handleBulkDragEnd}
            isDraggable={canEdit && fp.tool === "select"}
          />
        ))}
      </Layer>

      {/* ── Lasso Layer ── */}
      <Layer listening={false}>
        {fp.lassoRect && (
          <Rect
            x={(fp.lassoRect.x - fp.transform.x) / fp.transform.scale}
            y={(fp.lassoRect.y - fp.transform.y) / fp.transform.scale}
            width={fp.lassoRect.width / fp.transform.scale}
            height={fp.lassoRect.height / fp.transform.scale}
            fill="rgba(99,102,241,0.08)"
            stroke="#6366f1"
            strokeWidth={1.5 / fp.transform.scale}
            dash={[8 / fp.transform.scale, 4 / fp.transform.scale]}
          />
        )}
      </Layer>
    </Stage>
  );
}

// ── Grid dot pattern ─────────────────────────────────────────────
function GridDots({
  width, height, step, opacity,
}: { width: number; height: number; step: number; opacity: number }) {
  const dots: React.ReactNode[] = [];
  for (let x = 0; x <= width; x += step) {
    for (let y = 0; y <= height; y += step) {
      dots.push(
        <Rect
          key={`${x}-${y}`}
          x={x - 0.5} y={y - 0.5}
          width={1} height={1}
          fill={`rgba(148,163,184,${opacity * 0.4})`}
          listening={false}
        />
      );
    }
  }
  return <>{dots}</>;
}