/**
 * localDB — localStorage-backed database for IT Asset Management
 * -
 * ใช้แทน Supabase ในช่วงพัฒนา ก่อนนำขึ้น production
 * ทุก entity มี CRUD ครบ พร้อม seed data จาก mock files
 */

// - Types -

export interface Asset {
  id: string;
  asset_tag: string;
  serial_number: string;
  brand: string;
  model_name: string;
  category: string;
  branch_id: string;
  branch_name: string;
  branch_code: string;
  seat_id: string | null;
  seat_label: string | null;
  room_name: string | null;
  status: string;
  condition: string;
  purchase_date?: string;
  purchase_price: string;
  currency: string;
  vendor_name?: string;
  purchase_order_ref?: string;
  warranty_expiry: string;
  lifecycle_end_date?: string;
  is_critical?: boolean;
  hostname: string;
  ip_address: string;
  mac_address_eth?: string;
  mac_address_wifi?: string;
  notes: string;
  photos: string[];
  return_documents?: { name: string; timestamp: string; dataUrl?: string }[];
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  type: string;
  status: string;
  priority: string;
  title: string;
  description: string;
  reporter_name: string;
  reporter_email?: string;
  assignee_name?: string;
  asset_tag?: string;
  asset_id: string | null;
  branch?: string;
  resolution_notes?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  emp_code: string;
  full_name: string;
  nickname: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  branch: string;
  seat_label: string;
  asset_tag: string;
  asset_name: string;
  status: string;
  start_date: string;
  avatar_url: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  body: string;
  is_internal: boolean;
  author_name: string;
  created_at: string;
}

export interface AuditSession {
  id: string;
  name: string;
  notes: string;
  is_complete: boolean;
  started_at: string;
  completed_at: string | null;
  summary_json: {
    total: number; matched: number; missing: number;
    extra: number; damaged: number;
  } | null;
}

export interface AuditItem {
  id: string;
  session_id: string;
  asset_tag_scanned: string;
  asset_id: string | null;
  finding: "matched" | "extra" | "missing" | "damaged" | "wrong_location";
  scanned_at: string;
  notes: string | null;
}

// - Core engine -

const PREFIX = "itam_";

function getTable<T>(name: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PREFIX + name);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function setTable<T>(name: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFIX + name, JSON.stringify(data));
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function nowISO(): string {
  return new Date().toISOString();
}

// - Seed check -

const SEEDED_KEY = PREFIX + "seeded_v4";

export function ensureSeeded(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(SEEDED_KEY)) return;

  // No demo data — start clean
  setTable("assets", []);
  setTable("tickets", []);
  setTable("employees", []);
  setTable("ticket_comments", []);

  localStorage.setItem(SEEDED_KEY, "1");
}

// - Data migration: fix status consistency -
// Assets with in_use but no seat_id/floor assignment → reset to idle
// Run once on app load to fix stale localStorage data
export function runMigrations(): void {
  if (typeof window === "undefined") return;
  const assets = getTable<Asset>("assets");
  let changed = false;
  const fixed = assets.map(a => {
    // in_use requires a seat assignment; without one, revert to idle
    if (a.status === "in_use" && (!a.seat_id || a.seat_id === "")) {
      changed = true;
      return { ...a, status: "idle", updated_at: new Date().toISOString() };
    }
    return a;
  });
  if (changed) {
    setTable("assets", fixed);
    // Notify all components to re-fetch
    window.dispatchEvent(new Event("itam_assets_updated"));
  }
}

// - Assets CRUD -

export const assetDB = {
  getAll(): Asset[] {
    ensureSeeded();
    const raw = getTable<Asset>("assets");
    const tickets = getTable<Ticket>("tickets");
    const VALID = ["idle","in_use","under_repair","pending_return","returned"];
    const ACTIVE_TICKET = ["open","in_progress","pending_approval"];
    const REPAIR_TYPES  = ["repair","maintenance"];
    let dirty = false;
    const normalized = raw.map(a => {
      let s = a.status;
      // 1. Migrate old status values
      if (s === "active")                       s = "in_use";
      if (s === "retired" || s === "disposed")  s = "returned";
      if (s === "lost" || !VALID.includes(s))   s = "idle";
      // 2. in_use requires a floor plan seat
      if (s === "in_use" && !a.seat_id)         s = "idle";
      // 3. under_repair requires at least one active repair ticket
      //    If all repair tickets are closed/resolved → auto-restore
      if (s === "under_repair") {
        const hasActiveRepair = tickets.some(t =>
          t.asset_id === a.id &&
          REPAIR_TYPES.includes(t.type) &&
          ACTIVE_TICKET.includes(t.status)
        );
        if (!hasActiveRepair) {
          s = a.seat_id ? "in_use" : "idle";
        }
      }
      if (s !== a.status) { dirty = true; return { ...a, status: s }; }
      return a;
    });
    if (dirty) setTable("assets", normalized);
    return normalized;
  },

  getById(id: string): Asset | null {
    return this.getAll().find((a) => a.id === id) ?? null;
  },

  create(data: Omit<Asset, "id" | "created_at" | "updated_at">): Asset {
    const list = getTable<Asset>("assets");
    const item: Asset = { ...data, id: uid(), created_at: nowISO(), updated_at: nowISO() };
    setTable("assets", [item, ...list]);
    return item;
  },

  update(id: string, data: Partial<Asset>): Asset | null {
    const list = getTable<Asset>("assets").map((a) =>
      a.id === id ? { ...a, ...data, updated_at: nowISO() } : a
    );
    setTable("assets", list);
    // Return the raw saved value (avoid normalization overwriting what we just set)
    return list.find((a) => a.id === id) ?? null;
  },

  delete(id: string): void {
    setTable("assets", getTable<Asset>("assets").filter((a) => a.id !== id));
  },

  filter({ search = "", status = "", category = "", branch_id = "" } = {}): Asset[] {
    return this.getAll().filter((a) => {
      const q = search.toLowerCase();
      const matchSearch = !q || [a.asset_tag, a.serial_number, a.brand, a.model_name, a.hostname, a.ip_address]
        .some((v) => v?.toLowerCase().includes(q));
      const matchStatus   = !status   || a.status   === status;
      const matchCategory = !category || a.category === category;
      const matchBranch   = !branch_id || a.branch_id === branch_id;
      return matchSearch && matchStatus && matchCategory && matchBranch;
    });
  },
};

// - Tickets CRUD -

let ticketCounter = 0;

function nextTicketNumber(): string {
  ensureSeeded();
  const existing = getTable<Ticket>("tickets");
  const max = existing.reduce((m, t) => {
    const n = parseInt(t.ticket_number.split("-").pop() ?? "0");
    return Math.max(m, n);
  }, 0);
  ticketCounter = Math.max(ticketCounter, max) + 1;
  const year = new Date().getFullYear();
  return `TKT-${year}-${String(ticketCounter).padStart(4, "0")}`;
}

export const ticketDB = {
  getAll(): Ticket[] {
    ensureSeeded();
    return getTable<Ticket>("tickets");
  },

  getById(id: string): Ticket | null {
    return this.getAll().find((t) => t.id === id) ?? null;
  },

  create(data: Omit<Ticket, "id" | "ticket_number" | "created_at" | "updated_at">): Ticket {
    const list = this.getAll();
    const item: Ticket = {
      ...data,
      id: uid(),
      ticket_number: nextTicketNumber(),
      created_at: nowISO(),
      updated_at: nowISO(),
    };
    setTable("tickets", [item, ...list]);
    return item;
  },

  update(id: string, data: Partial<Ticket>): Ticket {
    const list = this.getAll().map((t) =>
      t.id === id ? { ...t, ...data, updated_at: nowISO() } : t
    );
    setTable("tickets", list);
    return list.find((t) => t.id === id)!;
  },

  filter({ search = "", status = "", type = "", priority = "" } = {}): Ticket[] {
    return this.getAll().filter((t) => {
      const q = search.toLowerCase();
      const matchSearch   = !q || [t.title, t.ticket_number, t.asset_tag, t.reporter_name]
        .some((v) => v?.toLowerCase().includes(q));
      const matchStatus   = !status   || t.status   === status;
      const matchType     = !type     || t.type     === type;
      const matchPriority = !priority || t.priority === priority;
      return matchSearch && matchStatus && matchType && matchPriority;
    });
  },

  getComments(ticketId: string): TicketComment[] {
    ensureSeeded();
    return getTable<TicketComment>("ticket_comments")
      .filter((c) => c.ticket_id === ticketId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  addComment(ticketId: string, body: string, isInternal: boolean, authorName: string): TicketComment {
    const list = getTable<TicketComment>("ticket_comments");
    const comment: TicketComment = {
      id: uid(), ticket_id: ticketId, body, is_internal: isInternal,
      author_name: authorName, created_at: nowISO(),
    };
    setTable("ticket_comments", [...list, comment]);
    return comment;
  },
};

// - Employees CRUD -

export const employeeDB = {
  getAll(): Employee[] {
    ensureSeeded();
    return getTable<Employee>("employees");
  },

  getById(id: string): Employee | null {
    return this.getAll().find((e) => e.id === id) ?? null;
  },

  create(data: Omit<Employee, "id">): Employee {
    const list = this.getAll();
    const item: Employee = { ...data, id: uid() };
    setTable("employees", [...list, item]);
    return item;
  },

  update(id: string, data: Partial<Employee>): Employee {
    const list = this.getAll().map((e) => e.id === id ? { ...e, ...data } : e);
    setTable("employees", list);
    return list.find((e) => e.id === id)!;
  },

  remove(id: string): void {
    setTable("employees", this.getAll().filter((e) => e.id !== id));
  },

  filter({ search = "", department = "", branch = "", status = "" } = {}): Employee[] {
    return this.getAll().filter((e) => {
      const q = search.toLowerCase();
      const matchSearch = !q || [e.full_name, e.emp_code, e.email, e.department, e.position]
        .some((v) => v?.toLowerCase().includes(q));
      const matchDept   = !department || e.department === department;
      const matchBranch = !branch     || e.branch     === branch;
      const matchStatus = !status     || e.status     === status;
      return matchSearch && matchDept && matchBranch && matchStatus;
    });
  },
};

// - Dashboard stats -

export function getDashboardStats() {
  ensureSeeded();
  const assets   = assetDB.getAll();
  const tickets  = ticketDB.getAll();
  const employees = employeeDB.getAll();
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 86400000).toISOString().split("T")[0];

  return {
    totalAssets:    assets.length,
    activeAssets:   assets.filter((a) => a.status === "in_use").length,
    idleAssets:     assets.filter((a) => a.status === "idle").length,
    underRepair:    assets.filter((a) => a.status === "under_repair").length,
    openTickets:    tickets.filter((t) => ["open", "in_progress", "pending_approval"].includes(t.status)).length,
    criticalTickets:tickets.filter((t) => t.priority === "critical" && t.status !== "closed").length,
    activeEmployees:employees.filter((e) => e.status === "active").length,
    warrantyExpiring: assets.filter((a) =>
      a.warranty_expiry && a.warranty_expiry <= soon && a.warranty_expiry >= now.toISOString().split("T")[0]
    ),
    recentTickets: tickets.slice(0, 5),
  };
}


// - Audit CRUD -

export const auditDB = {
  getSessions(): AuditSession[] {
    return getTable<AuditSession>("audit_sessions")
      .sort((a, b) => b.started_at.localeCompare(a.started_at));
  },
  getSession(id: string): AuditSession | null {
    return this.getSessions().find((s) => s.id === id) ?? null;
  },
  createSession(name: string, notes = ""): AuditSession {
    const s: AuditSession = {
      id: uid(), name, notes, is_complete: false,
      started_at: nowISO(), completed_at: null, summary_json: null,
    };
    setTable("audit_sessions", [...this.getSessions(), s]);
    return s;
  },
  completeSession(id: string, summary: AuditSession["summary_json"]): AuditSession {
    const list = this.getSessions().map((s) =>
      s.id === id ? { ...s, is_complete: true, completed_at: nowISO(), summary_json: summary } : s
    );
    setTable("audit_sessions", list);
    return list.find((s) => s.id === id)!;
  },
  deleteSession(id: string): void {
    setTable("audit_sessions", this.getSessions().filter((s) => s.id !== id));
    setTable("audit_items", getTable<AuditItem>("audit_items").filter((i) => i.session_id !== id));
  },
  getItems(sessionId: string): AuditItem[] {
    return getTable<AuditItem>("audit_items")
      .filter((i) => i.session_id === sessionId)
      .sort((a, b) => b.scanned_at.localeCompare(a.scanned_at));
  },
  addItem(sessionId: string, assetTagScanned: string, assetId: string | null,
    finding: AuditItem["finding"], notes: string | null = null): AuditItem {
    const item: AuditItem = {
      id: uid(), session_id: sessionId, asset_tag_scanned: assetTagScanned,
      asset_id: assetId, finding, scanned_at: nowISO(), notes,
    };
    setTable("audit_items", [...getTable<AuditItem>("audit_items"), item]);
    return item;
  },
  addMissingItems(sessionId: string, assets: { id: string; asset_tag: string }[]): void {
    const existing = getTable<AuditItem>("audit_items");
    const newItems: AuditItem[] = assets.map((a) => ({
      id: uid(), session_id: sessionId, asset_tag_scanned: a.asset_tag,
      asset_id: a.id, finding: "missing" as const, scanned_at: nowISO(), notes: null,
    }));
    setTable("audit_items", [...existing, ...newItems]);
  },
};

// - Reset (dev only) -

export function resetDB() {
  const keys = [
    "itam_assets","itam_employees","itam_tickets","itam_ticket_comments",
    "itam_audit_sessions","itam_audit_items",
    "itam_assets_seeded","itam_employees_seeded","itam_tickets_seeded",
  ];
  keys.forEach(k => { try { localStorage.removeItem(k); } catch {} });
}

// ── Floor-plan helpers ────────────────────────────────────────────
// Remove an asset_tag from every seat across all floors.
// Call this whenever an asset is returned / retired so the floor plan
// stays in sync without needing to open the floor-plan page.
export function removeAssetTagFromFloorPlan(assetTag: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("floorplan_data");
    if (!raw) return;
    const data: Record<string, { seats: { asset_tags?: string[]; [k: string]: unknown }[] }> = JSON.parse(raw);
    let changed = false;
    for (const floorId of Object.keys(data)) {
      const floor = data[floorId];
      if (!floor?.seats) continue;
      floor.seats = floor.seats.map(seat => {
        if (!seat.asset_tags?.includes(assetTag)) return seat;
        changed = true;
        return { ...seat, asset_tags: seat.asset_tags.filter(t => t !== assetTag) };
      });
    }
    if (changed) {
      localStorage.setItem("floorplan_data", JSON.stringify(data));
      window.dispatchEvent(new Event("itam_assets_updated"));
    }
  } catch { /* ignore */ }
}
