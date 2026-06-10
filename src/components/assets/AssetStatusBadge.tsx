"use client";

export const STATUS_MAP: Record<string, { th: string; en: string; className: string }> = {
  idle:           { th: "ว่าง",        en: "Idle",           className: "bg-slate-100    text-slate-600   dark:bg-slate-700  dark:text-slate-300" },
  in_use:         { th: "ใช้งาน",      en: "In Use",         className: "bg-green-100    text-green-700   dark:bg-green-900  dark:text-green-300" },
  under_repair:   { th: "แจ้งซ่อม",    en: "Under Repair",   className: "bg-amber-100    text-amber-700   dark:bg-amber-900  dark:text-amber-300" },
  pending_return: { th: "รอส่งคืน",    en: "Pending Return", className: "bg-orange-100   text-orange-700  dark:bg-orange-900 dark:text-orange-300" },
  returned:       { th: "ส่งคืนแล้ว",  en: "Returned",       className: "bg-blue-100     text-blue-700    dark:bg-blue-900   dark:text-blue-300"  },
};

export function AssetStatusBadge({ status, locale = "th" }: { status: string; locale?: string }) {
  const s = STATUS_MAP[status] ?? { th: status, en: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
      {locale === "th" ? s.th : s.en}
    </span>
  );
}

export function getStatusLabel(status: string, locale = "th"): string {
  const s = STATUS_MAP[status];
  if (!s) return status;
  return locale === "th" ? s.th : s.en;
}

export const ASSET_STATUSES = Object.entries(STATUS_MAP).map(([value, v]) => ({ value, ...v }));
