// @ts-nocheck
/**
 * Asset Queries
 * ─────────────────────────────────────────────────────────────────
 * All asset CRUD + filtering helpers.
 * Every function accepts a Supabase client so they work in both
 * Server Components (server client) and Client hooks (browser client).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Asset, AssetStatus, AssetCategory } from "@/types/database";

type DB = SupabaseClient<Database>;

// ── Filters ──────────────────────────────────────────────────────
export interface AssetFilters {
  branch_id?:    string;
  status?:       AssetStatus[];
  category?:     AssetCategory[];
  seat_id?:      string | null;   // null = unassigned only
  search?:       string;
  warranty_expiring_days?: number; // assets expiring within N days
  page?:         number;
  per_page?:     number;
}

// ── List ─────────────────────────────────────────────────────────
export async function listAssets(db: DB, filters: AssetFilters = {}) {
  const {
    branch_id, status, category, seat_id,
    search, warranty_expiring_days,
    page = 1, per_page = 50,
  } = filters;

  let q = db
    .from("assets")
    .select(`
      *,
      asset_models ( brand, model_name, category, image_url ),
      vendors      ( name ),
      seats        (
        id, label, status,
        rooms ( name, code, zones ( name, branches ( name, code ) ) )
      )
    `, { count: "exact" });

  if (branch_id)               q = q.eq("branch_id", branch_id);
  if (status?.length)          q = q.in("status", status);
  if (category?.length)        q = q.in("asset_models.category", category);
  if (seat_id === null)        q = q.is("seat_id", null);
  else if (seat_id)            q = q.eq("seat_id", seat_id);

  if (warranty_expiring_days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + warranty_expiring_days);
    q = q
      .not("warranty_expiry", "is", null)
      .lte("warranty_expiry", cutoff.toISOString().split("T")[0])
      .gte("warranty_expiry", new Date().toISOString().split("T")[0]);
  }

  if (search?.trim()) {
    // Postgres ilike across multiple columns
    const s = `%${search.trim()}%`;
    q = q.or(`asset_tag.ilike.${s},serial_number.ilike.${s},hostname.ilike.${s}`);
  }

  const from = (page - 1) * per_page;
  q = q.range(from, from + per_page - 1).order("created_at", { ascending: false });

  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0, page, per_page };
}

// ── Single asset ─────────────────────────────────────────────────
export async function getAsset(db: DB, id: string) {
  const { data, error } = await db
    .from("assets")
    .select(`
      *,
      asset_models ( *, vendors ( * ) ),
      vendors      ( * ),
      seats        (
        *,
        rooms (
          *,
          zones ( *, branches ( * ) )
        )
      ),
      asset_documents ( * )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// ── Get by asset tag (QR scan result) ────────────────────────────
export async function getAssetByTag(db: DB, tag: string) {
  const { data, error } = await db
    .from("assets")
    .select(`
      *,
      asset_models ( brand, model_name, category ),
      seats        ( id, label, rooms ( name, zones ( name, branches ( name ) ) ) )
    `)
    .eq("asset_tag", tag)
    .single();

  if (error) throw error;
  return data;
}

// ── Create ────────────────────────────────────────────────────────
export type CreateAssetInput = Pick<
  Asset,
  | "asset_tag" | "branch_id" | "model_id" | "serial_number"
  | "status" | "condition" | "purchase_date" | "purchase_price"
  | "currency" | "purchase_order_ref" | "vendor_id"
  | "warranty_expiry" | "lifecycle_end_date" | "is_critical"
  | "mac_address_eth" | "mac_address_wifi" | "ip_address" | "hostname"
  | "notes" | "extra_fields"
>;

export async function createAsset(db: DB, input: CreateAssetInput) {
  const { data, error } = await db
    .from("assets")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Update ───────────────────────────────────────────────────────
export async function updateAsset(db: DB, id: string, input: Partial<Asset>) {
  const { data, error } = await db
    .from("assets")
    .update({ ...input, updated_by: (await db.auth.getUser()).data.user?.id })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Assign asset to seat (1-to-1 enforced by DB UNIQUE constraint) ─
export async function assignAssetToSeat(
  db: DB,
  assetId: string,
  seatId: string | null
) {
  // Uses a DB transaction via Postgres function to be safe
  const { data, error } = await db.rpc("assign_asset_to_seat", {
    p_asset_id: assetId,
    p_seat_id:  seatId,
  });
  if (error) throw error;
  return data;
}

// ── Retire / change status ───────────────────────────────────────
export async function setAssetStatus(db: DB, id: string, status: AssetStatus, reason?: string) {
  return updateAsset(db, id, {
    status,
    ...(status === "idle" ? { seat_id: null } : {}),
    notes: reason,
  });
}

// ── Delete (soft: set status disposed) ──────────────────────────
export async function disposeAsset(db: DB, id: string, reason: string) {
  return setAssetStatus(db, id, "disposed", reason);
}

// ── Add photo URL to asset ────────────────────────────────────────
export async function addAssetPhoto(db: DB, assetId: string, photoUrl: string) {
  // Supabase array append
  const { data: current } = await db
    .from("assets")
    .select("photos")
    .eq("id", assetId)
    .single();

  const photos = [...(current?.photos ?? []), photoUrl];

  return updateAsset(db, assetId, { photos });
}

// ── Remove photo URL ──────────────────────────────────────────────
export async function removeAssetPhoto(db: DB, assetId: string, photoUrl: string) {
  const { data: current } = await db
    .from("assets")
    .select("photos")
    .eq("id", assetId)
    .single();

  const photos = (current?.photos ?? []).filter((p: string) => p !== photoUrl);
  return updateAsset(db, assetId, { photos });
}