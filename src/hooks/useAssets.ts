// @ts-nocheck
"use client";

/**
 * useAssets — Asset list with real-time updates & filtering
 * ─────────────────────────────────────────────────────────────────
 * Fetches assets from Supabase and subscribes to live changes.
 * Uses the strict "available_assets" view when unassigned_only=true
 * so dropdowns NEVER show already-assigned assets.
 */

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { listAssets, type AssetFilters } from "@/lib/queries/assets";
import { useRealtimeTable } from "./useRealtimeTable";
import type { Asset } from "@/types/database";

interface UseAssetsOptions extends AssetFilters {
  /** If true, uses available_assets view (seat_id IS NULL) */
  unassigned_only?: boolean;
  /** Auto-fetch on mount. Default true. */
  autoFetch?: boolean;
}

export function useAssets(options: UseAssetsOptions = {}) {
  const { unassigned_only, autoFetch = true, ...filters } = options;
  const supabase = getSupabaseBrowser();

  const [assets,     setAssets]     = useState<Asset[]>([]);
  const [total,      setTotal]      = useState(0);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const fetch = useCallback(async (overrides?: Partial<AssetFilters>) => {
    setIsLoading(true);
    setError(null);
    try {
      const merged = { ...filters, ...overrides, ...(unassigned_only ? { seat_id: null } : {}) };
      const result = await listAssets(supabase, merged);
      setAssets(result.data as Asset[]);
      setTotal(result.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(filters), unassigned_only]); // eslint-disable-line

  useEffect(() => {
    if (autoFetch) fetch();
  }, [autoFetch, fetch]);

  // Real-time: when any asset in the branch changes, refetch
  // (simpler than trying to merge complex joined rows)
  useEffect(() => {
    const channel = supabase
      .channel("assets-realtime")
      .on("postgres_changes" as any, {
        event:  "*",
        schema: "public",
        table:  "assets",
        ...(filters.branch_id ? { filter: `branch_id=eq.${filters.branch_id}` } : {}),
      }, () => {
        // Soft refresh — only if not already loading
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [filters.branch_id]); // eslint-disable-line

  return { assets, total, isLoading, error, refetch: fetch };
}

// ── Lightweight hook for allocation dropdowns ─────────────────────
// Returns ONLY unassigned assets. Updates live.
export function useAvailableAssets(branchId?: string) {
  const supabase = getSupabaseBrowser();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    let q = supabase
      .from("available_assets")
      .select("id, asset_tag, status, asset_models(brand, model_name, category)")
      .order("asset_tag");

    if (branchId) q = (q as any).eq("branch_id", branchId);

    const { data } = await q;
    setAssets((data ?? []) as unknown as Asset[]);
    setIsLoading(false);
  }, [branchId, supabase]);

  useEffect(() => { fetch(); }, [fetch]);

  // Live update when any asset seat_id changes
  useEffect(() => {
    const ch = supabase
      .channel("available-assets-watch")
      .on("postgres_changes" as any, {
        event: "UPDATE", schema: "public", table: "assets",
      }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch, supabase]);

  return { assets, isLoading, refetch: fetch };
}