// @ts-nocheck
/**
 * Dashboard Queries — aggregated stats for KPI cards & charts.
 * All queries use server-side Supabase client (no RLS bypass needed
 * — users only see data their role permits).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type DB = SupabaseClient<Database>;

// ── KPI counts ────────────────────────────────────────────────────
export async function getKpiCounts(db: DB, branchId?: string) {
  const base = branchId
    ? (table: string) => (db.from(table as any) as any).eq("branch_id", branchId)
    : (table: string) => db.from(table as any);

  const [
    { count: totalAssets },
    { count: activeAssets },
    { count: idleAssets },
    { count: underRepair },
    { count: openTickets },
    { count: totalSeats },
    { count: occupiedSeats },
  ] = await Promise.all([
    base("assets").select("*", { count: "exact", head: true }),
    base("assets").select("*", { count: "exact", head: true }).eq("status", "in_use"),
    base("assets").select("*", { count: "exact", head: true }).eq("status", "idle").is("seat_id", null),
    base("assets").select("*", { count: "exact", head: true }).eq("status", "returned"),
    db.from("tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
    db.from("seats").select("*", { count: "exact", head: true }).eq("is_active", true),
    db.from("seats").select("*", { count: "exact", head: true }).eq("status", "occupied"),
  ]);

  return {
    totalAssets:   totalAssets  ?? 0,
    activeAssets:  activeAssets ?? 0,
    idleAssets:    idleAssets   ?? 0,
    underRepair:   underRepair  ?? 0,
    openTickets:   openTickets  ?? 0,
    totalSeats:    totalSeats   ?? 0,
    occupiedSeats: occupiedSeats ?? 0,
    occupancyPct:  totalSeats ? Math.round(((occupiedSeats ?? 0) / totalSeats) * 100) : 0,
  };
}

// ── Warranty expiry timeline (next 12 months) ─────────────────────
// Returns monthly buckets: { month: "Jan 25", count: 4, critical: 1 }
export async function getWarrantyTimeline(db: DB, branchId?: string) {
  const today  = new Date();
  const cutoff = new Date(today);
  cutoff.setMonth(cutoff.getMonth() + 12);

  let q = db
    .from("assets")
    .select("warranty_expiry, is_critical")
    .not("warranty_expiry", "is", null)
    .not("status", "in", '("returned","lost")')
    .lte("warranty_expiry", cutoff.toISOString().split("T")[0])
    .order("warranty_expiry");

  if (branchId) q = (q as any).eq("branch_id", branchId);
  const { data } = await q;

  // Group by month
  const buckets: Record<string, { month: string; expiring: number; critical: number; expired: number }> = {};

  // Pre-fill 13 months (0 = this month already-expired, 1-12 = upcoming)
  for (let i = -1; i < 12; i++) {
    const d   = new Date(today);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    buckets[key] = { month: label, expiring: 0, critical: 0, expired: 0 };
  }

  (data ?? []).forEach((row) => {
    if (!row.warranty_expiry) return;
    const d   = new Date(row.warranty_expiry);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!buckets[key]) return;
    if (d < today) {
      buckets[key].expired++;
    } else {
      buckets[key].expiring++;
      if (row.is_critical) buckets[key].critical++;
    }
  });

  return Object.values(buckets);
}

// ── Asset count by category ───────────────────────────────────────
export async function getAssetsByCategory(db: DB, branchId?: string) {
  let q = db
    .from("assets")
    .select("asset_models(category)")
    .not("status", "in", '("returned","lost")');

  if (branchId) q = (q as any).eq("branch_id", branchId);
  const { data } = await q;

  const counts: Record<string, number> = {};
  (data ?? []).forEach((row: any) => {
    const cat = row.asset_models?.category ?? "other";
    counts[cat] = (counts[cat] ?? 0) + 1;
  });

  const LABELS: Record<string, string> = {
    computer:       "Computer",
    laptop:         "Laptop",
    monitor:        "Monitor",
    printer:        "Printer",
    network_device: "Network",
    ups:            "UPS",
    phone:          "Phone",
    peripheral:     "Peripheral",
    server:         "Server",
    other:          "Other",
  };

  return Object.entries(counts)
    .map(([cat, count]) => ({ category: cat, label: LABELS[cat] ?? cat, count }))
    .sort((a, b) => b.count - a.count);
}

// ── Asset status breakdown ────────────────────────────────────────
export async function getAssetsByStatus(db: DB, branchId?: string) {
  let q = db.from("assets").select("status");
  if (branchId) q = (q as any).eq("branch_id", branchId);
  const { data } = await q;

  const counts: Record<string, number> = {};
  (data ?? []).forEach((row) => {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  });

  const CONFIG: Record<string, { label: string; color: string }> = {
    active:       { label: "Active",       color: "#22c55e" },
    idle:         { label: "Idle",         color: "#6366f1" },
    under_repair: { label: "Under Repair", color: "#f59e0b" },
    retired:      { label: "Retired",      color: "#94a3b8" },
    lost:         { label: "Lost",         color: "#ec4899" },
    disposed:     { label: "Disposed",     color: "#ef4444" },
  };

  return Object.entries(counts).map(([status, count]) => ({
    status,
    label: CONFIG[status]?.label ?? status,
    color: CONFIG[status]?.color ?? "#94a3b8",
    count,
  }));
}

// ── Recent tickets ────────────────────────────────────────────────
export async function getRecentTickets(db: DB, limit = 5) {
  const { data } = await db
    .from("tickets")
    .select("id, ticket_number, title, status, priority, type, created_at, creator:created_by(full_name)")
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

// ── Assets expiring within 30 days ───────────────────────────────
export async function getExpiringAssets(db: DB, branchId?: string, days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  let q = db
    .from("assets")
    .select("id, asset_tag, warranty_expiry, is_critical, asset_models(brand, model_name)")
    .not("warranty_expiry", "is", null)
    .lte("warranty_expiry", cutoff.toISOString().split("T")[0])
    .not("status", "in", '("returned","lost")')
    .order("warranty_expiry");

  if (branchId) q = (q as any).eq("branch_id", branchId);
  const { data } = await q;
  return data ?? [];
}