"use client";
import React from "react";

/**
 * MobileNav — iOS-style floating liquid-glass tab bar
 * Shown only on mobile (hidden md:hidden).
 * The "Scan" tab opens the full-screen QR scanner directly.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
interface NavItemDef {
  label: string;
  href: string;
  icon: React.ElementType;
}
type NavItem = NavItemDef;

interface MobileNavProps {
  items: NavItem[];
}

export function MobileNav({ items }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-3 inset-x-3 z-30 md:hidden pb-[env(safe-area-inset-bottom)]"
    >
      <div
        className="flex h-16 items-stretch rounded-3xl overflow-visible"
        style={{
          background: "rgba(255,255,255,0.65)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.7)",
          boxShadow: "0 8px 32px rgba(15,23,42,0.16), 0 1px 2px rgba(15,23,42,0.06)",
        }}
      >
        {items.map((item) => {
          const Icon     = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const isScan   = item.href === "/scan";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-all",
                isScan
                  ? "relative"
                  : isActive
                    ? "text-indigo-600"
                    : "text-slate-500 hover:text-slate-800"
              )}
            >
              {isScan ? (
                /* Scan button — elevated glass pill */
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full text-white -mt-6"
                  style={{
                    background: "linear-gradient(135deg,#6366f1 0%,#7c3aed 100%)",
                    boxShadow: "0 6px 20px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.3)",
                  }}
                >
                  <Icon size={22} />
                </span>
              ) : (
                <>
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full transition-all",
                      isActive ? "px-4 py-1" : "px-4 py-1"
                    )}
                    style={isActive ? { background: "rgba(99,102,241,0.14)" } : undefined}
                  >
                    <Icon size={19} strokeWidth={isActive ? 2.4 : 1.8} />
                  </span>
                  <span className={cn("text-[10px]", isActive && "font-semibold")}>
                    {item.label}
                  </span>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
