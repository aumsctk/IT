"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { LayerVisibility } from "@/hooks/useFloorPlan";

interface LayerControlsProps {
  layers:      LayerVisibility;
  onToggle:    (key: keyof LayerVisibility) => void;
  seatCounts:  { available: number; occupied: number; maintenance: number };
}

export function LayerControls({ layers, onToggle, seatCounts }: LayerControlsProps) {
  const { locale } = useLanguage();
  const isTh = locale === "th";
  const [open, setOpen] = useState(false);

  const LAYER_DEFS: Array<{ key: keyof LayerVisibility; label: string; dot: string }> = [
    { key: "showVacant",      label: isTh ? "ว่าง"           : "Vacant",        dot: "#22c55e" },
    { key: "showOccupied",    label: isTh ? "มีคนใช้"        : "Occupied",      dot: "#6366f1" },
    { key: "showMaintenance", label: isTh ? "ซ่อมบำรุง"      : "Maintenance",   dot: "#94a3b8" },
    { key: "showBroken",      label: isTh ? "ชำรุด"          : "Broken",        dot: "#ef4444" },
    { key: "showNetwork",     label: isTh ? "พอร์ตเครือข่าย" : "Network Ports", dot: "#06b6d4" },
    { key: "showNames",       label: isTh ? "ชื่อพนักงาน"    : "Employee Names",dot: "#f59e0b" },
  ];

  const countMap: Record<string, number | undefined> = {
    showVacant:      seatCounts.available,
    showOccupied:    seatCounts.occupied,
    showMaintenance: seatCounts.maintenance,
  };

  return (
    <div className="absolute bottom-16 left-3 z-10 md:bottom-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 rounded-xl border border-border bg-card/95",
          "backdrop-blur-sm shadow-lg px-3 py-2 text-xs font-medium transition-colors",
          open ? "text-primary border-primary/30" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Layers size={14} />
        <span>{isTh ? "เลเยอร์" : "Layers"}</span>
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 min-w-[180px] rounded-xl border border-border bg-card shadow-xl p-2 space-y-0.5 animate-fade-in">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isTh ? "การแสดงผล" : "Visibility"}
          </p>
          {LAYER_DEFS.map(({ key, label, dot }) => {
            const active = layers[key];
            const count  = countMap[key];
            return (
              <button
                key={key}
                onClick={() => onToggle(key)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                  "hover:bg-accent"
                )}
              >
                <span
                  className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                  style={{
                    borderColor: active ? dot : "#94a3b8",
                    backgroundColor: active ? dot : "transparent",
                  }}
                />
                <span className="flex-1 text-left">{label}</span>
                {count !== undefined && (
                  <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
                )}
              </button>
            );
          })}

          <div className="border-t border-border mt-1 pt-1">
            <p className="px-2 py-1 text-[10px] text-muted-foreground">

              {isTh ? "Shift+คลิกเพื่อซ่อน/แสดง layer" : "Shift+click to toggle layer"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
