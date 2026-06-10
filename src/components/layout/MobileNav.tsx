"use client";
import React from "react";

/**
 * MobileNav — iOS/Android-style bottom tab bar
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
      className={cn(
        "fixed bottom-0 inset-x-0 z-30 md:hidden",
        "flex h-16 items-stretch border-t border-border bg-card",
        // Safe area inset for notched phones (iOS)
        "pb-[env(safe-area-inset-bottom)]"
      )}
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
              "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
              isScan
                ? "relative"
                : isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isScan ? (
              /* Scan button — elevated pill */
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg -mt-5">
                <Icon size={22} />
              </span>
            ) : (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={cn("text-[10px]", isActive && "font-semibold")}>
                  {item.label}
                </span>
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
