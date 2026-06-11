"use client";
import React, { useEffect, useRef } from "react";

/**
 * MobileNav — iOS-style floating liquid-glass tab bar
 * แสดงเมนูชุดเดียวกับ sidebar ทั้งหมด เลื่อนซ้าย-ขวาได้
 * ปุ่ม "สแกน" เป็นวงกลมไล่เฉดตรงกลาง
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItemDef {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface MobileNavProps {
  items: NavItemDef[];
}

export function MobileNav({ items }: MobileNavProps) {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);

  // เลื่อนให้เมนูที่ active โผล่กลางจออัตโนมัติ
  useEffect(() => {
    const el = scrollRef.current?.querySelector<HTMLElement>("[data-active='true']");
    if (el) el.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [pathname]);

  return (
    <nav className="fixed bottom-3 inset-x-3 z-30 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.68)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.7)",
          boxShadow: "0 8px 32px rgba(15,23,42,0.16), 0 1px 2px rgba(15,23,42,0.06)",
        }}
      >
        <div
          ref={scrollRef}
          className="flex h-[68px] items-stretch overflow-x-auto [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {items.map((item) => {
            const Icon     = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")) ||
              (item.href !== "/dashboard" && pathname === item.href);
            const isScan   = item.href === "/scan";

            if (isScan) {
              return (
                <Link key={item.href} href={item.href}
                  className="flex w-[68px] shrink-0 flex-col items-center justify-center">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full text-white"
                    style={{
                      background: "linear-gradient(135deg,#6366f1 0%,#7c3aed 100%)",
                      boxShadow: "0 4px 16px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.3)",
                    }}
                  >
                    <Icon size={20} />
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={isActive}
                className={cn(
                  "flex w-[68px] shrink-0 flex-col items-center justify-center gap-1 text-xs font-medium transition-all",
                  isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <span
                  className="flex items-center justify-center rounded-full px-4 py-1 transition-all"
                  style={isActive ? { background: "rgba(99,102,241,0.14)" } : undefined}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} />
                </span>
                <span className={cn(
                  "text-[9.5px] leading-none max-w-[64px] truncate",
                  isActive && "font-semibold"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
