"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { th as thLocale } from "date-fns/locale";
import {
  ArrowLeft, Edit, QrCode, Trash2, RotateCcw,
  AlertTriangle, MapPin, Paperclip, FileText, X, Upload,
  History as HistoryIcon,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { assetDB, ticketDB, removeAssetTagFromFloorPlan, type Asset, type Ticket } from "@/lib/supabaseDB";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/ConfirmDialog";

// ── Status config ─────────────────────────────────────────────────
const STATUS_CFG: Record<string, { th: string; en: string; cls: string }> = {
  idle:           { th: "ว่าง",        en: "Idle",           cls: "bg-slate-100    text-slate-600"  },
  in_use:         { th: "ใช้งาน",      en: "In Use",         cls: "bg-green-100    text-green-700"  },
  under_repair:   { th: "แจ้งซ่อม",    en: "Under Repair",   cls: "bg-amber-100    text-amber-700"  },
  pending_return: { th: "รอส่งคืน",    en: "Pending Return", cls: "bg-orange-100   text-orange-700" },
  returned:       { th: "ส่งคืนแล้ว",  en: "Returned",       cls: "bg-blue-100     text-blue-700"   },
};

const CONDITION_CFG: Record<string, { th: string; en: string }> = {
  excellent: { th: "ดีเยี่ยม", en: "Excellent" },
  good:      { th: "ดี",       en: "Good"      },
  fair:      { th: "พอใช้",    en: "Fair"      },
  poor:      { th: "แย่",      en: "Poor"      },
};

const TICKET_STATUS: Record<string, { th: string; en: string; cls: string }> = {
  open:             { th: "เปิด",           en: "Open",            cls: "bg-blue-500/15   text-blue-700"   },
  in_progress:      { th: "กำลังดำเนินการ", en: "In Progress",     cls: "bg-amber-500/15  text-amber-700"  },
  pending_approval: { th: "รอการอนุมัติ",   en: "Pending Approval",cls: "bg-violet-500/15 text-violet-700" },
  resolved:         { th: "แก้ไขแล้ว",      en: "Resolved",        cls: "bg-green-500/15  text-green-700"  },
  closed:           { th: "ปิด",            en: "Closed",          cls: "bg-slate-400/20  text-slate-600"  },
};

export function AssetDetailPageClient({ asset: initialAsset }: { asset: Asset }) {
  const { locale } = useLanguage();
  const router     = useRouter();
  const isTh       = locale === "th";
  const [tab,    setTab]    = useState(0);
  const [asset,  setAsset]  = useState(initialAsset);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const { confirm, ConfirmUI } = useConfirm();

  // Sync internal state when parent passes a freshly-loaded asset prop
  useEffect(() => {
    setAsset(initialAsset);
  }, [initialAsset]);

  const reload = useCallback(() => {
    assetDB.getById(initialAsset.id).then(fresh => { if (fresh) setAsset(fresh); });
    ticketDB.getAll().then(all => setTickets(all.filter(t => t.asset_id === initialAsset.id)));
  }, [initialAsset.id]);

  useEffect(() => {
    reload();
    window.addEventListener("itam_assets_updated", reload);
    return () => window.removeEventListener("itam_assets_updated", reload);
  }, [reload]);

  const TABS = [
    isTh ? "ภาพรวม" : "Overview",
    isTh ? "เครือข่าย" : "Network",
    isTh ? "แจ้งปัญหา" : "Tickets",
    isTh ? "เอกสารส่งคืน" : "Return Docs",
    isTh ? "ประวัติ" : "History",
  ];

  const cfg    = STATUS_CFG[asset.status];
  const fmtDate = (d?: string | null) => {
    if (!d) return "-";
    try { return format(new Date(d), "d MMM yyyy", { locale: isTh ? thLocale : undefined }); }
    catch { return d; }
  };

  const today    = new Date();
  const wDate    = asset.warranty_expiry ? new Date(asset.warranty_expiry) : null;
  const wDays    = wDate ? Math.round((wDate.getTime() - today.getTime()) / 86400000) : null;
  const isExpired = wDays !== null && wDays < 0;
  const isSoon    = wDays !== null && !isExpired && wDays <= 30;

  async function handleDelete() {
    const ok = await confirm({
      title: isTh ? `ลบสินทรัพย์ ${asset.asset_tag}?` : `Delete ${asset.asset_tag}?`,
      message: isTh ? "ข้อมูลจะถูกลบถาวร ไม่สามารถกู้คืนได้" : "This action cannot be undone.",
      confirmLabel: isTh ? "ลบ" : "Delete",
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    await assetDB.delete(asset.id);
    router.push("/assets");
  }

  async function handleRequestReturn() {
    const ok = await confirm({
      title: isTh ? "ส่งคืนสินทรัพย์?" : "Return Asset?",
      message: isTh
        ? `เปลี่ยนสถานะ ${asset.asset_tag} เป็น "รอส่งคืน"`
        : `Change ${asset.asset_tag} status to "Pending Return"`,
      confirmLabel: isTh ? "ยืนยัน" : "Confirm",
    });
    if (!ok) return;
    const updated = await assetDB.update(asset.id, {
      status: "pending_return",
      assigned_to_id: null,
      assigned_to_name: null,
      seat_id: null,
      seat_label: null,
    });
    if (updated) {
      setAsset(updated);
      toast.success(isTh ? "เปลี่ยนสถานะเป็นรอส่งคืนแล้ว" : "Status changed to Pending Return");
      window.dispatchEvent(new Event("itam_assets_updated"));
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {ConfirmUI}
      {showReturnModal && (
        <ReturnConfirmModal
          asset={asset}
          isTh={isTh}
          onClose={() => setShowReturnModal(false)}
          onConfirmed={(updated) => { setAsset(updated); setShowReturnModal(false); setTab(3); }}
        />
      )}

      {/* Breadcrumb */}
      <Link href="/assets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={14} />
        {isTh ? "ทรัพย์สิน IT" : "Assets"}
      </Link>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-lg">
            {asset.category.slice(0, 2).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-bold font-mono text-base">{asset.asset_tag}</h1>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", cfg?.cls)}>
                {isTh ? cfg?.th : cfg?.en}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {asset.brand} {asset.model_name}
              {asset.serial_number && <span className="ml-2 font-mono text-xs">SN: {asset.serial_number}</span>}
            </p>
            {asset.seat_label && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin size={11} />
                {asset.seat_label} · {asset.room_name}
              </p>
            )}
            {asset.assigned_to_name && (
              <p className="text-xs text-muted-foreground mt-0.5">
                👤 {asset.assigned_to_name}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 shrink-0 justify-end">
            <button onClick={handleDelete} disabled={deleting}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-red-200 hover:bg-red-50 transition-colors text-red-500"
              title={isTh ? "ลบ" : "Delete"}>
              <Trash2 size={15} />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors text-muted-foreground"
              title="QR Code">
              <QrCode size={16} />
            </button>
            {/* ส่งคืน button — show when in_use */}
            {asset.status === "in_use" && (
              <button onClick={handleRequestReturn}
                className="flex items-center gap-1.5 rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors">
                <RotateCcw size={14} />
                {isTh ? "ส่งคืน" : "Return"}
              </button>
            )}
            {/* คืนสถานะเป็นว่าง — show when returned */}
            {asset.status === "returned" && (
              <button onClick={async () => {
                const ok = await confirm({
                  title: isTh ? "คืนสถานะเป็นว่าง?" : "Restore to Idle?",
                  message: isTh ? "ทรัพย์สินจะกลับมาพร้อมใช้งานได้อีกครั้ง" : "Asset will become available again",
                  confirmLabel: isTh ? "ยืนยัน" : "Confirm",
                });
                if (!ok) return;
                const updated = await assetDB.update(asset.id, {
                  status: "idle", seat_id: null, seat_label: null,
                  assigned_to_id: null, assigned_to_name: null,
                });
                if (updated) { setAsset(updated); window.dispatchEvent(new Event("itam_assets_updated")); }
              }}
                className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                <RotateCcw size={14} />
                {isTh ? "คืนสถานะเป็นว่าง" : "Restore to Idle"}
              </button>
            )}
            {/* ยืนยันส่งคืน — show when pending_return */}
            {asset.status === "pending_return" && (
              <button onClick={() => setShowReturnModal(true)}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                <Paperclip size={14} />
                {isTh ? "ยืนยันส่งคืน" : "Confirm Return"}
              </button>
            )}
            <Link href={`/assets/${asset.id}/edit`}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Edit size={14} />
              {isTh ? "แก้ไข" : "Edit"}
            </Link>
          </div>
        </div>

        {/* Warranty alert */}
        {(isExpired || isSoon) && (
          <div className={cn(
            "mt-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium",
            isExpired
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          )}>
            <AlertTriangle size={14} />
            {isExpired
              ? (isTh ? `การรับประกันหมดอายุแล้ว ${Math.abs(wDays!)} วัน` : `Warranty expired ${Math.abs(wDays!)} days ago`)
              : (isTh ? `การรับประกันจะหมดใน ${wDays} วัน` : `Warranty expires in ${wDays} days`)}
            {` (${fmtDate(asset.warranty_expiry)})`}
          </div>
        )}

        {/* Pending return banner */}
        {asset.status === "pending_return" && (
          <div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2.5 text-xs font-medium text-orange-700">
            <span>⏳ {isTh ? 'รอการยืนยันส่งคืน — กด "ยืนยันส่งคืน" เพื่อแนบเอกสารและปิดงาน' : 'Pending return confirmation — click "Confirm Return" to attach documents'}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((label, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={cn(
              "shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === i ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
            {label}
            {i === 2 && tickets.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-bold">
                {tickets.length}
              </span>
            )}
            {i === 3 && (asset.return_documents?.length ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] font-bold">
                {asset.return_documents!.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 0 && <OverviewTab  asset={asset} isTh={isTh} fmtDate={fmtDate} />}
      {tab === 1 && <NetworkTab   asset={asset} isTh={isTh} />}
      {tab === 2 && <TicketsTab   tickets={tickets} assetId={asset.id} isTh={isTh} />}
      {tab === 3 && <ReturnDocsTab asset={asset} isTh={isTh} onUpdate={setAsset} />}
      {tab === 4 && <HistoryTab   isTh={isTh} />}
    </div>
  );
}

// ── Return Confirm Modal ──────────────────────────────────────────
function ReturnConfirmModal({ asset, isTh, onClose, onConfirmed }: {
  asset: Asset; isTh: boolean;
  onClose: () => void;
  onConfirmed: (updated: Asset) => void;
}) {
  const [note, setNote]   = useState("");
  const [files, setFiles] = useState<{ name: string; url: string; size: string; dataUrl?: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    picked.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string;
        const size = f.size < 1024 * 1024
          ? `${(f.size / 1024).toFixed(0)} KB`
          : `${(f.size / 1024 / 1024).toFixed(1)} MB`;
        setFiles(prev => [...prev, { name: f.name, url: dataUrl, size, dataUrl }]);
      };
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  }

  async function handleConfirm() {
    const now = new Date().toISOString();
    const docs = files.map(f => ({ name: f.name, timestamp: now, dataUrl: f.dataUrl }));
    const updated = await assetDB.update(asset.id, {
      status: "returned",
      return_documents: [...(asset.return_documents ?? []), ...docs],
      assigned_to_id: null,
      assigned_to_name: null,
      seat_id: null,
      seat_label: null,
      room_name: null,
    });
    if (updated) {
      // Remove from floor plan seats across all floors
      removeAssetTagFromFloorPlan(asset.asset_tag);
      window.dispatchEvent(new Event("itam_assets_updated"));
      onConfirmed(updated);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-card border border-border shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">
            {isTh ? "ยืนยันการส่งคืน" : "Confirm Return"}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <span className="font-mono font-bold">{asset.asset_tag}</span>
            <span className="text-muted-foreground ml-2">{asset.brand} {asset.model_name}</span>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {isTh ? "หมายเหตุการส่งคืน" : "Return Note"}
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder={isTh ? "เหตุผล / สภาพอุปกรณ์ / หมายเหตุ..." : "Reason / condition / notes..."}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              {isTh ? "แนบเอกสาร (ใบส่งคืน / รูปถ่าย)" : "Attach Documents (return form / photos)"}
            </label>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex w-full items-center gap-2 rounded-lg border-2 border-dashed border-border px-3 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
              <Upload size={15} />
              {isTh ? "คลิกเพื่อแนบไฟล์..." : "Click to attach files..."}
            </button>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileChange} className="hidden" />

            {files.length > 0 && (
              <div className="space-y-1.5">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={13} className="text-blue-500 shrink-0" />
                      <span className="truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{f.size}</span>
                    </div>
                    <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                      className="rounded p-0.5 hover:bg-red-100 text-muted-foreground hover:text-red-600 ml-2">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-border">
          <button onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
            {isTh ? "ยกเลิก" : "Cancel"}
          </button>
          <button onClick={handleConfirm}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            <Paperclip size={14} />
            {isTh ? "ยืนยันส่งคืน" : "Confirm Return"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Return Documents Tab ──────────────────────────────────────────
function ReturnDocsTab({ asset, isTh, onUpdate }: {
  asset: Asset; isTh: boolean; onUpdate: (a: Asset) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<{ url: string; name: string; isPdf: boolean } | null>(null);
  const docs: { name: string; timestamp: string; dataUrl?: string }[] = (asset.return_documents ?? []).map((d: any) => typeof d === 'string' ? { name: d, timestamp: '' } : d);

  function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const pickedFiles = Array.from(e.target.files ?? []);
    const now = new Date().toISOString();
    let pending = pickedFiles.length;
    const newDocs: { name: string; timestamp: string; dataUrl?: string }[] = [];
    pickedFiles.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => {
        newDocs.push({ name: f.name, timestamp: now, dataUrl: ev.target?.result as string });
        pending--;
        if (pending === 0) {
          assetDB.update(asset.id, { return_documents: [...docs, ...newDocs] }).then(updated => { if (updated) onUpdate(updated); });
        }
      };
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  }

  if (docs.length === 0 && asset.status !== "returned" && asset.status !== "pending_return") {
    return (
      <div className="rounded-xl border border-dashed border-border py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <FileText size={32} strokeWidth={1} />
        <p className="text-sm">{isTh ? "ยังไม่มีเอกสารส่งคืน" : "No return documents yet"}</p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-foreground">
          {isTh ? `เอกสารส่งคืน (${docs.length})` : `Return Documents (${docs.length})`}
        </h3>
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors">
          <Upload size={12} />
          {isTh ? "เพิ่มเอกสาร" : "Add Document"}
        </button>
        <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx"
          onChange={handleAdd} className="hidden" />
      </div>

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 flex flex-col items-center gap-3 text-muted-foreground">
          <Paperclip size={28} strokeWidth={1} />
          <p className="text-sm">{isTh ? "ยังไม่มีเอกสารแนบ — กดเพิ่มเอกสารด้านบน" : "No attachments — click Add Document above"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc, i) => {
            const ts = doc.timestamp ? new Date(doc.timestamp) : null;
            const fmtTs = ts ? ts.toLocaleDateString("th-TH", { day:"2-digit", month:"short", year:"numeric" }) + " " + ts.toLocaleTimeString("th-TH", { hour:"2-digit", minute:"2-digit" }) : "";
            const isImg = /\.(png|jpg|jpeg|gif|webp)$/i.test(doc.name);
            const isPdf = /\.pdf$/i.test(doc.name);
            return (
              <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
                {/* Header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <FileText size={18} className="text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    {fmtTs && <p className="text-xs text-muted-foreground mt-0.5">📅 {fmtTs}</p>}
                  </div>
                  {doc.dataUrl && (
                    <a href={doc.dataUrl} download={doc.name}
                      className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors"
                      title={isTh ? "ดาวน์โหลด" : "Download"}>
                      ⬇ {isTh ? "โหลด" : "Download"}
                    </a>
                  )}
                </div>
                {/* Inline preview */}
                {doc.dataUrl && isImg && (
                  <div className="border-t border-border bg-muted/30 p-3 cursor-zoom-in"
                    onClick={() => setLightbox({ url: doc.dataUrl!, name: doc.name, isPdf: false })}>
                    <img src={doc.dataUrl} alt={doc.name}
                      className="max-h-48 w-auto mx-auto rounded-md object-contain" />
                    <p className="text-center text-xs text-muted-foreground mt-1.5">🔍 {isTh ? "คลิกเพื่อดูเต็มจอ" : "Click to view fullscreen"}</p>
                  </div>
                )}
                {doc.dataUrl && isPdf && (
                  <div className="border-t border-border">
                    <iframe src={doc.dataUrl} title={doc.name}
                      className="w-full h-64 rounded-b-lg" />
                    <div className="px-4 py-2 bg-muted/30 flex justify-end">
                      <button onClick={() => setLightbox({ url: doc.dataUrl!, name: doc.name, isPdf: true })}
                        className="text-xs text-primary hover:underline">
                        🔍 {isTh ? "ดูเต็มจอ" : "Fullscreen"}
                      </button>
                    </div>
                  </div>
                )}
                {doc.dataUrl && !isImg && !isPdf && (
                  <div className="border-t border-border bg-muted/30 px-4 py-3">
                    <p className="text-xs text-muted-foreground">{isTh ? "ไม่สามารถแสดงตัวอย่างได้ — กด โหลด เพื่อเปิดไฟล์" : "No preview available — click Download to open"}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>

    {/* Lightbox modal */}
    {lightbox && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        onClick={() => setLightbox(null)}>
        <button onClick={() => setLightbox(null)}
          className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors">
          <X size={20} />
        </button>
        <p className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm font-medium truncate max-w-xs">{lightbox.name}</p>
        {lightbox.isPdf ? (
          <iframe src={lightbox.url} title={lightbox.name}
            className="w-full max-w-4xl h-[85vh] rounded-lg"
            onClick={e => e.stopPropagation()} />
        ) : (
          <img src={lightbox.url} alt={lightbox.name}
            className="max-w-full max-h-[85vh] rounded-lg object-contain"
            onClick={e => e.stopPropagation()} />
        )}
        <a href={lightbox.url} download={lightbox.name}
          className="absolute bottom-4 right-4 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20 transition-colors"
          onClick={e => e.stopPropagation()}>
          ⬇ Download
        </a>
      </div>
    )}
    </>
  );
}

// ── Overview ─────────────────────────────────────────────────────
function OverviewTab({ asset, isTh, fmtDate }: {
  asset: Asset; isTh: boolean; fmtDate: (d?: string | null) => string;
}) {
  const rows: Array<[string, React.ReactNode]> = [
    [isTh ? "หมายเลขสินทรัพย์" : "Asset Tag",   <span className="font-mono">{asset.asset_tag}</span>],
    [isTh ? "Serial Number"   : "Serial Number", asset.serial_number ?? "-"],
    [isTh ? "ประเภท"          : "Category",      asset.category ?? "-"],
    [isTh ? "ยี่ห้อ"          : "Brand",         asset.brand ?? "-"],
    [isTh ? "รุ่น"            : "Model",         asset.model_name ?? "-"],
    [isTh ? "สภาพ"            : "Condition",     (() => { const c = { excellent:"ดีเยี่ยม",good:"ดี",fair:"พอใช้",poor:"แย่" }; return isTh ? (c[asset.condition as keyof typeof c] ?? asset.condition ?? "-") : (asset.condition ?? "-"); })()],
    [isTh ? "รับประกันถึง"    : "Warranty Exp.", fmtDate(asset.warranty_expiry)],
    [isTh ? "มอบหมายให้"      : "Assigned To",   asset.assigned_to_name ?? "-"],
    [isTh ? "โต๊ะ"            : "Desk",          asset.seat_label ?? "-"],
    [isTh ? "ห้อง/พื้นที่"    : "Room",          asset.room_name ?? "-"],
    [isTh ? "ราคา"            : "Price",         asset.purchase_price ? `${Number(asset.purchase_price).toLocaleString()} ${asset.currency ?? "THB"}` : "-"],
    [isTh ? "หมายเหตุ"        : "Notes",         asset.notes ?? "-"],
  ];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value], i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : ""}>
              <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap w-40">{label}</td>
              <td className="px-4 py-2.5 text-foreground">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Network ───────────────────────────────────────────────────────
function NetworkTab({ asset, isTh }: { asset: Asset; isTh: boolean }) {
  const rows: Array<[string, string]> = [
    ["Hostname",    asset.hostname ?? "-"],
    ["IP Address",  asset.ip_address ?? "-"],
    ["MAC (LAN)",   asset.mac_address_eth ?? "-"],
    ["MAC (Wi-Fi)", asset.mac_address_wifi ?? "-"],
    
  ];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value], i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : ""}>
              <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap w-36 font-mono text-xs">{label}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-foreground">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tickets ───────────────────────────────────────────────────────
function TicketsTab({ tickets, assetId, isTh }: {
  tickets: Ticket[]; assetId: string; isTh: boolean;
}) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-12 flex flex-col items-center gap-3 text-muted-foreground">
        <AlertTriangle size={32} strokeWidth={1} />
        <p className="text-sm">{isTh ? "ยังไม่มีใบแจ้งปัญหา" : "No tickets yet"}</p>
        <Link href={`/tickets/new?asset_id=${assetId}`}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          {isTh ? "+ แจ้งปัญหา" : "+ New Ticket"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end mb-2">
        <Link href={`/tickets/new?asset_id=${assetId}`}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          {isTh ? "+ แจ้งปัญหาใหม่" : "+ New Ticket"}
        </Link>
      </div>
      {tickets.map(t => {
        const sc = TICKET_STATUS[t.status ?? "open"];
        return (
          <Link key={t.id} href={`/tickets/${t.id}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-accent/50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{t.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.ticket_number} · {t.type}</p>
            </div>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0", sc?.cls)}>
              {isTh ? sc?.th : sc?.en}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// ── History stub ──────────────────────────────────────────────────
function HistoryTab({ isTh }: { isTh: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <HistoryIcon size={32} strokeWidth={1} />
      <p className="text-sm">{isTh ? "ประวัติการเปลี่ยนแปลง (เร็วๆ นี้)" : "Change history (coming soon)"}</p>
    </div>
  );
}
