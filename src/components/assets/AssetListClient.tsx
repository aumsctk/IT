"use client";

/**
 * AssetListClient — bilingual (TH/EN)
 */

import { useCallback, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { AssetStatusBadge } from "./AssetStatusBadge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Asset, AssetStatus } from "@/types/database";

interface AssetRow extends Asset {
  asset_models?: { brand: string; model_name: string; category: string; image_url?: string };
  seats?:        { id: string; label: string; rooms?: { name: string } } | null;
}

interface AssetListClientProps {
  initialAssets: AssetRow[];
  initialTotal:  number;
  branches:      Array<{ id: string; name: string; code: string }>;
}

const STATUS_OPTIONS: { value: AssetStatus; th: string; en: string }[] = [
  { value: "active",       th: "ใช้งานอยู่",  en: "Active"       },
  { value: "idle",         th: "ว่างอยู่",     en: "Idle"         },
  { value: "under_repair", th: "กำลังซ่อม",   en: "Under Repair" },
  { value: "retired",      th: "เลิกใช้งาน",  en: "Retired"      },
  { value: "lost",         th: "สูญหาย",       en: "Lost"         },
  { value: "disposed",     th: "จำหน่ายแล้ว", en: "Disposed"     },
];

export function AssetListClient({
  initialAssets,
  initialTotal,
  branches,
}: AssetListClientProps) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const { locale }   = useLanguage();

  const L = {
    searchPlaceholder: locale === "th" ? "ค้นหา tag, serial, hostname…"  : "Search tag, serial, hostname…",
    allBranches:       locale === "th" ? "ทุกสาขา"      : "All Branches",
    allStatuses:       locale === "th" ? "ทุกสถานะ"     : "All Statuses",
    shown:             locale === "th" ? "แสดง"          : "shown",
    total:             locale === "th" ? "ทั้งหมด"       : "total",
    noAssets:          locale === "th" ? "ไม่พบสินทรัพย์"         : "No assets found",
    adjustFilter:      locale === "th" ? "ลองปรับ filter ดู"      : "Try adjusting your filters",
    page:              locale === "th" ? "หน้า"          : "Page",
    of:                locale === "th" ? "จาก"           : "of",
    unassigned:        locale === "th" ? "ยังไม่กำหนด"  : "Unassigned",
    expired:           locale === "th" ? " · หมดแล้ว"   : " · Expired",
    soon:              locale === "th" ? " · ใกล้หมด"   : " · Soon",
    colTag:            locale === "th" ? "หมายเลขสินทรัพย์" : "Asset Tag",
    colModel:          locale === "th" ? "รุ่น"          : "Model",
    colStatus:         locale === "th" ? "สถานะ"         : "Status",
    colLocation:       locale === "th" ? "ตำแหน่ง"      : "Location",
    colWarranty:       locale === "th" ? "การรับประกัน"  : "Warranty",
  };

  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const { rows } = useRealtimeTable<AssetRow>({
    table:       "assets",
    initialData: initialAssets,
  });

  const page    = Number(searchParams.get("page") ?? 1);
  const perPage = 50;
  const pages   = Math.ceil(initialTotal / perPage);

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-border bg-card/50">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && updateParam("q", search || null)}
            placeholder={L.searchPlaceholder}
            className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <select
          value={searchParams.get("branch_id") ?? ""}
          onChange={(e) => updateParam("branch_id", e.target.value || null)}
          className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">{L.allBranches}</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
          ))}
        </select>

        <select
          value={searchParams.get("status") ?? ""}
          onChange={(e) => updateParam("status", e.target.value || null)}
          className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">{L.allStatuses}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{locale === "th" ? s.th : s.en}</option>
          ))}
        </select>

        <span className="ml-auto text-xs text-muted-foreground hidden sm:block">
          {rows.length} {L.shown} / {initialTotal} {L.total}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card border-b border-border">
            <tr>
              <th className={thCls("w-12")}></th>
              <th className={thCls()}>{L.colTag}</th>
              <th className={thCls("hidden sm:table-cell")}>{L.colModel}</th>
              <th className={thCls()}>{L.colStatus}</th>
              <th className={thCls("hidden md:table-cell")}>{L.colLocation}</th>
              <th className={thCls("hidden lg:table-cell")}>{L.colWarranty}</th>
              <th className={thCls("w-10")}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((asset) => (
              <AssetRowItem key={asset.id} asset={asset} locale={locale} L={L} />
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-sm">{L.noAssets}</p>
            <p className="text-xs mt-1">{L.adjustFilter}</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-card/50">
          <span className="text-xs text-muted-foreground">
            {L.page} {page} {L.of} {pages}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => updateParam("page", String(page - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={page >= pages}
              onClick={() => updateParam("page", String(page + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AssetRowItem({
  asset, locale, L,
}: {
  asset: AssetRow;
  locale: string;
  L: Record<string, string>;
}) {
  const router         = useRouter();
  const warrantyDate   = asset.warranty_expiry ? new Date(asset.warranty_expiry) : null;
  const isExpired      = warrantyDate ? warrantyDate < new Date() : false;
  const isExpiringSoon = warrantyDate
    ? !isExpired && warrantyDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    : false;

  return (
    <tr
      className="hover:bg-accent/30 transition-colors group cursor-pointer"
      onClick={() => router.push(`/assets/${asset.id}`)}
    >
      <td className="px-3 py-3">
        <div className="h-9 w-9 rounded-md bg-muted overflow-hidden">
          {asset.asset_models?.image_url ? (
            <Image src={asset.asset_models.image_url} alt="" width={36} height={36} className="object-contain h-full w-full" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
              {asset.asset_models?.category?.slice(0, 2).toUpperCase() ?? "—"}
            </div>
          )}
        </div>
      </td>

      <td className="px-3 py-3">
        <Link href={`/assets/${asset.id}`} className="group-hover:text-primary transition-colors">
          <div className="font-medium font-mono text-xs">{asset.asset_tag}</div>
          {asset.serial_number && (
            <div className="text-[11px] text-muted-foreground">{asset.serial_number}</div>
          )}
        </Link>
      </td>

      <td className="px-3 py-3 hidden sm:table-cell text-sm text-muted-foreground">
        {asset.asset_models ? `${asset.asset_models.brand} ${asset.asset_models.model_name}` : "—"}
      </td>

      <td className="px-3 py-3">
        <AssetStatusBadge status={asset.status} />
      </td>

      <td className="px-3 py-3 hidden md:table-cell text-xs text-muted-foreground">
        {asset.seats
          ? `${asset.seats.label} · ${asset.seats.rooms?.name ?? ""}`
          : <span className="italic">{L.unassigned}</span>}
      </td>

      <td className="px-3 py-3 hidden lg:table-cell text-xs">
        {warrantyDate ? (
          <span className={cn(
            isExpired      ? "text-destructive" :
            isExpiringSoon ? "text-amber-600"   : "text-muted-foreground"
          )}>
            {warrantyDate.toLocaleDateString(locale === "th" ? "th-TH" : "en-GB")}
            {isExpired && L.expired}
            {isExpiringSoon && L.soon}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      <td className="px-3 py-3">
        <Link href={`/assets/${asset.id}`} className="text-muted-foreground hover:text-foreground transition-colors">›</Link>
      </td>
    </tr>
  );
}

function thCls(extra?: string) {
  return cn("px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide", extra);
}
