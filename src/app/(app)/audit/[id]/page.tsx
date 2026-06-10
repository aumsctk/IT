"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ScanLine } from "lucide-react";
import { auditDB, assetDB, type AuditSession, type AuditItem, type Asset } from "@/lib/supabaseDB";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const FINDING_COLORS: Record<string, string> = {
  matched:       "bg-green-500/15 text-green-700",
  missing:       "bg-red-500/15 text-red-700",
  extra:         "bg-amber-500/15 text-amber-700",
  damaged:       "bg-orange-500/15 text-orange-700",
  wrong_location:"bg-blue-500/15 text-blue-700",
};
const FINDING_ORDER = ["missing","extra","wrong_location","damaged","matched"];

export default function AuditReportPage() {
  const { id } = useParams<{ id: string }>();
  const { locale } = useLanguage();
  const isTh = locale === "th";
  const [session, setSession] = useState<AuditSession | null | "loading">("loading");
  const [items, setItems] = useState<AuditItem[]>([]);
  const [assetMap, setAssetMap] = useState<Record<string, Asset>>({});

  useEffect(() => {
    auditDB.getSession(id).then(s => {
      setSession(s);
      if (s) {
        auditDB.getItems(id).then(its => {
          setItems(its);
          // Pre-load assets for all items with asset_id
          const ids = [...new Set(its.map(i => i.asset_id).filter(Boolean) as string[])];
          Promise.all(ids.map(aid => assetDB.getById(aid))).then(results => {
            const map: Record<string, Asset> = {};
            results.forEach((a, i) => { if (a) map[ids[i]] = a; });
            setAssetMap(map);
          });
        });
      }
    });
  }, [id]);

  if (session === "loading") return null;
  if (!session) return <div className="p-8 text-center text-muted-foreground">{isTh ? "ไม่พบรอบตรวจนับ" : "Session not found"}</div>;

  const sum = session.summary_json;
  const grouped = items.reduce<Record<string, AuditItem[]>>((acc, i) => {
    acc[i.finding] = [...(acc[i.finding] ?? []), i];
    return acc;
  }, {});

  const FINDING_LABEL: Record<string, string> = {
    matched: isTh ? "พบแล้ว" : "Matched",
    missing: isTh ? "ไม่พบ" : "Missing",
    extra: isTh ? "ไม่ได้อยู่ในระบบ" : "Extra",
    damaged: isTh ? "ชำรุด" : "Damaged",
    wrong_location: isTh ? "ผิดสถานที่" : "Wrong Location",
  };

  return (
    <div className="px-4 py-6 space-y-6">
      <Link href="/audit" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> {isTh ? "รอบตรวจนับ" : "Audit Sessions"}
      </Link>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-base font-semibold">{session.name}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(session.started_at).toLocaleDateString(isTh ? "th-TH" : "en-GB", { day: "2-digit", month: "long", year: "numeric" })}
              {session.notes ? ` · ${session.notes}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!session.is_complete && (
              <Link href={`/audit/${id}/scan`}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                <ScanLine size={13} /> {isTh ? "ต่อการสแกน" : "Resume Scan"}
              </Link>
            )}
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${session.is_complete ? "bg-green-500/15 text-green-700" : "bg-amber-500/15 text-amber-700"}`}>
              {session.is_complete ? (isTh ? "เสร็จสิ้น" : "Complete") : (isTh ? "กำลังดำเนินการ" : "In Progress")}
            </span>
          </div>
        </div>

        {sum && (
          <div className="flex flex-wrap gap-3">
            {[
              { key: "total",   label: isTh ? "ทั้งหมด" : "Expected",  cls: "bg-slate-100 text-slate-700" },
              { key: "matched", label: isTh ? "พบแล้ว"  : "Matched",   cls: "bg-green-100 text-green-700" },
              { key: "missing", label: isTh ? "ไม่พบ"   : "Missing",   cls: "bg-red-100 text-red-700" },
              { key: "extra",   label: isTh ? "นอกรายการ": "Extra",    cls: "bg-amber-100 text-amber-700" },
            ].map(({ key, label, cls }) => (
              <div key={key} className={`flex flex-col items-center rounded-xl px-5 py-3 min-w-[80px] ${cls}`}>
                <span className="text-2xl font-bold">{(sum as any)[key] ?? 0}</span>
                <span className="text-xs font-medium mt-0.5">{label}</span>
              </div>
            ))}
          </div>
        )}

        {sum && sum.total > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{isTh ? "ความแม่นยำ" : "Accuracy"}</span>
              <span>{Math.round((sum.matched / sum.total) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(sum.matched / sum.total) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {FINDING_ORDER.filter((f) => grouped[f]?.length > 0).map((finding) => (
        <div key={finding} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${FINDING_COLORS[finding] ?? "bg-muted text-muted-foreground"}`}>
              {FINDING_LABEL[finding] ?? finding}
            </span>
            <span>{grouped[finding].length} {isTh ? "รายการ" : "items"}</span>
          </h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {grouped[finding].map((item) => {
                  const asset = item.asset_id ? assetMap[item.asset_id] ?? null : null;
                  return (
                    <tr key={item.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-medium">{item.asset_tag_scanned}</span>
                        {asset && <span className="text-xs text-muted-foreground ml-2">{asset.brand} {asset.model_name}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                        {finding === "missing" ? (isTh ? "คาดว่าอยู่ที่นี่แต่ไม่พบ" : "Expected but not found") : item.notes ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                        {new Date(item.scanned_at).toLocaleTimeString(isTh ? "th-TH" : "en-GB")}
                      </td>
                      {asset && (
                        <td className="px-4 py-3">
                          <Link href={`/assets/${asset.id}`} className="text-xs text-primary hover:underline">
                            {isTh ? "ดูสินทรัพย์ →" : "View Asset →"}
                          </Link>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ScanLine size={36} strokeWidth={1} />
          <p className="mt-3 text-sm">{isTh ? "ยังไม่มีการสแกน" : "No items scanned yet"}</p>
          <Link href={`/audit/${id}/scan`} className="mt-3 text-sm text-primary hover:underline">
            {isTh ? "เริ่มสแกน →" : "Start scanning →"}
          </Link>
        </div>
      )}
    </div>
  );
}
