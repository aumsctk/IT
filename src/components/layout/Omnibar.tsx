// @ts-nocheck
"use client";

/**
 * Omnibar — Universal Search
 * ─────────────────────────────────────────────────────────────────
 * Accessible on every page. Searches Assets, Employees, Tickets,
 * and Seats in a single keystroke (Ctrl+K / Cmd+K).
 *
 * Uses the `omnibar_search()` PostgreSQL function via Supabase RPC.
 * Results are grouped by entity type with keyboard navigation.
 */

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, Users, Ticket, Map, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface SearchResult {
  id:          string;
  entity_type: "asset" | "employee" | "ticket" | "seat";
  label:       string;
  sublabel:    string;
  url:         string;
  status:      string;
}

const ENTITY_ICONS: Record<string, React.ElementType> = {
  asset:    Package,
  employee: Users,
  ticket:   Ticket,
  seat:     Map,
};

const ENTITY_LABELS: Record<string, { th: string; en: string }> = {
  asset:    { th: "สินทรัพย์",  en: "Assets"    },
  employee: { th: "พนักงาน",    en: "Employees" },
  ticket:   { th: "แจ้งปัญหา",  en: "Tickets"   },
  seat:     { th: "ที่นั่ง",     en: "Desks"     },
};

export function Omnibar() {
  const router = useRouter();
  const { locale } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<SearchResult[]>([]);
  const [isOpen,    setIsOpen]    = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [isPending, startTransition] = useTransition();

  const supabase = getSupabaseBrowser();

  // ── Keyboard shortcut Ctrl+K / Cmd+K ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Debounced search ──
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      startTransition(async () => {
        const { data, error } = await supabase.rpc("omnibar_search", {
          query,
          result_limit: 15,
        });
        if (!error && data) setResults(data as SearchResult[]);
      });
    }, 220);
    return () => clearTimeout(timer);
  }, [query, supabase]);

  // ── Group results by entity type ──
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.entity_type]) acc[r.entity_type] = [];
    acc[r.entity_type].push(r);
    return acc;
  }, {});

  const flatResults = results; // for keyboard nav index

  const handleSelect = useCallback(
    (url: string) => {
      router.push(url);
      setIsOpen(false);
      setQuery("");
      setActiveIdx(-1);
    },
    [router]
  );

  // ── Arrow key navigation ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(flatResults[activeIdx].url);
    }
  };

  // ── Close on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        listRef.current && !listRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative w-full">
      {/* Input */}
      <div className="relative flex items-center">
        <Search size={15} className="absolute left-3 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          placeholder={locale === "th" ? "ค้นหาสินทรัพย์ พนักงาน แจ้งปัญหา… (⌘K)" : "Search assets, people, tickets… (⌘K)"}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); setActiveIdx(-1); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-9 w-full rounded-md border border-input bg-background pl-9 pr-10 text-sm",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
            "transition-all"
          )}
        />
        {isPending && (
          <Loader2 size={14} className="absolute right-3 animate-spin text-muted-foreground" />
        )}
        {!isPending && query && (
          <kbd className="absolute right-3 hidden sm:flex h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && query.trim().length >= 2 && (
        <div
          ref={listRef}
          className={cn(
            "absolute top-full left-0 right-0 z-50 mt-1.5",
            "max-h-[420px] overflow-y-auto",
            "rounded-lg border border-border bg-popover shadow-xl",
            "animate-fade-in"
          )}
        >
          {results.length === 0 && !isPending && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {locale === "th" ? `ไม่พบผลลัพธ์สำหรับ "${query}"` : `No results for "${query}"`}
            </div>
          )}

          {Object.entries(grouped).map(([type, items]) => {
            const Icon  = ENTITY_ICONS[type] ?? Package;
            const labelObj = ENTITY_LABELS[type];
            const label = labelObj ? labelObj[locale as "th" | "en"] ?? labelObj.en : type;
            return (
              <div key={type}>
                {/* Group header */}
                <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                  <Icon size={12} className="text-muted-foreground" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {label}
                  </span>
                </div>

                {items.map((result) => {
                  const globalIdx = flatResults.indexOf(result);
                  const isActive  = globalIdx === activeIdx;
                  return (
                    <button
                      key={result.id}
                      onMouseDown={() => handleSelect(result.url)}
                      onMouseEnter={() => setActiveIdx(globalIdx)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        isActive ? "bg-accent" : "hover:bg-accent/50"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {result.label}
                        </div>
                        {result.sublabel && (
                          <div className="text-xs text-muted-foreground truncate">
                            {result.sublabel}
                          </div>
                        )}
                      </div>
                      <StatusBadge status={result.status} />
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* Footer hint */}
          {results.length > 0 && (
            <div className="border-t border-border px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {locale === "th" ? `พบ ${results.length} รายการ` : `${results.length} results`}
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:block">
                {locale === "th" ? "↑↓ เลื่อน · ↵ เปิด · ESC ปิด" : "↑↓ navigate · ↵ open · ESC close"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const STATUS_TH: Record<string, string> = {
  active:       "ใช้งานอยู่",
  idle:         "ว่างอยู่",
  under_repair: "กำลังซ่อม",
  retired:      "เลิกใช้งาน",
  open:         "เปิด",
  resolved:     "แก้ไขแล้ว",
  available:    "ว่าง",
  occupied:     "มีคนใช้",
};

function StatusBadge({ status }: { status: string }) {
  const { locale } = useLanguage();
  const colorMap: Record<string, string> = {
    active:       "bg-green-500/15 text-green-600",
    idle:         "bg-indigo-500/15 text-indigo-600",
    under_repair: "bg-amber-500/15 text-amber-600",
    retired:      "bg-slate-400/20 text-slate-500",
    open:         "bg-blue-500/15 text-blue-600",
    resolved:     "bg-green-500/15 text-green-600",
    available:    "bg-green-500/15 text-green-600",
    occupied:     "bg-indigo-500/15 text-indigo-600",
  };
  return (
    <span className={cn(
      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
      colorMap[status] ?? "bg-muted text-muted-foreground"
    )}>
      {locale === "th" ? (STATUS_TH[status] ?? status.replace(/_/g, " ")) : status.replace(/_/g, " ")}
    </span>
  );
}