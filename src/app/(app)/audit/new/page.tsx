"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auditDB } from "@/lib/supabaseDB";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function NewAuditPage() {
  const router = useRouter();
  const { locale } = useLanguage();
  const isTh = locale === "th";
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError(isTh ? "กรุณากรอกชื่อรอบการตรวจนับ" : "Session name is required"); return; }
    const session = await auditDB.createSession(name.trim(), notes.trim());
    router.push(`/audit/${session.id}/scan`);
  }

  const inp = "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="px-4 py-6 space-y-6">
      <Link href="/audit" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> {isTh ? "ย้อนกลับ" : "Back"}
      </Link>
      <h1 className="text-lg font-semibold">{isTh ? "เริ่มรอบตรวจนับใหม่" : "New Audit Session"}</h1>

      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {isTh ? "ชื่อรอบการตรวจนับ *" : "Session Name *"}
          </label>
          <input value={name} onChange={e => { setName(e.target.value); setError(""); }}
            placeholder={isTh ? "เช่น ตรวจนับประจำไตรมาส 3/2568" : "e.g. Q3 2025 Full Audit"}
            className={inp} autoFocus />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {isTh ? "หมายเหตุ (ไม่บังคับ)" : "Notes (optional)"}
          </label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            rows={3} placeholder={isTh ? "หมายเหตุเพิ่มเติม…" : "Optional notes…"}
            className={`${inp} resize-none`} />
        </div>

        <button type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          {isTh ? "เริ่มการสแกน →" : "Start Scanning →"}
        </button>
      </form>
    </div>
  );
}
