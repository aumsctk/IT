// @ts-nocheck
"use client";

/**
 * FloorPlanPageClient — Client wrapper for the floor plan page.
 * Renders the room/branch picker sidebar + the main canvas.
 *
 * Layout (desktop):
 *  ┌─────────────┬─────────────────────────────────┐
 *  │  Room list  │        FloorPlanView             │
 *  │  (sidebar)  │                                 │
 *  └─────────────┴─────────────────────────────────┘
 *
 * Mobile: room picker is a dropdown at the top.
 */

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Map, ChevronDown, Upload, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloorPlanView } from "./FloorPlanView";
import { uploadFloorPlan } from "@/lib/storage";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Room {
  id:            string;
  name:          string;
  code:          string;
  floor_plan_url: string | null;
  plan_width_px:  number | null;
  plan_height_px: number | null;
  zones:         any;
}

interface FloorPlanPageClientProps {
  branches:       Array<{ id: string; name: string; code: string }>;
  rooms:          Room[];
  room:           Room | null;
  canEdit:        boolean;
  initialBranchId?: string;
}

export function FloorPlanPageClient({
  branches, rooms, room: initialRoom, canEdit, initialBranchId,
}: FloorPlanPageClientProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = getSupabaseBrowser();

  const [selectedRoom, setSelectedRoom]   = useState<Room | null>(initialRoom);
  const [branchId,     setBranchId]       = useState(initialBranchId ?? "");
  const [uploading,    setUploading]      = useState(false);

  const filteredRooms = rooms.filter(
    (r) => !branchId || (r.zones?.branches?.id === branchId)
  );

  const navigate = useCallback(
    (roomId: string) => {
      const room = rooms.find((r) => r.id === roomId) ?? null;
      setSelectedRoom(room);
      const params = new URLSearchParams(searchParams.toString());
      params.set("room_id", roomId);
      params.delete("seat");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [rooms, router, searchParams]
  );

  async function handleBlueprintUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedRoom) return;
    setUploading(true);
    try {
      const url = await uploadFloorPlan(supabase, selectedRoom.id, file);
      await supabase
        .from("rooms")
        .update({ floor_plan_url: url })
        .eq("id", selectedRoom.id);
      setSelectedRoom((prev) => prev ? { ...prev, floor_plan_url: url } : prev);
      toast.success("Blueprint uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  // ── Group rooms by zone / floor ───────────────────────────────
  const grouped = filteredRooms.reduce<Record<string, Room[]>>((acc, r) => {
    const key = r.zones?.name ?? "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Room Sidebar (desktop) ── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-card overflow-y-auto">
        {/* Branch picker */}
        <div className="p-3 border-b border-border">
          <select
            value={branchId}
            onChange={(e) => { setBranchId(e.target.value); }}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
            ))}
          </select>
        </div>

        {/* Room list */}
        <div className="flex-1 py-2">
          {Object.entries(grouped).map(([zone, zoneRooms]) => (
            <div key={zone}>
              <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {zone}
              </p>
              {zoneRooms.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(r.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
                    selectedRoom?.id === r.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Map size={13} className="shrink-0" />
                  <span className="truncate">{r.name}</span>
                  {r.floor_plan_url && (
                    <Check size={10} className="ml-auto shrink-0 text-green-500" />
                  )}
                </button>
              ))}
            </div>
          ))}
          {filteredRooms.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">No rooms found</p>
          )}
        </div>

        {/* Blueprint upload */}
        {canEdit && selectedRoom && (
          <div className="border-t border-border p-3">
            <label className={cn(
              "flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-border px-3 py-2",
              "text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors",
              uploading && "opacity-50 pointer-events-none"
            )}>
              <Upload size={13} />
              {uploading ? "Uploading…" : "Upload Blueprint"}
              <input type="file" accept="image/*,.pdf,.svg" className="hidden" onChange={handleBlueprintUpload} />
            </label>
          </div>
        )}
      </aside>

      {/* ── Mobile room picker dropdown ── */}
      <div className="md:hidden absolute top-14 inset-x-0 z-10 bg-card border-b border-border px-4 py-2">
        <select
          value={selectedRoom?.id ?? ""}
          onChange={(e) => navigate(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none"
        >
          <option value="">— Select a room —</option>
          {filteredRooms.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* ── Main canvas area ── */}
      <div className="flex flex-1 flex-col overflow-hidden mt-10 md:mt-0">
        {selectedRoom ? (
          <FloorPlanView
            roomId={selectedRoom.id}
            planWidth={selectedRoom.plan_width_px ?? 1200}
            planHeight={selectedRoom.plan_height_px ?? 800}
            blueprintUrl={selectedRoom.floor_plan_url}
            canEdit={canEdit}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Map size={40} strokeWidth={1} />
            <p className="text-sm">Select a room to view the floor plan</p>
          </div>
        )}
      </div>
    </div>
  );
}