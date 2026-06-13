// @ts-nocheck
"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Globe, Database, Info } from "lucide-react";
import { assetDB } from "@/lib/supabaseDB";
import { SEED_ASSETS } from "@/lib/seed/plan2569";

export default function SettingsPage() {
  const { locale: _loc } = useLanguage();
  const locale: "th" | "en" = _loc === "en" ? "en" : "th";

  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  async function handleImport() {
    const ok = window.confirm(locale === "th"
      ? `นำเข้าทรัพย์สินจากผังคอม 2569 ทั้งหมด ${SEED_ASSETS.length} รายการ?\n(รายการที่มีเลขทรัพย์สินอยู่แล้วจะถูกข้าม)`
      : `Import ${SEED_ASSETS.length} assets from Plan 2569?\n(Existing asset tags will be skipped)`);
    if (!ok) return;
    setImporting(true); setImportMsg("");
    try {
      const existing = await assetDB.getAll();
      const have = new Set(existing.map((a) => a.asset_tag));
      let added = 0, skipped = 0, failed = 0;
      for (const s of SEED_ASSETS) {
        if (have.has(s.asset_tag)) { skipped++; continue; }
        try {
          await assetDB.create({
            asset_tag: s.asset_tag, serial_number: s.serial_number, brand: s.brand,
            model_name: s.model_name, category: s.category,
            branch_id: "b01", branch_name: "ศูนย์ฯนครราชสีมา", branch_code: "NMA-01",
            seat_id: null, seat_label: s.seat_label, room_name: s.room_name,
            status: s.status, condition: "good", purchase_price: "", currency: "THB",
            hostname: "", ip_address: "", notes: s.notes,
            photos: [], return_documents: [],
            assigned_to_id: null, assigned_to_name: s.assigned_to_name,
          });
          added++;
        } catch (e) { console.error("import fail", s.asset_tag, e); failed++; }
        setImportMsg(locale === "th" ? `กำลังนำเข้า... ${added + skipped + failed}/${SEED_ASSETS.length}` : `Importing... ${added + skipped + failed}/${SEED_ASSETS.length}`);
      }
      setImportMsg(
        (locale === "th"
          ? `เสร็จสิ้น: เพิ่มใหม่ ${added} รายการ, ข้าม ${skipped} รายการ (มีอยู่แล้ว)`
          : `Done: added ${added}, skipped ${skipped} (already exist)`) +
        (failed ? (locale === "th" ? `, ล้มเหลว ${failed}` : `, failed ${failed}`) : "")
      );
      window.dispatchEvent(new Event("itam_assets_updated"));
    } catch (e) {
      setImportMsg((locale === "th" ? "เกิดข้อผิดพลาด: " : "Error: ") + (e?.message ?? String(e)));
    }
    setImporting(false);
  }

  return (
    <div className="min-h-full">
      <div className="max-w-2xl mx-auto px-5 md:px-8 py-8 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {locale === "th" ? "ตั้งค่า" : "Settings"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {locale === "th" ? "ภาษาและการนำเข้าข้อมูลของระบบ" : "Language and data management"}
          </p>
        </div>

        {/* ภาษา */}
        <div className="sp-card p-6 space-y-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Globe size={15} className="text-indigo-500" />
            {locale === "th" ? "ภาษา" : "Language"}
          </p>
          <p className="text-xs text-muted-foreground">
            {locale === "th" ? "เลือกภาษาที่ใช้แสดงผลทั้งระบบ" : "Display language for the whole app"}
          </p>
          <div style={{ display: "inline-flex" }}><LanguageSwitcher variant="light" /></div>
        </div>

        {/* นำเข้าข้อมูล */}
        <div className="sp-card p-6 space-y-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Database size={15} className="text-indigo-500" />
            {locale === "th" ? "นำเข้าข้อมูล" : "Data Import"}
          </p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{locale === "th" ? "นำเข้าทรัพย์สินจากผังคอม 2569" : "Import assets from Plan 2569"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {locale === "th"
                  ? `${SEED_ASSETS.length} รายการ (คอม / UPS / จอ / Printer) — รายการที่มีอยู่แล้วจะถูกข้าม`
                  : `${SEED_ASSETS.length} items — existing tags are skipped`}
              </p>
            </div>
            <button onClick={handleImport} disabled={importing}
              className="sp-btn-primary shrink-0 disabled:opacity-50 text-xs">
              {importing ? (locale === "th" ? "กำลังนำเข้า..." : "Importing...") : (locale === "th" ? "นำเข้า" : "Import")}
            </button>
          </div>
          {importMsg && <p className="text-xs font-medium text-foreground">{importMsg}</p>}
        </div>

        {/* เกี่ยวกับระบบ */}
        <div className="sp-card p-6 space-y-2">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Info size={15} className="text-indigo-500" />
            {locale === "th" ? "เกี่ยวกับระบบ" : "About"}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            IT Asset Manager · ศูนย์ฯนครราชสีมา<br />
            {locale === "th"
              ? "ข้อมูลทรัพย์สิน ผังพื้นที่ และรอบสำรวจ ถูกเก็บบนฐานข้อมูลกลาง (Supabase) ใช้ร่วมกันได้ทุกเครื่อง"
              : "Assets, floor plans and survey rounds are stored centrally in Supabase."}
          </p>
        </div>

      </div>
    </div>
  );
}
