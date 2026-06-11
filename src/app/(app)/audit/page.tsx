"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ClipboardCheck, Trash2, CheckCircle2, Clock } from "lucide-react";
import { auditDB, type AuditSession } from "@/lib/supabaseDB";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { cn } from "@/lib/utils";

export default function AuditPage() {
  const { locale } = useLanguage();
  const isTh = locale === "th";
  const [sessions, setSessions] = useState<AuditSession[]>([]);
  const { confirm, ConfirmUI } = useConfirm();

  useEffect(() => { auditDB.getSessions().then(setSessions); }, []);

  async function deleteSession(id: string) {
    const ok = await confirm({
      title: isTh ? "ลบรอบตรวจนับนี้?" : "Delete this audit session?",
      message: isTh ? "ข้อมูลการสแกนทั้งหมดจะถูกลบถาวร" : "All scan data will be permanently removed.",
      confirmLabel: isTh ? "ลบ" : "Delete",
      danger: true,
    });
    if (!ok) return;
    await auditDB.deleteSession(id);
    auditDB.getSessions().then(setSessions);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {ConfirmUI}

      {/* Header */}
      <div className="page-header bg-white">
        <div>
          <h1 className="page-title">{isTh ? "ตรวจสอบทรัพย์สิน" : "Physical Audit"}</h1>
          <p className="page-sub">{isTh ? "ตรวจนับสินทรัพย์จริงและเปรียบเทียบกับระบบ" : "Scan assets and compare against records"}</p>
        </div>
        <Link href="/audit/new" className="sp-btn-primary">
          <Plus size={14} />
          {isTh ? "เริ่มรอบใหม่" : "New Audit"}
        </Link>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto px-6 md:px-8 py-5">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 pb-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <ClipboardCheck size={28} strokeWidth={1.5} className="text-slate-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-600">{isTh ? "ยังไม่มีรอบการตรวจนับ" : "No audit sessions yet"}</p>
              <p className="text-xs text-slate-400 mt-1">{isTh ? "กดเริ่มรอบใหม่เพื่อเริ่มสแกน" : "Start a new session to begin scanning"}</p>
            </div>
            <Link href="/audit/new" className="sp-btn-secondary mt-2">
              <Plus size={14} />
              {isTh ? "เริ่มรอบใหม่" : "New Audit"}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const sum = s.summary_json;
              const progress = sum ? Math.round((sum.matched / Math.max(sum.matched + sum.missing, 1)) * 100) : null;
              return (
                <div key={s.id} className="sp-card group flex items-center gap-4 p-4 hover:shadow-md transition-all">
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                    s.is_complete ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {s.is_complete ? <CheckCircle2 size={20} strokeWidth={1.75} /> : <Clock size={20} strokeWidth={1.75} />}
                  </div>

                  <Link href={`/audit/${s.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-slate-900">{s.name}</p>
                      <span className={cn("badge", s.is_complete ? "badge-green" : "badge-amber")}>
                        {s.is_complete ? (isTh ? "เสร็จสิ้น" : "Complete") : (isTh ? "กำลังดำเนินการ" : "In Progress")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(s.started_at).toLocaleDateString(isTh ? "th-TH" : "en-GB", {
                        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                    {sum && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-[120px]">
                          <div className={cn("h-full rounded-full", sum.missing > 0 ? "bg-amber-400" : "bg-green-500")}
                            style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">{progress}%</span>
                        <span className="text-[10px] font-semibold text-green-600">{sum.matched} {isTh ? "พบ" : "found"}</span>
                        {sum.missing > 0 && <span className="text-[10px] font-semibold text-red-500">{sum.missing} {isTh ? "หาย" : "missing"}</span>}
                        {sum.extra > 0 && <span className="text-[10px] font-semibold text-amber-600">+{sum.extra} extra</span>}
                      </div>
                    )}
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    {!s.is_complete && (
                      <Link href={`/audit/${s.id}/scan`}
                        className="sp-btn-secondary text-[12px] opacity-0 group-hover:opacity-100 transition-all">
                        {isTh ? "สแกนต่อ" : "Resume"}
                      </Link>
                    )}
                    <button onClick={() => deleteSession(s.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
