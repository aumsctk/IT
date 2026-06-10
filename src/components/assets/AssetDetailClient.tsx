"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { th as thLocale, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { TicketStatusBadge, TicketTypeLabel } from "@/components/tickets/TicketStatusBadge";
import { Plus } from "lucide-react";

type Tab = "overview" | "photos" | "network" | "tickets" | "history";

export function AssetDetailClient({
  asset,
  tickets = [],
  allocationHistory = [],
}: {
  asset:             any;
  tickets?:          any[];
  allocationHistory?:any[];
}) {
  const { locale } = useLanguage();
  const isTh = locale === "th";
  const [tab, setTab] = useState<Tab>("overview");

  const TABS: Array<{ key: Tab; label: string }> = [
    { key: "overview", label: isTh ? "ภาพรวม"   : "Overview" },
    { key: "photos",   label: isTh ? "รูปภาพ"   : "Photos"   },
    { key: "network",  label: isTh ? "เครือข่าย" : "Network"  },
    { key: "tickets",  label: isTh ? "แจ้งปัญหา" : "Tickets"  },
    { key: "history",  label: isTh ? "ประวัติ"   : "History"  },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              "shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
            {label}
            {key === "tickets" && tickets.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-bold">
                {tickets.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab  asset={asset} isTh={isTh} />}
      {tab === "photos"   && <PhotosTab    photos={asset.photos ?? []} isTh={isTh} />}
      {tab === "network"  && <NetworkTab   asset={asset} isTh={isTh} />}
      {tab === "tickets"  && <TicketsTab   tickets={tickets} assetId={asset.id} isTh={isTh} locale={locale} />}
      {tab === "history"  && <HistoryTab   history={allocationHistory} isTh={isTh} />}
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────
function OverviewTab({ asset, isTh }: { asset: any; isTh: boolean }) {
  const rows: Array<[string, React.ReactNode]> = [
    [isTh ? "รหัสทรัพย์สิน"    : "Asset Tag",       <code key="t" className="font-mono text-sm">{asset.asset_tag}</code>],
    [isTh ? "หมายเลขซีเรียล"   : "Serial Number",   asset.serial_number ?? "—"],
    [isTh ? "สภาพ"             : "Condition",       <span key="c" className="capitalize">{asset.condition}</span>],

    [isTh ? "ราคาที่ซื้อ"       : "Purchase Price",  asset.purchase_price ? `${Number(asset.purchase_price).toLocaleString()} ${asset.currency}` : "—"],
    [isTh ? "วันหมดประกัน"      : "Warranty Expiry", asset.warranty_expiry ? format(new Date(asset.warranty_expiry), "dd MMM yyyy") : "—"],
    [isTh ? "หมายเหตุ"          : "Notes",           asset.notes ?? "—"],
  ];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-border">
          {rows.map(([label, value]) => (
            <tr key={String(label)}>
              <td className="px-4 py-3 text-xs font-medium text-muted-foreground w-40 shrink-0">{label}</td>
              <td className="px-4 py-3 text-foreground">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Photos ────────────────────────────────────────────────────────
function PhotosTab({ photos, isTh }: { photos: string[]; isTh: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);

  if (photos.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border py-16 text-sm text-muted-foreground">
        {isTh ? "ไม่มีรูปภาพ" : "No photos attached"}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((url) => (
          <button key={url} onClick={() => setSelected(url)}
            className="relative aspect-square rounded-xl overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all">
            <Image src={url} alt={isTh ? "รูปภาพสินทรัพย์" : "Asset photo"} fill className="object-cover" sizes="200px" />
          </button>
        ))}
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelected(null)}>
          <div className="relative max-w-2xl w-full max-h-[80vh] rounded-xl overflow-hidden">
            <Image src={selected} alt={isTh ? "รูปภาพสินทรัพย์" : "Asset photo"} width={800} height={600}
              className="object-contain w-full h-full" />
          </div>
        </div>
      )}
    </>
  );
}

// ── Network ───────────────────────────────────────────────────────
function NetworkTab({ asset, isTh }: { asset: any; isTh: boolean }) {
  const seat  = asset.seats;
  const ports = seat?.switch_ports ?? [];
  const rows: Array<[string, string]> = [
    [isTh ? "ชื่อเครื่อง"     : "Hostname",       asset.hostname        ?? "—"],
    [isTh ? "IP Address"      : "IP Address",     asset.ip_address      ?? "—"],
    [isTh ? "พอร์ตผนัง"       : "Wall Port",      seat?.rj45_wall_port  ?? "—"],
    [isTh ? "Patch Panel"     : "Patch Panel",    seat?.patch_panel_port ?? "—"],
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {rows.map(([label, value]) => (
              <tr key={label}>
                <td className="px-4 py-3 text-xs font-medium text-muted-foreground w-40">{label}</td>
                <td className="px-4 py-3 font-mono text-sm">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ports.map((p: any) => (
        <div key={p.id} className="rounded-xl border border-border bg-card p-4 text-sm space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{p.network_switches?.name}</span>
            <span className="text-muted-foreground">{isTh ? `พอร์ต ${p.port_label ?? p.port_number}` : `Port ${p.port_label ?? p.port_number}`}</span>
          </div>
          {p.vlans && (
            <div className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.vlans.color_hex ?? "#6366f1" }} />
              <span>VLAN {p.vlans.vlan_id} — {p.vlans.name}</span>
              {p.vlans.subnet_cidr && <span className="text-muted-foreground">({p.vlans.subnet_cidr})</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Tickets ───────────────────────────────────────────────────────
function TicketsTab({ tickets, assetId, isTh, locale }: { tickets: any[]; assetId: string; isTh: boolean; locale: string }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link href={`/tickets/new?asset_id=${assetId}`}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          <Plus size={12} /> {isTh ? "แจ้งปัญหาใหม่" : "New Ticket"}
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          {isTh ? "ยังไม่มีการแจ้งปัญหาสำหรับสินทรัพย์นี้" : "No tickets for this asset yet"}
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t: any) => (
            <Link key={t.id} href={`/tickets/${t.id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 hover:bg-accent/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">{t.ticket_number}</span>
                  <TicketStatusBadge status={t.status} />
                </div>
                <p className="text-sm font-medium truncate mt-0.5">{t.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <TicketTypeLabel type={t.type} />
                  <span className="text-xs text-muted-foreground">
                    · {formatDistanceToNow(new Date(t.created_at), {
                        addSuffix: true,
                        locale: locale === "th" ? thLocale : enUS,
                      })}
                  </span>
                </div>
              </div>
              <span className="text-muted-foreground shrink-0">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── History ───────────────────────────────────────────────────────
function HistoryTab({ history, isTh }: { history: any[]; isTh: boolean }) {
  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        {isTh ? "ยังไม่มีประวัติการเปลี่ยนแปลง" : "No history yet"}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {history.map((h: any, i: number) => (
        <div key={i} className="flex gap-3 p-3 rounded-xl border border-border text-sm">
          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
          <div>
            <p className="font-medium">{h.action ?? h.field}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{h.note ?? ""}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
