"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { MapPin, Monitor, Laptop2, Printer, Router, BatteryCharging, Keyboard, HardDrive, MonitorDot, Box, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Asset } from "@/lib/supabaseDB";
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
  computer:       { th: "คอมพิวเตอร์",      en: "Computer"       },
  laptop:         { th: "โน้ตบุ๊ก",          en: "Laptop"         },
  monitor:        { th: "จอมอนิเตอร์",       en: "Monitor"        },
  printer:        { th: "เครื่องพิมพ์",      en: "Printer"        },
  network_device: { th: "อุปกรณ์เครือข่าย", en: "Network Device" },
  ups:            { th: "UPS",               en: "UPS"            },
  peripheral:     { th: "อุปกรณ์ต่อพ่วง",   en: "Peripheral"     },
  server:         { th: "เซิร์ฟเวอร์",       en: "Server"         },
  other:          { th: "อื่นๆ",              en: "Other"          },
};
const CAT_ICON: Record<string, { Icon: React.ElementType; bg: string; fg: string }> = {
  computer:       { Icon: Monitor,         bg: "bg-blue-50",   fg: "text-blue-600"   },
  laptop:         { Icon: Laptop2,         bg: "bg-violet-50", fg: "text-violet-600" },
  monitor:        { Icon: MonitorDot,      bg: "bg-cyan-50",   fg: "text-cyan-600"   },
  printer:        { Icon: Printer,         bg: "bg-amber-50",  fg: "text-amber-600"  },
  network_device: { Icon: Router,          bg: "bg-green-50",  fg: "text-green-600"  },
  ups:            { Icon: BatteryCharging, bg: "bg-orange-50", fg: "text-orange-600" },
  peripheral:     { Icon: Keyboard,        bg: "bg-pink-50",   fg: "text-pink-600"   },
  server:         { Icon: HardDrive,       bg: "bg-red-50",    fg: "text-red-600"    },
  other:          { Icon: Box,             bg: "bg-slate-100", fg: "text-slate-500"  },
};

export function AssetTable({ assets }: { assets: Asset[] }) {
  const { locale } = useLanguage();
  const router = useRouter();
  const isTh = locale === "th";

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <Box size={32} strokeWidth={1.5} />
        <p className="text-sm font-medium">{isTh ? "ไม่พบสินทรัพย์" : "No assets found"}</p>
        <p className="text-xs text-slate-300">{isTh ? "ลองเปลี่ยน filter ดูครับ" : "Try adjusting your filters"}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white border-b border-slate-200 z-10">
          <tr>
            <th className="th w-12" />
            <th className="th">{isTh ? "รหัสสินทรัพย์" : "Asset Tag"}</th>
            <th className="th hidden sm:table-cell">{isTh ? "รุ่น / ยี่ห้อ" : "Model"}</th>
            <th className="th">{isTh ? "สถานะ" : "Status"}</th>
            <th className="th hidden md:table-cell">{isTh ? "ผู้ใช้งาน" : "User"}</th>
            <th className="th hidden lg:table-cell">{isTh ? "ประกัน" : "Warranty"}</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const today = new Date();
            const wDate = asset.warranty_expiry ? new Date(asset.warranty_expiry) : null;
            const wDays = wDate ? Math.round((wDate.getTime() - today.getTime()) / 86400000) : null;
            const isExpired = wDays !== null && wDays < 0;
            const isSoon    = wDays !== null && !isExpired && wDays <= 30;
            const iconCfg   = CAT_ICON[asset.category] ?? CAT_ICON.other;
            const { Icon }  = iconCfg;

            return (
              <tr key={asset.id}
                className="border-b border-slate-100 hover:bg-indigo-50/40 transition-colors duration-100 group cursor-pointer"
                onClick={() => router.push(`/assets/${asset.id}`)}>

                <td className="pl-4 pr-2 py-3">
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", iconCfg.bg)}>
                    <Icon size={16} strokeWidth={1.75} className={iconCfg.fg} />
                  </div>
                </td>

                <td className="px-4 py-3">
                  <Link href={`/assets/${asset.id}`}
                    className="font-mono text-[12px] font-bold text-slate-800 hover:text-indigo-600 transition-colors">
                    {asset.asset_tag}
                  </Link>
                  {asset.serial_number && (
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{asset.serial_number}</p>
                  )}
                </td>

                <td className="px-4 py-3 hidden sm:table-cell">
                  <p className="text-sm font-medium text-slate-800">{asset.brand} {asset.model_name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isTh ? CATEGORY_LABEL[asset.category]?.th : CATEGORY_LABEL[asset.category]?.en}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <span className={STATUS_BADGE[asset.status] ?? "badge-slate"}>
                    {isTh ? STATUS_LABEL[asset.status]?.th : STATUS_LABEL[asset.status]?.en}
                  </span>
                </td>

                <td className="px-4 py-3 hidden md:table-cell">
                  {asset.assigned_to_name ? (
                    <p className="text-sm font-medium text-slate-700 truncate max-w-[160px]">{asset.assigned_to_name}</p>
                  ) : null}
                  {asset.seat_label ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={10} className="text-slate-300 shrink-0" />
                      <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                        {asset.seat_label}{asset.room_name ? ` · ${asset.room_name}` : ""}
                      </span>
                    </div>
                  ) : !asset.assigned_to_name ? (
                    <span className="text-[11px] text-slate-300 italic">{isTh ? "ยังไม่ได้กำหนด" : "Unassigned"}</span>
                  ) : null}
                </td>

                <td className="px-4 py-3 hidden lg:table-cell">
                  {wDate ? (
                    <div>
                      <p className={cn("text-xs font-medium", isExpired ? "text-red-600" : isSoon ? "text-amber-600" : "text-slate-500")}>
                        {isTh
                          ? wDate.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
                          : format(wDate, "d MMM yyyy")}
                      </p>
                      {(isExpired || isSoon) && (
                        <p className={cn("text-[10px] font-semibold mt-0.5", isExpired ? "text-red-500" : "text-amber-500")}>
                          {isExpired
                            ? (isTh ? `หมดประกันมา ${Math.abs(wDays!)} วัน` : `${Math.abs(wDays!)}d overdue`)
                            : (isTh ? `เหลืออีก ${wDays} วัน` : `${wDays}d left`)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>

                <td className="pr-3">
                  <Link href={`/assets/${asset.id}`}
                    className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all ml-auto">
                    <ChevronRight size={14} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
