"use client";

import { useCallback, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, ChevronRight as Arrow } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th as thLocale, enUS } from "date-fns/locale";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { TicketStatusBadge, TicketPriorityBadge, TicketTypeLabel } from "./TicketStatusBadge";
import { cn } from "@/lib/utils";

interface TicketRow {
  id: string; ticket_number: string; type: string; status: string;
  priority: string; title: string; created_at: string;
  creator?: { full_name: string }; assignee?: { full_name: string } | null;
  assets?: { asset_tag: string } | null;
}
interface Props { initialTickets: TicketRow[]; initialTotal: number; isStaff: boolean; }

const STATUS_LABELS: Record<string, { th: string; en: string }> = {
  open:             { th: "เปิด",           en: "Open"             },
  in_progress:      { th: "ดำเนินการ",      en: "In Progress"      },
  pending_approval: { th: "รออนุมัติ",       en: "Pending Approval" },
  resolved:         { th: "แก้ไขแล้ว",       en: "Resolved"         },
  closed:           { th: "ปิดแล้ว",         en: "Closed"           },
  rejected:         { th: "ปฏิเสธ",          en: "Rejected"         },
};
const TYPE_LABELS: Record<string, { th: string; en: string }> = {
  withdraw: { th: "เบิก", en: "Withdraw" }, return: { th: "คืน", en: "Return" },
  repair: { th: "ซ่อมแซม", en: "Repair" }, relocation: { th: "ย้าย", en: "Relocation" },
  audit: { th: "ตรวจสอบ", en: "Audit" }, other: { th: "อื่นๆ", en: "Other" },
};
const PRIORITY_LABELS: Record<string, { th: string; en: string }> = {
  low: { th: "ต่ำ", en: "Low" }, medium: { th: "ปานกลาง", en: "Medium" },
  high: { th: "สูง", en: "High" }, critical: { th: "วิกฤต", en: "Critical" },
};

export function TicketListClient({ initialTickets, initialTotal, isStaff }: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const { locale }   = useLanguage();
  const isTh         = locale === "th";
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const { rows } = useRealtimeTable<TicketRow & { id: string }>({
    table: "tickets", initialData: initialTickets as any,
  });

  const page    = Number(searchParams.get("page") ?? 1);
  const perPage = 40;
  const pages   = Math.ceil(initialTotal / perPage);

  const setParam = useCallback((key: string, val: string | null) => {
    const p = new URLSearchParams(searchParams.toString());
    if (val) p.set(key, val); else p.delete(key);
    p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  }, [router, pathname, searchParams]);

  const FILTERS = [
    { key: "status",   placeholder: isTh ? "ทุกสถานะ"     : "All Statuses",   opts: Object.entries(STATUS_LABELS).map(([v,l])=>({ value:v, label:isTh?l.th:l.en })) },
    { key: "type",     placeholder: isTh ? "ทุกประเภท"    : "All Types",      opts: Object.entries(TYPE_LABELS).map(([v,l])=>({ value:v, label:isTh?l.th:l.en })) },
    { key: "priority", placeholder: isTh ? "ทุกความสำคัญ" : "All Priorities", opts: Object.entries(PRIORITY_LABELS).map(([v,l])=>({ value:v, label:isTh?l.th:l.en })) },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* Filter bar */}
      <div className="filter-bar bg-white">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setParam("q", search || null)}
            placeholder={isTh ? "ค้นหา ticket…" : "Search tickets…"}
            className="sp-input pl-8"
          />
        </div>
        {FILTERS.map(({ key, placeholder, opts }) => (
          <select key={key} value={searchParams.get(key) ?? ""}
            onChange={(e) => setParam(key, e.target.value || null)}
            className="sp-select">
            <option value="">{placeholder}</option>
            {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 md:px-8 py-4">
        <div className="sp-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="th">{isTh ? "เลขที่" : "Number"}</th>
                <th className="th">{isTh ? "หัวข้อ" : "Title"}</th>
                <th className="th hidden sm:table-cell">{isTh ? "ประเภท" : "Type"}</th>
                <th className="th">{isTh ? "สถานะ" : "Status"}</th>
                <th className="th hidden md:table-cell">{isTh ? "ความสำคัญ" : "Priority"}</th>
                {isStaff && <th className="th hidden lg:table-cell">{isTh ? "ผู้รับผิดชอบ" : "Assignee"}</th>}
                <th className="th hidden md:table-cell">{isTh ? "วันที่แจ้ง" : "Created"}</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}
                  className="border-b border-slate-100 hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                  onClick={() => router.push(`/tickets/${t.id}`)}>
                  <td className="pl-4 pr-3 py-3.5">
                    <span className="font-mono text-[11px] font-semibold text-slate-400 group-hover:text-indigo-600 transition-colors">
                      {t.ticket_number}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 max-w-[240px]">
                    <p className="font-semibold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">{t.title}</p>
                    {t.assets && <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{t.assets.asset_tag}</span>}
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell"><TicketTypeLabel type={t.type as any} /></td>
                  <td className="px-4 py-3.5"><TicketStatusBadge status={t.status as any} /></td>
                  <td className="px-4 py-3.5 hidden md:table-cell"><TicketPriorityBadge priority={t.priority as any} /></td>
                  {isStaff && (
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-[12px] text-slate-500">
                        {t.assignee?.full_name ?? <span className="italic text-slate-300">{isTh ? "ยังไม่กำหนด" : "Unassigned"}</span>}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="text-[11px] text-slate-400">
                      {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: isTh ? thLocale : enUS })}
                    </span>
                  </td>
                  <td className="pr-3">
                    <Arrow size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400">
              <Search size={24} strokeWidth={1.5} />
              <p className="text-sm font-medium">{isTh ? "ไม่พบข้อมูล" : "No tickets found"}</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-6 md:px-8 py-3 border-t border-slate-200 bg-white shrink-0">
          <span className="text-xs text-slate-500">{isTh ? `หน้า ${page} / ${pages}` : `Page ${page} of ${pages}`}</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setParam("page", String(page - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button disabled={page >= pages} onClick={() => setParam("page", String(page + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
