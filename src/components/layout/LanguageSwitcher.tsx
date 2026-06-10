"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function LanguageSwitcher({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const { locale, setLocale } = useLanguage();
  const isLight = variant === "light";

  return (
    <div style={{
      display:"flex", alignItems:"center", gap:"2px",
      background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)",
      borderRadius:"10px", padding:"3px",
      border: isLight ? "1px solid #e2e8f0" : "none",
    }}>
      {(["th","en"] as const).map((lang) => {
        const active = locale === lang;
        return (
          <button key={lang} onClick={() => setLocale(lang)} style={{
            height:"32px", padding:"0 16px", borderRadius:"7px", border:"none", cursor:"pointer",
            fontSize:"13px", fontWeight:active ? 700 : 500,
            background: active
              ? (isLight ? "#6366f1" : "rgba(255,255,255,0.15)")
              : "transparent",
            color: active
              ? (isLight ? "#fff" : "#f1f5f9")
              : (isLight ? "#94a3b8" : "#64748b"),
            transition:"all 0.15s",
            letterSpacing:"0.04em",
            boxShadow: active && isLight ? "0 1px 4px rgba(99,102,241,0.3)" : "none",
          }}
          onMouseEnter={e=>{ if(!active)(e.currentTarget as HTMLButtonElement).style.color = isLight ? "#475569" : "#94a3b8"; }}
          onMouseLeave={e=>{ if(!active)(e.currentTarget as HTMLButtonElement).style.color = isLight ? "#94a3b8" : "#64748b"; }}>
            {lang === "th" ? "TH" : "EN"}
          </button>
        );
      })}
    </div>
  );
}
