import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Asset, Ticket, Employee, TicketComment, AuditSession, AuditItem } from "@/lib/localDB";

const sb = () => getSupabaseBrowser() as any;

// ── ASSETS ──────────────────────────────────────────────────────
export const assetDB = {
  async getAll(): Promise<Asset[]> {
    const { data, error } = await sb().from("assets").select("*").order("created_at", { ascending: false });
    if (error) { console.error("assetDB.getAll:", error); return []; }
    return (data ?? []) as Asset[];
  },
  async getById(id: string): Promise<Asset | null> {
    const { data } = await sb().from("assets").select("*").eq("id", id).single();
    return (data as Asset) ?? null;
  },
  async create(d: Omit<Asset,"id"|"created_at"|"updated_at">): Promise<Asset> {
    const { data, error } = await sb().from("assets").insert(d).select().single();
    if (error) throw error;
    return data as Asset;
  },
  async update(id: string, d: Partial<Asset>): Promise<Asset | null> {
    const { data, error } = await sb().from("assets").update(d).eq("id", id).select().single();
    if (error) throw error;
    return data as Asset;
  },
  async delete(id: string): Promise<void> {
    await sb().from("assets").delete().eq("id", id);
  },
  async filter({ search="", status="", category="", branch_id="" } = {}): Promise<Asset[]> {
    let q = sb().from("assets").select("*");
    if (status)    q = q.eq("status", status);
    if (category)  q = q.eq("category", category);
    if (branch_id) q = q.eq("branch_id", branch_id);
    const { data } = await q.order("created_at", { ascending: false });
    let result = (data ?? []) as Asset[];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(a =>
        [a.asset_tag,a.serial_number,a.brand,a.model_name,a.hostname,a.ip_address]
          .some(v => v?.toLowerCase().includes(s))
      );
    }
    return result;
  },
};

// ── TICKETS ──────────────────────────────────────────────────────
export const ticketDB = {
  async getAll(): Promise<Ticket[]> {
    const { data } = await sb().from("tickets").select("*").order("created_at", { ascending: false });
    return (data ?? []) as Ticket[];
  },
  async getById(id: string): Promise<Ticket | null> {
    const { data } = await sb().from("tickets").select("*").eq("id", id).single();
    return (data as Ticket) ?? null;
  },
  async create(d: Omit<Ticket,"id"|"ticket_number"|"created_at"|"updated_at">): Promise<Ticket> {
    // Generate ticket number
    const year = new Date().getFullYear();
    const { count } = await sb().from("tickets").select("*", { count: "exact", head: true });
    const num = String((count ?? 0) + 1).padStart(4, "0");
    const ticket_number = `TKT-${year}-${num}`;
    const { data, error } = await sb().from("tickets").insert({ ...d, ticket_number }).select().single();
    if (error) throw error;
    return data as Ticket;
  },
  async update(id: string, d: Partial<Ticket>): Promise<Ticket> {
    const { data, error } = await sb().from("tickets").update(d).eq("id", id).select().single();
    if (error) throw error;
    return data as Ticket;
  },
  async filter({ search="", status="", type="", priority="" } = {}): Promise<Ticket[]> {
    let q = sb().from("tickets").select("*");
    if (status)   q = q.eq("status", status);
    if (type)     q = q.eq("type", type);
    if (priority) q = q.eq("priority", priority);
    const { data } = await q.order("created_at", { ascending: false });
    let result = (data ?? []) as Ticket[];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(t =>
        [t.title,t.ticket_number,t.asset_tag,t.reporter_name].some(v => v?.toLowerCase().includes(s))
      );
    }
    return result;
  },
  async getComments(ticketId: string): Promise<TicketComment[]> {
    const { data } = await sb().from("ticket_comments").select("*")
      .eq("ticket_id", ticketId).order("created_at", { ascending: true });
    return (data ?? []) as TicketComment[];
  },
  async addComment(ticketId: string, body: string, isInternal: boolean, authorName: string): Promise<TicketComment> {
    const { data, error } = await sb().from("ticket_comments")
      .insert({ ticket_id: ticketId, body, is_internal: isInternal, author_name: authorName })
      .select().single();
    if (error) throw error;
    return data as TicketComment;
  },
};

// ── EMPLOYEES ────────────────────────────────────────────────────
export const employeeDB = {
  async getAll(): Promise<Employee[]> {
    const { data } = await sb().from("employees").select("*").order("full_name");
    return (data ?? []) as Employee[];
  },
  async getById(id: string): Promise<Employee | null> {
    const { data } = await sb().from("employees").select("*").eq("id", id).single();
    return (data as Employee) ?? null;
  },
  async create(d: Omit<Employee,"id">): Promise<Employee> {
    const { data, error } = await sb().from("employees").insert(d).select().single();
    if (error) throw error;
    return data as Employee;
  },
  async update(id: string, d: Partial<Employee>): Promise<Employee> {
    const { data, error } = await sb().from("employees").update(d).eq("id", id).select().single();
    if (error) throw error;
    return data as Employee;
  },
  async remove(id: string): Promise<void> {
    await sb().from("employees").delete().eq("id", id);
  },
  async filter({ search="", department="", branch="", status="" } = {}): Promise<Employee[]> {
    let q = sb().from("employees").select("*");
    if (department) q = q.eq("department", department);
    if (branch)     q = q.eq("branch", branch);
    if (status)     q = q.eq("status", status);
    const { data } = await q.order("full_name");
    let result = (data ?? []) as Employee[];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(e =>
        [e.full_name,e.emp_code,e.email,e.department,e.position].some(v => v?.toLowerCase().includes(s))
      );
    }
    return result;
  },
};

// ── AUDIT ─────────────────────────────────────────────────────────
export const auditDB = {
  async getSessions(): Promise<AuditSession[]> {
    const { data } = await sb().from("audit_sessions").select("*").order("started_at", { ascending: false });
    return (data ?? []) as AuditSession[];
  },
  async getSession(id: string): Promise<AuditSession | null> {
    const { data } = await sb().from("audit_sessions").select("*").eq("id", id).single();
    return (data as AuditSession) ?? null;
  },
  async createSession(name: string, notes = ""): Promise<AuditSession> {
    const { data, error } = await sb().from("audit_sessions").insert({ name, notes }).select().single();
    if (error) throw error;
    return data as AuditSession;
  },
  async completeSession(id: string, summary: AuditSession["summary_json"]): Promise<AuditSession> {
    const { data, error } = await sb().from("audit_sessions")
      .update({ is_complete: true, completed_at: new Date().toISOString(), summary_json: summary })
      .eq("id", id).select().single();
    if (error) throw error;
    return data as AuditSession;
  },
  async deleteSession(id: string): Promise<void> {
    await sb().from("audit_sessions").delete().eq("id", id);
  },
  async getItems(sessionId: string): Promise<AuditItem[]> {
    const { data } = await sb().from("audit_items").select("*")
      .eq("session_id", sessionId).order("scanned_at", { ascending: false });
    return (data ?? []) as AuditItem[];
  },
  async addItem(sessionId: string, assetTagScanned: string, assetId: string | null,
    finding: AuditItem["finding"], notes: string | null = null): Promise<AuditItem> {
    const { data, error } = await sb().from("audit_items")
      .insert({ session_id: sessionId, asset_tag_scanned: assetTagScanned, asset_id: assetId, finding, notes })
      .select().single();
    if (error) throw error;
    return data as AuditItem;
  },
  async addMissingItems(sessionId: string, assets: { id: string; asset_tag: string }[]): Promise<void> {
    const rows = assets.map(a => ({
      session_id: sessionId, asset_tag_scanned: a.asset_tag,
      asset_id: a.id, finding: "missing" as const,
    }));
    await sb().from("audit_items").insert(rows);
  },
};

// ── FLOOR PLAN ────────────────────────────────────────────────────
export const floorPlanDB = {
  async get(floorKey: string): Promise<Record<string,unknown> | null> {
    const { data } = await sb().from("floor_plan_data").select("data").eq("floor_key", floorKey).single();
    return (data?.data as Record<string,unknown>) ?? null;
  },
  async upsert(floorKey: string, data: unknown): Promise<void> {
    await sb().from("floor_plan_data").upsert({ floor_key: floorKey, data, updated_at: new Date().toISOString() });
  },
};

// ── DASHBOARD STATS ───────────────────────────────────────────────
export async function getDashboardStats() {
  const [assets, tickets, employees] = await Promise.all([
    assetDB.getAll(),
    ticketDB.getAll(),
    employeeDB.getAll(),
  ]);
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 86400000).toISOString().split("T")[0];
  return {
    totalAssets:    assets.length,
    activeAssets:   assets.filter(a => a.status === "in_use").length,
    idleAssets:     assets.filter(a => a.status === "idle").length,
    underRepair:    assets.filter(a => a.status === "under_repair").length,
    openTickets:    tickets.filter(t => ["open","in_progress","pending_approval"].includes(t.status)).length,
    criticalTickets:tickets.filter(t => t.priority === "critical" && t.status !== "closed").length,
    activeEmployees:employees.filter(e => e.status === "active").length,
    warrantyExpiring: assets.filter(a =>
      a.warranty_expiry && a.warranty_expiry <= soon && a.warranty_expiry >= now.toISOString().split("T")[0]
    ),
    recentTickets: tickets.slice(0, 5),
  };
}

// ── UTILITIES ─────────────────────────────────────────────────────
export async function removeAssetTagFromFloorPlan(assetTag: string): Promise<void> {
  // Update all floor plans that reference this asset tag
  const { data } = await sb().from("floor_plan_data").select("floor_key, data");
  if (!data) return;
  for (const row of data) {
    const floorData = row.data as Record<string, unknown>;
    if (!floorData?.seats) continue;
    const seats = floorData.seats as { asset_tags?: string[] }[];
    let changed = false;
    const updated = seats.map(seat => {
      if (!seat.asset_tags?.includes(assetTag)) return seat;
      changed = true;
      return { ...seat, asset_tags: seat.asset_tags.filter((t: string) => t !== assetTag) };
    });
    if (changed) {
      await sb().from("floor_plan_data").update({ data: { ...floorData, seats: updated } }).eq("floor_key", row.floor_key);
    }
  }
}

// ── FLOOR PLAN (Supabase — sync ทุกเครื่อง) ──────────────────────
// 1 แถวต่อ 1 พื้นที่: floor_key = floor id, data = { label, order, zones, seats }
export const floorplanDB = {
  async getAll(): Promise<{ floors: { id: string; label: string }[]; data: Record<string, { zones: unknown[]; seats: unknown[] }> } | null> {
    const { data, error } = await sb().from("floor_plan_data").select("floor_key, data");
    if (error) throw error;
    const rows = (data ?? []).filter((r: { data?: { zones?: unknown; seats?: unknown } }) => r.data && (r.data.zones || r.data.seats));
    if (rows.length === 0) return null;
    rows.sort((a: { data: { order?: number } }, b: { data: { order?: number } }) => (a.data.order ?? 0) - (b.data.order ?? 0));
    const floors = rows.map((r: { floor_key: string; data: { label?: string } }) => ({ id: r.floor_key, label: r.data.label ?? r.floor_key }));
    const map: Record<string, { zones: unknown[]; seats: unknown[] }> = {};
    rows.forEach((r: { floor_key: string; data: { zones?: unknown[]; seats?: unknown[] } }) => {
      map[r.floor_key] = { zones: r.data.zones ?? [], seats: r.data.seats ?? [] };
    });
    return { floors, data: map };
  },
  async saveAll(
    floors: { id: string; label: string }[],
    data: Record<string, { zones: unknown[]; seats: unknown[] }>
  ): Promise<void> {
    const rows = floors.map((f, i) => ({
      floor_key: f.id,
      data: { label: f.label, order: i, zones: data[f.id]?.zones ?? [], seats: data[f.id]?.seats ?? [] },
    }));
    const { error } = await sb().from("floor_plan_data").upsert(rows, { onConflict: "floor_key" });
    if (error) throw error;
    // ลบพื้นที่ที่ถูกเอาออก (ข้าม key พิเศษที่ขึ้นต้นด้วย "_")
    const keep = new Set(floors.map(f => f.id));
    const { data: all } = await sb().from("floor_plan_data").select("floor_key");
    const stale = (all ?? [])
      .map((r: { floor_key: string }) => r.floor_key)
      .filter((k: string) => !keep.has(k) && !k.startsWith("_"));
    if (stale.length) await sb().from("floor_plan_data").delete().in("floor_key", stale);
  },
};

// ── SURVEY ROUNDS (รอบสำรวจผู้ถือครอง) ──────────────────────────
// เก็บใน floor_plan_data row พิเศษ floor_key = "_survey_rounds"
// (ใช้ตารางเดิม — ไม่ต้องสร้างตารางใหม่)
const SURVEY_KEY = "_survey_rounds";
export type SurveyRoundRow = {
  id: string; no: number;
  started_at: string; closed_at: string | null;
  results: Record<string, unknown>; items: unknown[] | null;
};
export const surveyDB = {
  async getAll(): Promise<SurveyRoundRow[]> {
    const { data, error } = await sb()
      .from("floor_plan_data").select("data").eq("floor_key", SURVEY_KEY).maybeSingle();
    if (error) throw error;
    return ((data?.data as { rounds?: SurveyRoundRow[] })?.rounds ?? []) as SurveyRoundRow[];
  },
  async saveAll(rounds: SurveyRoundRow[]): Promise<void> {
    const { error } = await sb()
      .from("floor_plan_data")
      .upsert({ floor_key: SURVEY_KEY, data: { rounds } }, { onConflict: "floor_key" });
    if (error) throw error;
  },
};

// Re-export types from localDB so consumers can import from supabaseDB
export type { Asset, Ticket, Employee, TicketComment, AuditSession, AuditItem } from "@/lib/localDB";
