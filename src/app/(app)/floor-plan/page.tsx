"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { employeeDB, assetDB, ticketDB } from "@/lib/supabaseDB";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { SEED_FLOORS, SEED_FLOORPLAN } from "@/lib/seed/plan2569";

// ── Types ──────────────────────────────────────────────────────────
type SeatStatus = "vacant"|"occupied"|"maintenance"|"broken";
type Zone  = { id:string; label:string; x:number; y:number; w:number; h:number; color:string };
type Seat  = {
  id:string; label:string; x:number; y:number; w:number; h:number;
  status:SeatStatus; employee?:string;
  asset_tags?: string[];   // ← หลายทรัพย์สิน
  rj45_port?:string;
};
type Floor = { id:string; label:string };
type FloorData = { zones:Zone[]; seats:Seat[] };
type ResizeEdge = "se"|"sw"|"ne"|"nw"|"e"|"s"|"w"|"n";
type DragOp =
  | { kind:"move_seat"; id:string; ox:number; oy:number; mx:number; my:number }
  | { kind:"move_zone"; id:string; ox:number; oy:number; mx:number; my:number }
  | { kind:"resize_zone"; id:string; edge:ResizeEdge; ox:number; oy:number; ow:number; oh:number; mx:number; my:number };

// ── Constants ──────────────────────────────────────────────────────
const SC: Record<SeatStatus,string> = { vacant:"#e0f2fe", occupied:"#d1fae5", maintenance:"#fef3c7", broken:"#fee2e2" };
const SB: Record<SeatStatus,string> = { vacant:"#7dd3fc", occupied:"#6ee7b7", maintenance:"#fcd34d", broken:"#fca5a5" };
const SL: Record<SeatStatus,{th:string;en:string}> = {
  vacant:{th:"ว่าง",en:"Vacant"}, occupied:{th:"มีคนใช้",en:"Occupied"},
  maintenance:{th:"ซ่อมบำรุง",en:"Maintenance"}, broken:{th:"ชำรุด",en:"Broken"},
};
const ZONE_COLORS = ["#eff6ff","#f0fdf4","#fdf4ff","#fff7ed","#fef2f2","#f0f9ff","#fefce8","#f0fdfa"];
const SNAP = 10;
const snap = (v:number) => Math.round(v/SNAP)*SNAP;
const uid  = () => Date.now().toString(36)+Math.random().toString(36).slice(2,6);

// ── Initial data (จากไฟล์ ผังคอม 2569.xlsx) ────────────────────────
const FLOORPLAN_VERSION = "v3-plan2569";
const INIT_FLOORS: Floor[] = SEED_FLOORS;
const INIT_DATA: Record<string,FloorData> = SEED_FLOORPLAN as Record<string,FloorData>;

// ── Asset icon from registered category ───────────────────────────
const CATEGORY_ICON: Record<string,string> = {
  laptop:         "💻",
  computer:       "🖥️",
  monitor:        "📺",
  printer:        "🖨️",
  network_device: "🌐",
  phone:          "☎️",
  tablet:         "📱",
  camera:         "📷",
  ups:            "🔋",
  keyboard:       "⌨️",
  mouse:          "🖱️",
  storage:        "💾",
  scanner:        "🔍",
  projector:      "📽️",
  server:         "🗄️",
};

function categoryIcon(tag: string, assetList: any[] = []): string {
  const asset = assetList.find((a: any) => a.asset_tag === tag);
  if (asset?.category) return CATEGORY_ICON[asset.category] ?? "📦";
  // fallback: guess from tag prefix
  const t = tag.toUpperCase();
  if (t.includes("NB") || t.includes("LAPTOP")) return "💻";
  if (t.includes("PC") || t.includes("DESKTOP")) return "🖥️";
  if (t.includes("MON")) return "📺";
  if (t.includes("UPS")) return "🔋";
  if (t.includes("PRN")) return "🖨️";
  if (t.includes("NET") || t.includes("SW")) return "🌐";
  return "📦";
}

// Active repair tickets set (asset_tag → true)
async function buildRepairSet(): Promise<Set<string>> {
  const active = new Set<string>();
  const ACTIVE = ["open","in_progress","pending_approval"];
  (await ticketDB.getAll())
    .filter((t: any) => t.type === "repair" && ACTIVE.includes(t.status) && t.asset_tag)
    .forEach((t: any) => active.add(t.asset_tag!));
  return active;
}

// ── Main ───────────────────────────────────────────────────────────
export default function FloorPlanPage() {
  const { locale: raw } = useLanguage();
  const isTh = raw === "th";

  const [floors,     setFloors]     = useState<Floor[]>(INIT_FLOORS);
  const [floorData,  setFloorData]  = useState<Record<string,FloorData>>(INIT_DATA);
  const [currentId,  setCurrentId]  = useState("fl1");
  const [selected,   setSelected]   = useState<Seat|null>(null);
  const [editModal,  setEditModal]  = useState<Seat|null>(null);
  const [zoneModal,  setZoneModal]  = useState<Zone|null|"new">(null);
  const [floorModal, setFloorModal] = useState<Floor|null|"new">(null);
  const [tool,       setTool]       = useState<"select"|"add_seat"|"add_zone">("select");
  const [zoom,       setZoom]       = useState(1);
  const [showLy,     setShowLy]     = useState(false);
  const [layers,     setLayers]     = useState({ vacant:true,occupied:true,maintenance:true,broken:true,names:true,ports:false,assets:true });
  const [search,     setSearch]     = useState("");
  const [searchResult, setSearchResult] = useState<{floorId:string;seatId:string}|null>(null);
  const [employees,  setEmployees]  = useState<{id:string;full_name:string}[]>([]);
  const [assets,     setAssets]     = useState<{id:string;asset_tag:string;brand:string;model_name:string;status?:string;assigned_to_name?:string|null}[]>([]);

  const [repairSet, setRepairSet] = useState<Set<string>>(new Set());
  const { confirm, ConfirmUI } = useConfirm();

  // ── localStorage persistence ──────────────────────────────────────
  const [_loaded, _setLoaded] = useState(false);
  useEffect(() => {
    try {
      // Version check — if version mismatch, reset to INIT
      const ver = localStorage.getItem("floorplan_version");
      if (ver !== FLOORPLAN_VERSION) {
        localStorage.removeItem("floorplan_floors");
        localStorage.removeItem("floorplan_data");
        localStorage.removeItem("floorplan_current");
        localStorage.setItem("floorplan_version", FLOORPLAN_VERSION);
        setFloors(INIT_FLOORS);
        setFloorData(INIT_DATA);
        setCurrentId("fl1");
      } else {
        const f = localStorage.getItem("floorplan_floors");   if (f) setFloors(JSON.parse(f));
        const d = localStorage.getItem("floorplan_data");     if (d) setFloorData(JSON.parse(d));
        const c = localStorage.getItem("floorplan_current");  if (c) setCurrentId(c);
        const def = { vacant:true,occupied:true,maintenance:true,broken:true,names:true,ports:false,assets:true };
        const l = localStorage.getItem("floorplan_layers");   if (l) setLayers({ ...def, ...JSON.parse(l) });
      }
    } catch {}
    _setLoaded(true);
  }, []);
  useEffect(() => { if (_loaded) { try { localStorage.setItem("floorplan_floors",  JSON.stringify(floors));    } catch {} } }, [floors, _loaded]);
  useEffect(() => { if (_loaded) { try { localStorage.setItem("floorplan_data",    JSON.stringify(floorData)); } catch {} } }, [floorData, _loaded]);
  useEffect(() => { if (_loaded) { try { localStorage.setItem("floorplan_current", currentId);                } catch {} } }, [currentId, _loaded]);
  useEffect(() => { if (_loaded) { try { localStorage.setItem("floorplan_layers",  JSON.stringify(layers));   } catch {} } }, [layers, _loaded]);

  useEffect(() => {
    employeeDB.getAll().then(all=>setEmployees(all.map(e=>({id:e.id,full_name:e.full_name}))));
    assetDB.getAll().then(all=>setAssets(all.map(a=>({id:a.id,asset_tag:a.asset_tag,brand:a.brand,model_name:a.model_name,status:a.status,assigned_to_name:a.assigned_to_name}))));
    buildRepairSet().then(setRepairSet);
  }, []);

  // Seat sync handled by onSave — no mount sync needed



  const cur = floorData[currentId] ?? { zones:[], seats:[] };
  const setCur = (fn:(d:FloorData)=>FloorData) =>
    setFloorData(p=>({ ...p, [currentId]: fn(p[currentId]??{zones:[],seats:[]}) }));
  const zones = cur.zones;
  const seats = cur.seats;
  const setZones = (fn:(z:Zone[])=>Zone[]) => setCur(d=>({...d,zones:fn(d.zones)}));
  const setSeats = (fn:(s:Seat[])=>Seat[]) => setCur(d=>({...d,seats:fn(d.seats)}));

  // Collect ALL assigned tags across ALL floors except a specific seat
  function getAssignedTags(excludeSeatId?: string): Set<string> {
    const used = new Set<string>();
    Object.values(floorData).forEach(fd => {
      fd.seats.forEach(s => {
        if (s.id !== excludeSeatId) {
          (s.asset_tags ?? []).forEach(t => used.add(t));
        }
      });
    });
    return used;
  }

  // Search: find which floor+seat has this asset tag or employee name
  function doSearch(q: string) {
    if (!q.trim()) { setSearchResult(null); return; }
    const lq = q.toLowerCase();
    for (const [fid, fd] of Object.entries(floorData)) {
      for (const s of fd.seats) {
        const match =
          s.label.toLowerCase().includes(lq) ||
          (s.employee ?? "").toLowerCase().includes(lq) ||
          (s.asset_tags ?? []).some(t => t.toLowerCase().includes(lq)) ||
          (s.rj45_port ?? "").toLowerCase().includes(lq);
        if (match) {
          setSearchResult({ floorId: fid, seatId: s.id });
          setCurrentId(fid);
          // select the seat
          setTimeout(() => setSelected(s), 50);
          return;
        }
      }
    }
    setSearchResult(null); // not found
  }

  const dragRef   = useRef<DragOp|null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const canvasW = Math.max(640, ...zones.map(z=>z.x+z.w), ...seats.map(s=>s.x+s.w)) + 60;
  const canvasH = Math.max(380, ...zones.map(z=>z.y+z.h), ...seats.map(s=>s.y+s.h)) + 60;

  const onMouseMove = useCallback((e:MouseEvent) => {
    const d = dragRef.current; if (!d) return;
    const dx=(e.clientX-d.mx)/zoom, dy=(e.clientY-d.my)/zoom;
    if(d.kind==="move_seat")
      setSeats(p=>p.map(s=>s.id===d.id?{...s,x:snap(d.ox+dx),y:snap(d.oy+dy)}:s));
    else if(d.kind==="move_zone")
      setZones(p=>p.map(z=>z.id===d.id?{...z,x:snap(d.ox+dx),y:snap(d.oy+dy)}:z));
    else if(d.kind==="resize_zone")
      setZones(p=>p.map(z=>{
        if(z.id!==d.id)return z;
        let{x,y,w,h}={x:d.ox,y:d.oy,w:d.ow,h:d.oh};const eg=d.edge;
        if(eg.includes("e"))w=snap(Math.max(80,d.ow+dx));
        if(eg.includes("s"))h=snap(Math.max(60,d.oh+dy));
        if(eg.includes("w")){const nw=snap(Math.max(80,d.ow-dx));x=snap(d.ox+d.ow-nw);w=nw;}
        if(eg.includes("n")){const nh=snap(Math.max(60,d.oh-dy));y=snap(d.oy+d.oh-nh);h=nh;}
        return{...z,x,y,w,h};
      }));
  },[zoom,currentId]);

  const onMouseUp = useCallback(()=>{dragRef.current=null;},[]);
  useEffect(()=>{
    window.addEventListener("mousemove",onMouseMove);
    window.addEventListener("mouseup",onMouseUp);
    return()=>{window.removeEventListener("mousemove",onMouseMove);window.removeEventListener("mouseup",onMouseUp);};
  },[onMouseMove,onMouseUp]);

  useEffect(()=>{
    function onKeyDown(e:KeyboardEvent){
      if(!selected) return;
      if(e.key!=="Delete"&&e.key!=="Backspace") return;
      const tag=(e.target as HTMLElement).tagName;
      if(tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT") return;
      e.preventDefault();
      // async confirm — use then() since inside event handler
      confirm({ title:`ลบโต๊ะ ${selected.label}?`, confirmLabel:"ลบ", danger:true })
        .then(ok=>{ if(ok){ setSeats(p=>p.filter(s=>s.id!==selected.id)); setSelected(null); } });
    }
    window.addEventListener("keydown",onKeyDown);
    return()=>window.removeEventListener("keydown",onKeyDown);
  },[selected]);

  function startMoveSeat(e:React.MouseEvent,s:Seat){if(tool!=="select")return;e.stopPropagation();dragRef.current={kind:"move_seat",id:s.id,ox:s.x,oy:s.y,mx:e.clientX,my:e.clientY};}
  function startMoveZone(e:React.MouseEvent,z:Zone){if(tool!=="select")return;e.stopPropagation();dragRef.current={kind:"move_zone",id:z.id,ox:z.x,oy:z.y,mx:e.clientX,my:e.clientY};}
  function startResizeZone(e:React.MouseEvent,z:Zone,edge:ResizeEdge){e.stopPropagation();e.preventDefault();dragRef.current={kind:"resize_zone",id:z.id,edge,ox:z.x,oy:z.y,ow:z.w,oh:z.h,mx:e.clientX,my:e.clientY};}

  function handleCanvasClick(e:React.MouseEvent){
    const rect=canvasRef.current!.getBoundingClientRect();
    const x=snap((e.clientX-rect.left)/zoom-40),y=snap((e.clientY-rect.top)/zoom-30);
    if(tool==="add_seat"){
      const s:Seat={id:uid(),label:`S-${(seats.length+1).toString().padStart(2,"0")}`,x,y,w:104,h:104,status:"vacant",asset_tags:[]};
      setSeats(p=>[...p,s]);setTool("select");setSelected(s);
    } else if(tool==="add_zone"){
      const z:Zone={id:uid(),label:isTh?`โซน ${zones.length+1}`:`Zone ${zones.length+1}`,x:snap(x-75),y:snap(y-50),w:180,h:200,color:ZONE_COLORS[zones.length%ZONE_COLORS.length]};
      setZones(p=>[...p,z]);setTool("select");setZoneModal(z);
    } else { setSelected(null);setShowLy(false); }
  }

  const stats={
    vacant:      seats.filter(s=>s.status==="vacant").length,
    occupied:    seats.filter(s=>s.status==="occupied").length,
    maintenance: seats.filter(s=>s.status==="maintenance").length,
    broken:      seats.filter(s=>s.status==="broken").length,
  };

  function handlePrint(){
    const fl = floors.find(f=>f.id===currentId);
    const padX = 40, padY = 50;
    const cW = Math.max(400, ...zones.map(z=>z.x+z.w), ...seats.map(s=>s.x+s.w)) + padX;
    const cH = Math.max(300, ...zones.map(z=>z.y+z.h), ...seats.map(s=>s.y+s.h)) + padY;
    // A4 usable area (15mm margin each side): portrait 170×257mm, landscape 257×170mm → at 96dpi ≈ 3.78px/mm
    const PX = 3.78;
    const PORT_W = Math.round(170*PX), PORT_H = Math.round(257*PX); // ~642×971
    const LAND_W = Math.round(257*PX), LAND_H = Math.round(170*PX); // ~971×642
    const scaleP = Math.min(PORT_W/cW, PORT_H/cH);
    const scaleL = Math.min(LAND_W/cW, LAND_H/cH);
    const landscape = scaleL > scaleP;
    const A4_W = landscape ? LAND_W : PORT_W;
    const A4_H = landscape ? LAND_H : PORT_H;
    const scale = landscape ? scaleL : scaleP;

    // build zone HTML
    const zonesHtml = zones.map(z=>`
      <div style="position:absolute;left:${z.x}px;top:${z.y}px;width:${z.w}px;height:${z.h}px;
        background:${z.color}cc;border:2px dashed #94a3b8;box-sizing:border-box;">
        <div style="padding:3px 8px;font-size:10px;font-weight:700;color:#475569;border-bottom:1px dashed #cbd5e1;">${z.label}</div>
      </div>`).join("");

    const SB_PRINT: Record<SeatStatus,string> = { vacant:"#7dd3fc", occupied:"#6ee7b7", maintenance:"#fcd34d", broken:"#fca5a5" };
    const SL_PRINT: Record<SeatStatus,string> = { vacant:"ว่าง", occupied:"มีคนใช้", maintenance:"ซ่อมบำรุง", broken:"ชำรุด" };

    const seatsHtml = seats.map(seat=>{
      const tags = seat.asset_tags ?? [];
      const assetRows = tags.slice(0,3).map(t=>{
        const hr = repairSet.has(t);
        return `<div style="display:flex;align-items:center;gap:3px;font-size:8px;">
          <span>${categoryIcon(t)}</span>
          <span style="font-family:monospace;background:${hr?"#fef2f2":"#eef2ff"};color:${hr?"#dc2626":"#4338ca"};padding:0 3px;font-weight:${hr?700:400};">${t}</span>
          ${hr?'<span>🔧</span>':""}
        </div>`;
      }).join("");
      const moreTag = tags.length>3?`<span style="font-size:8px;color:#6366f1;font-weight:700;">+${tags.length-3}</span>`:"";
      return `
      <div style="position:absolute;left:${seat.x}px;top:${seat.y}px;width:104px;height:104px;
        border:1.5px solid ${SB_PRINT[seat.status]};background:#fff;overflow:hidden;display:flex;flex-direction:column;">
        <div style="background:${SB_PRINT[seat.status]};padding:3px 6px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
          <span style="font-size:10px;font-weight:800;color:#0f172a;">${seat.label}</span>
          <span style="font-size:7px;color:#334155;">${seat.rj45_port??""}${!seat.rj45_port?SL_PRINT[seat.status]:""}</span>
        </div>
        <div style="padding:3px 6px 2px;border-bottom:1px solid #f1f5f9;font-size:9px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${seat.employee?`👤 ${seat.employee}`:`<span style="color:#9ca3af;font-style:italic;">ไม่ระบุ</span>`}
        </div>
        <div style="flex:1;padding:3px 6px;display:flex;flex-direction:column;gap:2px;overflow:hidden;">
          ${assetRows}${moreTag}
        </div>
      </div>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>ผังพื้นที่ — ${fl?.label??""}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  @page{size:A4 ${landscape?"landscape":"portrait"};margin:15mm 15mm 15mm 15mm;}
  body{font-family:'Sarabun','Noto Sans Thai',sans-serif;background:#fff;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  .header{margin-bottom:12px;border-bottom:2px solid #e2e8f0;padding-bottom:8px;display:flex;justify-content:space-between;align-items:flex-end;}
  .title{font-size:16px;font-weight:700;color:#0f172a;}
  .subtitle{font-size:10px;color:#64748b;}
  .legend{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;}
  .leg{display:flex;align-items:center;gap:4px;font-size:9px;color:#475569;}
  .leg-dot{width:10px;height:10px;flex-shrink:0;}
  .canvas-wrap{position:relative;transform-origin:top left;}
</style>
</head><body>
<div class="header">
  <div>
    <div class="title">ผังพื้นที่ — ${fl?.label??""}</div>
    <div class="subtitle">พิมพ์เมื่อ: ${new Date().toLocaleDateString("th-TH",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})} · A4 ${landscape?"แนวนอน (Landscape)":"แนวตั้ง (Portrait)"}</div>
  </div>
  <div class="subtitle">โต๊ะทั้งหมด ${seats.length} ที่</div>
</div>
<div class="legend">
  <div class="leg"><div class="leg-dot" style="background:#7dd3fc;"></div>ว่าง (${seats.filter(s=>s.status==="vacant").length})</div>
  <div class="leg"><div class="leg-dot" style="background:#6ee7b7;"></div>มีคนใช้ (${seats.filter(s=>s.status==="occupied").length})</div>
  <div class="leg"><div class="leg-dot" style="background:#fcd34d;"></div>ซ่อมบำรุง (${seats.filter(s=>s.status==="maintenance").length})</div>
  <div class="leg"><div class="leg-dot" style="background:#fca5a5;"></div>ชำรุด (${seats.filter(s=>s.status==="broken").length})</div>
</div>
<div class="canvas-wrap" style="width:${cW}px;height:${cH}px;transform:scale(${scale.toFixed(4)});transform-origin:top left;background:#fff;border:1px solid #e2e8f0;
  background-image:radial-gradient(circle,#e2e8f0 1px,transparent 1px);background-size:20px 20px;position:relative;">
  ${zonesHtml}
  ${seatsHtml}
</div>
</body></html>`;

    const win = window.open("","_blank","width=900,height=700");
    if(!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }

  function addFloor(){
    const id=uid();
    const newLabel=isTh?`พื้นที่ ${floors.length+1}`:`Area ${floors.length+1}`;
    setFloors(p=>[...p,{id,label:newLabel}]);
    setFloorData(p=>({...p,[id]:{zones:[],seats:[]}}));
    setCurrentId(id);
    setFloorModal({id,label:newLabel});
  }

  const isSearchHit = (seatId:string) => searchResult?.floorId===currentId && searchResult?.seatId===seatId;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {ConfirmUI}

      {/* ── Sidebar ── */}
      <div className="w-52 bg-white border-r flex flex-col flex-shrink-0 text-xs">
        <div className="px-4 py-3 border-b font-bold text-sm text-gray-900">{isTh?"ผังพื้นที่":"Floor Plan"}</div>

        {/* Search */}
        <div className="px-3 py-2 border-b">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">🔍</span>
            <input
              value={search}
              onChange={e=>setSearch(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&doSearch(search)}
              placeholder={isTh?"ค้นหาทรัพย์สิน / พนักงาน…":"Search asset / employee…"}
              className="w-full pl-7 pr-2 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          {search && (
            <button onClick={()=>doSearch(search)}
              className="mt-1 w-full text-[11px] bg-indigo-50 text-indigo-700 rounded-md py-1 hover:bg-indigo-100 transition-colors">
              {isTh?"ค้นหา":"Search"}
            </button>
          )}
          {search && searchResult===null && (
            <p className="text-[10px] text-red-500 mt-1 px-1">{isTh?"ไม่พบ":"Not found"}</p>
          )}
          {search && searchResult && (
            <p className="text-[10px] text-green-600 mt-1 px-1">
              ✓ {floors.find(f=>f.id===searchResult.floorId)?.label} · {floorData[searchResult.floorId]?.seats.find(s=>s.id===searchResult.seatId)?.label}
            </p>
          )}
        </div>

        {/* Tools */}
        <div className="px-3 py-3 border-b space-y-0.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{isTh?"เครื่องมือ":"Tools"}</p>
          {([["select",isTh?"🖱 เลือก / ย้าย":"🖱 Select / Move"],["add_seat",isTh?"➕ เพิ่มโต๊ะ":"➕ Add Desk"],["add_zone",isTh?"⬜ เพิ่มโซน":"⬜ Add Zone"]] as [string,string][]).map(([t,l])=>(
            <button key={t} onClick={()=>setTool(t as typeof tool)}
              className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors ${tool===t?"bg-indigo-100 text-indigo-700 font-semibold":"hover:bg-gray-50 text-gray-600"}`}>{l}</button>
          ))}
        </div>

        {/* Zones */}
        <div className="px-3 py-3 border-b overflow-y-auto" style={{maxHeight:160}}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{isTh?"โซน":"Zones"}</p>
            <button onClick={()=>setZoneModal("new")} className="text-indigo-600 hover:text-indigo-800">+</button>
          </div>
          {zones.length===0&&<p className="text-gray-400 text-[11px] italic px-2">{isTh?"ยังไม่มีโซน":"No zones"}</p>}
          {zones.map(z=>(
            <button key={z.id} onClick={()=>setZoneModal(z)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left text-gray-700">
              <span className="w-3 h-3 rounded-sm border border-gray-300 flex-shrink-0" style={{backgroundColor:z.color}}/>
              <span className="truncate">{z.label}</span>
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="px-3 py-3 space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{isTh?"สรุป":"Summary"}</p>
          {(Object.keys(stats) as SeatStatus[]).sort((a,b)=>stats[b]-stats[a]).map(k=>(
            <div key={k} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm border" style={{backgroundColor:SC[k],borderColor:SB[k]}}/>
                <span className="text-gray-600">{SL[k][isTh?"th":"en"]}</span>
              </div>
              <span className="font-semibold text-gray-800">{stats[k]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Floor tabs */}
        <div className="bg-white border-b px-3 pt-2 flex items-end gap-1 text-xs">
          {floors.map(fl=>(
            <div key={fl.id} className="flex items-center">
              <button onClick={()=>{setCurrentId(fl.id);setSelected(null);setSearchResult(null);setSearch("");}}
                className={`px-4 py-2 rounded-t-lg border-t border-x font-medium transition-colors ${currentId===fl.id?"bg-white border-gray-200 text-indigo-700 -mb-px z-10":"bg-gray-50 border-transparent text-gray-500 hover:text-gray-700"}`}>
                {fl.label}
              </button>
              {currentId===fl.id&&(
                <button onClick={()=>setFloorModal(fl)} title={isTh?"แก้ไขพื้นที่":"Edit"}
                  className="ml-0.5 px-1 py-2 text-gray-400 hover:text-indigo-600">✏️</button>
              )}
            </div>
          ))}
          <button onClick={addFloor} className="px-3 py-2 text-indigo-600 hover:text-indigo-800 font-medium">
            + {isTh?"เพิ่มพื้นที่":"Add Area"}
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-white border-b px-4 py-2 flex items-center gap-2 text-xs">
          {tool!=="select"&&(
            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-medium">
              {tool==="add_seat"?(isTh?"คลิกเพื่อวางโต๊ะ":"Click to place desk"):(isTh?"คลิกเพื่อสร้างโซน":"Click to create zone")}
              &nbsp;·&nbsp;<button onClick={()=>setTool("select")} className="underline">{isTh?"ยกเลิก":"Cancel"}</button>
            </span>
          )}
          <div className="flex-1"/>
          {/* Layers */}
          <div className="relative">
            <button onClick={()=>setShowLy(!showLy)} className={`border rounded-lg px-2.5 py-1 transition-colors ${showLy?"bg-indigo-50 border-indigo-300 text-indigo-700":"hover:bg-gray-100 text-gray-600"}`}>
              ⚙ {isTh?"เลเยอร์":"Layers"}
            </button>
            {showLy&&(
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-lg p-3 z-50 w-44 space-y-1.5">
                {(Object.entries(layers) as [keyof typeof layers,boolean][]).map(([k,v])=>(
                  <label key={String(k)} className="flex items-center gap-2 cursor-pointer text-gray-700">
                    <input type="checkbox" checked={v} onChange={()=>setLayers((l: typeof layers)=>({...l,[k]:!l[k]}))} className="accent-indigo-600"/>
                    {k==="vacant"&&(isTh?"ว่าง":"Vacant")}{k==="occupied"&&(isTh?"มีคนใช้":"Occupied")}
                    {k==="maintenance"&&(isTh?"ซ่อมบำรุง":"Maintenance")}{k==="broken"&&(isTh?"ชำรุด":"Broken")}
                    {k==="names"&&(isTh?"ชื่อพนักงาน":"Names")}{k==="ports"&&"Ports"}{k==="assets"&&(isTh?"ทรัพย์สิน":"Assets")}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5 border rounded-lg overflow-hidden">
            <button onClick={()=>setZoom(z=>Math.max(0.3,+(z-0.1).toFixed(1)))} className="px-2 py-1 hover:bg-gray-100">−</button>
            <span className="w-12 text-center tabular-nums text-gray-700">{Math.round(zoom*100)}%</span>
            <button onClick={()=>setZoom(z=>Math.min(3,+(z+0.1).toFixed(1)))} className="px-2 py-1 hover:bg-gray-100">+</button>
          </div>
          <button onClick={()=>setZoom(1)} className="border rounded-lg px-2.5 py-1 text-gray-600 hover:bg-gray-100">{isTh?"รีเซต":"Reset"}</button>
          <button onClick={handlePrint} className="border rounded-lg px-2.5 py-1 text-gray-600 hover:bg-gray-100 flex items-center gap-1">
            🖨 {isTh?"พิมพ์":"Print"}
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-gray-100 p-6">
          <div style={{width:canvasW*zoom,height:canvasH*zoom,position:"relative"}}>
            <div ref={canvasRef} onClick={handleCanvasClick}
              style={{position:"absolute",top:0,left:0,width:canvasW,height:canvasH,background:"white",
                border:"1px solid #e2e8f0",borderRadius:12,transform:`scale(${zoom})`,transformOrigin:"top left",
                cursor:tool==="select"?"default":tool==="add_seat"?"crosshair":"cell",
                backgroundImage:"radial-gradient(circle,#d1d5db 1px,transparent 1px)",backgroundSize:"20px 20px"}}>

              {/* Zones */}
              {zones.map(zone=>(
                <div key={zone.id} style={{position:"absolute",left:zone.x,top:zone.y,width:zone.w,height:zone.h,
                  backgroundColor:zone.color+"cc",border:"2px dashed #94a3b8",borderRadius:8,boxSizing:"border-box"}}>
                  <div onMouseDown={e=>startMoveZone(e,zone)} onDoubleClick={e=>{e.stopPropagation();setZoneModal(zone);}}
                    style={{padding:"4px 8px",fontSize:11,fontWeight:700,color:"#475569",cursor:"move",userSelect:"none",borderBottom:"1px dashed #cbd5e1"}}>
                    {zone.label}
                    <span style={{fontSize:9,color:"#94a3b8",marginLeft:4,fontWeight:400}}>{isTh?"(ดับเบิลคลิกแก้ไข)":"(dbl-edit)"}</span>
                  </div>
                  {(["nw","ne","sw","se","n","s","e","w"] as ResizeEdge[]).map(edge=>(
                    <RHandle key={edge} edge={edge} onMouseDown={e=>startResizeZone(e,zone,edge)}/>
                  ))}
                </div>
              ))}

              {/* Seats — fixed 104×104, Option B: header band */}
              {seats.filter(s=>layers[s.status]).map(seat=>{
                const tags = seat.asset_tags ?? [];
                const isHit = isSearchHit(seat.id);
                const isSel = selected?.id===seat.id;
                return (
                  <div key={seat.id} onMouseDown={e=>startMoveSeat(e,seat)}
                    onClick={e=>{if(tool==="select"){e.stopPropagation();setSelected(seat);}}}
                    style={{
                      position:"absolute", left:seat.x, top:seat.y,
                      width:104, height:104,
                      backgroundColor:"#fff",
                      border:`2px solid ${isHit?"#f59e0b":isSel?"#6366f1":SB[seat.status]}`,
                      borderRadius:0,
                      outline: isHit?"3px solid rgba(245,158,11,0.4)":isSel?"3px solid rgba(99,102,241,0.3)":"none",
                      boxShadow:"0 1px 4px rgba(0,0,0,0.12)",
                      cursor:tool==="select"?"grab":"default",
                      zIndex:5, userSelect:"none", overflow:"hidden",
                      display:"flex", flexDirection:"column",
                    }}>

                    {/* ── Header band (status color) ── */}
                    <div style={{
                      background:SB[seat.status],
                      padding:"3px 6px",
                      display:"flex", alignItems:"center", justifyContent:"space-between",
                      flexShrink:0,
                    }}>
                      <span style={{fontSize:10, fontWeight:800, color:"#0f172a", letterSpacing:"0.2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:68}}>{seat.label}</span>
                      {layers.ports && seat.rj45_port
                        ? <span style={{fontSize:7, color:"#334155", fontFamily:"monospace", background:"rgba(255,255,255,0.55)", padding:"0 3px", borderRadius:2}}>{seat.rj45_port}</span>
                        : <span style={{fontSize:7, color:"#334155", opacity:0.6}}>{SL[seat.status][isTh?"th":"en"]}</span>
                      }
                    </div>

                    {/* ── Employee row ── */}
                    <div style={{padding:"3px 6px 2px", display:"flex", alignItems:"center", gap:3, borderBottom:"1px solid #f1f5f9", flexShrink:0}}>
                      {seat.employee ? (
                        <>
                          <span style={{fontSize:9, flexShrink:0}}>👤</span>
                          <span style={{fontSize:9, color:"#374151", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{seat.employee}</span>
                        </>
                      ) : (
                        <span style={{fontSize:9, color:"#9ca3af", fontStyle:"italic"}}>{isTh?"ไม่ระบุ":"—"}</span>
                      )}
                    </div>

                    {/* ── Asset rows (vertical, max 3, +N) ── */}
                    <div style={{flex:1, padding:"3px 6px", display:"flex", flexDirection:"column", gap:2, overflow:"hidden"}}>
                      {layers.assets && tags.length > 0 ? (
                        <>
                          {tags.slice(0,3).map(t=>{
                            const hasRepair = repairSet.has(t);
                            return (
                              <div key={t} title={`${t}${hasRepair?" — มีการแจ้งซ่อม":""}`}
                                style={{display:"flex", alignItems:"center", gap:3}}>
                                <span style={{fontSize:11, lineHeight:1, flexShrink:0}}>{categoryIcon(t)}</span>
                                <span style={{
                                  fontSize:8, fontFamily:"monospace",
                                  color: hasRepair?"#dc2626":"#4338ca",
                                  background: hasRepair?"#fef2f2":"#eef2ff",
                                  padding:"0 3px", lineHeight:"14px",
                                  maxWidth:52, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                                  fontWeight: hasRepair?700:400,
                                  flexShrink:1,
                                }}>{t}</span>
                                {hasRepair && (
                                  <span style={{fontSize:8, flexShrink:0}}>🔧</span>
                                )}
                              </div>
                            );
                          })}
                          {tags.length > 3 && (
                            <span style={{fontSize:8, color:"#6366f1", fontWeight:700}}>+{tags.length-3}</span>
                          )}
                        </>
                      ) : (
                        layers.assets && <span style={{fontSize:8, color:"#d1d5db"}}>—</span>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Seat Panel ── */}
      {selected&&(
        <div className="w-64 bg-white border-l flex flex-col text-xs flex-shrink-0">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <span className="font-bold text-sm text-gray-900">{isTh?"โต๊ะ":"Desk"} {selected.label}</span>
            <button onClick={()=>setSelected(null)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
          </div>
          {/* ปุ่มอยู่ใต้ header เลย ไม่ต้องเลื่อน */}
          <div className="px-4 py-2 border-b flex gap-2">
            <button onClick={()=>setEditModal({...selected})} className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg py-1.5 text-xs font-medium transition-colors">
              ✏️ {isTh?"แก้ไขที่นั่ง":"Edit"}
            </button>
            <button onClick={async()=>{
                const ok=await confirm({title:isTh?`ลบโต๊ะ ${selected.label}?`:`Delete desk ${selected.label}?`,confirmLabel:isTh?"ลบ":"Delete",danger:true});
                if(ok){setSeats(p=>p.filter(s=>s.id!==selected.id));setSelected(null);}
              }}
              className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg py-1.5 text-xs font-medium transition-colors flex items-center justify-center gap-1">
              🗑 {isTh?"ลบโต๊ะ":"Delete"}
            </button>
          </div>
          <div className="px-4 py-3 space-y-3 flex-1 overflow-y-auto">
            <span className="inline-flex px-2.5 py-0.5 rounded-full font-medium" style={{backgroundColor:SC[selected.status],color:"#374151"}}>
              {SL[selected.status][isTh?"th":"en"]}
            </span>
            <SRow label={isTh?"พนักงาน":"Employee"} value={selected.employee??(isTh?"ยังไม่กำหนด":"—")}/>
            <div>
              <p className="text-gray-400 mb-1.5">{isTh?"ทรัพย์สิน":"Assets"}</p>
              {(selected.asset_tags??[]).length===0
                ? <p className="text-gray-400 italic">{isTh?"ยังไม่มี":"None"}</p>
                : <div className="flex flex-col gap-2">
                    {(selected.asset_tags??[]).map(t=>{
                      const assetInfo = assets.find(a => a.asset_tag === t);
                      const owner = assetInfo?.assigned_to_name;
                      const seatPerson = selected.employee;
                      const ownerDiffers = owner && owner !== seatPerson;
                      return (
                      <div key={t} className="rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm">{categoryIcon(t)}</span>
                            <span className="font-mono text-indigo-700 text-xs truncate">{t}</span>
                          </div>
                          <a href={`/tickets/new?asset_tag=${encodeURIComponent(t)}&desk=${encodeURIComponent(selected.label)}`}
                            className="shrink-0 text-[10px] bg-orange-100 text-orange-700 hover:bg-orange-200 rounded px-1.5 py-0.5 transition-colors"
                            title={isTh?"แจ้งซ่อมสินทรัพย์นี้":"Create repair ticket"}>
                            🔧 {isTh?"แจ้งซ่อม":"Repair"}
                          </a>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[10px]">
                          <span className="text-gray-400">{isTh?"ผู้ครอบครอง:":"Owner:"}</span>
                          {owner
                            ? <span className={ownerDiffers ? "text-amber-600 font-medium" : "text-gray-600"}>{owner}{ownerDiffers && " ⚠️"}</span>
                            : <span className="text-gray-400 italic">{isTh?"ไม่ระบุ":"—"}</span>
                          }
                        </div>
                      </div>
                      );
                    })}
                  </div>
              }
            </div>
            <SRow label="RJ45" value={selected.rj45_port??"—"} mono/>
          </div>
        </div>
      )}

      {/* Modals */}
      {editModal&&<SeatModal seat={editModal} isTh={isTh} employees={employees} assets={assets}
        assignedTags={getAssignedTags(editModal.id)}
        onSave={s=>{
          // sync asset location + status back to assetDB
          const floorLabel = floors.find(f=>f.id===currentId)?.label ?? "";
          const hasEmployee = !!(s.employee);
          // clear old tags removed from this seat
          const oldTags = editModal.asset_tags ?? [];
          const newTags = s.asset_tags ?? [];
          assetDB.getAll().then(allA => {
          oldTags.filter((t: string)=>!newTags.includes(t)).forEach((t: string)=>{
            const a = allA.find((x: any)=>x.asset_tag===t);
            if(a) assetDB.update(a.id,{seat_id:null,seat_label:null,room_name:null,
              status: a.status==="in_use" ? "idle" : a.status});
          });
          // update new/existing tags
          newTags.forEach((t: string)=>{
            const a = allA.find(x=>x.asset_tag===t);
            if(a){
              const newStatus = (a.status==="idle"||a.status==="in_use")
                ? (hasEmployee ? "in_use" : "idle")
                : a.status; // don't override under_repair / pending_return / returned
              assetDB.update(a.id,{seat_id:s.id,seat_label:s.label,room_name:floorLabel,status:newStatus});
            }
          });
          window.dispatchEvent(new Event("itam_assets_updated"));
          setSeats(p=>p.map(x=>x.id===s.id?s:x));setSelected(s);setEditModal(null);
          });}}
        onClose={()=>setEditModal(null)}/>}
      {zoneModal&&<ZoneModal zone={zoneModal==="new"?null:zoneModal} isTh={isTh}
        onSave={z=>{if(zones.find(x=>x.id===z.id))setZones(p=>p.map(x=>x.id===z.id?z:x));else setZones(p=>[...p,z]);setZoneModal(null);}}
        onDelete={id=>{setZones(p=>p.filter(z=>z.id!==id));setZoneModal(null);}}
        onClose={()=>setZoneModal(null)}/>}
      {floorModal&&<FloorModal floor={floorModal==="new"?null:floorModal} isTh={isTh} canDelete={floors.length>1}
        onSave={f=>{if(floors.find(x=>x.id===f.id))setFloors(p=>p.map(x=>x.id===f.id?f:x));else setFloors(p=>[...p,f]);setFloorModal(null);}}
        onDelete={id=>{setFloors(p=>p.filter(f=>f.id!==id));setFloorData(p=>{const n={...p};delete n[id];return n;});setCurrentId(floors.find(f=>f.id!==id)!.id);setFloorModal(null);}}
        onClose={()=>setFloorModal(null)}/>}
    </div>
  );
}

// ── Resize Handle ──────────────────────────────────────────────────
function RHandle({edge,onMouseDown}:{edge:ResizeEdge;onMouseDown:(e:React.MouseEvent)=>void}){
  const s:React.CSSProperties={position:"absolute",background:"#6366f1",borderRadius:3,zIndex:20};
  const isV=edge==="n"||edge==="s",isH=edge==="e"||edge==="w",c=edge+"-resize";
  if(isV) Object.assign(s,{width:36,height:6,left:"50%",transform:"translateX(-50%)",cursor:c,...(edge==="n"?{top:-3}:{bottom:-3})});
  else if(isH) Object.assign(s,{width:6,height:36,top:"50%",transform:"translateY(-50%)",cursor:c,...(edge==="w"?{left:-3}:{right:-3})});
  else Object.assign(s,{width:10,height:10,cursor:c,...(edge.includes("n")?{top:-5}:{bottom:-5}),...(edge.includes("w")?{left:-5}:{right:-5})});
  return <div style={s} onMouseDown={onMouseDown}/>;
}

function SRow({label,value,mono=false}:{label:string;value:string;mono?:boolean}){
  return(<div><p className="text-gray-400 mb-0.5">{label}</p><p className={`text-gray-800 ${mono?"font-mono":""}`}>{value}</p></div>);
}

// ── Seat Modal (multi-asset) ────────────────────────────────────────
function SeatModal({seat,isTh,employees,assets,assignedTags,onSave,onClose}:{
  seat:Seat; isTh:boolean;
  employees:{id:string;full_name:string}[];
  assets:{id:string;asset_tag:string;brand:string;model_name:string;status?:string}[];
  assignedTags: Set<string>;
  onSave:(s:Seat)=>void; onClose:()=>void;
}){
  const [label,    setLabel]    = useState(seat.label);
  const [status,   setStatus]   = useState(seat.status);
  const [employee, setEmployee] = useState(seat.employee??"");
  const [tags,     setTags]     = useState<string[]>(seat.asset_tags??[]);
  const [rj45,     setRj45]     = useState(seat.rj45_port??"");
  const { confirm, ConfirmUI } = useConfirm();

  function toggleTag(tag:string){
    setTags(p=> p.includes(tag) ? p.filter(t=>t!==tag) : [...p,tag]);
  }

  async function handleSave(){
    const ok = await confirm({
      title: isTh?`บันทึกการแก้ไขโต๊ะ ${seat.label}?`:`Save changes to ${seat.label}?`,
      confirmLabel: isTh?"บันทึก":"Save",
    });
    if(!ok) return;
    onSave({...seat,label,status,employee:employee||undefined,asset_tags:tags,rj45_port:rj45||undefined});
  }

  return(
    <MModal title={isTh?`แก้ไขโต๊ะ ${seat.label}`:`Edit ${seat.label}`} onClose={onClose}>
      {ConfirmUI}
      <MF label={isTh?"ชื่อโต๊ะ":"Label"}><input value={label} onChange={e=>setLabel(e.target.value)} className={inp()}/></MF>
      <MF label={isTh?"สถานะ":"Status"}>
        <select value={status} onChange={e=>setStatus(e.target.value as SeatStatus)} className={inp()}>
          {(["vacant","occupied","maintenance","broken"] as SeatStatus[]).map(s=>(
            <option key={s} value={s}>{SL[s][isTh?"th":"en"]}</option>
          ))}
        </select>
      </MF>
      <MF label={isTh?"พนักงาน":"Employee"}>
        <select value={employee} onChange={e=>setEmployee(e.target.value)} className={inp()}>
          <option value="">—{isTh?"ไม่กำหนด":"None"}—</option>
          {employees.map(e=><option key={e.id} value={e.full_name}>{e.full_name}</option>)}
        </select>
      </MF>

      {/* Multi-asset selector */}
      <MF label={isTh?`ทรัพย์สิน (เลือกได้หลายรายการ)`:`Assets (select multiple)`}>
        <div className="border rounded-lg max-h-44 overflow-y-auto divide-y">
          {assets.length===0&&<p className="px-3 py-2 text-gray-400 text-[11px] italic">{isTh?"ไม่มีข้อมูลทรัพย์สิน":"No assets in DB"}</p>}
          {assets.filter(a => a.status !== 'returned' && (!assignedTags.has(a.asset_tag) || tags.includes(a.asset_tag))).map(a=>{
            const checked = tags.includes(a.asset_tag);
            return(
              <label key={a.id}
                className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer text-xs transition-colors
                  ${checked?"bg-indigo-50":"hover:bg-gray-50"}`}>
                <input type="checkbox" checked={checked}
                  onChange={()=>toggleTag(a.asset_tag)} className="accent-indigo-600"/>
                <span className="font-mono text-indigo-700">{a.asset_tag}</span>
                <span className="text-gray-500 truncate">{a.brand} {a.model_name}</span>
              </label>
            );
          })}
        </div>
        {tags.length>0&&(
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map(t=>(
              <span key={t} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 text-[11px]">
                {t}
                <button onClick={()=>setTags(p=>p.filter(x=>x!==t))} className="hover:text-red-500 leading-none">×</button>
              </span>
            ))}
          </div>
        )}
      </MF>

      <MF label="RJ45"><input value={rj45} onChange={e=>setRj45(e.target.value)} placeholder="P01" className={inp()}/></MF>
      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">{isTh?"ยกเลิก":"Cancel"}</button>
        <button onClick={handleSave}
          className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700">{isTh?"บันทึก":"Save"}</button>
      </div>
    </MModal>
  );
}

// ── Zone Modal ─────────────────────────────────────────────────────
function ZoneModal({zone,isTh,onSave,onDelete,onClose}:{zone:Zone|null;isTh:boolean;onSave:(z:Zone)=>void;onDelete:(id:string)=>void;onClose:()=>void;}){
  const [f,setF]=useState({label:zone?.label??(isTh?"โซนใหม่":"New Zone"),color:zone?.color??ZONE_COLORS[0],w:zone?.w??200,h:zone?.h??220});
  const { confirm:cfm, ConfirmUI:CUI } = useConfirm();
  return(
    <MModal title={zone?(isTh?`แก้ไขโซน ${zone.label}`:`Edit ${zone.label}`):(isTh?"เพิ่มโซน":"New Zone")} onClose={onClose}>
      {CUI}
      <MF label={isTh?"ชื่อโซน":"Name"}><input value={f.label} onChange={e=>setF(p=>({...p,label:e.target.value}))} className={inp()}/></MF>
      <MF label={isTh?"สี":"Color"}>
        <div className="flex gap-2 flex-wrap">{ZONE_COLORS.map(c=><button key={c} onClick={()=>setF(p=>({...p,color:c}))} className={`w-7 h-7 rounded border-2 ${f.color===c?"border-indigo-500 scale-110":"border-gray-200"}`} style={{backgroundColor:c}}/>)}</div>
      </MF>
      <div className="grid grid-cols-2 gap-3">
        <MF label={isTh?"กว้าง":"W"}><input type="number" value={f.w} min={80} onChange={e=>setF(p=>({...p,w:+e.target.value}))} className={inp()}/></MF>
        <MF label={isTh?"สูง":"H"}><input type="number" value={f.h} min={60} onChange={e=>setF(p=>({...p,h:+e.target.value}))} className={inp()}/></MF>
      </div>
      <div className="flex gap-2 pt-1">
        {zone&&<button onClick={async()=>{const ok=await cfm({title:isTh?`ลบโซน ${zone.label}?`:`Delete zone ${zone.label}?`,confirmLabel:isTh?"ลบ":"Delete",danger:true});if(ok)onDelete(zone.id);}} className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg py-2 text-sm">🗑 {isTh?"ลบ":"Delete"}</button>}
        <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">{isTh?"ยกเลิก":"Cancel"}</button>
        <button onClick={async()=>{const ok=await cfm({title:isTh?`บันทึกโซน ${f.label}?`:`Save zone ${f.label}?`,confirmLabel:isTh?"บันทึก":"Save"});if(ok)onSave({id:zone?.id??uid(),x:zone?.x??20,y:zone?.y??20,...f});}} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700">{isTh?"บันทึก":"Save"}</button>
      </div>
    </MModal>
  );
}

// ── Floor Modal ────────────────────────────────────────────────────
function FloorModal({floor,isTh,onSave,onDelete,canDelete,onClose}:{floor:Floor|null;isTh:boolean;canDelete:boolean;onSave:(f:Floor)=>void;onDelete:(id:string)=>void;onClose:()=>void;}){
  const [label,setLabel]=useState(floor?.label??(isTh?"พื้นที่ใหม่":"New Area"));
  const { confirm:cfm, ConfirmUI:CUI } = useConfirm();
  return(
    <MModal title={floor?(isTh?`แก้ไข ${floor.label}`:`Edit ${floor.label}`):(isTh?"เพิ่มพื้นที่":"New Area")} onClose={onClose}>
      {CUI}
      <MF label={isTh?"ชื่อพื้นที่":"Area Name"}><input value={label} onChange={e=>setLabel(e.target.value)} autoFocus className={inp()}/></MF>
      <div className="flex gap-2 pt-1">
        {floor&&canDelete&&<button onClick={async()=>{const ok=await cfm({title:isTh?`ลบพื้นที่ ${floor.label}?`:`Delete area ${floor.label}?`,message:isTh?"โต๊ะและโซนทั้งหมดในพื้นที่นี้จะถูกลบด้วย":"All desks and zones will be removed.",confirmLabel:isTh?"ลบ":"Delete",danger:true});if(ok)onDelete(floor.id);}} className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg py-2 text-sm">🗑 {isTh?"ลบพื้นที่":"Delete"}</button>}
        <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">{isTh?"ยกเลิก":"Cancel"}</button>
        <button onClick={async()=>{const ok=await cfm({title:isTh?`บันทึกพื้นที่ ${label}?`:`Save area ${label}?`,confirmLabel:isTh?"บันทึก":"Save"});if(ok)onSave({id:floor?.id??uid(),label});}} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700">{isTh?"บันทึก":"Save"}</button>
      </div>
    </MModal>
  );
}

// ── Shared ─────────────────────────────────────────────────────────
function MModal({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}){
  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function MF({label,children}:{label:string;children:React.ReactNode}){return<div className="space-y-1"><label className="text-xs font-medium text-gray-500">{label}</label>{children}</div>;}
function inp(){return "w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300";}

