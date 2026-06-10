// @ts-nocheck
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createSeat } from "@/lib/queries/seats";
import { cn } from "@/lib/utils";

const makeSchema = (isTh: boolean) => z.object({
  label:            z.string().min(1, isTh ? "กรุณากรอกชื่อ" : "Label required").max(20),
  node_type:        z.enum(["desk","server_rack","printer_station","network_cabinet","meeting_room","storage","label"]),
  rj45_wall_port:   z.string().optional(),
  patch_panel_port: z.string().optional(),
  notes:            z.string().optional(),
});

type FormValues = {
  label: string; node_type: string;
  rj45_wall_port: string; patch_panel_port: string; notes: string;
};

interface AddDeskModalProps {
  roomId:    string;
  pos_x:     number;
  pos_y:     number;
  onCreated: (seat: any) => void;
  onClose:   () => void;
}

export function AddDeskModal({ roomId, pos_x, pos_y, onCreated, onClose }: AddDeskModalProps) {
  const supabase = getSupabaseBrowser();
  const { locale } = useLanguage();
  const isTh = locale === "th";
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(makeSchema(isTh)),
    defaultValues: { label: "", node_type: "desk" },
  });

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      const seat = await createSeat(supabase, {
        room_id:          roomId,
        label:            values.label,
        node_type:        values.node_type as any,
        pos_x,
        pos_y,
        width_px:         60,
        height_px:        40,
        rotation_deg:     0,
        rj45_wall_port:   values.rj45_wall_port || null as any,
        patch_panel_port: values.patch_panel_port || null as any,
        notes:            values.notes || null as any,
      });
      toast.success(isTh ? `สร้างโต๊ะ "${values.label}" แล้ว` : `Desk "${values.label}" created`);
      onCreated(seat);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const { formState: { errors } } = form;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-sm">
            {isTh ? "เพิ่มโต๊ะ / โหนด" : "Add Desk / Node"}
          </h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-accent text-muted-foreground">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {isTh ? "ชื่อ *" : "Label *"}
            </label>
            <input {...form.register("label")} placeholder="D-01"
              className={cn("w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring",
                errors.label ? "border-destructive" : "border-input bg-background")} />
            {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {isTh ? "ประเภท" : "Type"}
            </label>
            <select {...form.register("node_type")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="desk">{isTh ? "โต๊ะทำงาน" : "Desk"}</option>
              <option value="server_rack">{isTh ? "Server Rack" : "Server Rack"}</option>
              <option value="printer_station">{isTh ? "เครื่องพิมพ์" : "Printer Station"}</option>
              <option value="network_cabinet">{isTh ? "ตู้เน็ตเวิร์ก" : "Network Cabinet"}</option>
              <option value="meeting_room">{isTh ? "ห้องประชุม" : "Meeting Room"}</option>
              <option value="storage">{isTh ? "คลังสินค้า" : "Storage"}</option>
              <option value="label">{isTh ? "ป้ายกำกับ" : "Label"}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {isTh ? "พอร์ตผนัง" : "Wall Port"}
              </label>
              <input {...form.register("rj45_wall_port")} placeholder="W-B3-045"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Patch Panel</label>
              <input {...form.register("patch_panel_port")} placeholder="PP-3A-045"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring font-mono" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {isTh ? "หมายเหตุ" : "Notes"}
            </label>
            <input {...form.register("notes")} placeholder={isTh ? "หมายเหตุเพิ่มเติม…" : "Optional notes…"}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
              {isTh ? "ยกเลิก" : "Cancel"}
            </button>
            <button type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              {isTh ? "เพิ่มโต๊ะ" : "Add Desk"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}