"use client";

/**
 * DashboardCharts — Recharts-powered chart panel
 * ─────────────────────────────────────────────────────────────────
 * 1. Warranty Expiry Timeline — BarChart (12 months)
 *    Bars: expiring (amber) + expired (red) + critical overlay
 *
 * 2. Assets by Category — Custom Donut PieChart
 *
 * 3. Assets by Status — Horizontal BarChart
 *
 * All charts are responsive (ResponsiveContainer),
 * use CSS variables for colors, and animate on mount.
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LabelList,
} from "recharts";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────
interface WarrantyBucket {
  month:    string;
  expiring: number;
  critical: number;
  expired:  number;
}

interface CategoryData {
  category: string;
  label:    string;
  count:    number;
}

interface StatusData {
  status: string;
  label:  string;
  color:  string;
  count:  number;
}

interface Props {
  warrantyTimeline: WarrantyBucket[];
  byCategory:       CategoryData[];
  byStatus:         StatusData[];
  locale?:          "th" | "en";
}

// ── Colour palette for categories ────────────────────────────────
const CATEGORY_COLORS = [
  "#6366f1", "#22c55e", "#f59e0b", "#06b6d4",
  "#ec4899", "#8b5cf6", "#10b981", "#f97316",
  "#3b82f6", "#94a3b8",
];

// ── Custom Tooltip ────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover shadow-lg px-3 py-2.5 text-xs">
      {label && <p className="font-semibold text-foreground mb-1.5">{label}</p>}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color ?? p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Custom donut label ────────────────────────────────────────────
function DonutLabel({ cx, cy, total }: { cx: number; cy: number; total: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.4em" fontSize={22} fontWeight={700} fill="var(--foreground, #0f172a)">
        {total}
      </tspan>
      <tspan x={cx} dy="1.4em" fontSize={11} fill="var(--muted-foreground, #64748b)">
        assets
      </tspan>
    </text>
  );
}

// ── Main component ────────────────────────────────────────────────
export function DashboardCharts({ warrantyTimeline, byCategory, byStatus, locale = "th" }: Props) {
  const L = {
    warrantyTitle:    locale === "th" ? "ไทม์ไลน์การรับประกัน"             : "Warranty Expiry Timeline",
    warrantySubtitle: locale === "th" ? "12 เดือนข้างหน้า"                 : "Next 12 months",
    categoryTitle:    locale === "th" ? "แยกตามประเภท"                     : "By Category",
    categorySubtitle: locale === "th" ? "สัดส่วนสินทรัพย์"                 : "Asset distribution",
    statusTitle:      locale === "th" ? "แยกตามสถานะ"                      : "Status Breakdown",
    statusSubtitle:   locale === "th" ? "สินทรัพย์ทั้งหมดตามสถานะปัจจุบัน" : "All assets by current status",
    expired:          locale === "th" ? "หมดแล้ว"   : "Expired",
    expiring:         locale === "th" ? "กำลังหมด"  : "Expiring",
    critical:         locale === "th" ? "วิกฤต"     : "Critical",
    assets:           locale === "th" ? "สินทรัพย์" : "assets",
    noWarranty:       locale === "th" ? "ไม่มีการรับประกันที่หมดใน 12 เดือนข้างหน้า" : "No warranties expiring in the next 12 months",
    noAssets:         locale === "th" ? "ยังไม่มีสินทรัพย์" : "No assets yet",
  };
  const totalAssets = byCategory.reduce((s, c) => s + c.count, 0);
  const hasWarranty = warrantyTimeline.some((b) => b.expiring + b.expired + b.critical > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-3">

      {/* ── Chart 1: Warranty Timeline (spans 2 cols on large screen) ── */}
      <section className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
        <ChartHeader title={L.warrantyTitle} subtitle={L.warrantySubtitle} />
        <div className="px-4 pb-5">
          {!hasWarranty ? (
            <EmptyChart message={L.noWarranty} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={warrantyTimeline} barGap={2} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={22}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--accent))" }} />
                <Bar dataKey="expired"  name={L.expired}  fill="#ef4444" radius={[3,3,0,0]} maxBarSize={28} />
                <Bar dataKey="expiring" name={L.expiring} fill="#f59e0b" radius={[3,3,0,0]} maxBarSize={28} />
                <Bar dataKey="critical" name={L.critical}  fill="#dc2626" radius={[3,3,0,0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-5 mt-2">
            {[
              { color: "#ef4444", label: L.expired  },
              { color: "#f59e0b", label: L.expiring },
              { color: "#dc2626", label: L.critical },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chart 2: Asset by Category (Donut) ── */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <ChartHeader title={L.categoryTitle} subtitle={L.categorySubtitle} />
        <div className="px-3 pb-4">
          {byCategory.length === 0 ? (
            <EmptyChart message={L.noAssets} />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={2}
                    animationBegin={0}
                    animationDuration={700}
                  >
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                    <DonutLabel
                      cx={0}   // overridden by SVG transform
                      cy={0}
                      total={totalAssets}
                    />
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Category legend */}
              <div className="space-y-1.5 px-1">
                {byCategory.slice(0, 6).map((c, i) => (
                  <div key={c.category} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                    />
                    <span className="flex-1 text-xs text-foreground truncate">{c.label}</span>
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground">{c.count}</span>
                    <span className="text-[10px] text-muted-foreground w-8 text-right">
                      {totalAssets > 0 ? `${Math.round((c.count / totalAssets) * 100)}%` : "—"}
                    </span>
                  </div>
                ))}
                {byCategory.length > 6 && (
                  <p className="text-[10px] text-muted-foreground pl-4">
                    +{byCategory.length - 6} more categories
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Chart 3: Asset by Status (Horizontal Bar) ── */}
      <section className="lg:col-span-3 rounded-xl border border-border bg-card overflow-hidden">
        <ChartHeader title={L.statusTitle} subtitle={L.statusSubtitle} />
        <div className="px-4 pb-5">
          {byStatus.length === 0 ? (
            <EmptyChart message={L.noAssets} />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(120, byStatus.length * 38)}>
              <BarChart
                layout="vertical"
                data={byStatus}
                barCategoryGap="30%"
                margin={{ left: 8, right: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--accent))" }} />
                <Bar dataKey="count" name={L.assets} radius={[0,4,4,0]} maxBarSize={22}>
                  {byStatus.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────
function ChartHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="px-5 py-4 border-b border-border">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
