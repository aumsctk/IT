"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ticketDB, assetDB, employeeDB, type Asset, type Employee } from "@/lib/supabaseDB";
import { useConfirm } from "@/components/ui/ConfirmDialog";

const TICKET_TYPES = [
  { value: "repair",      th: "แจ้งซ่อม",          en: "Repair" },
  { value: "relocation",  th: "ย้ายที่นั่ง",        en: "Relocation" },
  { value: "new_request", th: "เบิกทรัพย์สินใหม่",   en: "New Request" },
  { value: "retire",      th: "คืน/เลิกใช้งาน",    en: "Retire/Return" },
  { value: "other",       th: "อื่นๆ",               en: "Other" },
];

const PRIORITIES = [
  { value: "low",      th: "ต่ำ",      en: "Low" },
  { value: "medium",   th: "ปานกลาง", en: "Medium" },
  { value: "high",     th: "สูง",      en: "High" },
  { value: "critical", th: "เร่งด่วน", en: "Critical" },
];

export default function NewTicketPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { locale } = useLanguage();
  const isTh = locale === "th";
  const { confirm, ConfirmUI } = useConfirm();

  const [saving, setSaving] = useState(false);
  const [assets, setAssets]       = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({
    type:        "repair",
    priority:    "medium",
    title:       "",
    description: "",
    asset_id:    "",
    reporter_id: "",
  });

  useEffect(() => {
    (async () => {
    assetDB.getAll().then(setAssets);
    employeeDB.getAll().then(setEmployees);

    const assetTag = params.get("asset_tag");
    const assetId  = params.get("asset_id");
    const desk     = params.get("desk");

    if (assetTag || assetId) {
      const found = assetTag
        ? (await assetDB.getAll()).find(a => a.asset_tag === assetTag)
        : assetId ? await assetDB.getById(assetId) : null;
      if (found) {
        setForm(f => ({
          ...f,
          asset_id:    found.id,
          title:       isTh
            ? `แจ้งซ่อม ${found.asset_tag}${desk ? ` (${desk})` : ""}`
            : `Repair ${found.asset_tag}${desk ? ` (${desk})` : ""}`,
          description: isTh
            ? `สินทรัพย์: ${found.asset_tag} ${found.brand ?? ""} ${found.model_name ?? ""}${desk ? `\nโต๊ะ: ${desk}` : ""}`
            : `Asset: ${found.asset_tag} ${found.brand ?? ""} ${found.model_name ?? ""}${desk ? `\nDesk: ${desk}` : ""}`,
        }));
      }
    }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const ok = await confirm({
      title: isTh ? "สร้างใบแจ้งงาน?" : "Create ticket?",
      message: isTh ? `สร้างใบแจ้งงาน "${form.title}"` : `Create ticket "${form.title}"`,
      confirmLabel: isTh ? "สร้าง" : "Create",
    });
    if (!ok) return;

    setSaving(true);
    try {
      const reporter = form.reporter_id ? await employeeDB.getById(form.reporter_id) : null;
      const ticketAsset = form.asset_id ? await assetDB.getById(form.asset_id) : null;
      await ticketDB.create({
        type:           form.type as never,
        priority:       form.priority as never,
        title:          form.title,
        description:    form.description,
        status:         "open",
        asset_id:       form.asset_id || null,
        asset_tag:      ticketAsset?.asset_tag ?? "",
        reporter_name:  reporter ? reporter.full_name : "",
      });
      // Sync asset status on ticket creation
      if (form.asset_id) {
        const isRepair = ["repair", "maintenance"].includes(form.type);
        if (isRepair) {
          await assetDB.update(form.asset_id, { status: "under_repair" });
          window.dispatchEvent(new Event("itam_assets_updated"));
        }
      }
      router.push("/tickets");
    } finally {
      setSaving(false);
    }
  };

  const inp = "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30";
  const sel = "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      {ConfirmUI}

      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">
          {isTh ? "แจ้งงาน / แจ้งซ่อม" : "New Ticket"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isTh ? "กรอกรายละเอียดปัญหาหรือคำขอ" : "Fill in problem or request details"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-5">

        {/* Type + Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              {isTh ? "ประเภท" : "Type"}
            </label>
            <select value={form.type} onChange={e => set("type", e.target.value)} className={sel}>
              {TICKET_TYPES.map(t => (
                <option key={t.value} value={t.value}>{isTh ? t.th : t.en}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              {isTh ? "ความเร่งด่วน" : "Priority"}
            </label>
            <select value={form.priority} onChange={e => set("priority", e.target.value)} className={sel}>
              {PRIORITIES.map(p => (
                <option key={p.value} value={p.value}>{isTh ? p.th : p.en}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-muted-foreground">
            {isTh ? "หัวข้อ *" : "Title *"}
          </label>
          <input
            value={form.title}
            onChange={e => set("title", e.target.value)}
            placeholder={isTh ? "อธิบายปัญหาสั้นๆ..." : "Brief description..."}
            required
            className={inp}
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-muted-foreground">
            {isTh ? "รายละเอียด" : "Description"}
          </label>
          <textarea
            value={form.description}
            onChange={e => set("description", e.target.value)}
            rows={4}
            placeholder={isTh ? "รายละเอียดเพิ่มเติม..." : "Additional details..."}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        {/* Asset */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-muted-foreground">
            {isTh ? "สินทรัพย์ที่เกี่ยวข้อง" : "Related Asset"}
          </label>
          <select value={form.asset_id} onChange={e => set("asset_id", e.target.value)} className={sel}>
            <option value="">{isTh ? "— ไม่ระบุ —" : "— None —"}</option>
            {assets.filter(a => a.status !== "returned").map(a => (
              <option key={a.id} value={a.id}>
                {a.asset_tag} — {a.brand ?? ""} {a.model_name ?? ""}
              </option>
            ))}
          </select>
        </div>

        {/* Reporter */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-muted-foreground">
            {isTh ? "ผู้แจ้ง" : "Reporter"}
          </label>
          <select value={form.reporter_id} onChange={e => set("reporter_id", e.target.value)} className={sel}>
            <option value="">{isTh ? "— ไม่ระบุ —" : "— None —"}</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.emp_code} — {emp.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            {isTh ? "ยกเลิก" : "Cancel"}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? (isTh ? "กำลังสร้าง..." : "Creating...") : (isTh ? "สร้างใบแจ้งงาน" : "Create Ticket")}
          </button>
        </div>
      </form>
    </div>
  );
}
