// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ticketDB, assetDB, type Ticket } from "@/lib/supabaseDB";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { TicketStatusBadge, TicketPriorityBadge, TicketTypeLabel } from "@/components/tickets/TicketStatusBadge";

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null | "loading">("loading");

  useEffect(() => {
    const found = ticketDB.getById(id);
    setTicket(found ?? null);
  }, [id]);

  if (ticket === "loading") return null;
  if (!ticket) return (
    <div className="p-8 text-center text-muted-foreground">
      ไม่พบ Ticket / Ticket not found
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <Link href="/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Tickets
      </Link>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground">{ticket.ticket_number}</span>
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
            </div>
            <h1 className="text-base font-semibold">{ticket.title}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <TicketTypeLabel type={ticket.type} />
              <span>·</span>
              <span>By {ticket.reporter_name}</span>
              <span>·</span>
              <span>{new Date(ticket.created_at).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" })}</span>
            </div>
          </div>
        </div>

        {ticket.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-line">{ticket.description}</p>
        )}

        {ticket.asset_tag && (
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href={ticket.asset_id ? `/assets/${ticket.asset_id}` : "#"}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs hover:bg-accent transition-colors">
              🖥 {ticket.asset_tag}
            </Link>
          </div>
        )}
      </div>

      <TicketActions ticket={ticket} onUpdate={setTicket} />
    </div>
  );
}

function TicketActions({ ticket, onUpdate }: { ticket: Ticket; onUpdate: (t: Ticket) => void }) {
  const [comment, setComment] = useState("");
  const { confirm, ConfirmUI } = useConfirm();
  const router = useRouter();

  const TRANSITION_LABELS: Partial<Record<Ticket["status"], { title: string; msg?: string; danger?: boolean }>> = {
    in_progress:     { title: "รับงาน / Accept ticket?" },
    resolved:        { title: "ยืนยันว่าแก้ไขเสร็จแล้ว?", msg: "สถานะจะเปลี่ยนเป็น Resolved" },
    closed:          { title: "ปิด Ticket นี้?", msg: "ไม่สามารถเปิดใหม่ได้ภายหลัง", danger: true },
    rejected:        { title: "ปฏิเสธ Ticket นี้?", msg: "สถานะจะเปลี่ยนเป็น Rejected", danger: true },
  };

  async function transition(status: Ticket["status"]) {
    const lbl = TRANSITION_LABELS[status];
    if (lbl) {
      const ok = await confirm({
        title: lbl.title,
        message: lbl.msg,
        confirmLabel: "ยืนยัน",
        danger: lbl.danger,
      });
      if (!ok) return;
    }
    const updated = ticketDB.update(ticket.id, { status });
    if (updated) {
      // ── Sync asset status ──────────────────────────────────────────
      if (ticket.asset_id) {
        const isRepair = ["repair", "maintenance"].includes(ticket.type);
        if (isRepair) {
          if (status === "open" || status === "in_progress" || status === "pending_approval") {
            // ช่างรับงาน → แจ้งซ่อม
            assetDB.update(ticket.asset_id, { status: "under_repair" });
          } else if (status === "resolved" || status === "closed") {
            // ซ่อมเสร็จ → in_use ถ้ายังอยู่ในผัง มิฉะนั้น idle
            const fixedAsset = assetDB.getById(ticket.asset_id);
            assetDB.update(ticket.asset_id, {
              status: fixedAsset?.seat_id ? "in_use" : "idle"
            });
          } else if (status === "rejected" || status === "cancelled") {
            const cancelAsset = assetDB.getById(ticket.asset_id);
            assetDB.update(ticket.asset_id, {
              status: cancelAsset?.seat_id ? "in_use" : "idle"
            });
          }
        } else if (ticket.type === "retire" || ticket.type === "dispose") {
          if (status === "resolved" || status === "closed") {
            assetDB.update(ticket.asset_id, { status: "returned" });
          }
        }
      }
      onUpdate(updated);
      window.dispatchEvent(new Event("itam_assets_updated"));
      router.refresh();
    }
  }


  function submitComment() {
    if (!comment.trim()) return;
    ticketDB.addComment(ticket.id, comment, false, "IT Admin");
    setComment("");
  }

  const comments = ticketDB.getComments(ticket.id);
  const s = ticket.status;

  return (
    <div className="space-y-4">
      {ConfirmUI}
      {/* Actions */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</h3>
        <div className="flex flex-wrap gap-2">
          {s === "open" && (
            <ActionBtn onClick={() => transition("in_progress")} color="blue">รับงาน / Accept</ActionBtn>
          )}
          {s === "in_progress" && (
            <ActionBtn onClick={() => transition("resolved")} color="green">แก้ไขแล้ว / Mark Resolved</ActionBtn>
          )}
          {s === "pending_approval" && (<>
            <ActionBtn onClick={() => transition("resolved")} color="green">อนุมัติ / Approve</ActionBtn>
            <ActionBtn onClick={() => transition("rejected")} color="red">ปฏิเสธ / Reject</ActionBtn>
          </>)}
          {s === "resolved" && (
            <ActionBtn onClick={() => transition("closed")} color="gray">ปิด Ticket / Close</ActionBtn>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Timeline · {comments.length} comment{comments.length !== 1 ? "s" : ""}
          </h3>
        </div>
        <div className="px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีความคิดเห็น / No comments yet.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="text-sm">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium">{c.author_name}</span>
                <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("th-TH")}</span>
              </div>
              <p className="text-muted-foreground whitespace-pre-line">{c.body}</p>
            </div>
          ))}
        </div>
        {!["closed","rejected"].includes(s) && (
          <div className="border-t border-border px-4 py-3 space-y-2">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="เขียนความคิดเห็น... / Write a comment..."
              className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <div className="flex justify-end">
              <button onClick={submitComment} disabled={!comment.trim()}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                ส่ง / Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ children, onClick, color }: { children: React.ReactNode; onClick: () => void; color: string }) {
  const colors: Record<string, string> = {
    blue:  "bg-blue-600 hover:bg-blue-700 text-white",
    green: "bg-green-600 hover:bg-green-700 text-white",
    red:   "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
    gray:  "bg-muted hover:bg-accent text-foreground border border-border",
  };
  return (
    <button onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${colors[color] ?? colors.gray}`}>
      {children}
    </button>
  );
}