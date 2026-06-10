"use client";

import { useState } from "react";
import { LogOut, Settings, User, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface UserMenuProps {
  compact?: boolean;
}

export function UserMenu({ compact = false }: UserMenuProps) {
  const router   = useRouter();
  const supabase = getSupabaseBrowser();
  const { locale } = useLanguage();
  const isTh = locale === "th";
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div style={{position:"relative"}}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:"100%", display:"flex", alignItems:"center", gap:"10px",
        padding:"8px 10px", borderRadius:"10px", border:"none", cursor:"pointer",
        background: open ? "#f1f5f9" : "transparent",
        transition:"background 0.15s",
        textAlign:"left",
      }}
      onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background="#f1f5f9";}}
      onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background=open?"#f1f5f9":"transparent";}}>
        {/* avatar */}
        <span style={{
          width:"30px", height:"30px", borderRadius:"50%", flexShrink:0,
          background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:"12px", fontWeight:700, color:"white",
          boxShadow:"0 2px 8px rgba(99,102,241,0.3)",
        }}>U</span>

        {!compact && (
          <>
            <div style={{flex:1, minWidth:0}}>
              <p style={{fontSize:"12px", fontWeight:600, color:"#1e293b", lineHeight:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
                {isTh ? "บัญชีของฉัน" : "My Account"}
              </p>
              <p style={{fontSize:"10px", color:"#94a3b8", marginTop:"3px", lineHeight:1}}>User</p>
            </div>
            <ChevronDown size={13} style={{color:"#94a3b8", flexShrink:0, transform:open?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s"}}/>
          </>
        )}
      </button>

      {open && (
        <>
          <div style={{position:"fixed",inset:0,zIndex:10}} onClick={() => setOpen(false)} />
          <div style={{
            position:"absolute", zIndex:20, bottom:"calc(100% + 6px)", left:0, right:0,
            background:"#ffffff", borderRadius:"12px",
            border:"1px solid #e2e8f0",
            boxShadow:"0 8px 32px rgba(0,0,0,0.12)",
            padding:"4px", overflow:"hidden",
          }}>
            {[
              { label: isTh?"โปรไฟล์":"Profile", icon: User,     action: ()=>{ router.push("/profile"); setOpen(false); } },
              { label: isTh?"ตั้งค่า":"Settings", icon: Settings, action: ()=>{ router.push("/settings"); setOpen(false); } },
            ].map(({label, icon:Icon, action}) => (
              <button key={label} onClick={action} style={{
                width:"100%", display:"flex", alignItems:"center", gap:"8px",
                padding:"8px 12px", borderRadius:"8px", border:"none", cursor:"pointer",
                background:"transparent", color:"#374151", fontSize:"13px", fontWeight:500,
                transition:"background 0.1s", textAlign:"left",
              }}
              onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background="#f8fafc";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background="transparent";}}>
                <Icon size={14} style={{color:"#94a3b8"}}/>
                {label}
              </button>
            ))}
            <div style={{height:"1px",background:"#f1f5f9",margin:"3px 0"}}/>
            <button onClick={handleSignOut} style={{
              width:"100%", display:"flex", alignItems:"center", gap:"8px",
              padding:"8px 12px", borderRadius:"8px", border:"none", cursor:"pointer",
              background:"transparent", color:"#ef4444", fontSize:"13px", fontWeight:500,
              transition:"background 0.1s", textAlign:"left",
            }}
            onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(239,68,68,0.06)";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background="transparent";}}>
              <LogOut size={14}/>
              {isTh ? "ออกจากระบบ" : "Sign Out"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
