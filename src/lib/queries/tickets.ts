// @ts-nocheck
/**
 * Ticket Queries — full lifecycle: create, update, approve, resolve
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Ticket, TicketStatus, TicketType, TicketPriority } from "@/types/database";

type DB = SupabaseClient<Database>;

export interface TicketFilters {
  status?:      TicketStatus[];
  type?:        TicketType[];
  priority?:    TicketPriority[];
  assigned_to?: string;
  created_by?:  string;
  asset_id?:    string;
  branch_id?:   string;
  search?:      string;
  page?:        number;
  per_page?:    number;
}

// ── List ──────────────────────────────────────────────────────────
export async function listTickets(db: DB, filters: TicketFilters = {}) {
  const {
    status, type, priority, assigned_to, created_by,
    asset_id, branch_id, search,
    page = 1, per_page = 40,
  } = filters;

  let q = db
    .from("tickets")
    .select(`
      *,
      creator:created_by  ( id, full_name, avatar_url ),
      assignee:assigned_to( id, full_name, avatar_url ),
      assets              ( id, asset_tag, asset_models ( brand, model_name ) ),
      from_seat:from_seat_id ( id, label, rooms ( name ) ),
      to_seat:to_seat_id     ( id, label, rooms ( name ) )
    `, { count: "exact" });

  if (status?.length)   q = q.in("status", status);
  if (type?.length)     q = q.in("type", type);
  if (priority?.length) q = q.in("priority", priority);
  if (assigned_to)      q = q.eq("assigned_to", assigned_to);
  if (created_by)       q = q.eq("created_by", created_by);
  if (asset_id)         q = q.eq("asset_id", asset_id);
  if (branch_id)        q = q.eq("branch_id", branch_id);
  if (search?.trim()) {
    const s = `%${search.trim()}%`;
    q = q.or(`ticket_number.ilike.${s},title.ilike.${s}`);
  }

  const from = (page - 1) * per_page;
  q = q.range(from, from + per_page - 1).order("created_at", { ascending: false });

  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0, page, per_page };
}

// ── Single ────────────────────────────────────────────────────────
export async function getTicket(db: DB, id: string) {
  const { data, error } = await db
    .from("tickets")
    .select(`
      *,
      creator:created_by   ( * ),
      assignee:assigned_to ( * ),
      assets               ( *, asset_models ( * ) ),
      from_seat:from_seat_id ( *, rooms ( *, zones ( *, branches ( * ) ) ) ),
      to_seat:to_seat_id     ( *, rooms ( *, zones ( *, branches ( * ) ) ) ),
      ticket_comments ( *, author:author_id ( id, full_name, avatar_url ) )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// ── Create ────────────────────────────────────────────────────────
export type CreateTicketInput = Pick<
  Ticket,
  | "type" | "priority" | "title" | "description"
  | "asset_id" | "seat_id" | "branch_id"
  | "from_seat_id" | "to_seat_id"
  | "due_date" | "attachments"
>;

export async function createTicket(db: DB, input: CreateTicketInput) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await db
    .from("tickets")
    .insert({ ...input, created_by: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Update ────────────────────────────────────────────────────────
export async function updateTicket(db: DB, id: string, input: Partial<Ticket>) {
  const { data, error } = await db
    .from("tickets")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Workflow transitions ──────────────────────────────────────────
export async function assignTicket(db: DB, id: string, userId: string) {
  return updateTicket(db, id, { assigned_to: userId, status: "in_progress" });
}

export async function approveTicket(db: DB, id: string) {
  const { data: { user } } = await db.auth.getUser();
  return updateTicket(db, id, {
    status: "resolved",
    approved_by: user?.id,
    approved_at: new Date().toISOString(),
  });
}

export async function rejectTicket(db: DB, id: string, reason: string) {
  return updateTicket(db, id, {
    status: "rejected",
    rejection_reason: reason,
  });
}

export async function resolveTicket(db: DB, id: string, notes: string) {
  return updateTicket(db, id, {
    status: "resolved",
    resolution_notes: notes,
    resolved_at: new Date().toISOString(),
  });
}

export async function closeTicket(db: DB, id: string) {
  return updateTicket(db, id, {
    status: "closed",
    closed_at: new Date().toISOString(),
  });
}

// ── Comments ──────────────────────────────────────────────────────
export async function addComment(
  db: DB,
  ticketId: string,
  body: string,
  isInternal = false,
  attachments: string[] = []
) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await db
    .from("ticket_comments")
    .insert({ ticket_id: ticketId, author_id: user.id, body, is_internal: isInternal, attachments })
    .select(`*, author:author_id ( id, full_name, avatar_url )`)
    .single();

  if (error) throw error;
  return data;
}