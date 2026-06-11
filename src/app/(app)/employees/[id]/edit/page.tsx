"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { employeeDB } from "@/lib/supabaseDB";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { getPositions, savePositions } from "@/lib/mock/employees";

const STATUS_OPTS = [
  { value: "active",   th: "ทำงานอยู่", en: "Active"   },
  { value: "inactive", th: "ไม่ทำงาน",  en: "Inactive" },
  { value: "on_leave", th: "ลาพัก",     en: "On Leave" },
];

const CENTER = "ศูนย์ฯนครราชสีมา";

function inp() {
  return "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300";
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  );
}

export default function EditEmployeePage() {
  const { locale } = useLanguage();
  const isTh = locale === "th";
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { confirm, ConfirmUI } = useConfirm();

  const [positions, setPositions] = useState<string[]>([]);
  const [newPos, setNewPos] = useState("");
  const [showAddPos, setShowAddPos] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState({
    emp_code:   "",
    full_name:  "",
    nickname:   "",
    phone:      "",
    department: "",
    position:   "",
    branch:     CENTER,
    status:     "active",
    email:      "",
    start_date: "",
    seat_label: "",
    asset_tag:  "",
    asset_name: "",
    avatar_url: "",
  });

  useEffect(() => {
    (async () => {
    setPositions(getPositions());
    const emp = await employeeDB.getById(id);
    if (!emp) { setNotFound(true); return; }
    setForm({
      emp_code:   emp.emp_code   ?? "",
      full_name:  emp.full_name  ?? "",
      nickname:   emp.nickname   ?? "",
      phone:      emp.phone      ?? "",
      department: emp.department ?? "",
      position:   emp.position   ?? "",
      branch:     emp.branch     ?? CENTER,
      status:     emp.status     ?? "active",
      email:      emp.email      ?? "",
      start_date: emp.start_date ?? "",
      seat_label: emp.seat_label ?? "",
      asset_tag:  emp.asset_tag  ?? "",
      asset_name: emp.asset_name ?? "",
      avatar_url: emp.avatar_url ?? "",
    });
    })();
  }, [id]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  function addPos() {
    const d = newPos.trim();
    if (!d || positions.includes(d)) return;
    const updated = [...positions, d];
    setPositions(updated);
    savePositions(updated);
    setForm(p => ({ ...p, position: d }));
    setNewPos("");
    setShowAddPos(false);
  }

  function removePos(d: string) {
    const updated = positions.filter(x => x !== d);
    setPositions(updated);
    savePositions(updated);
    if (form.position === d) setForm(p => ({ ...p, position: "" }));
  }

  async function handleSave() {
    if (!form.full_name.trim()) {
      alert(isTh ? "กรุณากรอกชื่อ-นามสกุล" : "Full name is required");
      return;
    }
    const ok = await confirm({
      title: isTh ? `บันทึกการแก้ไข ${form.full_name}?` : `Save changes for ${form.full_name}?`,
      confirmLabel: isTh ? "บันทึก" : "Save",
    });
    if (!ok) return;
    await employeeDB.update(id, form);
    router.push("/employees");
  }

  async function handleDelete() {
    const ok = await confirm({
      title: isTh ? `ลบพนักงาน ${form.full_name}?` : `Delete ${form.full_name}?`,
      confirmLabel: isTh ? "ลบ" : "Delete",
      danger: true,
    });
    if (!ok) return;
    await employeeDB.remove(id);
    router.push("/employees");
  }

  if (notFound) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
      <p>{isTh ? "ไม่พบพนักงาน" : "Employee not found"}</p>
      <Link href="/employees" className="text-sm text-indigo-600 hover:underline">{isTh ? "กลับ" : "Back"}</Link>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {ConfirmUI}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <Link href="/employees" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{isTh ? "แก้ไขพนักงาน" : "Edit Employee"}</h1>
        </div>
        <button onClick={handleDelete}
          className="text-xs text-red-500 border border-red-200 hover:bg-red-50 rounded-lg px-3 py-1.5 transition-colors">
          {isTh ? "ลบพนักงาน" : "Delete"}
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-2xl space-y-6">

          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 border-b pb-1">{isTh ? "ข้อมูลทั่วไป" : "General Info"}</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label={isTh ? "รหัสพนักงาน" : "Employee Code"}>
                <input value={form.emp_code} onChange={set("emp_code")} placeholder="EMP-001" className={inp()} />
              </Field>
              <Field label={isTh ? "สถานะ" : "Status"}>
                <select value={form.status} onChange={set("status")} className={inp()}>
                  {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{isTh ? s.th : s.en}</option>)}
                </select>
              </Field>
            </div>
            <Field label={isTh ? "ชื่อ-นามสกุล *" : "Full Name *"}>
              <input value={form.full_name} onChange={set("full_name")} placeholder={isTh ? "สมชาย ใจดี" : "John Doe"} className={inp()} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={isTh ? "ชื่อเล่น" : "Nickname"}>
                <input value={form.nickname} onChange={set("nickname")} className={inp()} />
              </Field>
              <Field label={isTh ? "โทรศัพท์" : "Phone"}>
                <input value={form.phone} onChange={set("phone")} placeholder="081-234-5678" className={inp()} />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 border-b pb-1">{isTh ? "ตำแหน่ง" : "Position"}</h2>

            <Field label={isTh ? "ตำแหน่ง" : "Position"}>
              <div className="space-y-2">
                <select value={form.position} onChange={set("position")} className={inp()}>
                  <option value="">{isTh ? "-- เลือกตำแหน่ง --" : "-- Select --"}</option>
                  {!positions.includes(form.position) && form.position && <option value={form.position}>{form.position}</option>}
                  {positions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="flex flex-wrap gap-1.5">
                  {positions.map(d => (
                    <span key={d} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-0.5 text-xs">
                      {d}
                      <button onClick={() => removePos(d)} className="hover:text-red-500 transition-colors"><X size={10}/></button>
                    </span>
                  ))}
                  {showAddPos ? (
                    <div className="flex items-center gap-1">
                      <input value={newPos} onChange={e => setNewPos(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addPos()}
                        placeholder={isTh ? "ชื่อตำแหน่ง..." : "Position name..."}
                        autoFocus
                        className="text-xs border rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-300 w-32" />
                      <button onClick={addPos} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">{isTh ? "เพิ่ม" : "Add"}</button>
                      <button onClick={() => setShowAddPos(false)} className="text-xs text-gray-400 hover:text-gray-600">{isTh ? "ยกเลิก" : "Cancel"}</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddPos(true)} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
                      <Plus size={11}/>{isTh ? "เพิ่มตำแหน่ง" : "Add position"}
                    </button>
                  )}
                </div>
              </div>
            </Field>
          </section>

        </div>
      </div>

      <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
        <Link href="/employees" className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors">
          {isTh ? "ยกเลิก" : "Cancel"}
        </Link>
        <button onClick={handleSave} className="px-5 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">
          {isTh ? "บันทึก" : "Save"}
        </button>
        </div>
    </div>
  );
}
