"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, CheckCircle2, Plus, X, CalendarIcon } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import { DEMO_BRANCHES } from "@/lib/demo/assets";
import { assetDB, employeeDB } from "@/lib/supabaseDB";

const DEFAULT_CATEGORIES = [
  { value: "computer",       th: "คอมพิวเตอร์",      en: "Computer"       },
  { value: "laptop",         th: "โน้ตบุ๊ก",          en: "Laptop"         },
  { value: "monitor",        th: "จอมอนิเตอร์",       en: "Monitor"        },
  { value: "printer",        th: "เครื่องพิมพ์",      en: "Printer"        },
  { value: "network_device", th: "อุปกรณ์เครือข่าย", en: "Network Device" },
  { value: "ups",            th: "UPS",               en: "UPS"            },
  { value: "peripheral",     th: "อุปกรณ์ต่อพ่วง",   en: "Peripheral"     },
  { value: "server",         th: "เซิร์ฟเวอร์",       en: "Server"         },
  { value: "other",          th: "อื่นๆ",              en: "Other"          },
];

const DEFAULT_BRANDS: Record<string, string[]> = {
  computer:       ["Dell", "HP", "Lenovo", "ASUS", "Acer", "Apple"],
  laptop:         ["Dell", "HP", "Lenovo", "ASUS", "Acer", "Apple", "MSI"],
  monitor:        ["Dell", "HP", "LG", "Samsung", "ASUS", "BenQ", "Philips"],
  printer:        ["Brother", "HP", "Canon", "Epson", "Fuji Xerox"],
  network_device: ["Cisco", "MikroTik", "TP-Link", "Ubiquiti", "Juniper"],
  ups:            ["APC", "CyberPower", "Eaton", "Vertiv"],
  peripheral:     ["Logitech", "Microsoft", "Dell", "HP"],
  server:         ["Dell", "HP", "Lenovo", "Supermicro", "IBM"],
  other:          ["อื่นๆ"],
};

const DEFAULT_MODELS: Record<string, string[]> = {
  "Dell":       ["OptiPlex 7090", "OptiPlex 5090", "Vostro 3910", "XPS 8950", "Latitude 5540", "Latitude 7440", "Inspiron 15", "PowerEdge R750", "UltraSharp U2722D"],
  "HP":         ["EliteDesk 800 G9", "ProDesk 400 G9", "EliteBook 840 G10", "ProBook 450 G10", "LaserJet Pro M404dn", "LaserJet M110w", "Z24n G3"],
  "Lenovo":     ["ThinkCentre M70q", "ThinkCentre M90s", "ThinkPad T14", "ThinkPad X1 Carbon", "IdeaPad 5", "ThinkVision T27h", "ThinkServer SR650"],
  "ASUS":       ["ExpertCenter D7 Tower", "ProArt PA278QV", "VA24EHE", "ROG Strix B550-F"],
  "Acer":       ["Veriton X4690G", "Aspire TC-1760", "Aspire 5", "Swift 3"],
  "Apple":      ["Mac mini M2", "Mac Studio M2 Max", "MacBook Air M3", "MacBook Pro M3", "iMac M3"],
  "MSI":        ["Prestige 14", "Creator 15", "Stealth 16"],
  "LG":         ["27UK850-W", "27BN88U-B", "32UN880-B"],
  "Samsung":    ['27" S7', '32" M7', '34" ViewFinity S9'],
  "BenQ":       ["GW2790", "EW2480", "PD2725U"],
  "Philips":    ["243V7QJAB", "275V8LA"],
  "Brother":    ["HL-L2370DN", "MFC-L2750DW", "DCP-L3551CDW", "MFC-L8900CDW"],
  "Canon":      ["imageRUNNER ADVANCE C3525i", "PIXMA G3020", "LBP6030"],
  "Epson":      ["L3250", "M2170", "EcoTank L5290"],
  "Fuji Xerox": ["DocuPrint CP315dw", "DocuCentre SC2022"],
  "Cisco":      ["Catalyst 9200", "Catalyst 2960", "ASA 5500-X", "ISR 4321"],
  "MikroTik":   ["RB4011", "CCR2004", "hAP ax3", "CRS326-24G"],
  "TP-Link":    ["TL-SG1016", "Archer AX90", "EAP660 HD"],
  "Ubiquiti":   ["UniFi Dream Machine Pro", "UniFi Switch 24", "UniFi AP WiFi 6"],
  "Juniper":    ["SRX300", "EX2300", "MX204"],
  "APC":        ["Smart-UPS 750", "Smart-UPS 1500", "Back-UPS Pro 1500"],
  "CyberPower": ["CP1500EPFCLCD", "CP850EPFCLCD"],
  "Eaton":      ["5PX 1500", "9PX 2200"],
  "Vertiv":     ["Liebert GXT5 1000VA"],
  "Logitech":   ["MX Keys", "MX Master 3", "K780", "M750"],
  "Microsoft":  ["Bluetooth Keyboard", "Arc Mouse", "Ergonomic Keyboard"],
  "Supermicro": ["SYS-6029P-TRT", "SYS-220P-C9RT"],
  "IBM":        ["Power E1080", "FlashSystem 9200"],
  "อื่นๆ":      ["อื่นๆ"],
};

const CATALOG_KEY = "itam_catalog_v1";

type CatalogCategory = { value: string; th: string; en: string };
type Catalog = {
  categories: CatalogCategory[];
  brands: Record<string, string[]>;
  models: Record<string, string[]>;
};

function loadCatalog(): Catalog {
  if (typeof window === "undefined") return { categories: DEFAULT_CATEGORIES, brands: DEFAULT_BRANDS, models: DEFAULT_MODELS };
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { categories: DEFAULT_CATEGORIES, brands: DEFAULT_BRANDS, models: DEFAULT_MODELS };
}
function saveCatalog(c: Catalog) {
  localStorage.setItem(CATALOG_KEY, JSON.stringify(c));
}

const STATUSES = [
  { v: "idle",           th: "ว่าง",        en: "Idle"           },
  { v: "in_use",         th: "ใช้งาน",      en: "In Use"         },
  { v: "under_repair",   th: "แจ้งซ่อม",    en: "Under Repair"   },
  { v: "pending_return", th: "รอส่งคืน",    en: "Pending Return" },
  { v: "returned",       th: "ส่งคืนแล้ว",  en: "Returned"       },
]
const CONDITIONS = [
  { v: "excellent", th: "ดีเยี่ยม", en: "Excellent" },
  { v: "good",      th: "ดี",       en: "Good"      },
  { v: "fair",      th: "พอใช้",    en: "Fair"      },
  { v: "poor",      th: "แย่",      en: "Poor"      },
  { v: "broken",    th: "เสีย",     en: "Broken"    },
];

type FormState = {
  asset_tag: string; serial_number: string;
  category: string; brand: string; model_name: string;
  branch_id: string; status: string; condition: string;
  purchase_price: string; currency: string; warranty_expiry: string;
  hostname: string; ip_address: string; notes: string;
  assigned_to_id: string; assigned_to_name: string;
};
const DEFAULT_FORM: FormState = {
  asset_tag: "", serial_number: "",
  category: "computer", brand: "", model_name: "",
  branch_id: "b01", status: "idle", condition: "good",
  purchase_price: "", currency: "THB", warranty_expiry: "",
  hostname: "", ip_address: "", notes: "",
  assigned_to_id: "", assigned_to_name: "",
};

function parseDate(raw: string): string {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  return s;
}
function displayDate(iso: string): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return iso;
}

function DateField({ value, onChange, isTh }: { value: string; onChange: (v: string) => void; isTh: boolean }) {
  const [text, setText] = useState(displayDate(value));
  const dateRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setText(displayDate(value)); }, [value]);
  function handleBlur() {
    const parsed = parseDate(text);
    onChange(parsed);
    setText(displayDate(parsed));
  }
  function handleDatePicker(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
    setText(displayDate(e.target.value));
  }
  return (
    <div className="relative flex items-center">
      <input type="text" value={text} onChange={e => setText(e.target.value)} onBlur={handleBlur}
        placeholder="dd/mm/yyyy" className={cn(inp(), "pr-9")} />
      <button type="button" onClick={() => dateRef.current?.showPicker?.()}
        className="absolute right-2 text-muted-foreground hover:text-foreground transition-colors">
        <CalendarIcon size={15} />
      </button>
      <input ref={dateRef} type="date" value={value} onChange={handleDatePicker} className="sr-only" tabIndex={-1} />
    </div>
  );
}

function EditableSelect({ options, value, onChange, placeholder, onAdd, onRemove, addLabel, disabled }: {
  options: string[]; value: string; onChange: (v: string) => void;
  placeholder: string; onAdd: (v: string) => void; onRemove: (v: string) => void;
  addLabel: string; disabled?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");
  function doAdd() {
    const v = newVal.trim();
    if (!v || options.includes(v)) return;
    onAdd(v); onChange(v); setNewVal(""); setAdding(false);
  }
  return (
    <div className="space-y-2">
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className={cn(inp(), disabled && "opacity-50 cursor-not-allowed")}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <span key={o} className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs border",
            value === o ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-muted text-muted-foreground border-border"
          )}>
            {o}
            <button type="button" onClick={() => { onRemove(o); if (value === o) onChange(""); }}
              className="hover:text-red-500 transition-colors"><X size={9}/></button>
          </span>
        ))}
        {adding ? (
          <div className="flex items-center gap-1">
            <input value={newVal} onChange={e => setNewVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doAdd()} autoFocus
              className="text-xs border rounded px-2 py-0.5 w-28 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
            <button type="button" onClick={doAdd} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">เพิ่ม</button>
            <button type="button" onClick={() => setAdding(false)} className="text-xs text-gray-400 hover:text-gray-600">ยกเลิก</button>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)}
            className="inline-flex items-center gap-0.5 text-xs text-indigo-600 hover:text-indigo-800">
            <Plus size={11}/>{addLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function AssetFormPageClient({ assetId }: { assetId?: string }) {
  const router     = useRouter();
  const { locale } = useLanguage();
  const isTh       = locale === "th";
  const isEdit     = !!assetId;

  const [saving,    setSaving]    = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [form,      setForm]      = useState<FormState>(DEFAULT_FORM);
  const [catalog,   setCatalog]   = useState<Catalog>({ categories: DEFAULT_CATEGORIES, brands: DEFAULT_BRANDS, models: DEFAULT_MODELS });
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; emp_code: string }>>([]);

  useEffect(() => {
    (async () => {
    const c = loadCatalog();
    setCatalog(c);
    employeeDB.getAll().then(all =>
      setEmployees(all.filter(e => e.status !== "terminated")
        .map(e => ({ id: e.id, full_name: e.full_name, emp_code: e.emp_code ?? "" })))
    );
    if (!assetId) return;
    const existing = await assetDB.getById(assetId);
    if (existing) {
      setForm({
        asset_tag:       existing.asset_tag       ?? "",
        serial_number:   existing.serial_number   ?? "",
        category:        existing.category        ?? "computer",
        brand:           existing.brand           ?? "",
        model_name:      existing.model_name      ?? "",
        branch_id:       existing.branch_id       ?? "b01",
        status:          existing.status          ?? "idle",
        condition:       existing.condition       ?? "good",
        purchase_price:  String(existing.purchase_price ?? ""),
        currency:        existing.currency        ?? "THB",
        warranty_expiry: existing.warranty_expiry ?? "",
        hostname:        existing.hostname        ?? "",
        ip_address:      existing.ip_address      ?? "",
        notes:           existing.notes           ?? "",
        assigned_to_id:  existing.assigned_to_id  ?? "",
        assigned_to_name: existing.assigned_to_name ?? "",
      });
    }
    })();
  }, [assetId]);

  function set(key: keyof FormState, value: unknown) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function updateCatalog(next: Catalog) { setCatalog(next); saveCatalog(next); }

  function addCategory(th: string) {
    const value = th.toLowerCase().replace(/\s+/g, "_");
    updateCatalog({ ...catalog, categories: [...catalog.categories, { value, th, en: th }] });
  }
  function removeCategory(value: string) {
    updateCatalog({ ...catalog, categories: catalog.categories.filter(c => c.value !== value) });
    if (form.category === value) { set("category", ""); set("brand", ""); set("model_name", ""); }
  }
  function addBrand(name: string) {
    const cat = form.category;
    updateCatalog({ ...catalog, brands: { ...catalog.brands, [cat]: [...(catalog.brands[cat] ?? []), name] } });
  }
  function removeBrand(name: string) {
    const cat = form.category;
    updateCatalog({ ...catalog, brands: { ...catalog.brands, [cat]: (catalog.brands[cat] ?? []).filter(b => b !== name) } });
    if (form.brand === name) { set("brand", ""); set("model_name", ""); }
  }
  function addModel(name: string) {
    const brand = form.brand;
    updateCatalog({ ...catalog, models: { ...catalog.models, [brand]: [...(catalog.models[brand] ?? []), name] } });
  }
  function removeModel(name: string) {
    const brand = form.brand;
    updateCatalog({ ...catalog, models: { ...catalog.models, [brand]: (catalog.models[brand] ?? []).filter(m => m !== name) } });
    if (form.model_name === name) set("model_name", "");
  }

  const currentBrands = catalog.brands[form.category] ?? [];
  const currentModels = catalog.models[form.brand]    ?? [];
  const categoryLabel = catalog.categories.find(c => c.value === form.category)?.[isTh ? "th" : "en"] ?? "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.asset_tag.trim()) return;
    setSaving(true);
    const branch   = DEMO_BRANCHES.find(b => b.id === form.branch_id);
    // ชื่อพิมพ์ตรง ๆ ได้ — ถ้าตรงกับพนักงานในระบบจะเก็บ id ให้ด้วย
    const typedName = form.assigned_to_name.trim();
    const matched   = employees.find(e => e.full_name === typedName);
    // Status is controlled by floor plan assignment, not the form directly.
    // Form just preserves the existing status value without auto-changing it.
    const payload = {
      ...form,
      status:           form.status,
      branch_name:      branch?.name ?? form.branch_id,
      branch_code:      branch?.code ?? "",
      assigned_to_id:   matched?.id ?? null,
      assigned_to_name: typedName || null,
    };
    if (isEdit && assetId) {
      await assetDB.update(assetId, payload);
    } else {
      await assetDB.create({ ...payload, seat_id: null, seat_label: null, room_name: null, photos: [], return_documents: [] });
    }
    setSaving(false);
    setSuccess(true);
    window.dispatchEvent(new Event("itam_assets_updated"));
    setTimeout(() => router.push(isEdit ? "/assets/" + assetId : "/assets"), 1200);
  }

  if (success) return (
    <div className="max-w-xl mx-auto px-4 py-20 flex flex-col items-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
        <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
      </div>
      <h2 className="text-lg font-semibold">{isTh ? "บันทึกสำเร็จ!" : "Saved successfully!"}</h2>
      <p className="text-sm text-muted-foreground">{isTh ? "กำลังกลับไปหน้ารายการ..." : "Redirecting..."}</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link href={isEdit ? "/assets/" + assetId : "/assets"}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} />
        {isEdit ? (isTh ? "รายละเอียดสินทรัพย์" : "Asset Detail") : (isTh ? "ทรัพย์สิน IT" : "Assets")}
      </Link>

      <div>
        <h1 className="text-lg font-semibold">
          {isEdit ? (isTh ? "แก้ไขสินทรัพย์" : "Edit Asset") : (isTh ? "เพิ่มสินทรัพย์ใหม่" : "New Asset")}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isTh ? "QR Code จะถูกสร้างอัตโนมัติหลังบันทึก" : "A QR code will be generated after saving."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-7">

        <Section title={isTh ? "ข้อมูลสินทรัพย์" : "Asset Identity"}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={isTh ? "หมายเลขสินทรัพย์ *" : "Asset Tag *"}>
              <input value={form.asset_tag} onChange={e => set("asset_tag", e.target.value)}
                placeholder="IT-PC-00001" required className={inp()} />
            </Field>
            <Field label={isTh ? "หมายเลขซีเรียล" : "Serial Number"}>
              <input value={form.serial_number} onChange={e => set("serial_number", e.target.value)}
                placeholder="SN12345678" className={inp()} />
            </Field>
          </div>

          <Field label={isTh ? "ประเภท *" : "Category *"}>
            <EditableSelect
              options={catalog.categories.map(c => c.value)}
              value={form.category}
              onChange={v => { set("category", v); set("brand", ""); set("model_name", ""); }}
              placeholder={isTh ? "-- เลือกประเภท --" : "-- Select category --"}
              onAdd={addCategory} onRemove={removeCategory}
              addLabel={isTh ? "เพิ่มประเภท" : "Add category"}
            />
            {form.category && <p className="text-xs text-muted-foreground mt-1">{categoryLabel}</p>}
          </Field>

          <Field label={isTh ? "ยี่ห้อ" : "Brand"}>
            <EditableSelect
              options={currentBrands} value={form.brand}
              onChange={v => { set("brand", v); set("model_name", ""); }}
              placeholder={form.category ? (isTh ? "-- เลือกยี่ห้อ --" : "-- Select brand --") : (isTh ? "-- เลือกประเภทก่อน --" : "-- Select category first --")}
              onAdd={addBrand} onRemove={removeBrand}
              addLabel={isTh ? "เพิ่มยี่ห้อ" : "Add brand"}
              disabled={!form.category}
            />
          </Field>

          <Field label={isTh ? "รุ่น" : "Model"}>
            <EditableSelect
              options={currentModels} value={form.model_name}
              onChange={v => set("model_name", v)}
              placeholder={form.brand ? (isTh ? "-- เลือกรุ่น --" : "-- Select model --") : (isTh ? "-- เลือกยี่ห้อก่อน --" : "-- Select brand first --")}
              onAdd={addModel} onRemove={removeModel}
              addLabel={isTh ? "เพิ่มรุ่น" : "Add model"}
              disabled={!form.brand}
            />
          </Field>

          <Field label={isTh ? "ศูนย์ *" : "Center *"}>
            <select value={form.branch_id} onChange={e => set("branch_id", e.target.value)} className={inp()}>
              {DEMO_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
        </Section>

        <Section title={isTh ? "สถานะและสภาพ" : "Status and Condition"}>
          <div className="grid grid-cols-2 gap-4">
            <Field label={isTh ? "สถานะ *" : "Status *"}>
              <select value={form.status} onChange={e => set("status", e.target.value)} className={inp()}>
                {STATUSES.map(s => <option key={s.v} value={s.v}>{isTh ? s.th : s.en}</option>)}
              </select>
            </Field>
            <Field label={isTh ? "สภาพ *" : "Condition *"}>
              <select value={form.condition} onChange={e => set("condition", e.target.value)} className={inp()}>
                {CONDITIONS.map(c => <option key={c.v} value={c.v}>{isTh ? c.th : c.en}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        <Section title={isTh ? "มอบหมายให้พนักงาน" : "Assign to Employee"}>
          <Field label={isTh ? "พนักงานที่รับผิดชอบ" : "Assigned To"}>
            <input list="employee-suggestions"
              value={form.assigned_to_name}
              onChange={e => set("assigned_to_name", e.target.value)}
              placeholder={isTh ? "พิมพ์ชื่อ หรือเลือกจากรายชื่อพนักงาน..." : "Type a name or pick from employees..."}
              className={inp()} />
            <datalist id="employee-suggestions">
              {employees.map(e => (
                <option key={e.id} value={e.full_name}>
                  {e.emp_code ? `(${e.emp_code})` : ""}
                </option>
              ))}
            </datalist>
            {form.assigned_to_name.trim() && (
              employees.some(e => e.full_name === form.assigned_to_name.trim()) ? (
                <p className="text-xs text-green-600 mt-1">
                  {isTh ? "✓ ตรงกับพนักงานในระบบ" : "✓ Matches an employee in the system"}
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">
                  {isTh ? "บันทึกเป็นชื่ออิสระ (ไม่อยู่ในหมวดพนักงาน)" : "Saved as free-text name (not in Employees)"}
                </p>
              )
            )}
          </Field>
        </Section>

        <Section title={isTh ? "การจัดซื้อและการรับประกัน" : "Procurement and Warranty"}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={isTh ? "ราคาซื้อ" : "Purchase Price"}>
              <div className="flex gap-2">
                <input type="number" value={form.purchase_price} placeholder="0"
                  onChange={e => set("purchase_price", e.target.value)} className={cn(inp(), "flex-1")} />
                <select value={form.currency} onChange={e => set("currency", e.target.value)} className={cn(inp(), "w-20")}>
                  <option>THB</option><option>USD</option><option>EUR</option>
                </select>
              </div>
            </Field>
            <Field label={isTh ? "การรับประกันหมด" : "Warranty Expiry"}>
              <DateField value={form.warranty_expiry} onChange={v => set("warranty_expiry", v)} isTh={isTh} />
              <p className="text-[11px] text-muted-foreground mt-1">
                {isTh ? "พิมพ์ dd/mm/yyyy หรือก็อปวางได้เลย" : "Type dd/mm/yyyy, paste, or use calendar"}
              </p>
            </Field>
          </div>
        </Section>

        <Section title={isTh ? "ข้อมูลเครือข่าย" : "Network Identity"}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Hostname">
              <input value={form.hostname} onChange={e => set("hostname", e.target.value)}
                placeholder="PC-NMA-001" className={inp()} />
            </Field>
            <Field label="IP Address">
              <input value={form.ip_address} onChange={e => set("ip_address", e.target.value)}
                placeholder="192.168.1.100" className={inp()} />
            </Field>
          </div>
        </Section>

        <Section title={isTh ? "หมายเหตุ" : "Notes"}>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
            rows={3} placeholder={isTh ? "หมายเหตุเพิ่มเติม..." : "Additional notes..."}
            className={cn(inp(), "resize-none")} />
        </Section>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
            {isTh ? "ยกเลิก" : "Cancel"}
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? (isTh ? "กำลังบันทึก..." : "Saving...") : isEdit ? (isTh ? "บันทึกการแก้ไข" : "Save Changes") : (isTh ? "สร้างสินทรัพย์" : "Create Asset")}
          </button>
        </div>
      </form>
    </div>
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
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
function inp() {
  return "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";
}
