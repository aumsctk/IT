"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Loader2, X, Check, XCircle, ScanLine,
  AlertTriangle, ChevronRight, Layers, Sun, Moon, MapPin,
} from "lucide-react";
import { auditDB, assetDB, type AuditSession, type AuditItem } from "@/lib/supabaseDB";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// ── types ──────────────────────────────────────────────────────────
type SeatRaw  = { id:string; label:string; x:number; y:number; w:number; h:number; asset_tags?:string[]; employee?:string };
type ZoneRaw  = { x:number; y:number; w:number; h:number; color:string; label:string };
type FloorRaw = { label:string; seats:SeatRaw[]; zones?:ZoneRaw[] };
interface ConfirmTarget { assetTag:string; seat:SeatRaw; floorLabel:string }
type ItemFinding = { tag:string; name:string; finding:AuditItem["finding"]|null };

const CATEGORY_ICON: Record<string,string> = {
  laptop:"💻", computer:"🖥️", monitor:"📺", printer:"🖨️",
  network_device:"🌐", phone:"☎️", tablet:"📱", ups:"🔋",
  keyboard:"⌨️", mouse:"🖱️", storage:"💾", server:"🗄️",
};
function assetIconFromCat(category?: string, tag="") {
  if(category && CATEGORY_ICON[category]) return CATEGORY_ICON[category];
  const t=tag.toUpperCase();
  if(t.includes("NB")||t.includes("LAPTOP")) return "💻";
  if(t.includes("PC")||t.includes("DESKTOP")) return "🖥️";
  if(t.includes("MON")) return "📺";
  if(t.includes("UPS")) return "🔋";
  if(t.includes("PRN")) return "🖨️";
  return "📦";
}

function getAllFloors(): {id:string;data:FloorRaw}[] {
  try {
    const raw=localStorage.getItem("floorplan_data");
    const rawF=localStorage.getItem("floorplan_floors");
    if(!raw) return [];
    const data=JSON.parse(raw) as Record<string,FloorRaw>;
    const floors:{id:string;label:string}[]=rawF?JSON.parse(rawF):[];
    const labelMap=Object.fromEntries(floors.map(f=>[f.id,f.label]));
    return floors.length>0
      ? floors.map(f=>({id:f.id,data:{...data[f.id],label:f.label} as FloorRaw})).filter(f=>data[f.id])
      : Object.entries(data).map(([id,d])=>({id,data:{...d,label:labelMap[id]??d.label??id} as FloorRaw}));
  } catch { return []; }
}
function getLocation(tag:string) {
  try {
    const raw=localStorage.getItem("floorplan_data");
    if(!raw) return null;
    const data=JSON.parse(raw) as Record<string,FloorRaw>;
    for(const floor of Object.values(data)){
      const seat=(floor.seats??[]).find(s=>(s.asset_tags??[]).includes(tag));
      if(seat) return {floorLabel:floor.label??"ชั้น?",seat};
    }
  } catch {}
  return null;
}

// ── theme tokens ────────────────────────────────────────────────────
const T = {
  light: {
    bg:         "#f8fafc",
    panel:      "#ffffff",
    panelB:     "#f1f5f9",
    border:     "#e2e8f0",
    borderSub:  "#f1f5f9",
    text:       "#0f172a",
    textMid:    "#475569",
    textSub:    "#94a3b8",
    inputBg:    "#f1f5f9",
    inputBd:    "#e2e8f0",
    inputFocus: "#6366f1",
    badge:      "#f1f5f9",
    rowHover:   "#f8fafc",
    mapBg:      "#f1f5f9",
    mapGrid:    "#e2e8f0",
    mapZoneFill:"14",
    seatEmpty:  "#e2e8f0",
    seatEmptyBd:"#cbd5e1",
    shadow:     "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
    shadowLg:   "0 4px 16px rgba(0,0,0,0.10)",
    primary:    "#6366f1",
    primaryHov: "#4f46e5",
    primaryBg:  "#eef2ff",
    success:    "#16a34a",
    successBg:  "#f0fdf4",
    successBd:  "#bbf7d0",
    danger:     "#dc2626",
    dangerBg:   "#fef2f2",
    dangerBd:   "#fecaca",
    warn:       "#d97706",
    warnBg:     "#fffbeb",
    warnBd:     "#fde68a",
    finish:     "#059669",
    finishHov:  "#047857",
  },
  dark: {
    bg:         "#0f172a",
    panel:      "#1e293b",
    panelB:     "#162032",
    border:     "#1e293b",
    borderSub:  "#1a2540",
    text:       "#f1f5f9",
    textMid:    "#94a3b8",
    textSub:    "#475569",
    inputBg:    "#0f172a",
    inputBd:    "#334155",
    inputFocus: "#818cf8",
    badge:      "#0f172a",
    rowHover:   "#162032",
    mapBg:      "#0a1120",
    mapGrid:    "#1e293b",
    mapZoneFill:"18",
    seatEmpty:  "#1e293b",
    seatEmptyBd:"#334155",
    shadow:     "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
    shadowLg:   "0 4px 16px rgba(0,0,0,0.5)",
    primary:    "#818cf8",
    primaryHov: "#6366f1",
    primaryBg:  "#312e81",
    success:    "#4ade80",
    successBg:  "#052e16",
    successBd:  "#166534",
    danger:     "#f87171",
    dangerBg:   "#450a0a",
    dangerBd:   "#7f1d1d",
    warn:       "#fbbf24",
    warnBg:     "#451a03",
    warnBd:     "#92400e",
    finish:     "#34d399",
    finishHov:  "#10b981",
  },
};
type Theme = Record<string,string>;

// ── FloorMap ────────────────────────────────────────────────────────
function FloorMap({floorData,scannedMap,pendingTag,onSeatClick,tk,assetIcon}:{
  floorData:FloorRaw; scannedMap:Map<string,AuditItem["finding"]>;
  pendingTag:string|null; onSeatClick:(s:SeatRaw)=>void; tk:Theme; assetIcon:(tag:string)=>string;
}) {
  const seats=floorData.seats??[];
  const zones=floorData.zones??[];
  const pendingSeat=pendingTag?seats.find(s=>(s.asset_tags??[]).includes(pendingTag)):null;
  const spotlight=!!pendingSeat;

  if(!seats.length) return (
    <div style={{color:tk.textSub}} className="flex flex-col items-center justify-center h-full gap-2">
      <Layers size={36} strokeWidth={1.5}/>
      <p className="text-sm">ยังไม่มีโต๊ะในชั้นนี้</p>
    </div>
  );
  const pad=60;
  const minX=Math.min(...seats.map(s=>s.x))-pad;
  const minY=Math.min(...seats.map(s=>s.y))-pad;
  const maxX=Math.max(...seats.map(s=>s.x+s.w))+pad;
  const maxY=Math.max(...seats.map(s=>s.y+s.h))+pad;

  // row height for each asset line inside card
  const ROW_H = 13;
  const HEADER_H = 20; // desk label + divider
  const EMP_H = 12;

  return (
    <svg viewBox={`${minX} ${minY} ${maxX-minX} ${maxY-minY}`} className="w-full h-full select-none">
      <defs>
        <pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0L0 0 0 20" fill="none" stroke={tk.mapGrid} strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect x={minX} y={minY} width={maxX-minX} height={maxY-minY} fill={tk.mapBg}/>
      <rect x={minX} y={minY} width={maxX-minX} height={maxY-minY} fill="url(#g)"/>

      {/* spotlight overlay */}
      {spotlight&&pendingSeat&&(
        <rect x={minX} y={minY} width={maxX-minX} height={maxY-minY}
          fill="rgba(0,0,0,0.5)" style={{pointerEvents:"none"}}/>
      )}

      {/* zones */}
      {zones.map((z,i)=>(
        <g key={i} opacity={spotlight?0.25:1}>
          <rect x={z.x} y={z.y} width={z.w} height={z.h} fill={z.color+tk.mapZoneFill}
            stroke={z.color+"40"} strokeWidth={1} strokeDasharray="5 4" rx={8}/>
          <text x={z.x+10} y={z.y+16} fontSize={9} fill={z.color+"80"} fontWeight="700">{z.label}</text>
        </g>
      ))}

      {/* seats: non-spotlight first, spotlight last (renders on top) */}
      {([false,true] as boolean[]).map(drawPending=>
        seats
          .filter(s=>pendingSeat&&s.id===pendingSeat.id ? drawPending : !drawPending)
          .map(s=>{
            const tags=s.asset_tags??[];
            const findings=tags.map(t=>scannedMap.get(t)).filter(Boolean) as string[];
            const doneCount=findings.length;
            const allDone=tags.length>0&&doneCount===tags.length;
            const hasMiss=findings.includes("missing");
            const hasDmg=findings.includes("damaged");
            const someDone=doneCount>0;
            const hasA=tags.length>0;
            const isPending=!!pendingSeat&&s.id===pendingSeat.id;
            const isDimmed=spotlight&&!isPending;

            // card colors — floor-plan style (white card, colored border)
            const cardBg = isPending ? "#fffbeb"
              : allDone&&!hasMiss ? "#f0fdf4"
              : hasMiss           ? "#fef2f2"
              : hasDmg            ? "#fffbeb"
              : someDone          ? "#f0fdf4"
              : "#ffffff";
            const borderCol = isPending ? "#f59e0b"
              : allDone&&!hasMiss ? "#22c55e"
              : hasMiss           ? "#ef4444"
              : hasDmg            ? "#f97316"
              : someDone          ? "#86efac"
              : "#e2e8f0";
            const bw = isPending ? 2.5 : (allDone||hasMiss) ? 2 : 1;

            // header bg strip
            const headerBg = isPending ? "#fef3c7"
              : allDone&&!hasMiss ? "#dcfce7"
              : hasMiss           ? "#fee2e2"
              : hasDmg            ? "#fed7aa"
              : "#f8fafc";
            const headerText = isPending ? "#92400e"
              : allDone&&!hasMiss ? "#15803d"
              : hasMiss           ? "#dc2626"
              : "#475569";

            const maxShow=6;
            const showTags=tags.slice(0,maxShow);

            return (
              <g key={s.id}
                opacity={isDimmed?0.15:1}
                onClick={()=>hasA&&!isDimmed&&onSeatClick(s)}
                style={{cursor:hasA&&!isDimmed?"pointer":"default"}}>

                {/* spotlight halo */}
                {isPending&&<>
                  <rect x={s.x-12} y={s.y-12} width={s.w+24} height={s.h+24} rx={16}
                    fill="none" stroke="#fbbf24" strokeWidth={1.5} opacity={0.35}/>
                  <rect x={s.x-7} y={s.y-7} width={s.w+14} height={s.h+14} rx={12}
                    fill="none" stroke="#f59e0b" strokeWidth={2.5} opacity={0.7}/>
                </>}

                {/* card shadow */}
                <rect x={s.x+1} y={s.y+2} width={s.w} height={s.h} rx={8} fill="rgba(0,0,0,0.08)"/>

                {/* card body */}
                <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={8}
                  fill={cardBg} stroke={borderCol} strokeWidth={bw}/>

                {/* header strip */}
                <rect x={s.x} y={s.y} width={s.w} height={HEADER_H} rx={8} fill={headerBg}/>
                <rect x={s.x} y={s.y+HEADER_H-4} width={s.w} height={4} fill={headerBg}/>
                <text x={s.x+s.w/2} y={s.y+13} textAnchor="middle"
                  fontSize={8} fontWeight="800" fill={headerText} letterSpacing="0.2">
                  {s.label}
                </text>

                {/* thin divider */}
                <line x1={s.x+6} y1={s.y+HEADER_H} x2={s.x+s.w-6} y2={s.y+HEADER_H}
                  stroke={borderCol} strokeWidth={0.7} opacity={0.5}/>

                {/* employee row */}
                {s.employee&&(
                  <g>
                    <text x={s.x+8} y={s.y+HEADER_H+EMP_H-2} fontSize={7} fill="#64748b">
                      👤
                    </text>
                    <text x={s.x+18} y={s.y+HEADER_H+EMP_H-2} fontSize={7}
                      fill="#475569" fontStyle="italic">
                      {s.employee.length>13?s.employee.slice(0,12)+"…":s.employee}
                    </text>
                  </g>
                )}

                {/* asset rows — floor-plan style: [icon] [tag] [✓/✗] */}
                {showTags.map((t,i)=>{
                  const rowY=s.y+HEADER_H+(s.employee?EMP_H:0)+i*ROW_H+ROW_H;
                  const finding=scannedMap.get(t);
                  const isConfirmed=!!finding&&finding!=="missing";
                  const isMissing=finding==="missing";
                  const isDamaged=finding==="damaged";
                  const shortTag=t.length>9?t.slice(0,8)+"…":t;
                  const tagColor=isConfirmed?"#16a34a":isMissing?"#dc2626":isDamaged?"#d97706":"#334155";
                  return (
                    <g key={t}>
                      {/* icon */}
                      <text x={s.x+8} y={rowY} fontSize={8}
                        opacity={isMissing?0.35:1}
                        style={{userSelect:"none",filter:isMissing?"saturate(0)":"none"}}>
                        {assetIcon(t)}
                      </text>
                      {/* tag */}
                      <text x={s.x+19} y={rowY} fontSize={7} fontFamily="monospace"
                        fontWeight={isConfirmed?"700":"500"} fill={tagColor}
                        textDecoration={isMissing?"line-through":"none"}>
                        {shortTag}
                      </text>
                      {/* status mark */}
                      {isConfirmed&&!isMissing&&(
                        <text x={s.x+s.w-8} y={rowY} fontSize={8} fill="#16a34a" fontWeight="800">✓</text>
                      )}
                      {isMissing&&(
                        <text x={s.x+s.w-8} y={rowY} fontSize={8} fill="#dc2626" fontWeight="800">✗</text>
                      )}
                      {isDamaged&&!isMissing&&(
                        <text x={s.x+s.w-8} y={rowY} fontSize={8} fill="#d97706">⚠</text>
                      )}
                    </g>
                  );
                })}

                {/* overflow */}
                {tags.length>maxShow&&(
                  <text x={s.x+8} y={s.y+HEADER_H+(s.employee?EMP_H:0)+maxShow*ROW_H+ROW_H}
                    fontSize={6.5} fill="#94a3b8" fontWeight="700">
                    +{tags.length-maxShow} อีก...
                  </text>
                )}

                {/* spotlight tooltip */}
                {isPending&&(
                  <g>
                    <rect x={s.x} y={s.y-22} width={s.w} height={17} rx={5} fill="#f59e0b"/>
                    <text x={s.x+s.w/2} y={s.y-10} textAnchor="middle"
                      fontSize={8.5} fontWeight="800" fill="white">📍 {s.label}</text>
                  </g>
                )}
              </g>
            );
          })
      )}
    </svg>
  );
}

// ── Main ─────────────────────────────────────────────────────────────
export function AuditScanMode({sessionId}:{sessionId:string}) {
  const router=useRouter();
  const {locale}=useLanguage();
  const inputRef=useRef<HTMLInputElement>(null);

  const [isDark, setIsDark]=useState(()=>{
    if(typeof window==="undefined") return false;
    const saved=localStorage.getItem("audit_scan_theme");
    return saved==="dark";
  });
  const tk=isDark?T.dark:T.light;
  function toggleTheme(){
    setIsDark(d=>{
      const next=!d;
      localStorage.setItem("audit_scan_theme",next?"dark":"light");
      return next;
    });
  }

  const [session,setSession]=useState<AuditSession|null>(null);
  const [items,setItems]=useState<AuditItem[]>([]);
  const [manualTag,setManualTag]=useState("");
  const [confirm,setConfirm]=useState<ConfirmTarget|null>(null);
  const [itemFindings,setItemFindings]=useState<ItemFinding[]>([]);
  const [bulkMode,setBulkMode]=useState(false);
  const [finishing,setFinishing]=useState(false);
  const [floors,setFloors]=useState<{id:string;data:FloorRaw}[]>([]);
  const [allAssets,setAllAssets]=useState<any[]>([]);
  const assetByTag=(tag:string)=>allAssets.find((a:any)=>a.asset_tag===tag);
  const assetIcon=(tag:string)=>{const a=assetByTag(tag);return assetIconFromCat(a?.category,tag);};
  const assetLabel=(tag:string)=>{const a=assetByTag(tag);return a?`${a.brand} ${a.model_name}`.trim():tag;};
  const [currentFloor,setCurrentFloor]=useState(0);
  const [flash,setFlash]=useState<{tag:string;finding:AuditItem["finding"]}|null>(null);

  useEffect(()=>{
    function onKey(e:KeyboardEvent){
      if(e.metaKey||e.ctrlKey||e.altKey) return;
      if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement) return;
      if(e.key.length===1||e.key==="Enter"||e.key==="Backspace"){
        e.preventDefault(); inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown",onKey,true);
    (async()=>{
    const s=await auditDB.getSession(sessionId);
    if(!s){router.push("/audit");return;}
    if(s.is_complete){router.push(`/audit/${sessionId}`);return;}
    const its=await auditDB.getItems(sessionId);
    const aa=await assetDB.getAll();
    setSession(s); setItems(its); setFloors(getAllFloors()); setAllAssets(aa.filter((a:any)=>a.status!=="returned"));
    setTimeout(()=>inputRef.current?.focus(),100);
    })();
    return()=>window.removeEventListener("keydown",onKey,true);
  },[sessionId,router]);

  const scannedMap=new Map(items.map(i=>[i.asset_tag_scanned,i.finding]));
  const matched=items.filter(i=>i.finding==="matched").length;
  const missing=items.filter(i=>i.finding==="missing").length;
  const extras=items.filter(i=>i.finding==="extra").length;
  const damaged=items.filter(i=>i.finding==="damaged").length;
  const total=allAssets.length;
  const scanned=items.filter(i=>i.finding!=="missing").length;
  const remaining=allAssets.filter(a=>!scannedMap.has(a.asset_tag));
  const pct=total>0?Math.round((scanned/total)*100):0;

  const recordScan=useCallback((tag:string,finding:AuditItem["finding"])=>{
    tag=tag.trim().toUpperCase();
    if(!tag||scannedMap.has(tag)) return;
    const asset=allAssets.find((a:any)=>a.asset_tag===tag);
    auditDB.addItem(sessionId,tag,asset?.id??null,finding).then(item=>{
    setItems(prev=>[item,...prev]);
    setFlash({tag,finding});
    setTimeout(()=>setFlash(null),2000);
    });
  },[scannedMap,allAssets,sessionId]);

  function handleSeatClick(seat:SeatRaw){
    const tags=(seat.asset_tags??[]).filter(t=>!scannedMap.has(t));
    if(!tags.length) return;
    const floor=floors[currentFloor];
    const findings:ItemFinding[]=tags.map(t=>({tag:t,name:assetLabel(t),finding:null}));
    setItemFindings(findings); setBulkMode(findings.length>1);
    setConfirm({assetTag:tags[0],seat,floorLabel:floor?.data.label??"ชั้น?"});
  }
  function confirmResult(finding:AuditItem["finding"]){
    if(!confirm) return;
    (confirm.seat.asset_tags??[]).filter(t=>!scannedMap.has(t)).forEach(t=>recordScan(t,finding));
    setConfirm(null); setTimeout(()=>inputRef.current?.focus(),50);
  }
  function confirmItemFinding(tag:string,finding:AuditItem["finding"]){
    setItemFindings(prev=>prev.map(i=>i.tag===tag?{...i,finding}:i));
  }
  function saveItemFindings(){
    itemFindings.forEach(i=>{if(i.finding) recordScan(i.tag,i.finding);});
    setConfirm(null); setTimeout(()=>inputRef.current?.focus(),50);
  }
  function submitManual(e:React.FormEvent){
    e.preventDefault();
    const tag=manualTag.trim().toUpperCase();
    if(!tag) return;
    const loc=getLocation(tag);
    if(loc){
      setItemFindings([{tag,name:assetLabel(tag),finding:null}]); setBulkMode(false);
      setConfirm({assetTag:tag,seat:loc.seat,floorLabel:loc.floorLabel});
    } else {
      recordScan(tag,allAssets.find(a=>a.asset_tag===tag)?"matched":"extra");
    }
    setManualTag("");
  }
  async function finishAudit(){
    setFinishing(true);
    const miss=allAssets.filter((a:any)=>!scannedMap.has(a.asset_tag));
    if(miss.length>0) await auditDB.addMissingItems(sessionId,miss);
    const all=[...items,...miss.map((a:any)=>({finding:"missing"as const,asset_tag_scanned:a.asset_tag}))];
    await auditDB.completeSession(sessionId,{total,matched,missing:miss.length,
      extra:all.filter(i=>i.finding==="extra").length,damaged:all.filter(i=>i.finding==="damaged").length});
    router.push(`/audit/${sessionId}`);
  }

  if(!session) return null;
  const floor=floors[currentFloor];

  // ── flash colors
  const flashColors:{[k:string]:{bg:string;bd:string;text:string}}={
    matched:{bg:tk.successBg,bd:tk.successBd,text:tk.success},
    missing:{bg:tk.dangerBg, bd:tk.dangerBd, text:tk.danger},
    damaged:{bg:tk.warnBg,   bd:tk.warnBd,   text:tk.warn},
    extra:  {bg:tk.primaryBg,bd:tk.primary+"40",text:tk.primary},
  };
  const fc=flash?flashColors[flash.finding??""]:null;

  return (
    <div style={{background:tk.bg,color:tk.text,height:"100dvh",display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* ═══ TOPBAR ═══ */}
      <header style={{background:tk.panel,borderBottom:`1px solid ${tk.border}`,flexShrink:0,boxShadow:tk.shadow,
        display:"flex",alignItems:"center",gap:"12px",padding:"0 20px",height:"52px"}}>

        {/* label only — session name lives in left panel */}
        <div style={{flexShrink:0}}>
          <p style={{color:tk.primary,fontSize:"11px",fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase"}}>AUDIT SCAN</p>
        </div>

        {/* progress ring + stats */}
        <div style={{display:"flex",alignItems:"center",gap:"12px",flex:1,justifyContent:"center"}}>
          {/* ring */}
          <div className="relative w-9 h-9 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke={tk.border} strokeWidth="3"/>
              <circle cx="18" cy="18" r="15" fill="none" stroke={tk.primary} strokeWidth="3"
                strokeDasharray={`${pct*0.942} 94.2`} strokeLinecap="round"
                style={{transition:"stroke-dasharray 0.5s ease"}}/>
            </svg>
            <span style={{color:tk.primary}} className="absolute inset-0 flex items-center justify-center text-[9px] font-black">{pct}%</span>
          </div>

          {/* stat pills */}
          <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
            <StatPill label="พบ"    value={matched} color={tk.success}  bg={tk.successBg} bd={tk.successBd}/>
            {missing>0&&<StatPill label="ไม่พบ" value={missing} color={tk.danger}  bg={tk.dangerBg}  bd={tk.dangerBd}/>}
            {damaged>0&&<StatPill label="ชำรุด" value={damaged} color={tk.warn}    bg={tk.warnBg}    bd={tk.warnBd}/>}
            {extras>0 &&<StatPill label="เกิน" value={extras}  color={tk.primary} bg={tk.primaryBg} bd={tk.primary+"40"}/>}
            <span style={{color:tk.textSub}} className="text-xs ml-1">{scanned}<span style={{color:tk.textSub}} className="opacity-50">/{total}</span></span>
          </div>
        </div>

        {/* controls */}
        <div style={{display:"flex",alignItems:"center",gap:"8px",flexShrink:0}}>
          <button onClick={toggleTheme}
            style={{background:tk.badge,border:`1px solid ${tk.border}`,color:tk.textMid,borderRadius:"8px"}}
            className="w-8 h-8 flex items-center justify-center transition-opacity hover:opacity-70">
            {isDark?<Sun size={15}/>:<Moon size={15}/>}
          </button>

          <button onClick={finishAudit} disabled={finishing||items.length===0}
            className="flex items-center gap-1.5 text-xs font-bold rounded-lg px-3 h-8 transition-all disabled:opacity-30"
            style={{background:tk.finish,color:"white"}}>
            {finishing?<Loader2 size={13} className="animate-spin"/>:<CheckCircle2 size={13}/>}
            เสร็จสิ้น
          </button>
        </div>
      </header>

      {/* progress bar */}
      <div style={{height:"2px",background:tk.border,flexShrink:0}}>
        <div style={{height:"100%",width:`${pct}%`,background:tk.primary,transition:"width 0.6s ease",borderRadius:"0 999px 999px 0"}}/>
      </div>

      {/* ═══ BODY ═══ */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>

        {/* ── LEFT PANEL ── */}
        <div style={{width:"260px",flexShrink:0,display:"flex",flexDirection:"column",
          borderRight:`1px solid ${tk.border}`,background:tk.panel,overflow:"hidden"}}>

          {/* Scan input */}
          <div style={{padding:"12px",borderBottom:`1px solid ${tk.border}`,flexShrink:0}}>
            <form onSubmit={submitManual}>
              <p style={{color:tk.textSub,fontSize:"10px",fontWeight:600,display:"block",marginBottom:"6px"}}>สแกน / กรอกรหัส</p>
              <div style={{display:"flex",gap:"6px"}}>
                <div style={{flex:1,position:"relative"}}>
                  <ScanLine size={13} style={{position:"absolute",left:"9px",top:"50%",transform:"translateY(-50%)",color:tk.textSub,pointerEvents:"none"}}/>
                  <input ref={inputRef} value={manualTag} onChange={e=>setManualTag(e.target.value.toUpperCase())}
                    placeholder="NB-001…"
                    style={{width:"100%",height:"34px",paddingLeft:"28px",paddingRight:"8px",
                      background:tk.inputBg,border:`1px solid ${tk.inputBd}`,borderRadius:"8px",
                      color:tk.text,fontSize:"12px",fontFamily:"monospace",outline:"none",boxSizing:"border-box"}}
                    onFocus={e=>{e.currentTarget.style.borderColor=tk.inputFocus; e.currentTarget.style.boxShadow=`0 0 0 3px ${tk.inputFocus}20`;}}
                    onBlur={e=>{e.currentTarget.style.borderColor=tk.inputBd; e.currentTarget.style.boxShadow="none";}}
                  />
                </div>
                <button type="submit" style={{height:"34px",paddingLeft:"10px",paddingRight:"10px",
                  background:tk.primary,color:"white",borderRadius:"8px",fontSize:"12px",fontWeight:700,border:"none",cursor:"pointer",flexShrink:0}}>
                  ตรวจ
                </button>
              </div>
            </form>

            {/* flash feedback */}
            <div style={{marginTop:"8px",height:"30px",display:"flex",alignItems:"center",justifyContent:"center",
              borderRadius:"8px",transition:"all 0.3s ease",
              background:fc?fc.bg:"transparent",border:fc?`1px solid ${fc.bd}`:"1px solid transparent",
              overflow:"hidden"}}>
              {flash&&fc&&(
                <span style={{color:fc.text,fontSize:"11px",fontWeight:700,display:"flex",alignItems:"center",gap:"6px"}}>
                  {flash.finding==="matched"?<Check size={12}/>:flash.finding==="missing"?<XCircle size={12}/>:<AlertTriangle size={12}/>}
                  <span style={{fontFamily:"monospace"}}>{flash.tag}</span>
                  <span>{flash.finding==="matched"?"พบแล้ว ✓":flash.finding==="missing"?"ไม่พบ":"ชำรุด"}</span>
                </span>
              )}
            </div>
          </div>

          {/* remaining list header */}
          <div style={{padding:"10px 12px 6px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:"10px",fontWeight:700,color:tk.textSub,letterSpacing:"0.02em"}}>รอตรวจ</span>
            <span style={{fontSize:"11px",fontWeight:700,color:tk.textMid}}>
              {remaining.length}<span style={{color:tk.textSub,fontWeight:400}}>/{total}</span>
            </span>
          </div>

          {/* list */}
          <div style={{flex:1,overflowY:"auto"}}>
            {remaining.length===0?(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                height:"100%",gap:"8px",color:tk.success}}>
                <CheckCircle2 size={28} strokeWidth={1.5}/>
                <p style={{fontSize:"13px",fontWeight:600}}>ครบทั้งหมดแล้ว!</p>
                <p style={{fontSize:"10px",color:tk.textSub}}>กด "เสร็จสิ้น" เพื่อบันทึก</p>
              </div>
            ):remaining.map(a=>{
              const loc=getLocation(a.asset_tag);
              return (
                <button key={a.asset_tag}
                  onClick={()=>{
                    for(let fi=0;fi<floors.length;fi++){
                      const seat=floors[fi].data.seats.find(s=>(s.asset_tags??[]).includes(a.asset_tag));
                      if(seat){
                        if(fi!==currentFloor) setCurrentFloor(fi);
                        setItemFindings([{tag:a.asset_tag,name:`${a.brand} ${a.model_name}`,finding:null}]);
                        setBulkMode(false);
                        setConfirm({assetTag:a.asset_tag,seat,floorLabel:floors[fi].data.label??"ชั้น?"});
                        return;
                      }
                    }
                    setItemFindings([{tag:a.asset_tag,name:`${a.brand} ${a.model_name}`,finding:null}]);
                    setBulkMode(false);
                    setConfirm({assetTag:a.asset_tag,seat:{id:"",label:"?",x:0,y:0,w:0,h:0,asset_tags:[a.asset_tag]},floorLabel:"ไม่มีข้อมูลผัง"});
                  }}
                  style={{width:"100%",textAlign:"left",padding:"8px 12px",borderBottom:`1px solid ${tk.borderSub}`,
                    background:"transparent",border:"none",cursor:"pointer",display:"block",transition:"background 0.15s"}}
                  onMouseEnter={e=>(e.currentTarget.style.background=tk.rowHover)}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <span style={{fontSize:"16px",lineHeight:1}}>{assetIcon(a.asset_tag)}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontFamily:"monospace",fontSize:"11px",fontWeight:700,color:tk.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.asset_tag}</p>
                      <p style={{fontSize:"10px",color:tk.textSub,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:"1px"}}>{a.brand} {a.model_name}</p>
                    </div>
                    {loc?(
                      <span style={{fontSize:"9px",color:tk.primary,fontWeight:600,whiteSpace:"nowrap",flexShrink:0}}>📍{loc.seat.label}</span>
                    ):(
                      <ChevronRight size={12} style={{color:tk.textSub,flexShrink:0}}/>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: MAP ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

          {/* floor tabs */}
          {floors.length>1&&(
            <div style={{padding:"8px 12px",borderBottom:`1px solid ${tk.border}`,display:"flex",gap:"6px",flexShrink:0,background:tk.panel}}>
              {floors.map((f,i)=>(
                <button key={f.id} onClick={()=>setCurrentFloor(i)}
                  style={{padding:"4px 12px",borderRadius:"6px",fontSize:"11px",fontWeight:700,border:"none",cursor:"pointer",transition:"all 0.15s",
                    background:i===currentFloor?tk.primary:tk.badge,
                    color:i===currentFloor?"white":tk.textMid,
                    boxShadow:i===currentFloor?`0 2px 8px ${tk.primary}30`:"none"}}>
                  {f.data.label??`ชั้น ${i+1}`}
                </button>
              ))}
            </div>
          )}

          {/* map area */}
          <div style={{flex:1,overflow:"hidden",padding:"12px",position:"relative"}}>
            {floor?(
              <FloorMap floorData={floor.data} scannedMap={scannedMap} assetIcon={assetIcon}
                pendingTag={confirm?.assetTag??null} onSeatClick={handleSeatClick} tk={tk}/>
            ):(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                height:"100%",gap:"8px",color:tk.textSub}}>
                <MapPin size={36} strokeWidth={1}/>
                <p style={{fontSize:"13px"}}>ยังไม่มีข้อมูลผังพื้นที่</p>
                <p style={{fontSize:"11px",color:tk.textSub,opacity:0.6}}>ใช้ช่องด้านซ้ายกรอกรหัสได้เลย</p>
              </div>
            )}
          </div>

          {/* legend */}
          <div style={{padding:"8px 16px",borderTop:`1px solid ${tk.border}`,display:"flex",
            alignItems:"center",gap:"16px",flexShrink:0,background:tk.panel}}>
            <Leg color={tk.success} label="พบ" tk={tk}/>
            <Leg color={tk.danger}  label="ไม่พบ" tk={tk}/>
            <Leg color={tk.warn}    label="ชำรุด" tk={tk}/>
            <Leg color={tk.primary} label="กำลังดู" tk={tk}/>
            <Leg color={tk.seatEmptyBd} label="ยังไม่ตรวจ" tk={tk}/>
            <span style={{marginLeft:"auto",fontSize:"10px",color:tk.textSub}}>กดโต๊ะ = ยืนยันผล</span>
          </div>
        </div>
      </div>

      {/* ═══ CONFIRM MODAL ═══ */}
      {confirm&&(
        <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"flex-end",justifyContent:"center",
          background:"rgba(0,0,0,0.45)",backdropFilter:"blur(6px)"}}>
          <div style={{width:"100%",maxWidth:"480px",background:tk.panel,
            borderRadius:"20px 20px 0 0",border:`1px solid ${tk.border}`,borderBottom:"none",
            boxShadow:tk.shadowLg}}>

            {/* handle */}
            <div style={{display:"flex",justifyContent:"center",padding:"12px 0 8px"}}>
              <div style={{width:"36px",height:"4px",borderRadius:"999px",background:tk.border}}/>
            </div>

            {/* header */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"0 20px 12px",borderBottom:`1px solid ${tk.border}`}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"4px"}}>
                  <span style={{fontSize:"10px",fontWeight:700,color:tk.textSub,letterSpacing:"0.02em"}}>
                    📍 {confirm.floorLabel}
                  </span>
                  <span style={{color:tk.textSub}}>·</span>
                  <span style={{fontSize:"10px",fontWeight:700,color:tk.primary}}>โต๊ะ {confirm.seat.label}</span>
                  {confirm.seat.employee&&<><span style={{color:tk.textSub}}>·</span>
                    <span style={{fontSize:"10px",color:tk.textSub}}>{confirm.seat.employee}</span></>}
                </div>
                <p style={{fontSize:"14px",fontWeight:700,color:tk.text}}>
                  {itemFindings.length} รายการรอยืนยัน
                </p>
              </div>
              <button onClick={()=>setConfirm(null)}
                style={{width:"28px",height:"28px",borderRadius:"8px",border:`1px solid ${tk.border}`,
                  background:tk.badge,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:tk.textMid}}>
                <X size={14}/>
              </button>
            </div>

            {/* mode toggle */}
            {itemFindings.length>1&&(
              <div style={{margin:"12px 20px 0",display:"flex",borderRadius:"10px",overflow:"hidden",border:`1px solid ${tk.border}`}}>
                {[{v:true,l:"พร้อมกันทั้งหมด"},{v:false,l:"แยกรายการ"}].map(({v,l})=>(
                  <button key={String(v)} onClick={()=>setBulkMode(v)}
                    style={{flex:1,padding:"8px 0",fontSize:"12px",fontWeight:700,border:"none",cursor:"pointer",transition:"all 0.15s",
                      background:bulkMode===v?tk.primary:"transparent",color:bulkMode===v?"white":tk.textMid}}>
                    {l}
                  </button>
                ))}
              </div>
            )}

            <div style={{padding:"12px 20px 24px"}}>
              {bulkMode?(
                <div style={{display:"flex",gap:"8px"}}>
                  <ConfirmBtn label="ไม่พบ" icon={<XCircle size={16}/>} bg={tk.dangerBg} bd={tk.dangerBd} color={tk.danger} onClick={()=>confirmResult("missing")}/>
                  <ConfirmBtn label="ชำรุด" icon={<AlertTriangle size={16}/>} bg={tk.warnBg} bd={tk.warnBd} color={tk.warn} onClick={()=>confirmResult("damaged")}/>
                  <ConfirmBtn label="พบทั้งหมด" icon={<Check size={16}/>} bg={tk.successBg} bd={tk.successBd} color={tk.success} bold onClick={()=>confirmResult("matched")}/>
                </div>
              ):(
                <div>
                  <div style={{display:"flex",flexDirection:"column",gap:"6px",maxHeight:"200px",overflowY:"auto",marginBottom:"12px"}}>
                    {itemFindings.map(item=>(
                      <div key={item.tag} style={{display:"flex",alignItems:"center",gap:"10px",
                        padding:"8px 12px",borderRadius:"10px",background:tk.badge,border:`1px solid ${tk.border}`}}>
                        <span style={{fontSize:"18px",lineHeight:1}}>{assetIcon(item.tag)}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontFamily:"monospace",fontSize:"11px",fontWeight:700,color:tk.text}}>{item.tag}</p>
                          {item.name&&<p style={{fontSize:"10px",color:tk.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</p>}
                        </div>
                        <div style={{display:"flex",gap:"4px"}}>
                          {([{f:"matched"as AuditItem["finding"],l:"พบ",c:tk.success,bg:tk.successBg,bd:tk.successBd},
                             {f:"damaged"as AuditItem["finding"],l:"ชำรุด",c:tk.warn,bg:tk.warnBg,bd:tk.warnBd},
                             {f:"missing"as AuditItem["finding"],l:"ไม่พบ",c:tk.danger,bg:tk.dangerBg,bd:tk.dangerBd}
                          ]).map(({f,l,c,bg,bd})=>(
                            <button key={f} onClick={()=>confirmItemFinding(item.tag,f)}
                              style={{fontSize:"10px",padding:"3px 8px",borderRadius:"6px",fontWeight:700,cursor:"pointer",transition:"all 0.15s",
                                background:item.finding===f?bg:"transparent",
                                border:`1px solid ${item.finding===f?bd:tk.border}`,
                                color:item.finding===f?c:tk.textSub,
                                opacity:item.finding&&item.finding!==f?0.4:1}}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={saveItemFindings} disabled={itemFindings.some(i=>i.finding===null)}
                    style={{width:"100%",height:"40px",borderRadius:"10px",fontSize:"13px",fontWeight:700,
                      background:tk.primary,color:"white",border:"none",cursor:"pointer",
                      opacity:itemFindings.some(i=>i.finding===null)?0.35:1,
                      display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",transition:"opacity 0.2s"}}>
                    <Check size={15}/> บันทึก {itemFindings.length} รายการ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({label,value,color,bg,bd}:{label:string;value:number;color:string;bg:string;bd:string}) {
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"2px 8px",
      borderRadius:"999px",background:bg,border:`1px solid ${bd}`,fontSize:"11px",fontWeight:700,color}}>
      {value} <span style={{fontWeight:400,opacity:0.7,fontSize:"10px"}}>{label}</span>
    </span>
  );
}
function Leg({color,label,tk}:{color:string;label:string;tk:Theme}) {
  return (
    <span style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"10px",color:tk.textSub}}>
      <span style={{width:"8px",height:"8px",borderRadius:"2px",background:color,flexShrink:0,display:"inline-block"}}/>
      {label}
    </span>
  );
}
function ConfirmBtn({label,icon,bg,bd,color,bold,onClick}:{label:string;icon:React.ReactNode;bg:string;bd:string;color:string;bold?:boolean;onClick:()=>void}) {
  return (
    <button onClick={onClick}
      style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"6px",
        padding:"14px 8px",borderRadius:"12px",background:bg,border:`1px solid ${bd}`,
        color,fontWeight:bold?700:600,fontSize:"12px",cursor:"pointer",transition:"filter 0.15s"}}
      onMouseEnter={e=>(e.currentTarget.style.filter="brightness(1.1)")}
      onMouseLeave={e=>(e.currentTarget.style.filter="")}>
      {icon}{label}
    </button>
  );
}
