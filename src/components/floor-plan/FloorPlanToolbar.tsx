"use client";

import { MousePointer2, Hand, PenLine, ZoomIn, ZoomOut, Maximize2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { ToolMode } from "@/hooks/useFloorPlan";

interface FloorPlanToolbarProps {
  tool:        ToolMode;
  onToolChange:(t: ToolMode) => void;
  onZoomIn:    () => void;
  onZoomOut:   () => void;
  onFit:       () => void;
  onAddDesk:   () => void;
  scale:       number;
  canEdit:     boolean;
}

export function FloorPlanToolbar({
  tool, onToolChange, onZoomIn, onZoomOut, onFit, onAddDesk, scale, canEdit,
}: FloorPlanToolbarProps) {
  const { locale } = useLanguage();
  const isTh = locale === "th";

  const TOOLS: Array<{ mode: ToolMode; icon: React.ElementType; label: string }> = [
    { mode: "select", icon: MousePointer2, label: isTh ? "เลือก (V)" : "Select (V)" },
    { mode: "pan",    icon: Hand,          label: isTh ? "เลื่อน (H)" : "Pan (H)"  },
    { mode: "draw",   icon: PenLine,       label: isTh ? "วางโต๊ะ (D)" : "Place Desk (D)" },
  ];

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-xl border border-border bg-card/95 backdrop-blur-sm shadow-lg px-1.5 py-1.5">
      <div className="flex items-center gap-0.5">
        {TOOLS.map(({ mode, icon: Icon, label }) => (
          (!canEdit && mode === "draw") ? null : (
            <ToolBtn key={mode} active={tool === mode} title={label} onClick={() => onToolChange(mode)}>
              <Icon size={16} />
            </ToolBtn>
          )
        ))}
      </div>

      <Divider />

      <div className="flex items-center gap-0.5">
        <ToolBtn onClick={onZoomOut} title={isTh ? "ย่อ (-)" : "Zoom Out (-)"}>
          <ZoomOut size={16} />
        </ToolBtn>
        <span className="min-w-[46px] text-center text-xs font-mono font-medium text-muted-foreground tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <ToolBtn onClick={onZoomIn} title={isTh ? "ขยาย (+)" : "Zoom In (+)"}>
          <ZoomIn size={16} />
        </ToolBtn>
        <ToolBtn onClick={onFit} title={isTh ? "พอดีหน้าจอ (F)" : "Fit to screen (F)"}>
          <Maximize2 size={16} />
        </ToolBtn>
      </div>

      {canEdit && (
        <>
          <Divider />
          <ToolBtn
            onClick={onAddDesk}
            title={isTh ? "เพิ่มโต๊ะ" : "Add Desk"}
            className="gap-1 px-2.5 text-xs font-medium text-primary"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">{isTh ? "เพิ่มโต๊ะ" : "Add Desk"}</span>
          </ToolBtn>
        </>
      )}
    </div>
  );
}

function ToolBtn({
  children, active, onClick, title, className,
}: {
  children:  React.ReactNode;
  active?:   boolean;
  onClick:   () => void;
  title?:    string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-8 items-center justify-center rounded-lg px-2 transition-colors",
        "text-muted-foreground hover:text-foreground hover:bg-accent",
        active && "bg-primary bg-accent text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-0.5 h-5 w-px bg-border" />;
}
