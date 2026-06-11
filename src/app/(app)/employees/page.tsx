"use client";

import React from "react";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, UserPlus, X, Phone, Briefcase, Hash } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { employeeDB, type Employee } from "@/lib/supabaseDB";
import { getPositions } from "@/lib/mock/employees";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, Record<string, string>> = {
  active:     { th: "ปฏิบัติงาน", en: "Active"     },
  on_leave:   { th: "ลาพัก",       en: "On Leave"   },
  terminated: { th: "พ้นสภาพ",     en: "Terminated" },
};
const STATUS_CLS: Record<string, string> = {
  active:     "badge-green",
  on_leave:   "badge-amber",
  terminated: "badge-red",
};
const AVATAR_BG = [
  "bg-indigo-100 text-indigo-700", "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",     "bg-green-100 text-green-700",
  "bg-amber-100 text-amber-700",   "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",     "bg-orange-100 text-orange-700",
];
const avatarBg = (name: string) => AVATAR_BG[(name?.charCodeAt(0) ?? 0) % AVATAR_BG.length];

export default function EmployeesPage() {
  const { locale } = useLanguage();
  const isTh = locale === "th";
  const [employees, setEmployees]     = useState<Employee[]>([]);
  const [search, setSearch]           = useState("");
  const [pos, setPos]                 = useState("all");
  const [status, setStatus]           = useState("all");
  const [selected, setSelected]       = useState<Employee | null>(null);
  const [positions, setPositions]     = useState<string[]>([]);

  useEffect(() => {
    setPositions(getPositions());
    const load = () => { employeeDB.getAll().then(setEmployees); };
    load();
    window.addEventListener("itam_employees_updated", load);
    return () => window.removeEventListener("itam_employees_updated", load);
  }, []);

  const filtered = useMemo(() =>
    employees.filter(e => {
      const q = search.toLowerCase();
      if (q && !(`${e.emp_code} ${e.full_name ?? ""} ${e.position ?? ""}`).toLowerCase().includes(q)) return false;
      if (pos !== "all" && e.position !== pos) return false;
      if (status !== "all" && e.status !== status) return false;
      return true;
    }).sort((a, b) => (a.emp_code ?? "").localeCompare(b.emp_code ?? ""))
  , [employees, search, pos, status]);

  const hasFilter = search || pos !== "all" || status !== "all";

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Header */}
      <div className="page-header bg-white">
        <div>
          <h1 className="page-title">{isTh ? "พนักงาน" : "Employees"}</h1>
          <p className="page-sub">{filtered.length} {isTh ? "คน" : "people"}</p>
        </div>
        <Link href="/employees/new" className="sp-btn-primary">
          <UserPlus size={14} />
          {isTh ? "เพิ่มพนักงาน" : "Add Employee"}
        </Link>
      </div>

      {/* Filters */}
      <div className="filter-bar bg-white">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={isTh ? "ค้นหารหัส / ชื่อ / ตำแหน่ง..." : "Search code / name / position..."}
            className="sp-input pl-8" />
        </div>
        <select value={pos} onChange={e => setPos(e.target.value)} className="sp-select">
          <option value="all">{isTh ? "ทุกตำแหน่ง" : "All Positions"}</option>
          {positions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="sp-select">
          <option value="all">{isTh ? "ทุกสถานะ" : "All Status"}</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v[locale] ?? v.en}</option>)}
        </select>
        {hasFilter && (
          <button onClick={() => { setSearch(""); setPos("all"); setStatus("all"); }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
            <X size={11} /> {isTh ? "ล้าง" : "Clear"}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden px-6 md:px-8 py-4 gap-4">

        {/* Table */}
        <div className="flex-1 overflow-auto sp-card">
          <table className="w-full text-sm">
            <thead className="bg-white/75 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-10">
              <tr>
                <th className="th w-14" />
                <th className="th">{isTh ? "รหัส / ชื่อ" : "Code / Name"}</th>
                <th className="th hidden sm:table-cell">{isTh ? "ตำแหน่ง" : "Position"}</th>
                <th className="th">{isTh ? "สถานะ" : "Status"}</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400">
                    <Search size={24} strokeWidth={1.5} />
                    <p className="text-sm font-medium">{isTh ? "ไม่พบข้อมูลพนักงาน" : "No employees found"}</p>
                  </div>
                </td></tr>
              ) : filtered.map(emp => {
                const isActive = selected?.id === emp.id;
                return (
                  <tr key={emp.id}
                    onClick={() => setSelected(isActive ? null : emp)}
                    className={cn("border-b border-slate-100 transition-colors cursor-pointer group",
                      isActive ? "bg-indigo-50" : "hover:bg-indigo-50/40")}>
                    <td className="pl-4 pr-2 py-3">
                      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0", avatarBg(emp.full_name ?? ""))}>
                        {emp.full_name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className={cn("font-semibold text-sm", isActive ? "text-indigo-600" : "text-slate-800 group-hover:text-indigo-600 transition-colors")}>
                        {emp.full_name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{emp.emp_code}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-slate-500">{emp.position ?? "-"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={STATUS_CLS[emp.status ?? "active"] ?? "badge-slate"}>
                        {STATUS_LABEL[emp.status ?? "active"]?.[locale] ?? emp.status}
                      </span>
                    </td>
                    <td className="pr-4">
                      <Link href={`/employees/${emp.id}/edit`} onClick={e => e.stopPropagation()}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        {isTh ? "แก้ไข" : "Edit"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-72 shrink-0 sp-card overflow-auto slide-in flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">{isTh ? "ข้อมูลพนักงาน" : "Employee Info"}</h2>
              <button onClick={() => setSelected(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="flex flex-col items-center pt-6 pb-4 px-5">
              <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold mb-3", avatarBg(selected.full_name ?? ""))}>
                {selected.full_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <p className="font-bold text-slate-900 text-center">{selected.full_name}</p>
              <span className={cn(STATUS_CLS[selected.status ?? "active"] ?? "badge-slate", "mt-2")}>
                {STATUS_LABEL[selected.status ?? "active"]?.[locale] ?? selected.status}
              </span>
            </div>
            <div className="px-5 flex-1">
              <InfoRow icon={Hash}      label={isTh ? "รหัสพนักงาน" : "Employee Code"} value={selected.emp_code ?? "-"} mono />
              <InfoRow icon={Briefcase} label={isTh ? "ตำแหน่ง" : "Position"}          value={selected.position ?? "-"} />
              {selected.phone && <InfoRow icon={Phone} label={isTh ? "โทรศัพท์" : "Phone"} value={selected.phone} />}
            </div>
            <div className="px-5 pb-5 pt-4">
              <Link href={`/employees/${selected.id}/edit`} className="sp-btn-primary w-full justify-center">
                {isTh ? "แก้ไขข้อมูล" : "Edit Employee"}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, mono }: { icon: React.ElementType; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
        <Icon size={13} className="text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{label}</p>
        <p className={cn("text-sm font-semibold text-slate-800 break-words", mono && "font-mono")}>{value}</p>
      </div>
    </div>
  );
}
