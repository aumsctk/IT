"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, X, UserCheck, Check, RotateCcw, Pencil, Printer, History, ChevronDown } from "lucide-react";
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
const catTh = (c: string) => CATEGORY_LABEL[c]?.th ?? c;

type SurveyResult = {
  result: "confirmed" | "changed";
  from: string | null;
  to:   string | null;
  at:   string;
};
type RItem = {
  id: string; tag: string; category: string;
  seat: string | null; room: string | null; holder: string | null;
  result?: SurveyResult;
};
type Round = {
  id: string; no: number;
  startedAt: string; closedAt?: string;
  results: Record<string, SurveyResult>;
  items?: RItem[];               // snapshot ตอนปิดรอบ
};
type Store = { rounds: Round[]; currentId: string };

const LS_KEY = "custody_rounds_v1";
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
    // migrate รุ่นเก่า
    const old = localStorage.getItem("custody_survey_v1");
    if (old) {
      const o = JSON.parse(old);
      const r: Round = { id: uid(), no: 1, startedAt: o.startedAt ?? new Date().toISOString(), results: o.results ?? {} };
      return { rounds: [r], currentId: r.id };
    }
  } catch {}
  const r: Round = { id: uid(), no: 1, startedAt: new Date().toISOString(), results: {} };
  return { rounds: [r], currentId: r.id };
}

const fmtTh = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "";

export default function CustodySurveyPage() {
  const { locale } = useLanguage();
  const isTh = locale === "th";
  const { confirm, ConfirmUI } = useConfirm();

  const [assets, setAssets]       = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [store, setStore]         = useState<Store>({ rounds: [], currentId: "" });
  const [viewId, setViewId]       = useState("");
  const [search, setSearch]       = useState("");
  const [area, setArea]           = useState("all");
  const [pending, setPending]     = useState<"all" | "pending" | "done">("all");
  const [editing, setEditing]     = useState<string | null>(null);
  const [newName, setNewName]     = useState("");

  useEffect(() => {
    const s = loadStore();
    setStore(s); setViewId(s.currentId);
    const load = () => {
      assetDB.getAll().then(setAssets);
      employeeDB.getAll().then(all => setEmployees(all.map(e => ({ id: e.id, full_name: e.full_name }))));
    };
    load();
    window.addEventListener("itam_assets_updated", load);
    return () => window.removeEventListener("itam_assets_updated", load);
  }, []);

  const save = (s: Store) => {
    setStore(s);
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
  };

  const current  = store.rounds.find(r => r.id === store.currentId);
  const viewing  = store.rounds.find(r => r.id === viewId) ?? current;
  const readOnly = !!viewing?.closedAt;

  // ── รายการของรอบที่กำลังดู ──
  const items: RItem[] = useMemo(() => {
    if (!viewing) return [];
    if (viewing.closedAt && viewing.items) return viewing.items;
    return assets
      .filter(a => a.status !== "returned")
      .map(a => ({
        id: a.id, tag: a.asset_tag, category: a.category,
        seat: a.seat_label, room: a.room_name, holder: a.assigned_to_name,
        result: viewing.results[a.id],
      }));
  }, [viewing, assets]);

  const areas = useMemo(() =>
    Array.from(new Set(items.map(i => i.room).filter(Boolean))).sort() as string[]
  , [items]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      if (area !== "all" && i.room !== area) return false;
      if (pending === "pending" && i.result) return false;
      if (pending === "done" && !i.result) return false;
      if (q && !(`${i.tag} ${i.holder ?? ""} ${i.seat ?? ""}`.toLowerCase().includes(q))) return false;
      return true;
    }).sort((x, y) => (x.room ?? "").localeCompare(y.room ?? "", "th") || x.tag.localeCompare(y.tag));
  }, [items, search, area, pending]);

  const stats = useMemo(() => {
    const total     = items.length;
    const checked   = items.filter(i => i.result).length;
    const confirmed = items.filter(i => i.result?.result === "confirmed").length;
    const changed   = items.filter(i => i.result?.result === "changed").length;
    return { total, checked, confirmed, changed, pending: total - checked,
      pct: total ? Math.round((checked / total) * 100) : 0 };
  }, [items]);

  // ── actions (เฉพาะรอบปัจจุบัน) ──
  const setResult = (id: string, r: SurveyResult | null) => {
    if (!current) return;
    const results = { ...current.results };
    if (r) results[id] = r; else delete results[id];
    save({ ...store, rounds: store.rounds.map(x => x.id === current.id ? { ...x, results } : x) });
  };

  function confirmHolder(i: RItem) {
    setResult(i.id, { result: "confirmed", from: i.holder, to: i.holder, at: new Date().toISOString() });
  }

  async function saveChange(i: RItem) {
    const name = newName.trim();
    const matched = employees.find(e => e.full_name === name);
    await assetDB.update(i.id, { assigned_to_name: name || null, assigned_to_id: matched?.id ?? null } as Partial<Asset>);
    setResult(i.id, { result: "changed", from: i.holder, to: name || null, at: new Date().toISOString() });
    setEditing(null); setNewName("");
    window.dispatchEvent(new Event("itam_assets_updated"));
  }

  async function closeRound() {
    if (!current) return;
    const ok = await confirm({
      title: isTh
        ? `ปิดรอบที่ ${current.no} และเริ่มรอบใหม่? ผลรอบนี้จะถูกเก็บไว้ดูย้อนหลังได้`
        : `Close round ${current.no} and start a new one? Results will be archived`,
      confirmLabel: isTh ? "ปิดรอบ & เริ่มรอบใหม่" : "Close & Start New",
    });
    if (!ok) return;
    // snapshot รายการทั้งหมด ณ เวลาปิดรอบ
    const snapshot: RItem[] = assets
      .filter(a => a.status !== "returned")
      .map(a => ({
        id: a.id, tag: a.asset_tag, category: a.category,
        seat: a.seat_label, room: a.room_name, holder: a.assigned_to_name,
        result: current.results[a.id],
      }));
    const closed: Round = { ...current, closedAt: new Date().toISOString(), items: snapshot };
    const next: Round = { id: uid(), no: Math.max(...store.rounds.map(r => r.no)) + 1, startedAt: new Date().toISOString(), results: {} };
    const s: Store = { rounds: [...store.rounds.map(r => r.id === current.id ? closed : r), next], currentId: next.id };
    save(s); setViewId(next.id);
  }

  // ── พิมพ์รายงาน ──
  function printReport() {
    if (!viewing) return;
    const r = viewing;
    const byArea = new Map<string, RItem[]>();
    for (const i of items) {
      const k = i.room ?? "ไม่ระบุพื้นที่";
      if (!byArea.has(k)) byArea.set(k, []);
      byArea.get(k)!.push(i);
    }
    const resultCell = (i: RItem) => {
      if (!i.result) return `<span class="pill pill-gray">ไม่ได้ตรวจ</span>`;
      if (i.result.result === "confirmed") return `<span class="pill pill-green">✓ ยืนยันคนเดิม</span>`;
      return `<span class="pill pill-amber">เปลี่ยน: ${i.result.from ?? "—"} → ${i.result.to ?? "—"}</span>`;
    };
    const sections = Array.from(byArea.entries()).map(([areaName, rows]) => `
      <h2>${areaName} <span class="count">(${rows.length} รายการ)</span></h2>
      <table>
        <thead><tr>
          <th style="width:110px">เลขทรัพย์สิน</th><th style="width:100px">ประเภท</th>
          <th>ที่นั่ง</th><th>ผู้ถือครอง</th><th style="width:200px">ผลการตรวจ</th><th style="width:80px">วันที่ตรวจ</th>
        </tr></thead>
        <tbody>
          ${rows.sort((a,b)=>a.tag.localeCompare(b.tag)).map(i => `
            <tr>
              <td class="mono">${i.tag}</td>
              <td>${catTh(i.category)}</td>
              <td>${i.seat ?? "—"}</td>
              <td><b>${(i.result?.result === "changed" ? i.result.to : i.holder) ?? "<i>ไม่ระบุ</i>"}</b></td>
              <td>${resultCell(i)}</td>
              <td>${i.result ? fmtTh(i.result.at) : "—"}</td>
            </tr>`).join("")}
        </tbody>
      </table>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>รายงานสำรวจผู้ถือครองทรัพย์สิน — รอบที่ ${r.no}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  @page{size:A4 portrait;margin:14mm;}
  body{font-family:'Sarabun','Noto Sans Thai','Segoe UI',sans-serif;color:#0f172a;font-size:11px;line-height:1.5;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #4f46e5;padding-bottom:10px;margin-bottom:14px;}
  .head h1{font-size:18px;color:#1e1b4b;letter-spacing:-0.3px;}
  .head .sub{font-size:10px;color:#64748b;margin-top:3px;}
  .brand{display:flex;align-items:center;gap:8px;}
  .logo{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#6366f1,#7c3aed);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px;}
  .meta{text-align:right;font-size:10px;color:#475569;}
  .stats{display:flex;gap:8px;margin-bottom:16px;}
  .stat{flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:8px 12px;background:#f8fafc;}
  .stat .n{font-size:18px;font-weight:800;}
  .stat .l{font-size:9px;color:#64748b;margin-top:1px;}
  .n-green{color:#16a34a;}.n-amber{color:#d97706;}.n-gray{color:#64748b;}.n-indigo{color:#4f46e5;}
  h2{font-size:12px;margin:14px 0 6px;color:#1e1b4b;border-left:4px solid #6366f1;padding-left:8px;}
  h2 .count{font-weight:400;color:#94a3b8;font-size:10px;}
  table{width:100%;border-collapse:collapse;margin-bottom:4px;}
  th{background:#eef2ff;color:#3730a3;text-align:left;padding:5px 8px;font-size:9.5px;text-transform:uppercase;letter-spacing:0.4px;border-bottom:1.5px solid #c7d2fe;}
  td{padding:4.5px 8px;border-bottom:1px solid #f1f5f9;vertical-align:top;}
  tr:nth-child(even) td{background:#fafbff;}
  .mono{font-family:'Consolas',monospace;font-weight:700;color:#312e81;}
  .pill{display:inline-block;border-radius:99px;padding:1.5px 8px;font-size:9px;font-weight:700;}
  .pill-green{background:#dcfce7;color:#15803d;}
  .pill-amber{background:#fef3c7;color:#b45309;}
  .pill-gray{background:#f1f5f9;color:#64748b;}
  .sign{display:flex;gap:40px;margin-top:36px;page-break-inside:avoid;}
  .sigbox{flex:1;text-align:center;}
  .sigline{border-bottom:1px dotted #94a3b8;height:40px;margin-bottom:6px;}
  .sigbox p{font-size:10px;color:#475569;}
  .foot{margin-top:18px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between;}
</style></head><body>
<div class="head">
  <div class="brand">
    <div class="logo">IT</div>
    <div>
      <h1>รายงานสำรวจผู้ถือครองทรัพย์สิน</h1>
      <div class="sub">ศูนย์ฯนครราชสีมา · รอบที่ ${r.no} · เริ่ม ${fmtTh(r.startedAt)}${r.closedAt ? ` · ปิดรอบ ${fmtTh(r.closedAt)}` : " · (รอบปัจจุบัน — ยังไม่ปิดรอบ)"}</div>
    </div>
  </div>
  <div class="meta">พิมพ์เมื่อ ${new Date().toLocaleDateString("th-TH",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
</div>
<div class="stats">
  <div class="stat"><div class="n n-indigo">${stats.total}</div><div class="l">ทรัพย์สินทั้งหมด</div></div>
  <div class="stat"><div class="n">${stats.checked}</div><div class="l">ตรวจแล้ว (${stats.pct}%)</div></div>
  <div class="stat"><div class="n n-green">${stats.confirmed}</div><div class="l">ยืนยันคนเดิม</div></div>
  <div class="stat"><div class="n n-amber">${stats.changed}</div><div class="l">เปลี่ยนผู้ถือครอง</div></div>
  <div class="stat"><div class="n n-gray">${stats.pending}</div><div class="l">ยังไม่ได้ตรวจ</div></div>
</div>
${sections}
<div class="sign">
  <div class="sigbox"><div class="sigline"></div><p>ผู้สำรวจ</p><p>วันที่ ............................</p></div>
  <div class="sigbox"><div class="sigline"></div><p>ผู้ตรวจสอบ</p><p>วันที่ ............................</p></div>
  <div class="sigbox"><div class="sigline"></div><p>ผู้อนุมัติ</p><p>วันที่ ............................</p></div>
</div>
<div class="foot"><span>IT Asset Manager — Custody Survey Report</span><span>รอบที่ ${r.no}</span></div>
</body></html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { alert(isTh ? "เบราว์เซอร์บล็อกป๊อปอัป — กรุณาอนุญาตป๊อปอัปแล้วลองใหม่" : "Popup blocked"); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { try { win.focus(); win.print(); } catch {} }, 500);
  }

  // ════════════════════════ UI ════════════════════════
  return (
    <div className="flex flex-col h-full">
      {ConfirmUI}

      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)", boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}>
            <UserCheck size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="page-title truncate">{isTh ? "สำรวจผู้ถือครองทรัพย์สิน" : "Custody Survey"}</h1>
            <p className="page-sub">
              {viewing ? (isTh
                ? `รอบที่ ${viewing.no} · เริ่ม ${fmtTh(viewing.startedAt)}${viewing.closedAt ? ` · ปิดรอบแล้ว ${fmtTh(viewing.closedAt)}` : " · กำลังสำรวจ"}`
                : "") : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {/* Round selector */}
          <div className="relative">
            <select value={viewId} onChange={e => setViewId(e.target.value)} className="sp-select pr-8 appearance-none">
              {[...store.rounds].sort((a, b) => b.no - a.no).map(r => (
                <option key={r.id} value={r.id}>
                  {isTh ? `รอบที่ ${r.no}` : `Round ${r.no}`} — {fmtTh(r.startedAt)}{r.closedAt ? "" : (isTh ? " (ปัจจุบัน)" : " (current)")}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <button onClick={printReport} className="sp-btn-secondary text-xs">
            <Printer size={13} /> {isTh ? "พิมพ์รายงาน" : "Print Report"}
          </button>
          {!readOnly && (
            <button onClick={closeRound} className="sp-btn-primary text-xs">
              <RotateCcw size={13} /> {isTh ? "ปิดรอบ & เริ่มรอบใหม่" : "Close & New Round"}
            </button>
          )}
        </div>
      </div>

      {/* Stats + progress */}
      <div className="px-6 md:px-8 pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard n={stats.total}     l={isTh ? "ทั้งหมด" : "Total"}        color="text-slate-800" />
          <StatCard n={stats.checked}   l={isTh ? `ตรวจแล้ว ${stats.pct}%` : `Checked ${stats.pct}%`} color="text-indigo-600" />
          <StatCard n={stats.confirmed} l={isTh ? "ยืนยันคนเดิม" : "Confirmed"} color="text-green-600" />
          <StatCard n={stats.changed}   l={isTh ? "เปลี่ยนคน" : "Changed"}     color="text-amber-600" />
          <StatCard n={stats.pending}   l={isTh ? "ยังไม่ตรวจ" : "Pending"}    color="text-slate-400" />
        </div>
        <div className="h-2 rounded-full bg-slate-900/5 overflow-hidden mt-3">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${stats.pct}%`, background: "linear-gradient(90deg,#34d399,#10b981)" }} />
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 md:px-8 pt-3 pb-1 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
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
          <button onClick={() => { setSearch(""); setArea("all"); setPending("all"); }} className="sp-btn-ghost text-xs">
            <X size={11} /> {isTh ? "ล้าง" : "Clear"}
          </button>
        )}
        {readOnly && (
          <span className="badge-slate inline-flex items-center gap-1">
            <History size={10} /> {isTh ? "รอบที่ปิดแล้ว — ดูอย่างเดียว" : "Closed round — read only"}
          </span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto px-6 md:px-8 py-4 space-y-4">
        {list.length === 0 ? (
          <div className="sp-card flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <UserCheck size={32} strokeWidth={1.5} />
            <p className="text-sm font-medium">
              {items.length === 0
                ? (isTh ? "ยังไม่มีทรัพย์สินในระบบ — นำเข้าได้ที่หน้าตั้งค่า" : "No assets yet")
                : (isTh ? "ไม่พบรายการ" : "No results")}
            </p>
          </div>
        ) : (
          groupByArea(list).map(([areaName, rows]) => (
            <div key={areaName} className="sp-card overflow-hidden">
              <div className="px-5 py-3 flex items-center gap-2 border-b border-slate-200/50">
                <span className="w-2 h-2 rounded-full" style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }} />
                <span className="text-sm font-bold text-slate-800">{areaName}</span>
                <span className="text-[11px] text-slate-400">
                  {rows.filter(r => r.result).length}/{rows.length} {isTh ? "ตรวจแล้ว" : "checked"}
                </span>
              </div>
              <div className="divide-y divide-slate-100/80">
                {rows.map(i => {
                  const r = i.result;
                  const isEditing = editing === i.id;
                  return (
                    <div key={i.id} className={cn("px-5 py-3 transition-colors",
                      r && (r.result === "changed" ? "bg-amber-50/50" : "bg-green-50/40"))}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="w-36 shrink-0">
                          <p className="font-mono text-[12px] font-bold text-slate-800">{i.tag}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {catTh(i.category)}{i.seat ? ` · ${i.seat}` : ""}
                          </p>
                        </div>
                        <div className="flex-1 min-w-[130px]">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wide">{isTh ? "ผู้ถือครอง" : "Holder"}</p>
                          <p className="text-sm font-semibold text-slate-800">
                            {(r?.result === "changed" ? r.to : i.holder) ||
                              <span className="italic text-slate-400">{isTh ? "ไม่ระบุ" : "Unassigned"}</span>}
                          </p>
                        </div>

                        {r ? (
                          <div className="flex items-center gap-2 shrink-0">
                            {r.result === "confirmed" ? (
                              <span className="badge-green">✓ {isTh ? "ยืนยันคนเดิม" : "Confirmed"} · {fmtTh(r.at)}</span>
                            ) : (
                              <span className="badge-amber">{isTh ? "เปลี่ยน:" : "Changed:"} {r.from ?? "—"} → {r.to ?? "—"} · {fmtTh(r.at)}</span>
                            )}
                            {!readOnly && (
                              <button onClick={() => setResult(i.id, null)}
                                className="text-[11px] text-slate-400 hover:text-slate-600 underline">
                                {isTh ? "แก้" : "Undo"}
                              </button>
                            )}
                          </div>
                        ) : readOnly ? (
                          <span className="badge-slate shrink-0">{isTh ? "ไม่ได้ตรวจ" : "Not checked"}</span>
                        ) : isEditing ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <input list="survey-emp" value={newName} autoFocus
                              onChange={e => setNewName(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && saveChange(i)}
                              placeholder={isTh ? "ชื่อผู้ถือครองใหม่..." : "New holder..."}
                              className="sp-input w-48" />
                            <button onClick={() => saveChange(i)} className="sp-btn-primary text-xs px-3 py-1.5">
                              {isTh ? "บันทึก" : "Save"}
                            </button>
                            <button onClick={() => { setEditing(null); setNewName(""); }}
                              className="text-xs text-slate-400 hover:text-slate-600">
                              {isTh ? "ยกเลิก" : "Cancel"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => confirmHolder(i)}
                              className="flex items-center gap-1.5 rounded-full text-white text-xs font-semibold px-3.5 py-2 transition-all hover:brightness-110 active:scale-95"
                              style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 3px 10px rgba(34,197,94,0.3)" }}>
                              <Check size={13} /> {isTh ? "ยังเป็นคนเดิม" : "Still correct"}
                            </button>
                            <button onClick={() => { setEditing(i.id); setNewName(i.holder ?? ""); }}
                              className="sp-btn-secondary text-xs px-3.5 py-2">
                              <Pencil size={12} /> {isTh ? "เปลี่ยนผู้ถือครอง" : "Change"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <datalist id="survey-emp">
          {employees.map(e => <option key={e.id} value={e.full_name} />)}
        </datalist>
      </div>
    </div>
  );
}

function groupByArea(list: RItem[]): [string, RItem[]][] {
  const m = new Map<string, RItem[]>();
  for (const i of list) {
    const k = i.room ?? "ไม่ระบุพื้นที่";
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(i);
  }
  return Array.from(m.entries());
}

function StatCard({ n, l, color }: { n: number; l: string; color: string }) {
  return (
    <div className="sp-card px-4 py-3">
      <p className={cn("text-xl font-extrabold leading-none", color)}>{n}</p>
      <p className="text-[10px] text-slate-500 mt-1.5">{l}</p>
    </div>
  );
}
