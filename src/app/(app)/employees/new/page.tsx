"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { employeeDB } from "@/lib/supabaseDB";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { getDepartments, saveDepartments } from "@/lib/mock/employees";

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

export default function NewEmployeePage() {
  const { locale } = useLanguage();
  const isTh = locale === "th";
  const router = useRouter();
  const { confirm, ConfirmUI } = useConfirm();

  const [departments, setDepartments] = useState<string[]>([]);
  const [newDept, setNewDept] = useState("");
  const [showAddDept, setShowAddDept] = useState(false);

  useEffect(() => { setDepartments(getDepartments()); }, []);

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
    start_date: new Date().toISOString().split("T")[0],
    seat_label: "",
    asset_tag:  "",
    asset_name: "",
    avatar_url: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  function addDept() {
    const d = newDept.trim();
    if (!d || departments.includes(d)) return;
    const updated = [...departments, d];
    setDepartments(updated);
    saveDepartments(updated);
    setForm(p => ({ ...p, department: d }));
    setNewDept("");
    setShowAddDept(false);
  }

  async function removeDept(d: string) {
    const updated = departments.filter(x => x !== d);
    setDepartments(updated);
    saveDepartments(updated);
    if (form.department === d) setForm(p => ({ ...p, department: "" }));
  }

  async function handleSave() {
    if (!form.full_name.trim()) {
      alert(isTh ? "กรุณากรอกชื่อ-นามสกุล" : "Full name is required");
      return;
    }
    const ok = await confirm({
      title: isTh ? `เพิ่มพนักงาน ${form.full_name}?` : `Add employee ${form.full_name}?`,
      confirmLabel: isTh ? "เพิ่ม" : "Add",
    });
    if (!ok) return;
    await employeeDB.create(form);
    router.push("/employees");
  }

  return (
    <div className="flex flex-col h-full">
      {ConfirmUI}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <Link href="/employees" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">{isTh ? "เพิ่มพนักงาน" : "Add Employee"}</h1>
        </div>
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
            <h2 className="text-sm font-semibold text-gray-700 border-b pb-1">{isTh ? "ตำแหน่ง / แผนก" : "Position / Department"}</h2>

            {/* Department with add/remove */}
            <Field label={isTh ? "แผนก" : "Department"}>
              <div className="space-y-2">
                <select value={form.department} onChange={set("department")} className={inp()}>
                  <option value="">{isTh ? "-- เลือกแผนก --" : "-- Select --"}</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                {/* Dept management */}
                <div className="flex flex-wrap gap-1.5">
                  {departments.map(d => (
                    <span key={d} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-0.5 text-xs">
                      {d}
                      <button onClick={() => removeDept(d)} className="hover:text-red-500 transition-colors"><X size={10}/></button>
                    </span>
                  ))}
                  {showAddDept ? (
                    <div className="flex items-center gap-1">
                      <input value={newDept} onChange={e => setNewDept(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addDept()}
                        placeholder={isTh ? "ชื่อแผนก..." : "Dept name..."}
                        autoFocus
                        className="text-xs border rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-300 w-32" />
                      <button onClick={addDept} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">{isTh ? "เพิ่ม" : "Add"}</button>
                      <button onClick={() => setShowAddDept(false)} className="text-xs text-gray-400 hover:text-gray-600">{isTh ? "ยกเลิก" : "Cancel"}</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddDept(true)} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
                      <Plus size={11}/>{isTh ? "เพิ่มแผนก" : "Add dept"}
                    </button>
                  )}
                </div>
              </div>
            </Field>

            <Field label={isTh ? "ตำแหน่ง" : "Position"}>
              <input value={form.position} onChange={set("position")} placeholder={isTh ? "ผู้จัดการ IT" : "IT Manager"} className={inp()} />
            </Field>

            <Field label={isTh ? "ศูนย์" : "Center"}>
              <input value={CENTER} disabled className={inp() + " bg-gray-50 text-gray-500 cursor-not-allowed"} />
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
