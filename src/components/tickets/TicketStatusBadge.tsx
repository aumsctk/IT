"use client";

import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { TicketStatus, TicketPriority, TicketType } from "@/types/database";

const STATUS_CFG: Record<TicketStatus, { th: string; en: string; cls: string }> = {
  open:             { th: "เปิด",           en: "Open",         cls: "badge-indigo"  },
  in_progress:      { th: "ดำเนินการ",      en: "In Progress",  cls: "badge-purple"  },
  pending_approval: { th: "รออนุมัติ",       en: "Pending",      cls: "badge-amber"   },
  resolved:         { th: "แก้ไขแล้ว",       en: "Resolved",     cls: "badge-green"   },
  closed:           { th: "ปิดแล้ว",         en: "Closed",       cls: "badge-slate"   },
  rejected:         { th: "ปฏิเสธ",          en: "Rejected",     cls: "badge-red"     },
};
const PRIORITY_CFG: Record<TicketPriority, { th: string; en: string; dot: string; cls: string }> = {
  low:      { th: "ต่ำ",     en: "Low",      dot: "#94a3b8", cls: "text-slate-500"      },
  medium:   { th: "ปานกลาง", en: "Medium",   dot: "#f59e0b", cls: "text-amber-600"      },
  high:     { th: "สูง",     en: "High",     dot: "#ef4444", cls: "text-red-600"        },
  critical: { th: "วิกฤต",   en: "Critical", dot: "#dc2626", cls: "text-red-700 font-bold" },
};
const TYPE_LABEL: Record<TicketType, { th: string; en: string; icon: string }> = {
  withdraw:   { th: "เบิก",        en: "Withdraw",   icon: "📤" },
  return:     { th: "คืน",        en: "Return",     icon: "📥" },
  repair:     { th: "แจ้งซ่อม",    en: "Repair",     icon: "🔧" },
  relocation: { th: "ย้ายสถานที่", en: "Relocation", icon: "🚚" },
  audit:      { th: "ตรวจสอบ",    en: "Audit",      icon: "📋" },
  other:      { th: "อื่นๆ",       en: "Other",      icon: "💬" },
};

export function TicketStatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  const { locale } = useLanguage();
  const cfg = STATUS_CFG[status];
  if (!cfg) return null;
  return <span className={cn(cfg.cls, className)}>{locale === "th" ? cfg.th : cfg.en}</span>;
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  const { locale } = useLanguage();
  const cfg = PRIORITY_CFG[priority];
  if (!cfg) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", cfg.cls)}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
      {locale === "th" ? cfg.th : cfg.en}
    </span>
  );
}

export function TicketTypeLabel({ type }: { type: TicketType }) {
  const { locale } = useLanguage();
  const cfg = TYPE_LABEL[type as TicketType];
  if (!cfg) return <span className="text-[11px] text-slate-400">{type}</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
      <span>{cfg.icon}</span>
      {locale === "th" ? cfg.th : cfg.en}
    </span>
  );
}
