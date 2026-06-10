"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { assetDB, type Asset } from "@/lib/supabaseDB";
import { DEMO_BRANCHES } from "@/lib/demo/assets";
import { AssetTable } from "./AssetTable";

const STATUS_OPTS = [
  { value: "idle",           th: "ว่าง",        en: "Idle"           },
  { value: "in_use",         th: "ใช้งาน",      en: "In Use"         },
  { value: "under_repair",   th: "แจ้งซ่อม",    en: "Under Repair"   },
  { value: "pending_return", th: "รอส่งคืน",    en: "Pending Return" },
];
const CATEGORY_OPTS = [
  { value: "computer",       th: "คอมพิวเตอร์",      en: "Computer"       },
  { value: "laptop",         th: "โน้ตบุ๊ก",          en: "Laptop"         },
  { value: "monitor",        th: "จอมอนิเตอร์",       en: "Monitor"        },
  { value: "printer",        th: "เครื่องพิมพ์",      en: "Printer"        },
  { value: "network_device", th: "อุปกรณ์เครือข่าย", en: "Network Device" },
  { value: "ups",            th: "UPS",               en: "UPS"            },
  { value: "peripheral",     th: "อุปกรณ์ต่อพ่วง",   en: "Peripheral"     },
  { value: "server",         th: "เซิร์ฟเวอร์",       en: "Server"         },
];

export function AssetsPageClient() {
  const { locale } = useLanguage();
  const isTh = locale === "th";

  const [assets,       setAssets]       = useState<Asset[]>([]);
  const [search,       setSearch]       = useState("");
  const [status,       setStatus]       = useState("");
  const [category,     setCategory]     = useState("");
  const [branchId,     setBranchId]     = useState("");
  const [showReturned, setShowReturned] = useState(false);

  const reload = useCallback(() => { assetDB.getAll().then(setAssets); }, []);
  useEffect(() => {
    reload();
    const h = () => reload();
    window.addEventListener("storage", h);
    window.addEventListener("itam_assets_updated", h);
    return () => { window.removeEventListener("storage", h); window.removeEventListener("itam_assets_updated", h); };
  }, [reload]);

  const filtered = useMemo(() => {
    if (showReturned) return assets.filter(a => a.status === "returned");
    return assets.filter(a => {
      if (a.status === "returned") return false;
      const q = search.toLowerCase();
      if (q && !(`${a.asset_tag} ${a.serial_number ?? ""} ${a.hostname ?? ""} ${a.brand ?? ""} ${a.model_name ?? ""}`).toLowerCase().includes(q)) return false;
      if (status   && a.status   !== status)   return false;
      if (category && a.category !== category) return false;
      if (branchId && a.branch_id !== branchId) return false;
      return true;
    });
  }, [assets, search, status, category, branchId, showReturned]);

  const returnedCount = useMemo(() => assets.filter(a => a.status === "returned").length, [assets]);
  const hasFilter = !!(search || status || category || branchId);
  const clearFilters = () => { setSearch(""); setStatus(""); setCategory(""); setBranchId(""); };

  return (
    <div className="flex flex-col h-full bg-slate-100">

      {/* Header */}
      <div className="page-header bg-white">
        <div>
          <h1 className="page-title">
            {showReturned ? (isTh ? "ส่งคืนแล้ว" : "Returned Assets") : (isTh ? "ทรัพย์สิน IT" : "IT Assets")}
          </h1>
          <p className="page-sub">
            {filtered.length.toLocaleString()} {isTh ? "รายการ" : "items"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm bg-white">
            <button
              onClick={() => { setShowReturned(false); setStatus(""); }}
              className={`px-4 py-2 font-semibold transition-colors ${!showReturned ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
              {isTh ? "ใช้งาน" : "Active"}
            </button>
            <button
              onClick={() => setShowReturned(true)}
              className={`px-4 py-2 font-semibold transition-colors flex items-center gap-1.5 ${showReturned ? "bg-slate-700 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
              {isTh ? "ส่งคืนแล้ว" : "Returned"}
              {returnedCount > 0 && (
                <span className={`rounded-full px-1.5 text-[11px] font-bold ${showReturned ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}>
                  {returnedCount}
                </span>
              )}
            </button>
          </div>
          {!showReturned && (
            <Link href="/assets/new" className="sp-btn-primary">
              <Plus size={14} />
              {isTh ? "เพิ่มสินทรัพย์" : "New Asset"}
            </Link>
          )}
        </div>
      </div>

      {/* Filter bar */}
      {!showReturned && (
        <div className="filter-bar bg-white">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={isTh ? "ค้นหา tag, serial, hostname..." : "Search tag, serial, hostname..."}
              className="sp-input pl-8"
            />
          </div>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="sp-select">
            <option value="">{isTh ? "ทุกสาขา" : "All Centers"}</option>
            {DEMO_BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.code} {b.name}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="sp-select">
            <option value="">{isTh ? "ทุกสถานะ" : "All Statuses"}</option>
            {STATUS_OPTS.map((s) => <option key={s.value} value={s.value}>{isTh ? s.th : s.en}</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="sp-select">
            <option value="">{isTh ? "ทุกประเภท" : "All Categories"}</option>
            {CATEGORY_OPTS.map((c) => <option key={c.value} value={c.value}>{isTh ? c.th : c.en}</option>)}
          </select>
          {hasFilter && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">
              <X size={11} /> {isTh ? "ล้าง" : "Clear"}
            </button>
          )}
        </div>
      )}

      {/* Table wrapper */}
      <div className="flex-1 overflow-hidden mx-6 my-4 md:mx-8 sp-card">
        <AssetTable assets={filtered} />
      </div>
    </div>
  );
}
