"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, X, UserCheck, UserX, Package, ChevronDown, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { assetDB, employeeDB, type Asset } from "@/lib/supabaseDB";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<string, string> = {
  idle:           "badge-slate",
  in_use:         "badge-green",
  under_repair:   "badge-amber",
  pending_return: "badge-orange",
  returned:       "badge-blue",
};
const STATUS_LABEL: Record<string, { th: string; en: string }> = {
  idle:           { th: "ว่าง",        en: "Idle"           },
  in_use:         { th: "ใช้งาน",      en: "In Use"         },
  under_repair:   { th: "แจ้งซ่อม",    en: "Under Repair"   },
  pending_return: { th: "รอส่งคืน",    en: "Pending Return" },
  returned:       { th: "ส่งคืนแล้ว",  en: "Returned"       },
};
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
const AVATAR_BG = [
  "bg-indigo-100 text-indigo-700", "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",     "bg-green-100 text-green-700",
  "bg-amber-100 text-amber-700",   "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",     "bg-orange-100 text-orange-700",
];
const avatarBg = (name: string) => AVATAR_BG[(name?.charCodeAt(0) ?? 0) % AVATAR_BG.length];

type Group = { name: string; isEmployee: boolean; assets: Asset[] };

export default function AssignmentsPage() {
  const { locale } = useLanguage();
  const isTh = locale === "th";

  const [assets, setAssets]       = useState<Asset[]>([]);
  const [empNames, setEmpNames]   = useState<Set<string>>(new Set());
  const [search, setSearch]       = useState("");
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = () => {
      assetDB.getAll().then(setAssets);
      employeeDB.getAll().then(all => setEmpNames(new Set(all.map(e => e.full_name))));
    };
    load();
    window.addEventListener("itam_assets_updated", load);
    return () => window.removeEventListener("itam_assets_updated", load);
  }, []);

  const { groups, unassigned } = useMemo(() => {
    const map = new Map<string, Asset[]>();
    const un: Asset[] = [];
    for (const a of assets) {
      if (a.status === "returned") continue;
      const name = (a.assigned_to_name ?? "").trim();
      if (!name) { un.push(a); continue; }
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(a);
    }
    let gs: Group[] = Array.from(map.entries())
      .map(([name, list]) => ({ name, isEmployee: empNames.has(name), assets: list }))
      .sort((x, y) => x.name.localeCompare(y.name, "th"));
    const q = search.trim().toLowerCase();
    if (q) {
      gs = gs.filter(g =>
        g.name.toLowerCase().includes(q) ||
        g.assets.some(a => `${a.asset_tag} ${a.serial_number ?? ""} ${a.brand ?? ""} ${a.model_name ?? ""}`.toLowerCase().includes(q))
      );
    }
    return { groups: gs, unassigned: un };
  }, [assets, empNames, search]);

  const toggle = (name: string) =>
    setExpanded(p => { const n = new Set(p); n.has(name) ? n.delete(name) : n.add(name); return n; });

  const totalAssigned = groups.reduce((s, g) => s + g.assets.length, 0);

  return (
    <div className="flex flex-col h-full bg-slate-100">

      {/* Header */}
      <div className="page-header bg-white">
        <div>
          <h1 className="page-title">{isTh ? "ผู้รับผิดชอบทรัพย์สิน" : "Asset Assignments"}</h1>
          <p className="page-sub">
            {groups.length} {isTh ? "คน" : "people"} · {totalAssigned} {isTh ? "รายการ" : "assets"} · {unassigned.length} {isTh ? "ยังไม่มอบหมาย" : "unassigned"}
          </p>
        </div>
        <button onClick={() => setShowUnassigned(v => !v)}
          className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
            showUnassigned ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50")}>
          <UserX size={13} />
          {isTh ? `ยังไม่มอบหมาย (${unassigned.length})` : `Unassigned (${unassigned.length})`}
        </button>
      </div>

      {/* Search */}
      <div className="filter-bar bg-white">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={isTh ? "ค้นหาชื่อผู้รับผิดชอบ / เลขทรัพย์สิน..." : "Search person / asset tag..."}
            className="sp-input pl-8" />
        </div>
        {search && (
          <button onClick={() => setSearch("")}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
            <X size={11} /> {isTh ? "ล้าง" : "Clear"}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 md:px-8 py-4 space-y-3">

        {showUnassigned && (
          <div className="sp-card overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <UserX size={15} className="text-slate-400" />
              <span className="text-sm font-bold text-slate-700">{isTh ? "ยังไม่มอบหมาย" : "Unassigned"}</span>
              <span className="text-xs text-slate-400">({unassigned.length})</span>
            </div>
            <AssetRows assets={unassigned} isTh={isTh} />
          </div>
        )}

        {groups.length === 0 && !showUnassigned ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <UserCheck size={32} strokeWidth={1.5} />
            <p className="text-sm font-medium">{isTh ? "ไม่พบข้อมูล" : "No results"}</p>
          </div>
        ) : groups.map(g => {
          const open = expanded.has(g.name) || !!search.trim();
          return (
            <div key={g.name} className="sp-card overflow-hidden">
              <button onClick={() => toggle(g.name)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-indigo-50/40 transition-colors text-left">
                {open ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0", avatarBg(g.name))}>
                  {g.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{g.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {g.assets.length} {isTh ? "รายการ" : "assets"}
                    {g.isEmployee
                      ? (isTh ? " · พนักงานในระบบ" : " · registered employee")
                      : (isTh ? " · ชื่ออิสระ" : " · free-text name")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Package size={12} className="text-slate-300" />
                  <span className="text-sm font-bold text-slate-700">{g.assets.length}</span>
                </div>
              </button>
              {open && <AssetRows assets={g.assets} isTh={isTh} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AssetRows({ assets, isTh }: { assets: Asset[]; isTh: boolean }) {
  if (assets.length === 0) return (
    <p className="px-5 py-4 text-xs text-slate-400 border-t border-slate-100">
      {isTh ? "ไม่มีทรัพย์สิน" : "No assets"}
    </p>
  );
  return (
    <div className="border-t border-slate-100 divide-y divide-slate-50">
      {assets.map(a => (
        <Link key={a.id} href={`/assets/${a.id}`}
          className="flex items-center gap-3 px-5 py-2.5 hover:bg-indigo-50/40 transition-colors group">
          <span className="font-mono text-[12px] font-bold text-slate-800 group-hover:text-indigo-600 transition-colors w-24 shrink-0">
            {a.asset_tag}
          </span>
          <span className="text-xs text-slate-500 w-28 shrink-0">
            {(isTh ? CATEGORY_LABEL[a.category]?.th : CATEGORY_LABEL[a.category]?.en) ?? a.category}
          </span>
          <span className="text-xs text-slate-400 flex-1 min-w-0 truncate hidden sm:block">
            {[a.brand, a.model_name].filter(Boolean).join(" ")}
            {a.seat_label ? ` · ${a.seat_label}` : ""}
            {a.room_name ? ` · ${a.room_name}` : ""}
          </span>
          <span className={cn(STATUS_BADGE[a.status] ?? "badge-slate", "shrink-0")}>
            {(isTh ? STATUS_LABEL[a.status]?.th : STATUS_LABEL[a.status]?.en) ?? a.status}
          </span>
        </Link>
      ))}
    </div>
  );
}
