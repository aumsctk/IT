// @ts-nocheck
"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Check, User, Settings, Bell, Shield, Globe, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { assetDB } from "@/lib/supabaseDB";
import { SEED_ASSETS } from "@/lib/seed/plan2569";

type Tab = "profile" | "system" | "notifications" | "security";

export default function SettingsPage() {
  const { locale: _loc } = useLanguage();
  const locale: "th" | "en" = _loc === "en" ? "en" : "th";
  const [tab, setTab] = useState<Tab>("profile");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  const TABS: { id: Tab; label: { th: string; en: string }; icon: React.ElementType }[] = [
    { id: "profile",       label: { th: "โปรไฟล์",      en: "Profile"       }, icon: User      },
    { id: "system",        label: { th: "ระบบ",          en: "System"        }, icon: Settings  },
    { id: "notifications", label: { th: "การแจ้งเตือน",  en: "Notifications" }, icon: Bell      },
    { id: "security",      label: { th: "ความปลอดภัย",   en: "Security"      }, icon: Shield    },
  ];

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {locale === "th" ? "ตั้งค่า" : "Settings"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {locale === "th" ? "จัดการบัญชีและค่ากำหนดของคุณ" : "Manage your account and preferences"}
          </p>
        </div>

        {/* Success toast */}
        {saved && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-green-50 border border-green-200/80 px-4 py-3 text-sm font-medium text-green-700 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-300 fade-in">
            <Check size={15} className="shrink-0" />
            {locale === "th" ? "บันทึกสำเร็จแล้ว" : "Changes saved successfully"}
          </div>
        )}

        <div className="flex gap-6 items-start">
          {/* Sidebar tabs */}
          <div className="w-44 shrink-0">
            <div className="apple-card overflow-hidden">
              {TABS.map((t, i) => {
                const Icon = t.icon;
                const isActive = tab === t.id;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left",
                      i < TABS.length - 1 && "border-b border-border/50",
                      isActive
                        ? "bg-primary/8 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}>
                    <Icon size={15} className={isActive ? "text-primary" : "text-muted-foreground/70"} />
                    {t.label[locale]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="apple-card p-6 fade-in">
              {tab === "profile"       && <ProfileTab locale={locale} onSave={handleSave} />}
              {tab === "system"        && <SystemTab locale={locale} onSave={handleSave} />}
              {tab === "notifications" && <NotificationsTab locale={locale} onSave={handleSave} />}
              {tab === "security"      && <SecurityTab locale={locale} onSave={handleSave} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ locale, onSave }: { locale: "th" | "en"; onSave: () => void }) {
  const [name,  setName]  = useState("สมชาย ใจดี");
  const [email, setEmail] = useState("somchai@company.co.th");
  const [phone, setPhone] = useState("081-234-5678");
  const [dept,  setDept]  = useState("Information Technology");

  return (
    <div className="space-y-6">
      <SectionHeader
        title={locale === "th" ? "ข้อมูลส่วนตัว" : "Personal Information"}
        desc={locale === "th" ? "แก้ไขข้อมูลส่วนตัวของคุณ" : "Update your personal details"}
      />

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white text-lg font-bold shadow-sm">
          {name.slice(0, 2)}
        </div>
        <div>
          <button className="apple-btn-secondary text-xs px-3 py-1.5">
            {locale === "th" ? "เปลี่ยนรูปภาพ" : "Change Avatar"}
          </button>
          <p className="text-[10px] text-muted-foreground mt-1">
            {locale === "th" ? "JPG หรือ PNG ขนาดสูงสุด 2MB" : "JPG or PNG, max 2MB"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label={locale === "th" ? "ชื่อ-นามสกุล" : "Full Name"} value={name} onChange={setName} />
        <Field label={locale === "th" ? "อีเมล" : "Email"} value={email} onChange={setEmail} type="email" />
        <Field label={locale === "th" ? "โทรศัพท์" : "Phone"} value={phone} onChange={setPhone} />
        <Field label={locale === "th" ? "แผนก" : "Department"} value={dept} onChange={setDept} />
      </div>

      <div className="pt-1">
        <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          <Globe size={14} className="text-muted-foreground" />
          {locale === "th" ? "ภาษา" : "Language"}
        </p>
        <div style={{display:"inline-flex"}}><LanguageSwitcher variant="light" /></div>
      </div>

      <SaveButton label={locale === "th" ? "บันทึก" : "Save Changes"} onSave={onSave} />
    </div>
  );
}

function SystemTab({ locale, onSave }: { locale: "th" | "en"; onSave: () => void }) {
  const [warrantyDays, setWarrantyDays] = useState("30");
  const [auditRemind,  setAuditRemind]  = useState("90");
  const [dateFormat,   setDateFormat]   = useState("dd/MM/yyyy");
  const [timezone,     setTimezone]     = useState("Asia/Bangkok");
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
    <div className="space-y-6">
      <SectionHeader
        title={locale === "th" ? "การตั้งค่าระบบ" : "System Settings"}
        desc={locale === "th" ? "ปรับการตั้งค่าทั่วไปของระบบ" : "Configure general system behavior"}
      />
      <div className="space-y-4">
        <Field label={locale === "th" ? "แจ้งเตือนการรับประกันล่วงหน้า (วัน)" : "Warranty Alert Threshold (days)"}
          value={warrantyDays} onChange={setWarrantyDays} type="number"
          hint={locale === "th" ? "แจ้งเตือนก่อนการรับประกันหมดจำนวนกี่วัน" : "Alert N days before warranty expiry"} />
        <Field label={locale === "th" ? "รอบการตรวจสอบสินทรัพย์ (วัน)" : "Audit Cycle (days)"}
          value={auditRemind} onChange={setAuditRemind} type="number"
          hint={locale === "th" ? "แจ้งเตือนให้ตรวจสอบทุกกี่วัน" : "Remind to run audit every N days"} />
        <SelectField label={locale === "th" ? "รูปแบบวันที่" : "Date Format"}
          value={dateFormat} onChange={setDateFormat}
          options={[
            { value: "dd/MM/yyyy", label: "DD/MM/YYYY" },
            { value: "MM/dd/yyyy", label: "MM/DD/YYYY" },
            { value: "yyyy-MM-dd", label: "YYYY-MM-DD" },
          ]} />
        <SelectField label={locale === "th" ? "เขตเวลา" : "Timezone"}
          value={timezone} onChange={setTimezone}
          options={[
            { value: "Asia/Bangkok",   label: "Asia/Bangkok (UTC+7)"   },
            { value: "UTC",            label: "UTC"                    },
            { value: "Asia/Singapore", label: "Asia/Singapore (UTC+8)" },
          ]} />
      </div>

      {/* Import from ผังคอม 2569 */}
      <div className="rounded-2xl bg-muted/50 p-4 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
          <Database size={12} />
          {locale === "th" ? "นำเข้าข้อมูล" : "Data Import"}
        </p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{locale === "th" ? "นำเข้าทรัพย์สินจากผังคอม 2569" : "Import assets from Plan 2569"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {locale === "th"
                ? `${SEED_ASSETS.length} รายการ (คอม / UPS / จอ / Printer) — รายการที่มีอยู่แล้วจะถูกข้าม`
                : `${SEED_ASSETS.length} items (computers / UPS / monitors / printers) — existing tags are skipped`}
            </p>
          </div>
          <button onClick={handleImport} disabled={importing}
            className="apple-btn-primary shrink-0 disabled:opacity-50">
            {importing ? (locale === "th" ? "กำลังนำเข้า..." : "Importing...") : (locale === "th" ? "นำเข้า" : "Import")}
          </button>
        </div>
        {importMsg && <p className="text-xs font-medium text-foreground">{importMsg}</p>}
      </div>

      <SaveButton label={locale === "th" ? "บันทึก" : "Save Changes"} onSave={onSave} />
    </div>
  );
}

function NotificationsTab({ locale, onSave }: { locale: "th" | "en"; onSave: () => void }) {
  const [prefs, setPrefs] = useState({
    warranty: true, ticket: true, audit: false, relocation: true, email: true, inapp: true,
  });
  const toggle = (k: keyof typeof prefs) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const ITEMS = [
    { key: "warranty",   label: { th: "แจ้งเตือนการรับประกันหมด", en: "Warranty Expiry Alerts" } },
    { key: "ticket",     label: { th: "อัปเดต Ticket",             en: "Ticket Updates"         } },
    { key: "audit",      label: { th: "การแจ้งเตือนการตรวจสอบ",    en: "Audit Reminders"        } },
    { key: "relocation", label: { th: "การย้ายสินทรัพย์",           en: "Asset Relocations"      } },
  ];
  const CHANNELS = [
    { key: "email", label: { th: "แจ้งเตือนทางอีเมล", en: "Email Notifications"  } },
    { key: "inapp", label: { th: "แจ้งเตือนในแอป",    en: "In-App Notifications" } },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title={locale === "th" ? "การแจ้งเตือน" : "Notifications"}
        desc={locale === "th" ? "เลือกประเภทการแจ้งเตือนที่ต้องการรับ" : "Choose which notifications you receive"}
      />
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
          {locale === "th" ? "ประเภท" : "Types"}
        </p>
        <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/50">
          {ITEMS.map((item) => (
            <Toggle key={item.key} label={item.label[locale]}
              checked={prefs[item.key as keyof typeof prefs]}
              onChange={() => toggle(item.key as keyof typeof prefs)} />
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
          {locale === "th" ? "ช่องทาง" : "Channels"}
        </p>
        <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/50">
          {CHANNELS.map((item) => (
            <Toggle key={item.key} label={item.label[locale]}
              checked={prefs[item.key as keyof typeof prefs]}
              onChange={() => toggle(item.key as keyof typeof prefs)} />
          ))}
        </div>
      </div>
      <SaveButton label={locale === "th" ? "บันทึก" : "Save Changes"} onSave={onSave} />
    </div>
  );
}

function SecurityTab({ locale, onSave }: { locale: "th" | "en"; onSave: () => void }) {
  const [current, setCurrent] = useState("");
  const [next,    setNext]    = useState("");
  const [confirm, setConfirm] = useState("");

  return (
    <div className="space-y-6">
      <SectionHeader
        title={locale === "th" ? "ความปลอดภัย" : "Security"}
        desc={locale === "th" ? "เปลี่ยนรหัสผ่านและตั้งค่าความปลอดภัย" : "Change your password and security settings"}
      />
      <div className="space-y-4">
        <Field label={locale === "th" ? "รหัสผ่านปัจจุบัน" : "Current Password"}   value={current} onChange={setCurrent} type="password" />
        <Field label={locale === "th" ? "รหัสผ่านใหม่"     : "New Password"}        value={next}    onChange={setNext}    type="password"
          hint={locale === "th" ? "อย่างน้อย 8 ตัวอักษร" : "At least 8 characters"} />
        <Field label={locale === "th" ? "ยืนยันรหัสผ่านใหม่" : "Confirm New Password"} value={confirm} onChange={setConfirm} type="password" />
      </div>

      <div className="rounded-2xl bg-muted/50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
          {locale === "th" ? "Session ที่ใช้งานอยู่" : "Active Sessions"}
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{locale === "th" ? "เบราว์เซอร์ปัจจุบัน" : "Current Browser"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Bangkok, Thailand · {locale === "th" ? "ตอนนี้" : "Now"}</p>
          </div>
          <span className="badge badge-green">{locale === "th" ? "ใช้งานอยู่" : "Active"}</span>
        </div>
      </div>

      <SaveButton label={locale === "th" ? "เปลี่ยนรหัสผ่าน" : "Update Password"} onSave={onSave} />
    </div>
  );
}

/* ── Shared components ── */

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="pb-1">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", hint }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground
                   focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all
                   placeholder:text-muted-foreground/50" />
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground
                   focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-card hover:bg-accent/50 transition-colors">
      <span className="text-sm text-foreground">{label}</span>
      <button onClick={onChange}
        className={cn(
          "relative inline-flex h-6 w-11 rounded-full transition-colors duration-200",
          checked ? "bg-primary" : "bg-border"
        )}>
        <span className={cn(
          "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0"
        )} />
      </button>
    </div>
  );
}

function SaveButton({ label, onSave }: { label: string; onSave: () => void }) {
  return (
    <div className="flex justify-end pt-2 border-t border-border/50">
      <button onClick={onSave} className="apple-btn-primary">{label}</button>
    </div>
  );
}
