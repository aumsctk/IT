"use client";

/**
 * FloorPlanView — Assembles all floor plan sub-components.
 * This is the single component imported by the page.
 *
 * Layout:
 *  ┌─────────────────────────────────────┐
 *  │  [Toolbar — centered top]           │
 *  │                                     │
 *  │         Canvas                      │
 *  │                    [MiniMap BR]     │
 *  │  [Layers BL]                        │
 *  └─────────────────────────────────────┘
 *  [SeatPanel slides in from right / bottom]
 *
 * Props come from the parent page which resolves the room from URL params.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useFloorPlan } from "@/hooks/useFloorPlan";
import { FloorPlanCanvas } from "./FloorPlanCanvas";
import { FloorPlanToolbar } from "./FloorPlanToolbar";
import { LayerControls } from "./LayerControls";
import { MiniMap } from "./MiniMap";
import { SeatPanel } from "./SeatPanel";
import { AddDeskModal } from "./AddDeskModal";
import type Konva from "konva";

interface FloorPlanViewProps {
  roomId:      string;
  planWidth:   number;
  planHeight:  number;
  blueprintUrl?: string | null;
  canEdit:     boolean;
}

export function FloorPlanView({
  roomId, planWidth, planHeight, blueprintUrl, canEdit,
}: FloorPlanViewProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef     = useRef<Konva.Stage>(null);

  const [containerW, setContainerW] = useState(800);
  const [containerH, setContainerH] = useState(600);
  const [panelSeatId, setPanelSeatId] = useState<string | null>(null);
  const [showAddDesk,  setShowAddDesk]  = useState(false);
  const [newDeskPos,   setNewDeskPos]   = useState({ x: 100, y: 100 });

  // ── Resize observer ───────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width);
      setContainerH(entry.contentRect.height);
    });
    obs.observe(el);
    setContainerW(el.offsetWidth);
    setContainerH(el.offsetHeight);
    return () => obs.disconnect();
  }, []);

  // ── Floor plan hook ───────────────────────────────────────────
  const fp = useFloorPlan(roomId, stageRef);

  // ── Auto-focus when ?seat=<id> is in the URL ─────────────────
  useEffect(() => {
    const seatParam = searchParams.get("seat");
    if (seatParam && fp.seats.length > 0 && containerW > 0) {
      fp.focusOnSeat(seatParam, containerW, containerH);
      setPanelSeatId(seatParam);
    }
  }, [searchParams.get("seat"), fp.seats.length, containerW]); // eslint-disable-line

  // ── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case "v": case "V": fp.setTool("select"); break;
        case "h": case "H": fp.setTool("pan");    break;
        case "d": case "D": if (canEdit) fp.setTool("draw"); break;
        case "+": case "=": fp.zoomIn();  break;
        case "-":            fp.zoomOut(); break;
        case "f": case "F": fp.fitToScreen(containerW, containerH, planWidth, planHeight); break;
        case "Escape":       fp.clearSelection(); setPanelSeatId(null); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fp, canEdit, containerW, containerH, planWidth, planHeight]);

  // ── Seat click handler ────────────────────────────────────────
  const handleSeatClick = useCallback((seatId: string) => {
    setPanelSeatId(seatId);
    // Update URL without navigation (for sharing / deep-link)
    const params = new URLSearchParams(searchParams.toString());
    params.set("seat", seatId);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // ── Add desk: place at center of current viewport ─────────────
  const handleAddDesk = useCallback(() => {
    const worldX = (containerW / 2 - fp.transform.x) / fp.transform.scale;
    const worldY = (containerH / 2 - fp.transform.y) / fp.transform.scale;
    setNewDeskPos({ x: Math.max(0, worldX - 30), y: Math.max(0, worldY - 20) });
    setShowAddDesk(true);
  }, [fp.transform, containerW, containerH]);

  // ── Seat counts for LayerControls ─────────────────────────────
  const seatCounts = {
    available:   fp.seats.filter((s) => s.status === "available").length,
    occupied:    fp.seats.filter((s) => s.status === "occupied").length,
    maintenance: fp.seats.filter((s) => s.status === "maintenance").length,
  };

  const panelSeat   = fp.seats.find((s) => s.id === panelSeatId) ?? null;
  const multiSeats  = fp.selectedSeats.length > 1 ? fp.selectedSeats : [];

  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden bg-slate-100 dark:bg-slate-900">
      {/* Toolbar */}
      <FloorPlanToolbar
        tool={fp.tool}
        onToolChange={fp.setTool}
        onZoomIn={fp.zoomIn}
        onZoomOut={fp.zoomOut}
        onFit={() => fp.fitToScreen(containerW, containerH, planWidth, planHeight)}
        onAddDesk={handleAddDesk}
        scale={fp.transform.scale}
        canEdit={canEdit}
      />

      {/* Loading overlay */}
      {fp.isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="rounded-xl border border-border bg-card px-5 py-3 text-sm text-muted-foreground">
            Loading floor plan…
          </div>
        </div>
      )}

      {/* Canvas */}
      {containerW > 0 && (
        <FloorPlanCanvas
          fp={fp}
          blueprintUrl={blueprintUrl}
          planWidth={planWidth || 1200}
          planHeight={planHeight || 800}
          containerW={containerW}
          containerH={containerH}
          onSeatClick={handleSeatClick}
          canEdit={canEdit}
        />
      )}

      {/* Layer controls */}
      <LayerControls
        layers={fp.layers}
        onToggle={fp.toggleLayer}
        seatCounts={seatCounts}
      />

      {/* MiniMap */}
      <MiniMap
        seats={fp.seats}
        planWidth={planWidth || 1200}
        planHeight={planHeight || 800}
        transform={fp.transform}
        canvasW={containerW}
        canvasH={containerH}
        onNavigate={(x, y) => fp.setTransform((prev) => ({ ...prev, x, y }))}
      />

      {/* Selection count chip */}
      {fp.selectedIds.size > 1 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card/95 backdrop-blur-sm px-3 py-1.5 text-xs font-medium shadow-lg">
            <span>{fp.selectedIds.size} desks selected</span>
            <button
              onClick={() => {
                setPanelSeatId(null);
                // show multi panel
              }}
              className="text-primary hover:underline"
            >
              Edit
            </button>
            <button onClick={fp.clearSelection} className="text-muted-foreground hover:text-foreground">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Seat panel */}
      <SeatPanel
        seat={multiSeats.length === 0 ? panelSeat : null}
        multiSeats={multiSeats}
        onClose={() => {
          setPanelSeatId(null);
          fp.clearSelection();
        }}
        onUpdated={fp.refetch}
        canEdit={canEdit}
      />

      {/* Add desk modal */}
      {showAddDesk && (
        <AddDeskModal
          roomId={roomId}
          pos_x={newDeskPos.x}
          pos_y={newDeskPos.y}
          onCreated={(seat) => {
            fp.setSeats((prev) => [...prev, seat]);
            setPanelSeatId(seat.id);
          }}
          onClose={() => setShowAddDesk(false)}
        />
      )}
    </div>
  );
}
