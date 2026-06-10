"use client";

/**
 * SeatNode — Individual desk/node on the Konva canvas
 * ─────────────────────────────────────────────────────────────────
 * Renders a colored rectangle + label for each seat.
 * Color encodes status. Selected = glowing ring. Hovered = highlight.
 * Shows employee name or RJ45 port depending on active layers.
 */

import { useRef } from "react";
import { Rect, Group, Text, Circle } from "react-konva";
import type Konva from "konva";

export interface SeatNodeData {
  id:                   string;
  label:                string;
  status:               string;
  node_type:            string;
  pos_x:                number;
  pos_y:                number;
  width_px:             number;
  height_px:            number;
  rotation_deg:         number;
  rj45_wall_port?:      string | null;
  assigned_employee_id?: string | null;
  profiles?: { full_name: string } | null;
  assets?:   Array<{ status: string; asset_models?: { category: string } }>;
}

interface SeatNodeProps {
  seat:          SeatNodeData;
  isSelected:    boolean;
  isHovered:     boolean;
  showNetwork:   boolean;
  showNames:     boolean;
  scale:         number;    // current canvas scale (for responsive font)
  onSelect:      (id: string, multi: boolean) => void;
  onHover:       (id: string | null) => void;
  onDragEnd:     (id: string, x: number, y: number) => void;
  isDraggable:   boolean;
}

// Status → fill color map (uses tailwind-compatible hex)
const STATUS_COLOR: Record<string, { fill: string; stroke: string; dot?: string }> = {
  available:   { fill: "#f0fdf4", stroke: "#22c55e", dot: "#22c55e"  },
  occupied:    { fill: "#eef2ff", stroke: "#6366f1", dot: "#6366f1"  },
  reserved:    { fill: "#fffbeb", stroke: "#f59e0b", dot: "#f59e0b"  },
  maintenance: { fill: "#f8fafc", stroke: "#94a3b8", dot: "#94a3b8"  },
  inactive:    { fill: "#f8fafc", stroke: "#cbd5e1", dot: "#cbd5e1"  },
  // derived
  broken:      { fill: "#fff1f2", stroke: "#ef4444", dot: "#ef4444"  },
};

const NODE_TYPE_COLOR: Record<string, { fill: string; stroke: string }> = {
  server_rack:      { fill: "#1e293b", stroke: "#334155" },
  network_cabinet:  { fill: "#1e3a5f", stroke: "#1e40af" },
  printer_station:  { fill: "#f0fdf4", stroke: "#16a34a" },
  meeting_room:     { fill: "#fdf4ff", stroke: "#a855f7" },
  storage:          { fill: "#fafaf9", stroke: "#a8a29e" },
  label:            { fill: "transparent", stroke: "transparent" },
};

export function SeatNode({
  seat, isSelected, isHovered,
  showNetwork, showNames, scale,
  onSelect, onHover, onDragEnd, isDraggable,
}: SeatNodeProps) {
  const groupRef = useRef<Konva.Group>(null);

  const isSpecial   = seat.node_type !== "desk";
  const colors      = isSpecial
    ? (NODE_TYPE_COLOR[seat.node_type] ?? STATUS_COLOR.available)
    : (STATUS_COLOR[seat.status] ?? STATUS_COLOR.available);

  const fill        = colors.fill;
  const stroke      = isSelected ? "#6366f1" : isHovered ? "#a5b4fc" : colors.stroke;
  const strokeWidth = isSelected ? 2.5 : isHovered ? 2 : 1.5;

  // Adaptive font size based on canvas scale
  const fontSize      = Math.max(8, Math.min(13, 11 / scale));
  const subFontSize   = Math.max(7, Math.min(11, 9 / scale));
  const dotRadius     = Math.max(3, 5 / scale);

  const hasAssets     = (seat.assets?.length ?? 0) > 0;
  const employeeName  = seat.profiles?.full_name;
  const shortName     = employeeName
    ? employeeName.split(" ").map((n) => n[0]).join("").slice(0, 3).toUpperCase()
    : null;

  const w = seat.width_px;
  const h = seat.height_px;
  const cx = w / 2;
  const cy = h / 2;

  return (
    <Group
      ref={groupRef}
      x={seat.pos_x}
      y={seat.pos_y}
      rotation={seat.rotation_deg}
      draggable={isDraggable}
      onDragEnd={(e) => {
        onDragEnd(seat.id, e.target.x(), e.target.y());
      }}
      onClick={(e) => {
        onSelect(seat.id, e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey);
      }}
      onTap={() => onSelect(seat.id, false)}
      onMouseEnter={() => onHover(seat.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Selection glow ring */}
      {isSelected && (
        <Rect
          x={-4} y={-4}
          width={w + 8} height={h + 8}
          cornerRadius={8}
          fill="rgba(99,102,241,0.12)"
          stroke="#6366f1"
          strokeWidth={1.5 / scale}
          dash={[6 / scale, 3 / scale]}
        />
      )}

      {/* Main body */}
      <Rect
        x={0} y={0}
        width={w} height={h}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth / scale}
        cornerRadius={4 / scale}
        shadowEnabled={isHovered || isSelected}
        shadowColor="rgba(99,102,241,0.3)"
        shadowBlur={isSelected ? 12 / scale : 6 / scale}
        shadowOffsetY={2 / scale}
      />

      {/* Status dot (top-right) */}
      {!isSpecial && (
        <Circle
          x={w - dotRadius - 3 / scale}
          y={dotRadius + 3 / scale}
          radius={dotRadius}
          fill={(STATUS_COLOR[seat.status] ?? STATUS_COLOR.available).dot}
        />
      )}

      {/* Seat label */}
      <Text
        x={4 / scale} y={4 / scale}
        width={w - 8 / scale}
        text={seat.label}
        fontSize={fontSize}
        fontStyle="bold"
        fill={isSpecial ? "#e2e8f0" : "#1e293b"}
        align="center"
        ellipsis
        wrap="none"
      />

      {/* Employee name or initials */}
      {showNames && employeeName && h > 30 / scale && (
        <Text
          x={4 / scale}
          y={cy - subFontSize / 2 + 4 / scale}
          width={w - 8 / scale}
          text={w > 50 / scale ? employeeName.split(" ")[0] : shortName ?? ""}
          fontSize={subFontSize}
          fill="#475569"
          align="center"
          ellipsis
          wrap="none"
        />
      )}

      {/* RJ45 port label (network layer) */}
      {showNetwork && seat.rj45_wall_port && h > 30 / scale && (
        <Text
          x={4 / scale}
          y={h - subFontSize - 4 / scale}
          width={w - 8 / scale}
          text={seat.rj45_wall_port}
          fontSize={subFontSize * 0.9}
          fill="#64748b"
          align="center"
          fontFamily="monospace"
          ellipsis
          wrap="none"
        />
      )}

      {/* Asset count indicator (bottom-left dots) */}
      {hasAssets && (
        <Circle
          x={dotRadius + 3 / scale}
          y={h - dotRadius - 3 / scale}
          radius={dotRadius * 0.8}
          fill="#6366f1"
          opacity={0.7}
        />
      )}
    </Group>
  );
}
