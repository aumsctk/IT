// @ts-nocheck
"use client";

import { useState } from "react";
import Link from "next/link";
import { X, User, Package, MapPin, Wrench, ChevronRight, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { assignEmployeeToSeat, setSeatStatus } from "@/lib/queries/seats";
import { assignAssetToSeat } from "@/lib/queries/assets";
import { useAvailableAssets } from "@/hooks/useAssets";
import { useEmployees } from "@/hooks/useEmployees";
import { AssetStatusBadge } from "@/components/assets/AssetStatusBadge";

interface SeatPanelProps {
  seat:       any | null;
  multiSeats: any[];
  onClose:    () => void;
  onUpdated:  () => void;
  canEdit:    boolean;
}

export function SeatPanel({ seat, multiSeats, onClose, onUpdated, canEdit }: SeatPanelProps) {
  const { locale } = useLanguage();
  const isTh = locale === "th";
  const isOpen = !!seat || multiSeats.length > 0;
  const [sheetY] = useState(0);

  if (!isOpen) return null;

  const isMulti = multiSeats.length > 1;

  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/20 md:hidden" onClick={onClose} />
      <div
        className={cn(
          "hidden md:flex flex-col absolute right-0 top-0 bottom-0 w-80 z-20",
          "border-l border-border bg-card shadow-xl animate-slide-in-right",
          "md:hidden fixed inset-x-0 bottom-0 flex flex-col z-30",
          "rounded-t-2xl border-t border-border bg-card shadow-2xl",
          "max-h-[75dvh]"
        )}
        style={{ transform: `translateY(${sheetY}px)` }}
      >
        <div className="flex justify-center py-2 md:hidden">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h3 className="font-semibold text-sm">
              {isMulti
                ? (isTh ? `เลือก ${multiSeats.length} โต๊ะ` : `${multiSeats.length} desks selected`)
                : seat?.label ?? (isTh ? "ที่นั่ง" : "Seat")}
            </h3>
            {!isMulti && seat?.rooms && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin size={10} />
                {seat.rooms.name}
              </p>
            )}
          </div>
          <button onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-accent text-muted-foreground">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isMulti
            ? <MultiSeatContent seats={multiSeats} onClose={onClose} onUpdated={onUpdated} canEdit={canEdit} isTh={isTh} />
            : <SingleSeatContent seat={seat} onClose={onClose} onUpdated={onUpdated} canEdit={canEdit} isTh={isTh} />}
        </div>
      </div>
    </>
  );
}

function SingleSeatContent({ seat, onClose, onUpdated, canEdit, isTh }: {
  seat: any; onClose: () => void; onUpdated: () => void; canEdit: boolean; isTh: boolean;
}) {
  const supabase  = getSupabaseBrowser();
  const [saving, setSaving] = useState(false);

  const { employees, isLoading: loadingEmps } = useEmployees({ unassigned_only: true, branch_id: seat?.rooms?.zones?.branches?.id });
  const { assets,    isLoading: loadingAssets } = useAvailableAssets(seat?.rooms?.zones?.branches?.id);

  const [selectedEmployee, setSelectedEmployee] = useState<string>(seat?.assigned_employee_id ?? "");
  const [selectedAsset, setSelectedAsset] = useState<string>(seat?.assets?.[0]?.id ?? "");

  async function save() {
    setSaving(true);
    try {
      if (selectedEmployee !== (seat.assigned_employee_id ?? "")) {
        await assignEmployeeToSeat(supabase, seat.id, selectedEmployee || null);
      }
      if (selectedAsset && selectedAsset !== (seat.assets?.[0]?.id ?? "")) {
        await assignAssetToSeat(supabase, selectedAsset, seat.id);
      }
      if (!selectedAsset && seat.assets?.[0]?.id) {
        await assignAssetToSeat(supabase, seat.assets[0].id, null);
      }
      toast.success(isTh ? "บันทึกเรียบร้อยแล้ว" : "Seat updated");
      onUpdated();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function setMaintenance() {
    await setSeatStatus(supabase, seat.id, "maintenance");
    toast.success(isTh ? "ตั้งเป็นซ่อมบำรุงแล้ว" : "Seat set to maintenance");
    onUpdated();
    onClose();
  }

  return (
    <div className="p-4 space-y-5">
      <InfoRow label={isTh ? "สถานะ" : "Status"}>
        <SeatStatusPill status={seat.status} isTh={isTh} />
      </InfoRow>

      {seat.rj45_wall_port && (
        <InfoRow label={isTh ? "พอร์ต RJ45" : "RJ45 Port"}>
          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{seat.rj45_wall_port}</code>
        </InfoRow>
      )}

      {canEdit ? (
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <User size={12} /> {isTh ? "พนักงาน" : "Employee"}
          </label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            disabled={loadingEmps}
            className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">{isTh ? "— ยังไม่มอบหมาย —" : "— Unassigned —"}</option>
            {seat.profiles && (
              <option value={seat.profiles.id}>
                {seat.profiles.full_name} ({isTh ? "ปัจจุบัน" : "current"})
              </option>
            )}
            {employees
              .filter((e: any) => e.id !== seat.assigned_employee_id)
              .map((e: any) => (
                <option key={e.id} value={e.id}>{e.full_name} · {e.department ?? e.email}</option>
              ))}
          </select>
        </div>
      ) : seat.profiles ? (
        <InfoRow label={isTh ? "พนักงาน" : "Employee"}>
          <Link href={`/employees/${seat.profiles.id}`}
            className="flex items-center gap-1 text-sm text-primary hover:underline">
            {seat.profiles.full_name}
            <ChevronRight size={12} />
          </Link>
        </InfoRow>
      ) : (
        <InfoRow label={isTh ? "พนักงาน" : "Employee"}>
          <span className="text-sm text-muted-foreground italic">
            {isTh ? "ยังไม่มอบหมาย" : "Unassigned"}
          </span>
        </InfoRow>
      )}

      {canEdit ? (
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Package size={12} /> {isTh ? "สินทรัพย์หลัก" : "Primary Asset"}
          </label>
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            disabled={loadingAssets}
            className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">{isTh ? "— ไม่มี —" : "— None —"}</option>
            {seat.assets?.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.asset_tag} ({isTh ? "ปัจจุบัน" : "current"})
              </option>
            ))}
            {assets
              .filter((a: any) => !seat.assets?.find((sa: any) => sa.id === a.id))
              .map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.asset_tag} — {a.brand} {a.model_name}
                </option>
              ))}
          </select>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Package size={12} /> {isTh ? "สินทรัพย์" : "Assets"}
          </p>
          {seat.assets?.length ? (
            seat.assets.map((a: any) => (
              <Link key={a.id} href={`/assets/${a.id}`}
                className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm hover:bg-accent transition-colors">
                <span className="font-mono text-xs">{a.asset_tag}</span>
                <AssetStatusBadge status={a.status} />
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {isTh ? "ไม่มีสินทรัพย์" : "No assets"}
            </p>
          )}
        </div>
      )}

      {canEdit && (
        <div className="space-y-2 pt-2 border-t border-border">
          <button
            onClick={save}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {isTh ? "บันทึกการมอบหมาย" : "Save Assignment"}
          </button>
          <button
            onClick={setMaintenance}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            <Wrench size={12} />
            {isTh ? "ตั้งเป็นซ่อมบำรุง" : "Mark Maintenance"}
          </button>
        </div>
      )}

      <Link
        href={`/floor-plan/seat/${seat.id}`}
        className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        {isTh ? "รายละเอียดที่นั่งทั้งหมด" : "Full seat details"} <ChevronRight size={11} />
      </Link>
    </div>
  );
}

function MultiSeatContent({ seats, onClose, onUpdated, canEdit, isTh }: {
  seats: any[]; onClose: () => void; onUpdated: () => void; canEdit: boolean; isTh: boolean;
}) {
  const supabase = getSupabaseBrowser();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const statusCounts = seats.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  async function bulkSetStatus() {
    if (!status) return;
    setSaving(true);
    try {
      await Promise.all(seats.map((s) => setSeatStatus(supabase, s.id, status as any)));
      toast.success(isTh ? `อัปเดต ${seats.length} ที่นั่งแล้ว` : `${seats.length} seats updated`);
      onUpdated();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        {Object.entries(statusCounts).map(([s, count]) => (
          <div key={s} className="flex items-center justify-between text-sm">
            <SeatStatusPill status={s} isTh={isTh} />
            <span className="text-muted-foreground text-xs">{count}</span>
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {isTh ? `อัปเดตทั้งหมด ${seats.length} ที่นั่ง:` : `Bulk update all ${seats.length} seats:`}
          </p>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">{isTh ? "— เลือกสถานะ —" : "— Choose status —"}</option>
            <option value="available">{isTh ? "ว่าง" : "Available"}</option>
            <option value="maintenance">{isTh ? "ซ่อมบำรุง" : "Maintenance"}</option>
            <option value="inactive">{isTh ? "ไม่ใช้งาน" : "Inactive"}</option>
          </select>
          <button
            onClick={bulkSetStatus}
            disabled={saving || !status}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isTh ? `ใช้กับ ${seats.length} โต๊ะ` : `Apply to ${seats.length} desks`}
          </button>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function SeatStatusPill({ status, isTh }: { status: string; isTh: boolean }) {
  const colorMap: Record<string, string> = {
    available:   "bg-green-500/15 text-green-700",
    occupied:    "bg-indigo-500/15 text-indigo-700",
    reserved:    "bg-amber-500/15 text-amber-700",
    maintenance: "bg-slate-400/20 text-slate-600",
    inactive:    "bg-slate-200 text-slate-500",
  };
  const labelMap: Record<string, { th: string; en: string }> = {
    available:   { th: "ว่าง",       en: "Available"   },
    occupied:    { th: "มีคนใช้",    en: "Occupied"    },
    reserved:    { th: "จองแล้ว",    en: "Reserved"    },
    maintenance: { th: "ซ่อมบำรุง", en: "Maintenance" },
    inactive:    { th: "ไม่ใช้งาน",  en: "Inactive"    },
  };
  const label = isTh
    ? (labelMap[status]?.th ?? status)
    : (labelMap[status]?.en ?? status);
  const colorMap: Record<string, string> = {
    available:   "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    occupied:    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    reserved:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    maintenance: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
    inactive:    "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", colorMap[status] ?? colorMap.inactive)}>
      {label}
    </span>
  );
}