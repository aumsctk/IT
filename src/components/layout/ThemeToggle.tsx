"use client";
import { useTheme } from "@/lib/ThemeContext";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      title={isDark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
      style={{
        display: "flex", alignItems: "center", gap: "6px",
        padding: "4px 10px 4px 6px",
        borderRadius: "99px",
        border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #e2e8f0",
        background: isDark ? "#1e293b" : "#f8fafc",
        cursor: "pointer",
        transition: "all 0.2s",
        userSelect: "none",
      }}
    >
      {/* track */}
      <span style={{
        position: "relative",
        width: "36px", height: "20px",
        borderRadius: "99px",
        background: isDark ? "#6366f1" : "#e2e8f0",
        flexShrink: 0,
        transition: "background 0.25s",
      }}>
        {/* thumb */}
        <span style={{
          position: "absolute",
          top: "2px",
          left: isDark ? "18px" : "2px",
          width: "16px", height: "16px",
          borderRadius: "50%",
          background: "#ffffff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
          transition: "left 0.25s cubic-bezier(0.4,0,0.2,1)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}/>
      </span>
      {isDark
        ? <Moon size={13} style={{ color: "#a5b4fc" }} />
        : <Sun  size={13} style={{ color: "#f59e0b" }} />
      }
    </button>
  );
}
