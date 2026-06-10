"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th as thLocale, enUS } from "date-fns/locale";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ticketDB, type Ticket } from "@/lib/supabaseDB";
import { cn } from "@/lib/utils";

// ── Label maps ────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { th: string; en: string; cls: string }> = {
  open:             { th: "เปิด",             en: "Open",             cls: "bg-blue-500/15 text-blue-700"    },
  in_progress:      { th: "กำลังดำเนินการ",   en: "In Progress",      cls: "bg-amber-500/15 text-amber-700"  },
  pending_approval: { th: "รอการอนุมัติ",     en: "Pending Approval", cls: "bg-violet-500/15 text-violet-700"},
  resolved:         { th: "แก้ไขแล้ว",        en: "Resolved",         cls: "bg-green-500/15 text-green-700"  },
  closed:           { th: "ปิดแล้ว",          en: "Closed",           cls: "bg-slate-400/20 text-slate-600"  },
  rejected:         { th: "ปฏิเสธ",           en: "Rejected",         cls: "bg-red-500/15 text-red-600"      },
};

const PRIORITY_META: Record<string, { th: string; en: string; dot: string }> = {
  low:      { th: "ต่ำ",       en: "Low",      dot: "bg-slate-400"  },
  medium:   { th: "ปานกลาง",  en: "Medium",   dot: "bg-amber-400"  },
  high:     { th: "สูง",       en: "High",     dot: "bg-orange-500" },
  critical: { th: "วิกฤต",    en: "Critical", dot: "bg-red-500"    },
};

const TYPE_META: Record<string, { th: string; en: string; icon: string }> = {
  repair:      { th: "แจ้งซ่อม",          en: "Repair",       icon: "🔧" },
  relocation:  { th: "ย้ายที่นั่ง",        en: "Relocation",   icon: "🚚" },
  new_request: { th: "เบิกทรัพย์สินใหม่",   en: "New Request",  icon: "📦" },
  retire:      { th: "คืน/เลิกใช้งาน",    en: "Retire/Return",icon: "📥" },
  other:       { th: "อื่นๆ",              en: "Other",        icon: "📋" },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TicketsPage() {
  const { locale } = useLanguage();
  const isTh = locale === "th";

  const [tickets,        setTickets]        = useState<Ticket[]>([]);
  const [search,         setSearch]         = useState("");
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterType,     setFilterType]     = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [selectedId,     setSelectedId]     = useState<string | null>(null);
  const [showClosed,     setShowClosed]     = useState(false);

  useEffect(() => { ticketDB.getAll().then(setTickets); }, []);

  const CLOSED_STATUSES = ["closed", "resolved", "rejected"];
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return tickets.filter(t => {
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterType && t.type !== filterType) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (showClosed ? !CLOSED_STATUSES.includes(t.status) : CLOSED_STATUSES.includes(t.status)) return false;
      if (s && !([t.title, t.ticket_number, t.asset_tag, t.reporter_name].some(v => v?.toLowerCase().includes(s)))) return false;
      return true;
    });
  }, [tickets, search, filterStatus, filterType, filterPriority, showClosed]);

  const selected = selectedId ? tickets.find((t) => t.id === selectedId) ?? null : null;
  const openCount = tickets.filter((t) => ["open", "in_progress", "pending_approval"].includes(t.status)).length;

  async function updateTicketStatus(id: string, status: string) {
    await ticketDB.update(id, { status });
    const fresh = await ticketDB.getAll();
    setTickets(fresh);
    setSelectedId(id);
  }

  const hasFilter = !!(search || filterStatus || filterType || filterPriority);

  return (
    <div className="flex h-full overflow-hidden bg-slate-100">

      {/* ── List panel ── */}
      <div className={cn("flex flex-col flex-1 min-w-0 border-r border-slate-200", selected ? "hidden lg:flex" : "flex")}>

        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">
              {showClosed ? (isTh ? "ปิดแล้ว" : "Closed Tickets") : (isTh ? "แจ้งปัญหา" : "Tickets")}
            </h1>
            <p className="page-sub">
              {showClosed
                ? `${filtered.length} ${isTh ? "รายการ" : "items"}`
                : (isTh
                  ? `เปิดอยู่ ${openCount} รายการ`
                  : `${openCount} open`)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm bg-white">
              <button onClick={() => { setShowClosed(false); setFilterStatus(""); }}
                className={cn("px-3.5 py-2 font-medium transition-colors", !showClosed ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50")}>
                {isTh ? "ใช้งาน" : "Active"}
              </button>
              <button onClick={() => setShowClosed(true)}
                className={cn("px-3.5 py-2 font-medium transition-colors flex items-center gap-1.5", showClosed ? "bg-slate-700 text-white" : "text-slate-500 hover:bg-slate-50")}>
                {isTh ? "ปิดแล้ว" : "Closed"}
                {tickets.filter(t => ["closed","resolved","rejected"].includes(t.status)).length > 0 && (
                  <span className={cn("rounded-full px-1.5 text-[11px] font-bold", showClosed ? "bg-white/25" : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300")}>
                    {tickets.filter(t => ["closed","resolved","rejected"].includes(t.status)).length}
                  </span>
                )}
              </button>
            </div>
            {!showClosed && (
              <Link href="/tickets/new" className="sp-btn-primary">
                <Plus size={14} />
                {isTh ? "แจ้งปัญหาใหม่" : "New Ticket"}
              </Link>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="filter-bar bg-white">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isTh ? "ค้นหา ticket…" : "Search tickets…"}
              className="sp-input pl-8"
            />
          </div>
          <select value={filterStatus}   onChange={(e) => setFilterStatus(e.target.value)}   className={sel()}>
            <option value="">{isTh ? "ทุกสถานะ"     : "All Statuses"  }</option>
            {Object.entries(STATUS_META).map(([v, l]) => <option key={v} value={v}>{isTh ? l.th : l.en}</option>)}
          </select>
          <select value={filterType}     onChange={(e) => setFilterType(e.target.value)}     className={sel()}>
            <option value="">{isTh ? "ทุกประเภท"    : "All Types"     }</option>
            {Object.entries(TYPE_META).map(([v, l]) => <option key={v} value={v}>{isTh ? l.th : l.en}</option>)}
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={sel()}>
            <option value="">{isTh ? "ทุกความสำคัญ" : "All Priorities"}</option>
            {Object.entries(PRIORITY_META).map(([v, l]) => <option key={v} value={v}>{isTh ? l.th : l.en}</option>)}
          </select>
          {hasFilter && (
            <button onClick={() => { setSearch(""); setFilterStatus(""); setFilterType(""); setFilterPriority(""); }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">
              <X size={11} /> {isTh ? "ล้าง" : "Clear"}
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">{isTh ? "ไม่พบข้อมูล" : "No tickets found"}</p>
            </div>
          ) : (
            filtered.map((tk) => {
              const sm = STATUS_META[tk.status];
              const pm = PRIORITY_META[tk.priority];
              const tm = TYPE_META[tk.type];
              return (
                <button
                  key={tk.id}
                  onClick={() => setSelectedId(tk.id === selectedId ? null : tk.id)}
                  className={cn(
                    "w-full text-left rounded-xl border p-4 hover:shadow-sm transition-all",
                    selectedId === tk.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-foreground/20"
                  )}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5 shrink-0">{tm?.icon ?? "📋"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">{tk.ticket_number}</span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", sm?.cls)}>
                          {isTh ? sm?.th : sm?.en}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className={cn("w-2 h-2 rounded-full", pm?.dot)} />
                          {isTh ? pm?.th : pm?.en}
                        </span>
                      </div>
                      <p className="font-semibold text-sm mt-1 truncate">{tk.title}</p>
                      <p className="page-sub">
                        {isTh ? "โดย" : "by"} {tk.reporter_name}
                        {tk.branch ? ` · ${tk.branch}` : ""}
                      </p>
                      {tk.asset_tag && (
                        <p className="text-xs text-primary mt-0.5 font-mono">{tk.asset_tag}</p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0 text-right">
                      {formatDistanceToNow(new Date(tk.created_at), { addSuffix: true, locale: isTh ? thLocale : enUS })}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selected && (
        <TicketDetailPanel
          ticket={selected}
          isTh={isTh}
          onClose={() => setSelectedId(null)}
          onStatusChange={(status) => updateTicketStatus(selected.id, status)}
        />
      )}
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function TicketDetailPanel({
  ticket, isTh, onClose, onStatusChange,
}: {
  ticket: Ticket;
  isTh: boolean;
  onClose: () => void;
  onStatusChange: (s: string) => void;
}) {
  const sm = STATUS_META[ticket.status];
  const pm = PRIORITY_META[ticket.priority];
  const tm = TYPE_META[ticket.type];

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isTh ? "th-TH" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

  const [comment,  setComment]  = useState("");
  const [comments, setComments] = useState<any[]>([]);

  // Refresh comments when ticket changes
  useEffect(() => { ticketDB.getComments(ticket.id).then(setComments); }, [ticket.id]);

  async function handleComment() {
    if (!comment.trim()) return;
    await ticketDB.addComment(ticket.id, comment.trim(), false, isTh ? "เจ้าหน้าที่" : "Staff");
    ticketDB.getComments(ticket.id).then(setComments);
    setComment("");
  }

  return (
    <div className="w-full lg:w-[460px] xl:w-[500px] flex flex-col overflow-y-auto border-l border-border bg-card">

      {/* Panel header */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <button onClick={onClose}
          className="lg:hidden flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          ‹ {isTh ? "กลับ" : "Back"}
        </button>
        <span className="text-2xl shrink-0">{tm?.icon ?? "📋"}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{ticket.title}</p>
          <p className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</p>
        </div>
        <button onClick={onClose} className="hidden lg:flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors text-muted-foreground">
          <X size={16} />
        </button>
      </div>

      {/* Badges */}
      <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-border">
        <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", sm?.cls)}>{isTh ? sm?.th : sm?.en}</span>
        <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-muted text-foreground">
          <span className={cn("w-2 h-2 rounded-full", pm?.dot)} />{isTh ? pm?.th : pm?.en}
        </span>
        <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-foreground">{isTh ? tm?.th : tm?.en}</span>
      </div>

      {/* Info rows */}
      <div className="px-5 py-4 space-y-2.5 border-b border-border text-sm">
        <InfoRow label={isTh ? "ผู้แจ้ง"        : "Reporter"} value={ticket.reporter_email ? `${ticket.reporter_name} · ${ticket.reporter_email}` : ticket.reporter_name} />
        {ticket.assignee_name && <InfoRow label={isTh ? "ผู้รับผิดชอบ"  : "Assignee"} value={ticket.assignee_name} />}
        {ticket.branch        && <InfoRow label={isTh ? "สาขา"           : "Branch"}   value={ticket.branch} />}
        {ticket.asset_tag     && <InfoRow label={isTh ? "สินทรัพย์"      : "Asset"}    value={ticket.asset_tag} />}
        <InfoRow label={isTh ? "วันที่แจ้ง" : "Created"} value={fmtDate(ticket.created_at)} />
      </div>

      {/* Description */}
      {ticket.description && (
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">{isTh ? "รายละเอียด" : "Description"}</p>
          <p className="text-sm leading-relaxed">{ticket.description}</p>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 py-4 flex gap-2 flex-wrap border-b border-border">
        {ticket.status === "open" && (
          <ActionBtn cls="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => onStatusChange("in_progress")}>
            {isTh ? "รับงาน" : "Accept"}
          </ActionBtn>
        )}
        {ticket.status === "in_progress" && (
          <ActionBtn cls="bg-green-600 text-white hover:bg-green-700"
            onClick={() => onStatusChange("resolved")}>
            {isTh ? "แก้ไขแล้ว" : "Mark Resolved"}
          </ActionBtn>
        )}
        {ticket.status === "pending_approval" && (
          <>
            <ActionBtn cls="bg-green-600 text-white hover:bg-green-700"
              onClick={() => onStatusChange("resolved")}>
              {isTh ? "อนุมัติ" : "Approve"}
            </ActionBtn>
            <ActionBtn cls="border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => onStatusChange("rejected")}>
              {isTh ? "ปฏิเสธ" : "Reject"}
            </ActionBtn>
          </>
        )}
        {ticket.status === "resolved" && (
          <ActionBtn cls="bg-slate-600 text-white hover:bg-slate-700"
            onClick={() => onStatusChange("closed")}>
            {isTh ? "ปิด Ticket" : "Close Ticket"}
          </ActionBtn>
        )}
        <Link href={`/tickets/${ticket.id}`}
          className="flex-1 text-center text-sm rounded-lg border border-border py-2 hover:bg-accent transition-colors text-muted-foreground">
          {isTh ? "ดูรายละเอียดเต็ม" : "Full Detail"}
        </Link>
      </div>

      {/* Comments */}
      <div className="px-5 py-4 flex-1 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">{isTh ? "ความคิดเห็น" : "Comments"}</p>
        {comments.length === 0 && (
          <p className="text-xs text-muted-foreground italic">{isTh ? "ยังไม่มีความคิดเห็น" : "No comments yet"}</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg bg-muted/50 px-3 py-2.5 space-y-0.5">
            <p className="text-xs font-medium">{c.author_name}</p>
            <p className="text-sm">{c.body}</p>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleComment()}
            placeholder={isTh ? "เพิ่มความคิดเห็น…" : "Add a comment…"}
            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button onClick={handleComment}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {isTh ? "ส่ง" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-xs text-muted-foreground w-24 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function sel() { return "sp-input"; }

function ActionBtn({ children, cls, onClick }: { children: React.ReactNode; cls?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${cls ?? ""}`}>
      {children}
      </button>
  );
}
