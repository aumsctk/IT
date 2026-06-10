"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  unreadCount?: number;
}

export function NotificationBell({ unreadCount = 0 }: NotificationBellProps) {
  const { locale } = useLanguage();
  const label = locale === "th"
    ? `การแจ้งเตือน${unreadCount > 0 ? ` (${unreadCount} ยังไม่อ่าน)` : ""}`
    : `Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`;

  return (
    <Link
      href="/notifications"
      className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      aria-label={label}
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span className={cn(
          "absolute top-1.5 right-1.5 flex h-2 w-2 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground"
        )}>
        </span>
      )}
    </Link>
  );
}
