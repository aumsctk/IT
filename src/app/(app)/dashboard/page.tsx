"use client";

import { useState, useEffect } from "react";
import { getDashboardStats, assetDB, ticketDB, type Asset, type Ticket } from "@/lib/supabaseDB";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default function DashboardPage() {
  const { locale } = useLanguage();
  const isTh = locale === "th";
  const [ready, setReady] = useState(false);
  const [kpi, setKpi] = useState<any>(null);
  const [warrantyTimeline, setWarrantyTimeline] = useState<any[]>([]);
  const [byCategory, setByCategory] = useState<any[]>([]);
  const [byStatus, setByStatus] = useState<any[]>([]);
  const [expiringAssets, setExpiringAssets] = useState<any[]>([]);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [stats, assets, tickets] = await Promise.all([
        getDashboardStats(),
        assetDB.getAll(),
        ticketDB.getAll(),
      ]);

      // byCategory
      const CAT_LABEL: Record<string, string> = isTh ? {
        computer: "คอมพิวเตอร์", laptop: "โน้ตบุ๊ก", monitor: "จอมอนิเตอร์",
        network_device: "อุปกรณ์เครือข่าย", printer: "เครื่องพิมพ์", ups: "UPS",
        peripheral: "อุปกรณ์ต่อพ่วง", server: "เซิร์ฟเวอร์", other: "อื่นๆ",
      } : {
        computer: "Computer", laptop: "Laptop", monitor: "Monitor",
        network_device: "Network", printer: "Printer", ups: "UPS",
        peripheral: "Peripheral", server: "Server", other: "Other",
      };
      const catMap: Record<string, number> = {};
      assets.forEach((a) => { catMap[a.category] = (catMap[a.category] ?? 0) + 1; });
      setByCategory(Object.entries(catMap).map(([category, count]) => ({
        category, label: CAT_LABEL[category] ?? category, count,
      })));

      // byStatus
      const STATUS_COLOR: Record<string, string> = {
        idle: "#94a3b8", in_use: "#22c55e", under_repair: "#f59e0b",
        pending_return: "#f97316", returned: "#3b82f6",
      };
      const STATUS_LABEL: Record<string, string> = {
        idle: "ว่าง", in_use: "ใช้งาน", under_repair: "แจ้งซ่อม",
        pending_return: "รอส่งคืน", returned: "ส่งคืนแล้ว",
      };
      const statMap: Record<string, number> = {};
      assets.forEach((a) => { statMap[a.status] = (statMap[a.status] ?? 0) + 1; });
      setByStatus(Object.entries(statMap).map(([status, count]) => ({
        status, label: STATUS_LABEL[status] ?? status, color: STATUS_COLOR[status] ?? "#94a3b8", count,
      })));

      // warrantyTimeline
      const now = new Date();
      const months: any[] = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const label = d.toLocaleDateString("th-TH", { month: "short", year: "2-digit" });
        const inMonth = assets.filter((a) => {
          if (!a.warranty_expiry) return false;
          const wd = new Date(a.warranty_expiry);
          return wd.getFullYear() === d.getFullYear() && wd.getMonth() === d.getMonth();
        });
        months.push({
          month: label,
          expiring: inMonth.length,
          critical: inMonth.filter((a) => a.is_critical).length,
          expired: i === 0 ? assets.filter((a) => a.warranty_expiry && new Date(a.warranty_expiry) < now).length : 0,
        });
      }
      setWarrantyTimeline(months);

      // asset trend: compare assets added this month vs last month
      const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonthCount = assets.filter(a => new Date(a.created_at) >= startThisMonth).length;
      const lastMonthCount = assets.filter(a => {
        const d = new Date(a.created_at);
        return d >= startLastMonth && d < startThisMonth;
      }).length;
      let assetTrend: string | null = null;
      if (lastMonthCount > 0) {
        const pct = Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100);
        assetTrend = (pct >= 0 ? "+" : "") + pct + "%";
      } else if (thisMonthCount > 0) {
        assetTrend = "+100%";
      }

      // recentTickets
      setRecentTickets(tickets.slice(0, 5).map((t) => ({ ...t, creator: { full_name: t.reporter_name } })));

      // expiringAssets
      const soon = new Date(now.getTime() + 30 * 86400000).toISOString().split("T")[0];
      setExpiringAssets(assets
        .filter((a) => a.warranty_expiry && a.warranty_expiry <= soon && a.warranty_expiry >= now.toISOString().split("T")[0])
        .map((a) => ({ ...a, asset_models: { brand: a.brand, model_name: a.model_name } }))
      );

      // floor plan seats (still localStorage for floor plan)
      let totalSeats = 0, occupiedSeats = 0;
      try {
        const raw = localStorage.getItem("floorplan_data");
        if (raw) {
          const data = JSON.parse(raw);
          for (const floor of Object.values(data) as any[]) {
            const seats = floor.seats ?? [];
            totalSeats += seats.length;
            occupiedSeats += seats.filter((s: any) => s.employee).length;
          }
        }
      } catch {}

      setKpi({
        totalAssets: assets.length,
        assetTrend,
        activeAssets: stats.activeAssets,
        idleAssets: stats.idleAssets,
        underRepair: stats.underRepair,
        openTickets: stats.openTickets,
        totalSeats,
        occupiedSeats,
        occupancyPct: totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0,
      });

      setReady(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return null;

  return (
    <DashboardClient
      kpi={kpi}
      warrantyTimeline={warrantyTimeline}
      byCategory={byCategory}
      byStatus={byStatus}
      expiringAssets={expiringAssets}
      tickets={recentTickets}
    />
  );
}
