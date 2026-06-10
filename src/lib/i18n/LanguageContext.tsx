"use client";

/**
 * LanguageContext — จัดการภาษาทั่วทั้งแอป
 * ค่าเริ่มต้น: ภาษาไทย (th)
 * บันทึกใน localStorage → จำภาษาที่เลือกไว้
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Locale } from "./translations";
import { translations, t as translate } from "./translations";

interface LanguageContextValue {
  locale:     Locale;
  setLocale:  (l: Locale) => void;
  t:          (key: { th: string; en: string }) => string;
  tr:         typeof translations;   // raw translation object
}

const LanguageContext = createContext<LanguageContextValue>({
  locale:    "th",
  setLocale: () => {},
  t:         (k) => k.th,
  tr:        translations,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("th"); // ภาษาไทยเป็นค่าเริ่มต้น

  // โหลดจาก localStorage เมื่อ mount
  useEffect(() => {
    const saved = localStorage.getItem("app-locale") as Locale | null;
    if (saved === "th" || saved === "en") setLocaleState(saved);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("app-locale", l);
  }, []);

  const t = useCallback(
    (key: { th: string; en: string }) => translate(key, locale),
    [locale]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, tr: translations }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Hook สำหรับใช้ใน client components */
export function useLanguage() {
  return useContext(LanguageContext);
}
