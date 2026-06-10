// @ts-nocheck
/**
 * Seat / Desk Queries
 * Includes strict "available only" views used for allocation dropdowns.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Seat, SeatStatus } from "@/types/database";

type DB = SupabaseClient<Database>;

// ── All seats in a room (for floor plan canvas) ──────────────────
export async function listSeatsInRoom(db: DB, roomId: string) {
  const { data, error } = await db
    .from("seats")
    .select(`
      *,
      profiles:assigned_employee_id ( id, full_name, department, avatar_url ),
      assets   ( id, asset_tag, status, asset_models ( brand, model_name, category ) ),
      switch_ports ( port_label, switch_id, vlans ( name, color_hex ) )
    `)
    .eq("room_id", roomId)
    .eq("is_active", true)
    .order("label");

  if (error) throw error;
  return data ?? [];
}

// ── Available seats for allocation dropdown ──────────────────────
// STRICT: Only returns seats with status='available' AND no employee.
export async function listAvailableSeats(db: DB, branchId?: string) {
  let q = db
    .from("available_seats") // VIEW from Step 1
    .select("*")
    .order("branch_code")
    .order("room_code")
    .order("label");

  if (branchId) q = q.eq("branch_id", branchId);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// ── Single seat with full context ────────────────────────────────
export async function getSeat(db: DB, id: string) {
  const { data, error } = await db
    .from("seats")
    .select(`
      *,
      rooms (
        *,
        zones ( *, branches ( * ) )
      ),
      profiles:assigned_employee_id ( * ),
      assets (
        id, asset_tag, status, condition, photos,
        asset_models ( brand, model_name, category, image_url )
      ),
      switch_ports (
        *,
        network_switches ( name, ip_address ),
        vlans ( vlan_id, name, color_hex, subnet_cidr )
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// ── Create seat ───────────────────────────────────────────────────
export type CreateSeatInput = Pick<
  Seat,
  "room_id" | "label" | "node_type" | "pos_x" | "pos_y" |
  "width_px" | "height_px" | "rotation_deg" | "rj45_wall_port" | "patch_panel_port" | "notes"
>;

export async function createSeat(db: DB, input: CreateSeatInput) {
  const { data, error } = await db
    .from("seats")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Bulk create seats (floor plan builder drops multiple desks) ───
export async function bulkCreateSeats(db: DB, seats: CreateSeatInput[]) {
  const { data, error } = await db
    .from("seats")
    .insert(seats)
    .select();

  if (error) throw error;
  return data ?? [];
}

// ── Update seat position (drag on floor plan) ────────────────────
export async function updateSeatPosition(
  db: DB,
  id: string,
  pos: { pos_x: number; pos_y: number; rotation_deg?: number }
) {
  const { data, error } = await db
    .from("seats")
    .update(pos)
    .eq("id", id)
    .select("id, pos_x, pos_y, rotation_deg")
    .single();

  if (error) throw error;
  return data;
}

// ── Bulk update positions (after multi-select drag) ──────────────
export async function bulkUpdateSeatPositions(
  db: DB,
  updates: Array<{ id: string; pos_x: number; pos_y: number }>
) {
  // Supabase doesn't support bulk update natively — use Promise.all
  return Promise.all(
    updates.map(({ id, pos_x, pos_y }) =>
      updateSeatPosition(db, id, { pos_x, pos_y })
    )
  );
}

// ── Assign employee to seat ───────────────────────────────────────
// Employee's previous seat (if any) is auto-cleared by the DB UNIQUE constraint
export async function assignEmployeeToSeat(
  db: DB,
  seatId: string,
  employeeId: string | null
) {
  const { data, error } = await db
    .from("seats")
    .update({ assigned_employee_id: employeeId })
    .eq("id", seatId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Update seat status ────────────────────────────────────────────
export async function setSeatStatus(db: DB, id: string, status: SeatStatus) {
  const { data, error } = await db
    .from("seats")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Delete (soft) ─────────────────────────────────────────────────
export async function deactivateSeat(db: DB, id: string) {
  const { data, error } = await db
    .from("seats")
    .update({ is_active: false, assigned_employee_id: null })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}