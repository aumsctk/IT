"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, X, UserCheck, Check, RotateCcw, Pencil } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { assetDB, employeeDB, type Asset } from "@/lib/supabaseDB";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<string, { th: string; en: string }> = {
  computer:       { th: "คอมพิวเตอร์",      en: "Computer"  },
  laptop:         { th: "โน้ตบุ๊ก",          en: "Laptop"    },
  monitor:        { th: "จอมอนิเตอร์",       en: "Monitor"   },
  printer:        { th: "เครื่องพิมพ์",      en: "Printer"   },
  network_device: { th: "อุปกรณ์เครือข่าย", en: "Network"   },
  ups:            { th: "UPS",               en: "UPS"       },
  peripheral:     { th: "อุปกรณ์ต่อพ่วง",   en: "Peripheral"},
  server:         { th: "เซิร์ฟเวอร์",       en: "Server"    },
  other:          { th: "อื่นๆ",              en: "Other"     },
};

type SurveyResult = {
  result: "confirmed" | "changed";
  from: string | null;
  to:   string | null;
  at:   string;
};
type Survey = { startedAt: string; results: Record<string, SurveyResult> };

const LS_KEY = "custody_survey_v1";
const loadSurvey = (): Survey => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { startedAt: new Date().toISOString(), results: {} };
};

export default function CustodySurveyPage() {
  const { locale } = useLanguage();
  const isTh = locale === "th";
  const { confirm, ConfirmUI } = useConfirm();

  const [assets, setAssets]     = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [survey, setSurvey]     = useState<Survey>({ startedAt: "", results: {} });
  const [search, setSearch]     = useState("");
  const [area, setArea]         = useState("all");
  const [pending, setPending]   = useState<"all" | "pending" | "done">("all");
  const [editing, setEditing]   = useState<string | null>(null); // asset id being changed
  const [newName, setNewName]   = useState("");

  useEffect(() => {
    setSurvey(loadSurvey());
    const load = () => {
      assetDB.getAll().then(setAssets);
      employeeDB.getAll().then(all => setEmployees(all.map(e => ({ id: e.id, full_name: e.full_name }))));
    };
    load();
    window.addEventListener("itam_assets_updated", load);
    return () => window.removeEventListener("itam_assets_updated", load);
  }, []);

  const saveSurvey = (s: Survey) => {
    setSurvey(s);
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
  };

  const active = useMemo(() => assets.filter(a => a.status !== "returned"), [assets]);
  const areas  = useMemo(() =>
    Array.from(new Set(active.map(a => a.room_name).filter(Boolean))).sort() as string[]
  , [active]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return active.filter(a => {
      if (area !== "all" && a.room_name !== area) return false;
      const done = !!survey.results[a.id];
      if (pending === "pending" && done) return false;
      if (pending === "done" && !done) return false;
      if (q && !(`${a.asset_tag} ${a.assigned_to_name ?? ""} ${a.seat_label ?? ""} ${a.brand ?? ""} ${a.model_name ?? ""}`.toLowerCase().includes(q))) return false;
      return true;
    }).sort((x, y) => (x.room_name ?? "").localeCompare(y.room_name ?? "", "th") || x.asset_tag.localeCompare(y.asset_tag));
  }, [active, survey, search, area, pending]);

  const doneCount      = active.filter(a => survey.results[a.id]).length;
  const changedCount   = active.filter(a => survey.results[a.id]?.result === "changed").length;
  const progressPct    = active.length ? Math.round((doneCount / active.length) * 100) : 0;

  function confirmHolder(a: Asset) {
    saveSurvey({
      ...survey,
      results: {
        ...survey.results,
        [a.id]: { result: "confirmed", from: a.assigned_to_name ?? null, to: a.assigned_to_name ?? null, at: new Date().toISOString() },
      },
    });
  }

  async function saveChange(a: Asset) {
    const name = newName.trim();
    const matched = employees.find(e => e.full_name === name);
    await assetDB.update(a.id, { assigned_to_name: name || null, assigned_to_id: matched?.id ?? null } as Partial<Asset>);
    saveSurvey({
      ...survey,
      results: {
        ...survey.results,
        [a.id]: { result: "changed", from: a.assigned_to_name ?? null, to: name || null, at: new Date().toISOString() },
      },
    });
    setEditing(null); setNewName("");
    window.dispatchEvent(new Event("itam_assets_updated"));
  }

  function undo(a: Asset) {
    const results = { ...survey.results };
    delete results[a.id];
    saveSurvey({ ...survey, results });
  }

  async function startNewRound() {
    const ok = await confirm({
      title: isTh ? "เริ่มสำรวจรอบใหม่? ผลการสำรวจรอบนี้จะถูกล้าง" : "Start a new survey round? Current results will be cleared",
      confirmLabel: isTh ? "เริ่มใหม่" : "Restart",
      danger: true,
    });
    if (!ok) return;
    saveSurvey({ startedAt: new Date().toISOString(), results: {} });
  }

  return (
    <div className="flex flex-col h-full">
      {ConfirmUI}

      {/* Header */}
      <div className="page-header bg-white">
        <div>
          <h1 className="page-title">{isTh ? "สำรวจผู้ถือครองทรัพย์สิน" : "Custody Survey"}</h1>
          <p className="page-sub">
            {isTh
              ? `ตรวจแล้ว ${doneCount}/${active.length} รายการ · เปลี่ยนผู้ถือครอง ${changedCount}`
              : `Checked ${doneCount}/${active.length} · holder changed ${changedCount}`}
            {survey.startedAt && ` · ${isTh ? "เริ่มรอบ" : "round started"} ${new Date(survey.startedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`}
          </p>
        </div>
        <button onClick={startNewRound}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
          <RotateCcw size={13} />
          {isTh ? "เริ่มรอบใหม่" : "New Round"}
        </button>
      </div>

      {/* Progress bar */}
      <div className="bg-white px-6 md:px-8 pb-3">
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar bg-white">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={isTh ? "ค้นหาเลขทรัพย์สิน / ชื่อผู้ถือครอง..." : "Search tag / holder..."}
            className="sp-input pl-8" />
        </div>
        <select value={area} onChange={e => setArea(e.target.value)} className="sp-select">
          <option value="all">{isTh ? "ทุกพื้นที่" : "All Areas"}</option>
          {areas.map(z => <option key={z} value={z}>{z}</option>)}
        </select>
        <select value={pending} onChange={e => setPending(e.target.value as any)} className="sp-select">
          <option value="all">{isTh ? "ทั้งหมด" : "All"}</option>
          <option value="pending">{isTh ? "รอตรวจ" : "Pending"}</option>
          <option value="done">{isTh ? "ตรวจแล้ว" : "Checked"}</option>
        </select>
        {(search || area !== "all" || pending !== "all") && (
          <button onClick={() => { setSearch(""); setArea("all"); setPending("all"); }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
            <X size={11} /> {isTh ? "ล้าง" : "Clear"}
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto mx-6 my-4 md:mx-8 sp-card">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <UserCheck size={32} strokeWidth={1.5} />
            <p className="text-sm font-medium">
              {active.length === 0
                ? (isTh ? "ยังไม่มีทรัพย์สินในระบบ — นำเข้าได้ที่หน้าตั้งค่า" : "No assets yet — import them in Settings")
                : (isTh ? "ไม่พบรายการ" : "No results")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {list.map(a => {
              const r = survey.results[a.id];
              const isEditing = editing === a.id;
              return (
                <div key={a.id} className={cn("px-5 py-3", r && (r.result === "changed" ? "bg-amber-50/60" : "bg-green-50/40"))}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-40 shrink-0">
                      <p className="font-mono text-[12px] font-bold text-slate-800">{a.asset_tag}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {(isTh ? CATEGORY_LABEL[a.category]?.th : CATEGORY_LABEL[a.category]?.en) ?? a.category}
                        {a.seat_label ? ` · ${a.seat_label}` : ""}
                      </p>
                    </div>

                    <div className="flex-1 min-w-[140px]">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{isTh ? "ผู้ถือครองปัจจุบัน" : "Current holder"}</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {a.assigned_to_name || <span className="italic text-slate-400">{isTh ? "ไม่ระบุ" : "Unassigned"}</span>}
                      </p>
                      {a.room_name && <p className="text-[10px] text-slate-400">{a.room_name}</p>}
                    </div>

                    {/* Result / actions */}
                    {r ? (
                      <div className="flex items-center gap-2 shrink-0">
                        {r.result === "confirmed" ? (
                          <span className="badge-green">{isTh ? "✓ ยืนยันคนเดิม" : "✓ Confirmed"}</span>
                        ) : (
                          <span className="badge-amber">
                            {isTh ? "เปลี่ยน:" : "Changed:"} {r.from ?? "—"} → {r.to ?? "—"}
                          </span>
                        )}
                        <button onClick={() => undo(a)}
                          className="text-[11px] text-slate-400 hover:text-slate-600 underline">
                          {isTh ? "แก้" : "Undo"}
                        </button>
                      </div>
                    ) : isEditing ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <input list="survey-emp" value={newName} autoFocus
                          onChange={e => setNewName(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && saveChange(a)}
                          placeholder={isTh ? "ชื่อผู้ถือครองใหม่..." : "New holder..."}
                          className="sp-input w-48" />
                        <button onClick={() => saveChange(a)}
                          className="rounded-lg bg-indigo-600 text-white text-xs font-semibold px-3 py-2 hover:bg-indigo-700 transition-colors">
                          {isTh ? "บันทึก" : "Save"}
                        </button>
                        <button onClick={() => { setEditing(null); setNewName(""); }}
                          className="text-xs text-slate-400 hover:text-slate-600">
                          {isTh ? "ยกเลิก" : "Cancel"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => confirmHolder(a)}
                          className="flex items-center gap-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold px-3 py-2 hover:bg-green-700 transition-colors">
                          <Check size={13} /> {isTh ? "ยังเป็นคนเดิม" : "Still correct"}
                        </button>
                        <button onClick={() => { setEditing(a.id); setNewName(a.assigned_to_name ?? ""); }}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 px-3 py-2 hover:bg-slate-50 transition-colors">
                          <Pencil size={12} /> {isTh ? "เปลี่ยนผู้ถือครอง" : "Change holder"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <datalist id="survey-emp">
          {employees.map(e => <option key={e.id} value={e.full_name} />)}
        </datalist>
      </div>
    </div>
  );
}
