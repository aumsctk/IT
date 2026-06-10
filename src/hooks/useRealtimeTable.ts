"use client";

/**
 * useRealtimeTable — Generic Supabase Realtime hook
 * ─────────────────────────────────────────────────────────────────
 * Subscribes to INSERT / UPDATE / DELETE on any table and merges
 * changes into local state so the UI stays live without polling.
 *
 * Usage:
 *   const { rows, isLoading } = useRealtimeTable<Seat>({
 *     table:       "seats",
 *     initialData: serverFetchedSeats,
 *     filter:      `room_id=eq.${roomId}`,
 *   });
 */

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeTableOptions<T extends { id: string }> {
  /** Supabase table name */
  table:        string;
  /** Initial data (e.g. from server-side fetch) */
  initialData?: T[];
  /** Supabase filter string, e.g. `room_id=eq.abc123` */
  filter?:      string;
  /** Called when a row is inserted — return false to suppress default merge */
  onInsert?:    (row: T) => boolean | void;
  /** Called when a row is updated */
  onUpdate?:    (row: T) => boolean | void;
  /** Called when a row is deleted */
  onDelete?:    (row: T) => boolean | void;
}

export function useRealtimeTable<T extends { id: string }>({
  table,
  initialData = [],
  filter,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeTableOptions<T>) {
  const [rows, setRows]           = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase   = getSupabaseBrowser();

  // Sync initial data changes from server (e.g. router.refresh)
  useEffect(() => { setRows(initialData); }, [JSON.stringify(initialData)]); // eslint-disable-line

  useEffect(() => {
    // Build channel with optional filter
    const channelName = `realtime:${table}:${filter ?? "all"}`;
    const channel = supabase.channel(channelName);

    const cfg: Parameters<typeof channel.on>[1] = {
      event:  "*",
      schema: "public",
      table,
      ...(filter ? { filter } : {}),
    };

    channel.on("postgres_changes" as any, cfg, (payload: any) => {
      const { eventType, new: newRow, old: oldRow } = payload;

      if (eventType === "INSERT") {
        const suppress = onInsert?.(newRow as T);
        if (suppress !== false) {
          setRows((prev) => [newRow as T, ...prev]);
        }
      }

      if (eventType === "UPDATE") {
        const suppress = onUpdate?.(newRow as T);
        if (suppress !== false) {
          setRows((prev) =>
            prev.map((r) => (r.id === (newRow as T).id ? (newRow as T) : r))
          );
        }
      }

      if (eventType === "DELETE") {
        const suppress = onDelete?.(oldRow as T);
        if (suppress !== false) {
          setRows((prev) => prev.filter((r) => r.id !== (oldRow as T).id));
        }
      }
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter]); // eslint-disable-line

  return { rows, setRows, isLoading, setIsLoading };
}
