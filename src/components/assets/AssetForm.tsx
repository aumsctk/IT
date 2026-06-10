// @ts-nocheck
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createAsset, updateAsset } from "@/lib/queries/assets";
import { uploadQRCode } from "@/lib/qrcode";
import { PhotoUploader } from "./PhotoUploader";
import { useAssetPhotoUpload } from "@/hooks/useUpload";
import type { Asset, AssetStatus, AssetCondition } from "@/types/database";

const makeSchema = (isTh: boolean) => z.object({
  asset_tag:          z.string().min(3, isTh ? "กรุณากรอกรหัสสินทรัพย์" : "Asset tag is required").max(50),
  serial_number:      z.string().optional(),
  model_id:           z.string().uuid(isTh ? "กรุณาเลือกรุ่น" : "Select a model").optional().or(z.literal("")),
  branch_id:          z.string().uuid(isTh ? "กรุณาเลือกสาขา" : "Select a branch"),
  status:             z.enum(["active","idle","under_repair","retired","lost","disposed"]),
  condition:          z.enum(["excellent","good","fair","poor","broken"]),

  purchase_price:     z.coerce.number().min(0).optional(),
  currency:           z.string().length(3).default("THB"),
  warranty_expiry:    z.string().optional(),
  hostname:           z.string().optional(),
  ip_address:         z.string().optional(),
  notes:              z.string().optional(),
});

type FormValues = {
  asset_tag: string; serial_number: string; model_id: string; branch_id: string;
  status: AssetStatus; condition: AssetCondition;
  purchase_price?: number; currency: string;
  warranty_expiry: string; hostname: string;
  ip_address: string; notes: string;
};

interface AssetFormProps {
  asset?:     Partial<Asset>;
  branches:   Array<{ id: string; name: string }>;
  models:     Array<{ id: string; brand: string; model_name: string; category: string }>;
  onSuccess?: (asset: Asset) => void;
}

export function AssetForm({ asset, branches, models, onSuccess }: AssetFormProps) {
  const router   = useRouter();
  const supabase = getSupabaseBrowser();
  const { locale } = useLanguage();
  const isTh = locale === "th";
  const isEdit = !!asset?.id;

  const [photos, setPhotos]       = useState<string[]>(asset?.photos ?? []);
  const [isSaving, setIsSaving]   = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const photoUpload = useAssetPhotoUpload(asset?.id ?? "pending");

  const form = useForm<FormValues>({
    resolver: zodResolver(makeSchema(isTh)),
    defaultValues: {
      asset_tag:          asset?.asset_tag          ?? "",
      serial_number:      asset?.serial_number       ?? "",
      model_id:           asset?.model_id            ?? "",
      branch_id:          asset?.branch_id           ?? "",
      status:             (asset?.status as AssetStatus) ?? "idle",
      condition:          (asset?.condition as AssetCondition) ?? "good",

      purchase_price:     asset?.purchase_price       ?? undefined,
      currency:           asset?.currency             ?? "THB",
      warranty_expiry:    asset?.warranty_expiry       ?? "",
      hostname:           asset?.hostname              ?? "",
      ip_address:         asset?.ip_address            ?? "",
      notes:              asset?.notes                 ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSaving(true);
    try {
      const clean = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== "" && v != null)
      ) as Partial<Asset>;

      let saved: Asset;

      if (isEdit && asset?.id) {
        saved = await updateAsset(supabase, asset.id, clean) as Asset;
        toast.success(isTh ? "บันทึกการเปลี่ยนแปลงแล้ว" : "Asset updated");
      } else {
        saved = await createAsset(supabase, clean as any) as Asset;
        try {
          const qrUrl = await uploadQRCode(supabase, saved.id, saved.asset_tag);
          await updateAsset(supabase, saved.id, { qr_code_url: qrUrl });
        } catch { /* non-fatal */ }
        toast.success(isTh ? "สร้างสินทรัพย์แล้ว" : "Asset created");
      }

      if (pendingFiles.length > 0) {
        const urls = await photoUpload.upload(pendingFiles);
        const allPhotos = [...photos, ...urls];
        await updateAsset(supabase, saved.id, { photos: allPhotos });
        setPhotos(allPhotos);
      }

      onSuccess?.(saved);
      if (!isEdit) router.push(`/assets/${saved.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  const F   = form;
  const err = F.formState.errors;

  return (
    <form onSubmit={F.handleSubmit(onSubmit)} className="space-y-8">

      {/* Identity */}
      <Section title={isTh ? "ข้อมูลสินทรัพย์" : "Asset Identity"}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={isTh ? "รหัสสินทรัพย์ *" : "Asset Tag *"} error={err.asset_tag?.message}>
            <input {...F.register("asset_tag")} placeholder="IT-PC-00001"
              className={inputCls(!!err.asset_tag)} />
          </Field>

          <Field label={isTh ? "หมายเลขซีเรียล" : "Serial Number"} error={err.serial_number?.message}>
            <input {...F.register("serial_number")} placeholder="SN12345678"
              className={inputCls()} />
          </Field>

          <Field label={isTh ? "สาขา *" : "Branch *"} error={err.branch_id?.message}>
            <select {...F.register("branch_id")} className={inputCls(!!err.branch_id)}>
              <option value="">{isTh ? "— เลือกสาขา —" : "— Select branch —"}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>

          <Field label={isTh ? "รุ่น/โมเดล" : "Model"} error={err.model_id?.message}>
            <select {...F.register("model_id")} className={inputCls()}>
              <option value="">{isTh ? "— เลือกรุ่น —" : "— Select model —"}</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.brand} {m.model_name}</option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* Status */}
      <Section title={isTh ? "สถานะและสภาพ" : "Status & Condition"}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label={isTh ? "สถานะ *" : "Status *"} error={err.status?.message}>
            <select {...F.register("status")} className={inputCls()}>
              <option value="idle">{isTh ? "ว่างอยู่" : "Idle"}</option>
              <option value="active">{isTh ? "ใช้งานอยู่" : "Active"}</option>
              <option value="under_repair">{isTh ? "กำลังซ่อม" : "Under Repair"}</option>
              <option value="retired">{isTh ? "เลิกใช้งาน" : "Retired"}</option>
              <option value="lost">{isTh ? "สูญหาย" : "Lost"}</option>
              <option value="disposed">{isTh ? "จำหน่ายแล้ว" : "Disposed"}</option>
            </select>
          </Field>

          <Field label={isTh ? "สภาพ *" : "Condition *"} error={err.condition?.message}>
            <select {...F.register("condition")} className={inputCls()}>
              <option value="excellent">{isTh ? "ดีเยี่ยม" : "Excellent"}</option>
              <option value="good">{isTh ? "ดี" : "Good"}</option>
              <option value="fair">{isTh ? "พอใช้" : "Fair"}</option>
              <option value="poor">{isTh ? "แย่" : "Poor"}</option>
              <option value="broken">{isTh ? "ชำรุด" : "Broken"}</option>
            </select>
          </Field>

        </div>
      </Section>

      {/* Procurement */}
      <Section title={isTh ? "การจัดซื้อและการรับประกัน" : "Procurement & Warranty"}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={isTh ? "ราคาที่ซื้อ" : "Purchase Price"}>
            <div className="flex gap-2">
              <input {...F.register("purchase_price")} type="number" step="0.01"
                placeholder="0.00" className={cn(inputCls(), "flex-1")} />
              <select {...F.register("currency")} className={cn(inputCls(), "w-24")}>
                <option value="THB">THB</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </Field>

          <Field label={isTh ? "วันหมดประกัน" : "Warranty Expiry"}>
            <input type="date" {...F.register("warranty_expiry")} className={inputCls()} />
          </Field>
        </div>
      </Section>

      {/* Network */}
      <Section title={isTh ? "ข้อมูลเครือข่าย" : "Network Identity"}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={isTh ? "ชื่อเครื่อง" : "Hostname"}>
            <input {...F.register("hostname")} placeholder="PC-BKK-001" className={inputCls()} />
          </Field>
          <Field label="IP Address">
            <input {...F.register("ip_address")} placeholder="192.168.1.100" className={inputCls()} />
          </Field>
        </div>
      </Section>

      {/* Photos */}
      <Section title={isTh ? "รูปภาพ" : "Photos"}>
        <PhotoUploader
          existingPhotos={photos}
          maxPhotos={5}
          onUpload={async (files) => {
            if (isEdit && asset?.id) {
              const urls = await photoUpload.upload(files);
              setPhotos((prev) => [...prev, ...urls]);
              return urls;
            }
            setPendingFiles((prev) => [...prev, ...files]);
            return [];
          }}
          onRemove={(url) => setPhotos((prev) => prev.filter((p) => p !== url))}
          uploadStage={photoUpload.stage}
          uploadProgress={photoUpload.progress}
          uploadMessage={photoUpload.message}
          uploadError={photoUpload.error}
        />
      </Section>

      {/* Notes */}
      <Section title={isTh ? "หมายเหตุ" : "Notes"}>
        <textarea {...F.register("notes")} rows={3}
          placeholder={isTh ? "หมายเหตุเพิ่มเติม…" : "Additional notes…"}
          className={cn(inputCls(), "resize-none")} />
      </Section>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
          {isTh ? "ยกเลิก" : "Cancel"}
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {isSaving && <Loader2 size={15} className="animate-spin" />}
          {isEdit ? (isTh ? "บันทึกการเปลี่ยนแปลง" : "Save Changes") : (isTh ? "สร้างสินทรัพย์" : "Create Asset")}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}