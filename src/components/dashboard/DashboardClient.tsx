"use client";

import Link from "next/link";
import { AlertTriangle, Package, Ticket, Users, Layers, ArrowUpRight, TrendingUp } from "lucide-react";
import { DashboardCharts } from "./DashboardCharts";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { cn } from "@/lib/utils";

interface Props {
  kpi:             Record<string, number>;
  warrantyTimeline:any[];
  byCategory:      any[];
  byStatus:        any[];
  expiringAssets:  any[];
  tickets:         any[];
}

export function DashboardClient({ kpi, warrantyTimeline, byCategory, byStatus, expiringAssets, tickets }: Props) {
  const { t, tr, locale } = useLanguage();
  const isTh = locale === "th";

  const translatedByStatus = byStatus.map((s) => ({
    ...s,
    label: t((tr.assetStatus as any)[s.status] ?? { th: s.label, en: s.label }),
  }));

  const hour = new Date().getHours();
  const greeting = hour < 12
    ? t(tr.dashboard.greeting.morning)
    : hour < 17 ? t(tr.dashboard.greeting.afternoon)
    : t(tr.dashboard.greeting.evening);

  const STATUS_COLOR: Record<string, string> = {
    open:             "badge-indigo",
    in_progress:      "badge-purple",
    pending_approval: "badge-amber",
    resolved:         "badge-green",
    closed:           "badge-slate",
    rejected:         "badge-red",
  };
  const PRIORITY_DOT: Record<string, string> = {
    low: "#94a3b8", medium: "#f59e0b", high: "#ef4444", critical: "#dc2626",
  };
  const statusLabel = (s: string) => {
    const map = tr.ticket.status as any;
    return map[s] ? t(map[s]) : s;
  };

  return (
    <div className="px-6 py-6 md:px-8 md:py-8 space-y-6 max-w-7xl mx-auto fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{greeting}</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            {t(tr.dashboard.subtitle)}
            <span className="badge badge-amber">Demo</span>
          </p>
        </div>
        <Link href="/assets/new" className="sp-btn-primary hidden sm:flex shrink-0">
          <Package size={14} />
          {isTh ? "เพิ่มสินทรัพย์" : "Add Asset"}
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={t(tr.dashboard.kpi.totalAssets)}  value={kpi.totalAssets}  sub={`${kpi.activeAssets} ${t(tr.dashboard.kpi.active)}`}                     icon={Package} color="indigo" href="/assets"            trend="+2.4%" />
        <KpiCard label={t(tr.dashboard.kpi.idle)}         value={kpi.idleAssets}   sub={t(tr.dashboard.kpi.readyDeploy)}                                           icon={Layers}  color="slate"  href="/assets?status=idle" />
        <KpiCard label={t(tr.dashboard.kpi.openTickets)}  value={kpi.openTickets}  sub={`${kpi.underRepair} ${t(tr.dashboard.kpi.underRepair)}`}                   icon={Ticket}  color="amber"  href="/tickets"            alert={kpi.openTickets > 5} />
        <KpiCard label={t(tr.dashboard.kpi.occupancy)}    value={`${kpi.occupancyPct}%`} sub={`${kpi.occupiedSeats} / ${kpi.totalSeats} ${t(tr.dashboard.kpi.seats)}`} icon={Users} color="green"  href="/floor-plan" />
      </div>

      {/* Warranty alert */}
      {expiringAssets.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {expiringAssets.length} {t(tr.dashboard.warningStrip.title)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {expiringAssets.map((a) => {
                const days = Math.round((new Date(a.warranty_expiry).getTime() - Date.now()) / 86400000);
                const expired = days < 0;
                return (
                  <Link key={a.id} href={`/assets/${a.id}`}
                    className={cn("badge hover:opacity-80 transition-opacity", expired ? "badge-red" : "badge-amber")}>
                    <span className="font-mono">{a.asset_tag}</span>
                    <span className="ml-1 opacity-60">{expired ? `${Math.abs(days)}d ago` : `${days}d`}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <DashboardCharts warrantyTimeline={warrantyTimeline} byCategory={byCategory} byStatus={translatedByStatus} locale={locale} />

      {/* Bottom panels */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Open tickets */}
        <div className="sp-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Ticket size={14} className="text-indigo-600" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">{t(tr.dashboard.openTickets)}</h2>
            </div>
            <Link href="/tickets" className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold">
              {t(tr.common.viewAll)} <ArrowUpRight size={11} />
            </Link>
          </div>
          {tickets.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Ticket size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">{t(tr.dashboard.noTickets)}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tickets.map((ticket: any) => (
                <Link key={ticket.id} href={`/tickets/${ticket.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_DOT[ticket.priority] }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[10px] text-slate-400">{ticket.ticket_number}</span>
                      <span className={STATUS_COLOR[ticket.status] ?? "badge-slate"}>{statusLabel(ticket.status)}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 truncate group-hover:text-indigo-600 transition-colors">{ticket.title}</p>
                  </div>
                  <ArrowUpRight size={13} className="text-slate-300 shrink-0 group-hover:text-indigo-500 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Warranty */}
        <div className="sp-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <AlertTriangle size={14} className="text-amber-600" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">{t(tr.dashboard.warrantyList)}</h2>
            </div>
            <Link href="/assets" className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold">
              {t(tr.dashboard.allAssets)} <ArrowUpRight size={11} />
            </Link>
          </div>
          {expiringAssets.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <TrendingUp size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">{t(tr.dashboard.noWarranty)}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {expiringAssets.map((a) => {
                const days = Math.round((new Date(a.warranty_expiry).getTime() - Date.now()) / 86400000);
                const expired = days < 0;
                return (
                  <Link key={a.id} href={`/assets/${a.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold",
                      expired ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {expired ? "!" : days}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold font-mono text-slate-800">{a.asset_tag}</p>
                      <p className="text-xs text-slate-400 truncate">{a.asset_models.brand} {a.asset_models.model_name}</p>
                    </div>
                    <p className={cn("text-xs font-semibold shrink-0", expired ? "text-red-600" : days <= 7 ? "text-amber-600" : "text-slate-400")}>
                      {expired ? `${Math.abs(days)}d ${t(tr.dashboard.warningStrip.daysAgo)}` : `${days}d ${t(tr.dashboard.daysLeft)}`}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color, href, trend, alert }: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; color: string; href: string;
  trend?: string | null; alert?: boolean;
}) {
  const cfg: Record<string, { iconBg: string; iconFg: string; ring: string }> = {
    indigo: { iconBg: "bg-indigo-50", iconFg: "text-indigo-600", ring: "" },
    amber:  { iconBg: "bg-amber-50",  iconFg: "text-amber-600",  ring: alert ? "ring-2 ring-amber-300" : "" },
    green:  { iconBg: "bg-green-50",  iconFg: "text-green-600",  ring: "" },
    slate:  { iconBg: "bg-slate-100", iconFg: "text-slate-500",  ring: "" },
  };
  const c = cfg[color] ?? cfg.slate;

  return (
    <Link href={href} className={cn("sp-card-hover flex flex-col gap-3 p-5", c.ring)}>
      <div className="flex items-center justify-between">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", c.iconBg)}>
          <Icon size={17} className={c.iconFg} />
        </div>
        {trend && (
          <span className="flex items-center gap-0.5 text-[11px] font-semibold text-green-600">
            <TrendingUp size={10} /> {trend}
          </span>
        )}
        {alert && !trend && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
        <div className="text-[11px] font-semibold text-slate-500 mt-0.5">{label}</div>
        <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>
      </div>
    </Link>
  );
}
