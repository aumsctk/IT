// @ts-nocheck
"use client";

/**
 * MiniMap — Bird's-eye overview of the entire floor plan.
 * Shows colored seat rectangles and a viewport rectangle.
 * Clicking a location in the minimap pans the main canvas there.
 */

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import type { ViewTransform } from "@/hooks/useFloorPlan";

const MINI_W = 160;
const MINI_H = 100;

const STATUS_COLOR: Record<string, string> = {
  available:   "#22c55e",
  occupied:    "#6366f1",
  reserved:    "#f59e0b",
  maintenance: "#94a3b8",
  inactive:    "#cbd5e1",
};

interface MiniMapSeat {
  id:       string;
  pos_x:    number;
  pos_y:    number;
  width_px: number;
  height_px:number;
  status:   string;
}

interface MiniMapProps {
  seats:       MiniMapSeat[];
  planWidth:   number;
  planHeight:  number;
  transform:   ViewTransform;
  canvasW:     number;
  canvasH:     number;
  onNavigate:  (x: number, y: number) => void;
  className?:  string;
}

export function MiniMap({
  seats, planWidth, planHeight,
  transform, canvasW, canvasH,
  onNavigate, className,
}: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Scale factors: plan coords → minimap pixels
  const sx = MINI_W / (planWidth  || 1);
  const sy = MINI_H / (planHeight || 1);

  // Viewport rect in minimap coordinates
  const vpX = (-transform.x / transform.scale) * sx;
  const vpY = (-transform.y / transform.scale) * sy;
  const vpW = (canvasW / transform.scale) * sx;
  const vpH = (canvasH / transform.scale) * sy;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect     = e.currentTarget.getBoundingClientRect();
      const miniX    = e.clientX - rect.left;
      const miniY    = e.clientY - rect.top;

      // Convert minimap click to world coords
      const worldX   = miniX / sx;
      const worldY   = miniY / sy;

      // Center the canvas on this world coordinate
      const newX = canvasW  / 2 - worldX * transform.scale;
      const newY = canvasH  / 2 - worldY * transform.scale;
      onNavigate(newX, newY);
    },
    [sx, sy, canvasW, canvasH, transform.scale, onNavigate]
  );

  return (
    <div
      className={cn(
        "absolute bottom-4 right-3 z-10 overflow-hidden",
        "rounded-xl border border-border bg-card/95 backdrop-blur-sm shadow-lg",
        "hidden md:block",
        className
      )}
      style={{ width: MINI_W + 16, height: MINI_H + 16 }}
    >
      <svg
        width={MINI_W}
        height={MINI_H}
        viewBox={`0 0 ${MINI_W} ${MINI_H}`}
        className="m-2 cursor-pointer rounded-lg"
        onClick={handleClick}
      >
        {/* Floor background */}
        <rect x={0} y={0} width={MINI_W} height={MINI_H} fill="#f8fafc" rx={2} />

        {/* Seats */}
        {seats.map((s) => (
          <rect
            key={s.id}
            x={s.pos_x    * sx}
            y={s.pos_y    * sy}
            width={Math.max(s.width_px  * sx, 2)}
            height={Math.max(s.height_px * sy, 2)}
            fill={STATUS_COLOR[s.status] ?? "#94a3b8"}
            opacity={0.7}
            rx={0.5}
          />
        ))}

        {/* Viewport indicator */}
        <rect
          x={Math.max(0, vpX)}
          y={Math.max(0, vpY)}
          width={Math.min(vpW, MINI_W - Math.max(0, vpX))}
          height={Math.min(vpH, MINI_H - Math.max(0, vpY))}
          fill="rgba(99,102,241,0.08)"
          stroke="#6366f1"
          strokeWidth={1}
          rx={1}
        />
      </svg>
    </div>
  );
}