"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, Users, Map, Ticket,
  ClipboardCheck, Settings, ScanLine, Menu, X, ChevronLeft,
} from "lucide-react";
import { Omnibar } from "./Omnibar";
import { MobileNav } from "./MobileNav";
import { UserMenu } from "./UserMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";


interface AppShellProps {
  children:     React.ReactNode;
  userRole?:    string;
  unreadCount?: number;
}

const NAV_COLORS = [
  "#6366f1","#3b82f6","#8b5cf6","#14b8a6","#f59e0b","#10b981","#64748b",
];

export function AppShell({ children, userRole = "general_user" }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, tr } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  

  // theme tokens
  const sb = {
    bg:          isDark ? "#0f172a" : "#ffffff",
    border:      isDark ? "rgba(255,255,255,0.07)" : "#e2e8f0",
    labelActive: isDark ? "#f1f5f9" : undefined, // undefined = use color
    labelInact:  isDark ? "#94a3b8" : "#64748b",
    iconInact:   isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
    iconInactColor: isDark ? "#94a3b8" : "#94a3b8",
    hoverBg:     isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9",
    logoText:    isDark ? "#f1f5f9" : "#1e293b",
    logoSub:     isDark ? "#64748b" : "#94a3b8",
    chevron:     isDark ? "#475569" : "#94a3b8",
    chevronHover:isDark ? "#94a3b8" : "#64748b",
    hdr:         isDark ? "#0f172a" : "#ffffff",
    hdrBorder:   isDark ? "rgba(255,255,255,0.07)" : "rgba(226,232,240,0.8)",
    main:        isDark ? "#0d1525" : "#f1f5f9",
  };

  const NAV_ITEMS = [
    { label: t(tr.nav.dashboard), href: "/dashboard",  icon: LayoutDashboard },
    { label: t(tr.nav.assets),    href: "/assets",     icon: Package         },
    { label: t(tr.nav.employees), href: "/employees",  icon: Users           },
    { label: t(tr.nav.floorPlan), href: "/floor-plan", icon: Map             },
    { label: t(tr.nav.tickets),   href: "/tickets",    icon: Ticket          },
    { label: t(tr.nav.audit),     href: "/audit",      icon: ClipboardCheck, roles: ["super_admin","it_support"] },
    { label: t(tr.nav.settings),  href: "/settings",   icon: Settings,       roles: ["super_admin"] },
  ];

  const mobileNavItems = [
    { label: t(tr.nav.home),    href: "/dashboard",  icon: LayoutDashboard },
    { label: t(tr.nav.assets),  href: "/assets",     icon: Package         },
    { label: t(tr.nav.scan),    href: "/scan",       icon: ScanLine        },
    { label: t(tr.nav.tickets), href: "/tickets",    icon: Ticket          },
    { label: t(tr.nav.map),     href: "/floor-plan", icon: Map             },
  ];

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !(item as any).roles || (item as any).roles.includes(userRole)
  );

  const SidebarContent = () => (
    <div className="flex flex-col flex-1 overflow-hidden">
      <nav className="flex-1 overflow-y-auto" style={{padding:"10px"}}>
        {visibleNavItems.map((item, idx) => {
          const Icon    = item.icon;
          const color   = NAV_COLORS[idx] ?? "#6366f1";
          const isActive = pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              style={{
                display:"flex", alignItems:"center",
                gap: collapsed ? 0 : "10px",
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "10px 0" : "8px 10px",
                borderRadius:"10px", marginBottom:"2px",
                textDecoration:"none", transition:"background 0.15s",
                background: isActive ? color+"18" : "transparent",
                position:"relative",
              }}
              onMouseEnter={e => { if(!isActive)(e.currentTarget as HTMLElement).style.background = sb.hoverBg; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isActive ? color+"18" : "transparent"; }}
            >
              {isActive && (
                <span style={{
                  position:"absolute", left:0, top:"50%", transform:"translateY(-50%)",
                  width:"3px", height:"20px", borderRadius:"0 4px 4px 0", background:color,
                }}/>
              )}
              <span style={{
                width:"32px", height:"32px", borderRadius:"8px", flexShrink:0,
                display:"flex", alignItems:"center", justifyContent:"center",
                background: isActive ? color+"18" : sb.iconInact,
                transition:"background 0.15s",
              }}>
                <Icon size={15} style={{color: isActive ? color : sb.iconInactColor}} strokeWidth={2}/>
              </span>
              {!collapsed && (
                <span style={{
                  fontSize:"13px", fontWeight: isActive ? 600 : 500,
                  color: isActive ? (sb.labelActive ?? color) : sb.labelInact,
                  whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", flex:1,
                }}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div style={{borderTop:`1px solid ${sb.border}`, padding:"10px 10px 12px"}}>
        <UserMenu />
      </div>
    </div>
  );

  const LogoBlock = ({ mobile = false }: { mobile?: boolean }) => (
    <div style={{
      height:"56px", display:"flex", alignItems:"center", flexShrink:0,
      padding: mobile ? "0 16px" : collapsed ? "0" : "0 14px",
      justifyContent: !mobile && collapsed ? "center" : mobile ? "space-between" : "flex-start",
      gap:"10px", borderBottom:`1px solid ${sb.border}`,
    }}>
      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        <div style={{
          width:"32px", height:"32px", borderRadius:"10px",
          background:"linear-gradient(135deg,#6366f1,#4f46e5)",
          display:"flex", alignItems:"center", justifyContent:"center",
          flexShrink:0, boxShadow:"0 4px 12px rgba(99,102,241,0.3)",
        }}>
          <Package size={15} color="white" strokeWidth={2.5}/>
        </div>
        {(mobile || !collapsed) && (
          <div style={{flex:1, minWidth:0}}>
            <p style={{fontSize:"12px", fontWeight:700, color:sb.logoText, lineHeight:1, letterSpacing:"-0.01em"}}>IT Asset</p>
            <p style={{fontSize:"10px", color:sb.logoSub, marginTop:"3px", lineHeight:1}}>Manager</p>
          </div>
        )}
      </div>
      {mobile ? (
        <button onClick={() => setMobileOpen(false)} style={{
          width:"28px",height:"28px",borderRadius:"6px",border:"none",cursor:"pointer",
          background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
          color: isDark ? "#94a3b8" : "#64748b",
          display:"flex",alignItems:"center",justifyContent:"center"}}>
          <X size={15}/>
        </button>
      ) : !collapsed ? (
        <button onClick={() => setCollapsed(true)} style={{
          width:"24px", height:"24px", borderRadius:"6px", flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center",
          background:"transparent", border:"none", cursor:"pointer", color:sb.chevron,
        }}
        onMouseEnter={e=>{(e.currentTarget).style.color=sb.chevronHover;(e.currentTarget).style.background=isDark?"rgba(255,255,255,0.08)":"#f1f5f9";}}
        onMouseLeave={e=>{(e.currentTarget).style.color=sb.chevron;(e.currentTarget).style.background="transparent";}}>
          <ChevronLeft size={14}/>
        </button>
      ) : null}
    </div>
  );

  return (
    <div style={{display:"flex",height:"100dvh",width:"100%",overflow:"hidden",background:sb.main}}>

      {/* Desktop sidebar */}
      <aside style={{
        backgroundColor:sb.bg,
        borderRight:`1px solid ${sb.border}`,
        width: collapsed ? "64px" : "220px",
        flexShrink:0, display:"flex", flexDirection:"column",
        transition:"width 0.2s ease",
      }} className="hidden md:flex">
        {collapsed ? (
          <div style={{
            height:"56px",display:"flex",alignItems:"center",justifyContent:"center",
            borderBottom:`1px solid ${sb.border}`,
          }}>
            <button onClick={() => setCollapsed(false)} style={{
              width:"36px", height:"36px", borderRadius:"10px",
              background:"linear-gradient(135deg,#6366f1,#4f46e5)",
              display:"flex", alignItems:"center", justifyContent:"center",
              border:"none", cursor:"pointer", boxShadow:"0 4px 12px rgba(99,102,241,0.3)",
            }}>
              <Package size={16} color="white" strokeWidth={2.5}/>
            </button>
          </div>
        ) : (
          <LogoBlock />
        )}
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside style={{backgroundColor:sb.bg, borderRight:`1px solid ${sb.border}`}}
            className="absolute left-0 top-0 bottom-0 w-[260px] flex flex-col z-50 shadow-2xl">
            <LogoBlock mobile />
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <header style={{
          display:"flex", height:"56px", alignItems:"center", gap:"12px",
          borderBottom:`1px solid ${sb.hdrBorder}`,
          background:sb.hdr, padding:"0 16px", flexShrink:0, zIndex:20,
        }}>
          <button onClick={() => setMobileOpen(true)} className="md:hidden" style={{
            borderRadius:"8px", padding:"6px", color:"#64748b",
            background:"transparent", border:"none", cursor:"pointer",
          }}>
            <Menu size={18}/>
          </button>
          <div style={{flex:1}}>
            <Omnibar />
          </div>
          <div style={{display:"flex", alignItems:"center", gap:"8px", flexShrink:0}}>
            <ThemeToggle />
            <LanguageSwitcher variant="light" />
          </div>
        </header>
        <main style={{flex:1, overflow:"auto", background:sb.main}}>
          {children}
        </main>
        <MobileNav items={mobileNavItems} />
      </div>
    </div>
  );
}
