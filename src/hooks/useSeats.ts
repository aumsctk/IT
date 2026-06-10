// @ts-nocheck
"use client";

/**
 * useSeats — Real-time seats for a room (floor plan canvas)
 * The hook drives the floor plan: any INSERT/UPDATE/DELETE on seats
 * immediately re-renders the canvas without a full page refresh.
 */

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { listSeatsInRoom, listAvailableSeats } from "@/lib/queries/seats";

export function useRoomSeats(roomId: string | null) {
  const supabase   = getSupabaseBrowser();
  const [seats, setSeats]         = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!roomId) return;
    setIsLoading(true);
    const data = await listSeatsInRoom(supabase, roomId);
    setSeats(data);
    setIsLoading(false);
  }, [roomId, supabase]);

  useEffect(() => { fetch(); }, [fetch]);

  // Real-time subscription scoped to this room
  useEffect(() => {
    if (!roomId) return;
    const ch = supabase
      .channel(`seats-room-${roomId}`)
      .on("postgres_changes" as any, {
        event:  "*",
        schema: "public",
        table:  "seats",
        filter: `room_id=eq.${roomId}`,
      }, (payload: any) => {
        const { eventType, new: newRow, old: oldRow } = payload;

        if (eventType === "INSERT") {
          setSeats((prev) => [...prev, newRow]);
        }
        if (eventType === "UPDATE") {
          setSeats((prev) =>
            prev.map((s) => (s.id === newRow.id ? { ...s, ...newRow } : s))
          );
        }
        if (eventType === "DELETE") {
          setSeats((prev) => prev.filter((s) => s.id !== oldRow.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [roomId, supabase]);

  return { seats, setSeats, isLoading, refetch: fetch };
}

// ── Available seats for allocation dropdown (live) ────────────────
export function useAvailableSeats(branchId?: string) {
  const supabase = getSupabaseBrowser();
  const [seats, setSeats]         = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    const data = await listAvailableSeats(supabase, branchId);
    setSeats(data);
    setIsLoading(false);
  }, [branchId, supabase]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    const ch = supabase
      .channel("available-seats-watch")
      .on("postgres_changes" as any, {
        event:  "UPDATE",
        schema: "public",
        table:  "seats",
      }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch, supabase]);

  return { seats, isLoading, refetch: fetch };
}