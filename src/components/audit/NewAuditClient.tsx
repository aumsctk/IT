// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Zod schema — validation messages set dynamically below
const makeSchema = (isTh: boolean) => z.object({
  name:      z.string().min(3, isTh ? "กรุณากรอกชื่อรอบการตรวจนับ" : "Session name required"),
  branch_id: z.string().uuid(isTh ? "กรุณาเลือกสาขา" : "Select a branch"),
  room_id:   z.string().uuid().optional().or(z.literal("")),
  notes:     z.string().optional(),
});

type FormValues = {
  name: string;
  branch_id: string;
  room_id: string;
  notes: string;
};

export function NewAuditClient({
  branches, rooms, userId,
}: {
  branches: Array<{ id: string; name: string; code: string }>;
  rooms:    Array<{ id: string; name: string; code: string; zones?: any }>;
  userId:   string;
}) {
  const router   = useRouter();
  const supabase = getSupabaseBrowser();
  const { locale } = useLanguage();
  const isTh = locale === "th";
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(makeSchema(isTh)),
    defaultValues: { name: "", branch_id: "", room_id: "", notes: "" },
  });

  const selectedBranch = form.watch("branch_id");
  const filteredRooms  = rooms.filter((r) => r.zones?.branch_id === selectedBranch);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      const { data: session, error } = await supabase
        .from("audit_sessions")
        .insert({
          branch_id:  values.branch_id,
          room_id:    values.room_id || null,
          name:       values.name,
          started_by: userId,
          notes:      values.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success(isTh ? "เริ่มรอบการตรวจนับแล้ว" : "Audit session started");
      router.push(`/audit/${session.id}/scan`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const { formState: { errors } } = form;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}
      className="rounded-xl border border-border bg-card p-6 space-y-5">

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {isTh ? "ชื่อรอบการตรวจนับ *" : "Session Name *"}
        </label>
        <input {...form.register("name")}
          placeholder={isTh ? "ตรวจนับประจำไตรมาส 4/2567" : "Q4 2024 Full Branch Audit"}
          className={inputCls(!!errors.name)} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {isTh ? "สาขา *" : "Branch *"}
        </label>
        <select {...form.register("branch_id")} className={inputCls(!!errors.branch_id)}>
          <option value="">{isTh ? "— เลือกสาขา —" : "— Select branch —"}</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
          ))}
        </select>
        {errors.branch_id && <p className="text-xs text-destructive">{errors.branch_id.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {isTh ? "ขอบเขต (ไม่บังคับ — ถ้าว่างจะตรวจทั้งสาขา)" : "Scope (optional — leave blank for full branch)"}
        </label>
        <select {...form.register("room_id")} className={inputCls()} disabled={!selectedBranch}>
          <option value="">{isTh ? "ทุกห้องในสาขา" : "All rooms in branch"}</option>
          {filteredRooms.map((r) => (
            <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {isTh ? "หมายเหตุ" : "Notes"}
        </label>
        <textarea {...form.register("notes")} rows={2}
          placeholder={isTh ? "หมายเหตุเพิ่มเติม…" : "Optional notes…"}
          className={cn(inputCls(), "resize-none")} />
      </div>

      <button type="submit" disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
        {saving && <Loader2 size={14} className="animate-spin" />}
        {isTh ? "เริ่มการสแกน" : "Start Scanning"}
      </button>
    </form>
  );
}

function inputCls(hasError = false) {
  return cn(
    "block w-full rounded-md border bg-background px-3 py-2 text-sm",
    "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2",
    hasError && "border-destructive focus-visible:ring-destructive"
  );
}