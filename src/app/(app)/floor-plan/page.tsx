"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { employeeDB, assetDB, ticketDB, floorplanDB } from "@/lib/supabaseDB";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { SEED_FLOORS, SEED_FLOORPLAN, SEED_ASSETS } from "@/lib/seed/plan2569";
import {
  MousePointer2, Plus, Square, ZoomIn, ZoomOut, Maximize2,
  Printer, CloudOff, Pencil, Trash2, Copy, Search, X,
  ChevronDown, Eye, EyeOff, Layers, RotateCw, RotateCcw,
  ChevronRight,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
type SeatStatus = "vacant" | "occupied" | "maintenance" | "broken";
type Zone = { id: string; label: string; x: number; y: number; w: number; h: number; color: string };
type Seat = {
  id: string; label: string; x: number; y: number; w: number; h: number;
  status: SeatStatus; employee?: string; asset_tags?: string[]; rj45_port?: string;
};
type Floor = { id: string; label: string };
type ItemKind =
  "chair" | "sofa" | "cabinet" | "shelf" | "locker" |
  "partition" | "door" | "window" |
  "pc" | "monitor" | "printer" | "ups" | "switch" | "server" | "screen";
type FItem = {
  id: string; kind: ItemKind; label: string;
  x: number; y: number; w: number; h: number;
  rotation: number; color: string;
};
type FloorData = { zones: Zone[]; seats: Seat[]; items?: FItem[] };
type ResizeEdge = "se" | "sw" | "ne" | "nw" | "e" | "s" | "w" | "n";
type DragOp =
  | { kind: "move_seat"; id: string; ox: number; oy: number; mx: number; my: number }
  | { kind: "move_zone"; id: string; ox: number; oy: number; mx: number; my: number }
  | { kind: "move_item"; id: string; ox: number; oy: number; mx: number; my: number }
  | { kind: "resize_zone"; id: string; edge: ResizeEdge; ox: number; oy: number; ow: number; oh: number; mx: number; my: number }
  | { kind: "resize_item"; id: string; edge: ResizeEdge; ox: number; oy: number; ow: number; oh: number; mx: number; my: number };

type PlaceKind = "desk" | "zone" | ItemKind;

// ── Status colours ─────────────────────────────────────────────────
const SC: Record<SeatStatus, string> = { vacant: "#e0f2fe", occupied: "#d1fae5", maintenance: "#fef3c7", broken: "#fee2e2" };
const SB: Record<SeatStatus, string> = { vacant: "#7dd3fc", occupied: "#6ee7b7", maintenance: "#fcd34d", broken: "#fca5a5" };
const SA: Record<SeatStatus, string> = { vacant: "#0ea5e9", occupied: "#10b981", maintenance: "#f59e0b", broken: "#ef4444" };
const SL: Record<SeatStatus, { th: string; en: string }> = {
  vacant:      { th: "ว่าง",      en: "Vacant"      },
  occupied:    { th: "มีคนใช้",   en: "Occupied"    },
  maintenance: { th: "ซ่อมบำรุง", en: "Maintenance" },
  broken:      { th: "ชำรุด",     en: "Broken"      },
};

const ZONE_COLORS = [
  "#eff6ff","#f0fdf4","#fdf4ff","#fff7ed",
  "#fef2f2","#f0f9ff","#fefce8","#f0fdfa","#f8fafc","#faf5ff",
];
const ZONE_BORDER: Record<string, string> = {
  "#eff6ff":"#bfdbfe","#f0fdf4":"#bbf7d0","#fdf4ff":"#e9d5ff","#fff7ed":"#fed7aa",
  "#fef2f2":"#fecaca","#f0f9ff":"#bae6fd","#fefce8":"#fef08a","#f0fdfa":"#99f6e4",
  "#f8fafc":"#e2e8f0","#faf5ff":"#ddd6fe",
};

// ── Object Catalog ─────────────────────────────────────────────────
type CatalogEntry = {
  kind: PlaceKind; label: string; labelEn: string;
  emoji: string; defW: number; defH: number; color: string;
  cat: "area" | "furniture" | "it" | "structure";
};
const CATALOG: CatalogEntry[] = [
  { kind:"zone",      label:"โซน/ห้อง",        labelEn:"Zone/Room",      emoji:"⬜", defW:240, defH:200, color:"#eff6ff", cat:"area"      },
  { kind:"desk",      label:"โต๊ะทำงาน",        labelEn:"Desk",           emoji:"🖥", defW:104, defH:104, color:"#fff",    cat:"furniture" },
  { kind:"chair",     label:"เก้าอี้",          labelEn:"Chair",          emoji:"🪑", defW: 44, defH: 44, color:"#f0fdf4", cat:"furniture" },
  { kind:"sofa",      label:"โซฟา",             labelEn:"Sofa",           emoji:"🛋", defW:130, defH: 60, color:"#faf5ff", cat:"furniture" },
  { kind:"cabinet",   label:"ตู้เอกสาร",        labelEn:"Cabinet",        emoji:"🗄", defW: 60, defH: 80, color:"#fff7ed", cat:"furniture" },
  { kind:"shelf",     label:"ชั้นวาง",          labelEn:"Shelf",          emoji:"📚", defW:110, defH: 40, color:"#fef9c3", cat:"furniture" },
  { kind:"locker",    label:"ล็อคเกอร์",        labelEn:"Locker",         emoji:"🔒", defW: 50, defH: 90, color:"#f0f9ff", cat:"furniture" },
  { kind:"pc",        label:"คอมพิวเตอร์",      labelEn:"Desktop PC",     emoji:"🖥", defW: 60, defH: 60, color:"#eef2ff", cat:"it"        },
  { kind:"monitor",   label:"จอมอนิเตอร์",      labelEn:"Monitor",        emoji:"📺", defW: 80, defH: 30, color:"#dbeafe", cat:"it"        },
  { kind:"printer",   label:"เครื่องพิมพ์",     labelEn:"Printer",        emoji:"🖨", defW: 70, defH: 60, color:"#d1fae5", cat:"it"        },
  { kind:"ups",       label:"UPS",              labelEn:"UPS",            emoji:"🔋", defW: 40, defH: 90, color:"#fef9c3", cat:"it"        },
  { kind:"switch",    label:"Switch/Router",    labelEn:"Switch/Router",  emoji:"🌐", defW: 60, defH: 40, color:"#e0f2fe", cat:"it"        },
  { kind:"server",    label:"Server Rack",      labelEn:"Server Rack",    emoji:"🗄", defW: 60, defH:130, color:"#1e293b", cat:"it"        },
  { kind:"screen",    label:"โปรเจกเตอร์",     labelEn:"Projector",      emoji:"📽", defW:110, defH: 16, color:"#1e293b", cat:"it"        },
  { kind:"partition", label:"ฉากกั้น",          labelEn:"Partition",      emoji:"▬", defW:130, defH: 12, color:"#94a3b8", cat:"structure" },
  { kind:"door",      label:"ประตู",            labelEn:"Door",           emoji:"🚪", defW: 80, defH: 12, color:"#b45309", cat:"structure" },
  { kind:"window",    label:"หน้าต่าง",         labelEn:"Window",         emoji:"🪟", defW: 90, defH: 12, color:"#7dd3fc", cat:"structure" },
];
const CAT_LABELS: Record<string, { th: string; en: string }> = {
  area:      { th:"พื้นที่",      en:"Areas"     },
  furniture: { th:"เฟอร์นิเจอร์", en:"Furniture" },
  it:        { th:"อุปกรณ์ IT",   en:"IT Equip." },
  structure: { th:"โครงสร้าง",    en:"Structure" },
};
const CAT_ORDER = ["area","furniture","it","structure"] as const;

const SNAP = 10;
const snap = (v: number) => Math.round(v / SNAP) * SNAP;
const uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const FLOORPLAN_VERSION = "v5-autodesk";
const INIT_FLOORS: Floor[] = SEED_FLOORS;
const INIT_DATA: Record<string, FloorData> = SEED_FLOORPLAN as Record<string, FloorData>;

const CATEGORY_ICON: Record<string, string> = {
  laptop:"💻", computer:"🖥️", monitor:"📺", printer:"🖨️",
  network_device:"🌐", phone:"☎️", tablet:"📱", camera:"📷",
  ups:"🔋", keyboard:"⌨️", mouse:"🖱️", storage:"💾",
  scanner:"🔍", projector:"📽️", server:"🗄️",
};
function categoryIcon(tag: string, assetList: any[] = []): string {
  const asset = assetList.find((a: any) => a.asset_tag === tag);
  if (asset?.category) return CATEGORY_ICON[asset.category] ?? "📦";
  const seedCat = SEED_ASSETS.find(s => s.asset_tag === tag)?.category;
  if (seedCat) return CATEGORY_ICON[seedCat] ?? "📦";
  const t = tag.toUpperCase();
  if (t.includes("NB") || t.includes("LAPTOP")) return "💻";
  if (t.includes("PC") || t.includes("DESKTOP")) return "🖥️";
  if (t.includes("MON")) return "📺";
  if (t.includes("UPS")) return "🔋";
  if (t.includes("PRN")) return "🖨️";
  if (t.includes("NET") || t.includes("SW")) return "🌐";
  return "📦";
}
async function buildRepairSet(): Promise<Set<string>> {
  const active = new Set<string>();
  const ACTIVE = ["open","in_progress","pending_approval"];
  (await ticketDB.getAll())
    .filter((t: any) => t.type === "repair" && ACTIVE.includes(t.status) && t.asset_tag)
    .forEach((t: any) => active.add(t.asset_tag!));
  return active;
}

const GP: React.CSSProperties = {
  background: "rgba(255,255,255,0.62)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
};

// ── Main ───────────────────────────────────────────────────────────
export default function FloorPlanPage() {
  const { locale: raw } = useLanguage();
  const isTh = raw === "th";

  const [floors,      setFloors]      = useState<Floor[]>(INIT_FLOORS);
  const [floorData,   setFloorData]   = useState<Record<string, FloorData>>(INIT_DATA);
  const [currentId,   setCurrentId]   = useState(INIT_FLOORS[0]?.id ?? "fl1");
  const [selected,    setSelected]    = useState<Seat | null>(null);
  const [selectedItem,setSelectedItem]= useState<FItem | null>(null);
  const [editModal,   setEditModal]   = useState<Seat | null>(null);
  const [zoneModal,   setZoneModal]   = useState<Zone | null | "new">(null);
  const [floorModal,  setFloorModal]  = useState<Floor | null | "new">(null);
  const [pendingKind, setPendingKind] = useState<PlaceKind | null>(null);
  const [zoom,        setZoom]        = useState(1);
  const [showLy,      setShowLy]      = useState(false);
  const [catOpen,     setCatOpen]     = useState<Record<string, boolean>>({ area:true, furniture:true, it:false, structure:false });
  const [layers,      setLayers]      = useState({
    vacant: true, occupied: true, maintenance: true, broken: true,
    names: true, ports: false, assets: true, items: true,
  });
  const [search,       setSearch]       = useState("");
  const [searchResult, setSearchResult] = useState<{ floorId: string; seatId: string } | null>(null);
  const [employees,    setEmployees]    = useState<{ id: string; full_name: string }[]>([]);
  const [assets,       setAssets]       = useState<{ id: string; asset_tag: string; brand: string; model_name: string; status?: string; assigned_to_name?: string | null }[]>([]);
  const [repairSet,    setRepairSet]    = useState<Set<string>>(new Set());
  const { confirm, ConfirmUI } = useConfirm();
  const [_loaded, _setLoaded] = useState(false);
  const [syncErr, setSyncErr] = useState(false);

  // ── Persistence ─────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const remote = await floorplanDB.getAll();
        if (remote) {
          setFloors(remote.floors as Floor[]);
          setFloorData(remote.data as Record<string, FloorData>);
          const c = localStorage.getItem("floorplan_current");
          setCurrentId(c && (remote.data as Record<string, FloorData>)[c] ? c : remote.floors[0]?.id ?? "fl1");
          try { localStorage.setItem("floorplan_data", JSON.stringify(remote.data)); } catch {}
        } else {
          setFloors(INIT_FLOORS); setFloorData(INIT_DATA); setCurrentId(INIT_FLOORS[0]?.id ?? "fl1");
          await floorplanDB.saveAll(INIT_FLOORS, INIT_DATA as Record<string, { zones: unknown[]; seats: unknown[] }>).catch(() => setSyncErr(true));
          try { localStorage.setItem("floorplan_data", JSON.stringify(INIT_DATA)); } catch {}
        }
      } catch {
        setSyncErr(true);
        try {
          const f = localStorage.getItem("floorplan_floors"); if (f) setFloors(JSON.parse(f));
          const d = localStorage.getItem("floorplan_data");   if (d) setFloorData(JSON.parse(d));
          const c = localStorage.getItem("floorplan_current");if (c) setCurrentId(c);
        } catch {}
      }
      try {
        const def = { vacant:true, occupied:true, maintenance:true, broken:true, names:true, ports:false, assets:true, items:true };
        const l = localStorage.getItem("floorplan_layers"); if (l) setLayers({ ...def, ...JSON.parse(l) });
      } catch {}
      _setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!_loaded) return;
    try {
      localStorage.setItem("floorplan_floors", JSON.stringify(floors));
      localStorage.setItem("floorplan_data",   JSON.stringify(floorData));
    } catch {}
    const t = setTimeout(() => {
      floorplanDB.saveAll(floors, floorData as Record<string, { zones: unknown[]; seats: unknown[] }>)
        .then(() => setSyncErr(false)).catch(() => setSyncErr(true));
    }, 1200);
    return () => clearTimeout(t);
  }, [floors, floorData, _loaded]);

  useEffect(() => { if (_loaded) { try { localStorage.setItem("floorplan_current", currentId); } catch {} } }, [currentId, _loaded]);
  useEffect(() => { if (_loaded) { try { localStorage.setItem("floorplan_layers", JSON.stringify(layers)); } catch {} } }, [layers, _loaded]);
  useEffect(() => {
    employeeDB.getAll().then(all => setEmployees(all.map(e => ({ id: e.id, full_name: e.full_name }))));
    assetDB.getAll().then(all => setAssets(all.map(a => ({ id: a.id, asset_tag: a.asset_tag, brand: a.brand, model_name: a.model_name, status: a.status, assigned_to_name: a.assigned_to_name }))));
    buildRepairSet().then(setRepairSet);
  }, []);

  const cur      = floorData[currentId] ?? { zones: [], seats: [], items: [] };
  const setCur   = (fn: (d: FloorData) => FloorData) =>
    setFloorData(p => ({ ...p, [currentId]: fn(p[currentId] ?? { zones: [], seats: [], items: [] }) }));
  const zones    = cur.zones;
  const seats    = cur.seats;
  const items    = cur.items ?? [];
  const setZones = (fn: (z: Zone[]) => Zone[]) => setCur(d => ({ ...d, zones: fn(d.zones) }));
  const setSeats = (fn: (s: Seat[]) => Seat[]) => setCur(d => ({ ...d, seats: fn(d.seats) }));
  const setItems = (fn: (i: FItem[]) => FItem[]) => setCur(d => ({ ...d, items: fn(d.items ?? []) }));

  function getAssignedTags(excludeSeatId?: string): Set<string> {
    const used = new Set<string>();
    Object.values(floorData).forEach(fd => {
      fd.seats.forEach(s => { if (s.id !== excludeSeatId) (s.asset_tags ?? []).forEach(t => used.add(t)); });
    });
    return used;
  }

  function doSearch(q: string) {
    if (!q.trim()) { setSearchResult(null); return; }
    const lq = q.toLowerCase();
    for (const [fid, fd] of Object.entries(floorData)) {
      for (const s of fd.seats) {
        const match = s.label.toLowerCase().includes(lq) || (s.employee ?? "").toLowerCase().includes(lq)
          || (s.asset_tags ?? []).some(t => t.toLowerCase().includes(lq)) || (s.rj45_port ?? "").toLowerCase().includes(lq);
        if (match) { setSearchResult({ floorId: fid, seatId: s.id }); setCurrentId(fid); setTimeout(() => setSelected(s), 50); return; }
      }
    }
    setSearchResult(null);
  }

  function duplicateSeat(seat: Seat) {
    const n: Seat = { ...seat, id: uid(), label: seat.label + "'", x: snap(seat.x + 120), y: snap(seat.y), asset_tags: [], employee: undefined };
    setSeats(p => [...p, n]); setSelected(n);
  }

  const dragRef   = useRef<DragOp | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);

  const allX = [...zones.map(z => z.x + z.w), ...seats.map(s => s.x + s.w), ...items.map(i => i.x + i.w)];
  const allY = [...zones.map(z => z.y + z.h), ...seats.map(s => s.y + s.h), ...items.map(i => i.y + i.h)];
  const canvasW = Math.max(640, ...allX) + 60;
  const canvasH = Math.max(380, ...allY) + 60;

  const onMouseMove = useCallback((e: MouseEvent) => {
    const d = dragRef.current; if (!d) return;
    const dx = (e.clientX - d.mx) / zoom, dy = (e.clientY - d.my) / zoom;
    if (d.kind === "move_seat")
      setSeats(p => p.map(s => s.id === d.id ? { ...s, x: snap(d.ox + dx), y: snap(d.oy + dy) } : s));
    else if (d.kind === "move_zone")
      setZones(p => p.map(z => z.id === d.id ? { ...z, x: snap(d.ox + dx), y: snap(d.oy + dy) } : z));
    else if (d.kind === "move_item")
      setItems(p => p.map(i => i.id === d.id ? { ...i, x: snap(d.ox + dx), y: snap(d.oy + dy) } : i));
    else if (d.kind === "resize_zone")
      setZones(p => p.map(z => {
        if (z.id !== d.id) return z;
        let { x, y, w, h } = { x: d.ox, y: d.oy, w: d.ow, h: d.oh }; const eg = d.edge;
        if (eg.includes("e")) w = snap(Math.max(80, d.ow + dx));
        if (eg.includes("s")) h = snap(Math.max(60, d.oh + dy));
        if (eg.includes("w")) { const nw = snap(Math.max(80, d.ow - dx)); x = snap(d.ox + d.ow - nw); w = nw; }
        if (eg.includes("n")) { const nh = snap(Math.max(60, d.oh - dy)); y = snap(d.oy + d.oh - nh); h = nh; }
        return { ...z, x, y, w, h };
      }))
    else if (d.kind === "resize_item")
      setItems(p => p.map(i => {
        if (i.id !== d.id) return i;
        let { x, y, w, h } = { x: d.ox, y: d.oy, w: d.ow, h: d.oh }; const eg = d.edge;
        if (eg.includes("e")) w = snap(Math.max(20, d.ow + dx));
        if (eg.includes("s")) h = snap(Math.max(10, d.oh + dy));
        if (eg.includes("w")) { const nw = snap(Math.max(20, d.ow - dx)); x = snap(d.ox + d.ow - nw); w = nw; }
        if (eg.includes("n")) { const nh = snap(Math.max(10, d.oh - dy)); y = snap(d.oy + d.oh - nh); h = nh; }
        return { ...i, x, y, w, h };
      }));
  }, [zoom, currentId]);

  const onMouseUp = useCallback(() => { dragRef.current = null; }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [onMouseMove, onMouseUp]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === "v" || e.key === "V") { setPendingKind(null); return; }
        if (e.key === "Escape") { setPendingKind(null); setSelected(null); setSelectedItem(null); return; }
      }
      const hasSel = selected || selectedItem;
      if (!hasSel) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selected) {
          confirm({ title: `ลบโต๊ะ ${selected.label}?`, confirmLabel: "ลบ", danger: true })
            .then(ok => { if (ok) { setSeats(p => p.filter(s => s.id !== selected.id)); setSelected(null); } });
        } else if (selectedItem) {
          confirm({ title: `ลบ ${selectedItem.label}?`, confirmLabel: "ลบ", danger: true })
            .then(ok => { if (ok) { setItems(p => p.filter(i => i.id !== selectedItem.id)); setSelectedItem(null); } });
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && selected) { e.preventDefault(); duplicateSeat(selected); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, selectedItem]);

  function startMoveSeat(e: React.MouseEvent, s: Seat) {
    if (pendingKind) return; e.stopPropagation();
    dragRef.current = { kind: "move_seat", id: s.id, ox: s.x, oy: s.y, mx: e.clientX, my: e.clientY };
  }
  function startMoveZone(e: React.MouseEvent, z: Zone) {
    if (pendingKind) return; e.stopPropagation();
    dragRef.current = { kind: "move_zone", id: z.id, ox: z.x, oy: z.y, mx: e.clientX, my: e.clientY };
  }
  function startMoveItem(e: React.MouseEvent, it: FItem) {
    if (pendingKind) return; e.stopPropagation();
    dragRef.current = { kind: "move_item", id: it.id, ox: it.x, oy: it.y, mx: e.clientX, my: e.clientY };
  }
  function startResizeZone(e: React.MouseEvent, z: Zone, edge: ResizeEdge) {
    e.stopPropagation(); e.preventDefault();
    dragRef.current = { kind: "resize_zone", id: z.id, edge, ox: z.x, oy: z.y, ow: z.w, oh: z.h, mx: e.clientX, my: e.clientY };
  }
  function startResizeItem(e: React.MouseEvent, it: FItem, edge: ResizeEdge) {
    e.stopPropagation(); e.preventDefault();
    dragRef.current = { kind: "resize_item", id: it.id, edge, ox: it.x, oy: it.y, ow: it.w, oh: it.h, mx: e.clientX, my: e.clientY };
  }

  function handleCanvasClick(e: React.MouseEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = snap((e.clientX - rect.left) / zoom - 40), cy = snap((e.clientY - rect.top) / zoom - 30);
    if (!pendingKind) { setSelected(null); setSelectedItem(null); setShowLy(false); return; }
    if (pendingKind === "desk") {
      const s: Seat = { id: uid(), label: `S-${(seats.length + 1).toString().padStart(2, "0")}`, x: cx, y: cy, w: 104, h: 104, status: "vacant", asset_tags: [] };
      setSeats(p => [...p, s]); setPendingKind(null); setSelected(s);
    } else if (pendingKind === "zone") {
      const z: Zone = { id: uid(), label: isTh ? `โซน ${zones.length + 1}` : `Zone ${zones.length + 1}`, x: snap(cx - 75), y: snap(cy - 50), w: 200, h: 200, color: ZONE_COLORS[zones.length % ZONE_COLORS.length] };
      setZones(p => [...p, z]); setPendingKind(null); setZoneModal(z);
    } else {
      const entry = CATALOG.find(c => c.kind === pendingKind)!;
      const it: FItem = { id: uid(), kind: pendingKind as ItemKind, label: isTh ? entry.label : entry.labelEn, x: snap(cx - entry.defW / 2), y: snap(cy - entry.defH / 2), w: entry.defW, h: entry.defH, rotation: 0, color: entry.color };
      setItems(p => [...p, it]); setPendingKind(null); setSelectedItem(it);
    }
  }

  const stats = {
    vacant:      seats.filter(s => s.status === "vacant").length,
    occupied:    seats.filter(s => s.status === "occupied").length,
    maintenance: seats.filter(s => s.status === "maintenance").length,
    broken:      seats.filter(s => s.status === "broken").length,
  };

  function rotateItem(deg: number) {
    if (!selectedItem) return;
    const newRot = ((selectedItem.rotation + deg) % 360 + 360) % 360;
    const updated = { ...selectedItem, rotation: newRot };
    setItems(p => p.map(i => i.id === selectedItem.id ? updated : i));
    setSelectedItem(updated);
  }

  function fitToScreen() {
    const el = wrapRef.current; if (!el) return;
    const fit = Math.min((el.clientWidth - 48) / canvasW, (el.clientHeight - 48) / canvasH, 1.5);
    setZoom(Math.max(0.3, +fit.toFixed(2)));
  }
  useEffect(() => { if (_loaded) fitToScreen(); }, [currentId, _loaded]);

  function addFloor() {
    const id = uid(); const newLabel = isTh ? `พื้นที่ ${floors.length + 1}` : `Area ${floors.length + 1}`;
    setFloors(p => [...p, { id, label: newLabel }]);
    setFloorData(p => ({ ...p, [id]: { zones: [], seats: [], items: [] } }));
    setCurrentId(id); setFloorModal({ id, label: newLabel });
  }

  function handlePrint() {
    const fl = floors.find(f => f.id === currentId);
    const padX = 40, padY = 50;
    const cW = Math.max(400, ...zones.map(z => z.x + z.w), ...seats.map(s => s.x + s.w)) + padX;
    const cH = Math.max(300, ...zones.map(z => z.y + z.h), ...seats.map(s => s.y + s.h)) + padY;
    const PX = 3.78, PORT_W = Math.round(170 * PX), PORT_H = Math.round(257 * PX), LAND_W = Math.round(257 * PX), LAND_H = Math.round(170 * PX);
    const scaleP = Math.min(PORT_W / cW, PORT_H / cH), scaleL = Math.min(LAND_W / cW, LAND_H / cH);
    const landscape = scaleL > scaleP, scale = landscape ? scaleL : scaleP;
    const SL_P: Record<SeatStatus, string> = { vacant:"ว่าง", occupied:"มีคนใช้", maintenance:"ซ่อมบำรุง", broken:"ชำรุด" };
    const zonesHtml = zones.map(z => `<div style="position:absolute;left:${z.x}px;top:${z.y}px;width:${z.w}px;height:${z.h}px;background:${z.color}cc;border:1.5px solid ${ZONE_BORDER[z.color]??"#94a3b8"};border-radius:10px;box-sizing:border-box;"><div style="display:inline-flex;align-items:center;margin:5px 0 0 5px;padding:2px 8px;background:rgba(255,255,255,0.8);border-radius:5px;font-size:10px;font-weight:700;color:#475569;">${z.label}</div></div>`).join("");
    const seatsHtml = seats.map(seat => {
      const tags = seat.asset_tags ?? [];
      const assetRows = tags.slice(0, 3).map(t => `<div style="display:flex;align-items:center;gap:3px;font-size:8px;"><span>${categoryIcon(t)}</span><span style="font-family:monospace;background:#eef2ff;color:#4338ca;padding:0 3px;border-radius:3px;">${t}</span></div>`).join("");
      return `<div style="position:absolute;left:${seat.x}px;top:${seat.y}px;width:104px;height:104px;background:#fff;border:1.5px solid ${SB[seat.status]};border-left:4px solid ${SA[seat.status]};border-radius:10px;overflow:hidden;display:flex;flex-direction:column;"><div style="padding:4px 6px 3px;display:flex;align-items:center;gap:4px;flex-shrink:0;border-bottom:1px solid #f1f5f9;"><div style="width:6px;height:6px;border-radius:50%;background:${SA[seat.status]};flex-shrink:0;"></div><span style="font-size:10px;font-weight:800;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">${seat.label}</span><span style="font-size:7px;color:#64748b;">${SL_P[seat.status]}</span></div><div style="padding:3px 6px 2px;font-size:9px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0;">${seat.employee ? "👤 " + seat.employee : "<span style='color:#9ca3af;font-style:italic;'>ไม่ระบุ</span>"}</div><div style="flex:1;padding:3px 6px;display:flex;flex-direction:column;gap:2px;overflow:hidden;">${assetRows}</div></div>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>ผังพื้นที่ — ${fl?.label??""}</title><style>*{margin:0;padding:0;box-sizing:border-box;}@page{size:A4 ${landscape?"landscape":"portrait"};margin:15mm;}body{font-family:'Sarabun','Noto Sans Thai',sans-serif;background:#fff;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body><div style="margin-bottom:12px;border-bottom:2px solid #e2e8f0;padding-bottom:8px;display:flex;justify-content:space-between;align-items:flex-end;"><div><div style="font-size:16px;font-weight:700;color:#0f172a;">ผังพื้นที่ — ${fl?.label??""}</div><div style="font-size:10px;color:#64748b;">พิมพ์เมื่อ: ${new Date().toLocaleDateString("th-TH",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})} · A4 ${landscape?"แนวนอน":"แนวตั้ง"}</div></div><div style="font-size:10px;color:#64748b;">โต๊ะทั้งหมด ${seats.length} ที่</div></div><div style="width:${cW}px;height:${cH}px;transform:scale(${scale.toFixed(4)});transform-origin:top left;background:#fff;border:1px solid #e2e8f0;border-radius:10px;position:relative;background-image:radial-gradient(circle,#e2e8f0 1px,transparent 1px);background-size:20px 20px;">${zonesHtml}${seatsHtml}</div></body></html>`;
    const win = window.open("","_blank","width=900,height=700");
    if (!win) { alert(isTh?"เบราว์เซอร์บล็อกป๊อปอัป":"Popup blocked"); return; }
    win.document.write(html); win.document.close();
    setTimeout(() => { try { win.focus(); win.print(); } catch {} }, 500);
  }

  const isSearchHit = (seatId: string) => searchResult?.floorId === currentId && searchResult?.seatId === seatId;

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {ConfirmUI}

      {/* ── Floor Tab Bar ── */}
      <div className="flex items-end gap-0.5 px-3 pt-2 border-b border-white/50 z-20 flex-shrink-0" style={GP}>
        <div className="flex items-end gap-0.5 flex-1 overflow-x-auto pb-0 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth:"none" }}>
          {floors.map(fl => (
            <div key={fl.id} className="group flex items-center flex-shrink-0">
              <button onClick={() => { setCurrentId(fl.id); setSelected(null); setSelectedItem(null); setSearchResult(null); setSearch(""); }}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-t-xl border-t border-x transition-all ${currentId === fl.id ? "bg-white/80 border-white/70 text-indigo-700 -mb-px z-10 shadow-sm" : "bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/30"}`}>
                <Square size={10} className="opacity-50" />{fl.label}
              </button>
              {currentId === fl.id && (
                <button onClick={() => setFloorModal(fl)} className="opacity-0 group-hover:opacity-100 transition-opacity px-1 pb-0.5 text-slate-400 hover:text-indigo-600" title={isTh?"แก้ไขพื้นที่":"Edit area"}>
                  <Pencil size={9} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addFloor} className="flex items-center gap-1 px-3 py-2 mb-0 text-xs text-indigo-600 hover:bg-indigo-50/50 rounded-t-xl transition-colors font-medium flex-shrink-0">
          <Plus size={12} /> {isTh?"เพิ่มพื้นที่":"Add Area"}
        </button>
        <div className="flex items-center gap-1.5 pb-2 pl-3 flex-shrink-0">
          {syncErr ? (
            <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50/80 border border-amber-200/80 rounded-full px-2 py-0.5 font-medium"><CloudOff size={10} />{isTh?"ซิงก์ไม่สำเร็จ":"Sync failed"}</span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-emerald-500 opacity-70"><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />{isTh?"ซิงก์แล้ว":"Synced"}</span>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/40 z-10 flex-shrink-0" style={{ ...GP, background:"rgba(255,255,255,0.50)" }}>
        <div className="flex items-center gap-0.5 bg-black/5 rounded-xl p-0.5">
          <TBtn icon={<MousePointer2 size={15} />} label={isTh?"เลือก/ย้าย  [Esc]":"Select/Move  [Esc]"} active={!pendingKind} onClick={() => setPendingKind(null)} />
        </div>
        {pendingKind && (
          <span className="flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-3 py-1 rounded-full text-xs font-medium">
            {CATALOG.find(c => c.kind === pendingKind)?.emoji}{" "}
            {isTh ? CATALOG.find(c => c.kind === pendingKind)?.label : CATALOG.find(c => c.kind === pendingKind)?.labelEn}
            {" "}{isTh?"→ คลิก canvas":"→ click canvas"}
            <button onClick={() => setPendingKind(null)}><X size={11} /></button>
          </span>
        )}
        <div className="flex-1" />
        {/* Layers */}
        <div className="relative">
          <button onClick={() => setShowLy(!showLy)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all ${showLy?"bg-indigo-50 border-indigo-300/80 text-indigo-700":"border-white/60 bg-white/40 text-slate-600 hover:bg-white/70"}`}>
            <Layers size={13} />{isTh?"เลเยอร์":"Layers"}<ChevronDown size={11} className={`transition-transform ${showLy?"rotate-180":""}`} />
          </button>
          {showLy && (
            <div className="absolute right-0 top-full mt-1 rounded-2xl shadow-xl p-3 z-50 w-48 space-y-2 border border-white/60" style={GP}>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{isTh?"แสดง / ซ่อน":"Visibility"}</p>
              {(Object.entries(layers) as [keyof typeof layers, boolean][]).map(([k, v]) => (
                <label key={String(k)} className="flex items-center justify-between cursor-pointer text-slate-700">
                  <div className="flex items-center gap-2">
                    {(k==="vacant"||k==="occupied"||k==="maintenance"||k==="broken") && <div className="w-2 h-2 rounded-full" style={{ background: SA[k as SeatStatus] }} />}
                    {(k==="names"||k==="ports"||k==="assets"||k==="items") && <div className="w-2 h-2 rounded bg-slate-300" />}
                    <span className="text-xs">
                      {k==="vacant"&&(isTh?"ว่าง":"Vacant")}{k==="occupied"&&(isTh?"มีคนใช้":"Occupied")}
                      {k==="maintenance"&&(isTh?"ซ่อมบำรุง":"Maintenance")}{k==="broken"&&(isTh?"ชำรุด":"Broken")}
                      {k==="names"&&(isTh?"ชื่อพนักงาน":"Names")}{k==="ports"&&"RJ45 Ports"}
                      {k==="assets"&&(isTh?"ทรัพย์สิน":"Assets")}{k==="items"&&(isTh?"วัตถุ":"Objects")}
                    </span>
                  </div>
                  <button onClick={() => setLayers(l => ({ ...l, [k]: !l[k] }))} className={`transition-colors ${v?"text-indigo-600":"text-slate-300"}`}>
                    {v ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 border border-white/60 bg-white/40 rounded-xl overflow-hidden">
          <button onClick={() => setZoom(z => Math.max(0.3, +(z-0.1).toFixed(1)))} className="px-2 py-1.5 hover:bg-white/70 text-slate-500 transition-colors"><ZoomOut size={13} /></button>
          <span className="w-12 text-center text-xs tabular-nums text-slate-700 font-medium">{Math.round(zoom*100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, +(z+0.1).toFixed(1)))} className="px-2 py-1.5 hover:bg-white/70 text-slate-500 transition-colors"><ZoomIn size={13} /></button>
        </div>
        <button onClick={fitToScreen} title={isTh?"พอดีจอ":"Fit to screen"} className="flex items-center justify-center w-8 h-8 border border-white/60 bg-white/40 text-slate-500 hover:bg-white/70 rounded-xl transition-colors"><Maximize2 size={13} /></button>
        <button onClick={() => setZoom(1)} className="text-xs px-2.5 py-1.5 border border-white/60 bg-white/40 text-slate-600 hover:bg-white/70 rounded-xl transition-colors font-medium">100%</button>
        <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white/40 border border-white/60 text-slate-600 hover:bg-white/70 rounded-xl transition-colors font-medium"><Printer size={13} />{isTh?"พิมพ์":"Print"}</button>
      </div>

      {/* ── Main: Catalog + Canvas + Inspector ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Object Catalog ── */}
        <div className="w-52 flex flex-col flex-shrink-0 border-r border-white/50 text-xs overflow-hidden" style={{ ...GP, background:"rgba(255,255,255,0.55)" }}>
          {/* Search */}
          <div className="px-3 py-2 border-b border-white/40 flex-shrink-0">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==="Enter"&&doSearch(search)}
                placeholder={isTh?"ค้นหาโต๊ะ / พนักงาน…":"Search…"}
                className="w-full pl-7 pr-7 py-1.5 text-[11px] rounded-xl border border-white/50 bg-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 placeholder:text-slate-400" />
              {search && <button onClick={() => { setSearch(""); setSearchResult(null); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={11} /></button>}
            </div>
            {search && <button onClick={() => doSearch(search)} className="mt-1 w-full text-[11px] bg-indigo-500/10 text-indigo-700 rounded-lg py-1 hover:bg-indigo-500/20 font-medium">{isTh?"ค้นหา":"Search"}</button>}
            {search && searchResult===null && <p className="text-[10px] text-red-500 mt-1">{isTh?"ไม่พบผลลัพธ์":"Not found"}</p>}
            {search && searchResult && <p className="text-[10px] text-emerald-600 mt-1 font-medium">✓ {floors.find(f=>f.id===searchResult.floorId)?.label} · {floorData[searchResult.floorId]?.seats.find(s=>s.id===searchResult.seatId)?.label}</p>}
          </div>

          {/* Catalog sections */}
          <div className="flex-1 overflow-y-auto">
            {CAT_ORDER.map(cat => {
              const entries = CATALOG.filter(c => c.cat === cat);
              const isOpen = catOpen[cat];
              return (
                <div key={cat} className="border-b border-white/30">
                  <button onClick={() => setCatOpen(p => ({ ...p, [cat]: !p[cat] }))}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/40 transition-colors">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {isTh ? CAT_LABELS[cat].th : CAT_LABELS[cat].en}
                    </span>
                    <ChevronRight size={11} className={`text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-2 pb-2 grid grid-cols-2 gap-1.5">
                      {entries.map(entry => {
                        const isActive = pendingKind === entry.kind;
                        return (
                          <button key={entry.kind} onClick={() => setPendingKind(entry.kind)}
                            title={isTh ? entry.label : entry.labelEn}
                            className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition-all text-center ${
                              isActive
                                ? "border-indigo-400 bg-indigo-50 shadow-sm scale-105"
                                : "border-white/60 bg-white/50 hover:border-indigo-200 hover:bg-white/80 hover:scale-105"
                            }`}
                          >
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                              style={{ background: entry.color === "#1e293b" ? "#1e293b" : entry.color, border: `1.5px solid ${entry.color === "#1e293b" ? "#475569" : "#e2e8f0"}` }}>
                              <span style={{ fontSize: 18 }}>{entry.emoji}</span>
                            </div>
                            <span className={`text-[9.5px] leading-tight font-medium ${isActive ? "text-indigo-700" : "text-slate-600"}`}>
                              {isTh ? entry.label : entry.labelEn}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Stats summary */}
            <div className="px-3 py-3">
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{isTh?"สรุป":"Summary"}</p>
              <div className="space-y-1.5">
                {(Object.keys(stats) as SeatStatus[]).map(k => (
                  <div key={k} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SA[k] }} />
                    <span className="text-slate-600 flex-1 text-[11px]">{SL[k][isTh?"th":"en"]}</span>
                    <span className="font-semibold text-slate-700 text-[11px] w-5 text-right">{stats[k]}</span>
                  </div>
                ))}
                {seats.length > 0 && (
                  <div className="pt-1.5 border-t border-white/50 flex justify-between text-[10px] text-slate-400">
                    <span>{isTh?"รวม":"Total"}</span>
                    <span className="font-semibold text-slate-600">{seats.length} {isTh?"ที่นั่ง":"desks"} · {items.length} {isTh?"วัตถุ":"obj"}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Keyboard hints */}
            <div className="px-3 pb-3">
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{isTh?"ทางลัด":"Shortcuts"}</p>
              <div className="text-[9.5px] text-slate-400 space-y-0.5">
                <div className="flex items-center gap-1"><Kbd>Esc</Kbd><span>Select</span><Kbd>⌘D</Kbd><span>Dup</span></div>
                <div className="flex items-center gap-1"><Kbd>Del</Kbd><span>{isTh?"ลบที่เลือก":"Delete sel."}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Canvas ── */}
        <div ref={wrapRef} className="flex-1 overflow-auto relative"
          style={{ background:"linear-gradient(135deg,rgba(241,245,249,0.85) 0%,rgba(238,242,255,0.85) 100%)" }}
          onClick={() => setShowLy(false)}>
          <div className="absolute bottom-4 left-4 z-10 text-[9px] text-slate-400/70 pointer-events-none select-none font-mono">{canvasW} × {canvasH}</div>
          <div style={{ width: canvasW * zoom, height: canvasH * zoom, position:"relative", padding:24 }}>
            <div ref={canvasRef} onClick={handleCanvasClick}
              style={{
                position:"absolute", top:0, left:0, width:canvasW, height:canvasH,
                background:"#ffffff", border:"1px solid rgba(226,232,240,0.9)", borderRadius:16,
                boxShadow:"0 4px 32px rgba(15,23,42,0.06), 0 0 0 1px rgba(255,255,255,0.6)",
                transform:`scale(${zoom})`, transformOrigin:"top left",
                cursor: pendingKind ? "crosshair" : "default",
                backgroundImage:"radial-gradient(circle, rgba(148,163,184,0.30) 1px, transparent 1px)",
                backgroundSize:"20px 20px",
              }}>

              {/* Zones */}
              {zones.map(zone => {
                const bc = ZONE_BORDER[zone.color] ?? "#94a3b8";
                return (
                  <div key={zone.id} style={{ position:"absolute", left:zone.x, top:zone.y, width:zone.w, height:zone.h, backgroundColor:zone.color+"cc", border:`1.5px solid ${bc}`, borderRadius:12, boxSizing:"border-box" }}>
                    <div onMouseDown={e => startMoveZone(e, zone)} onDoubleClick={e => { e.stopPropagation(); setZoneModal(zone); }}
                      style={{ display:"inline-flex", alignItems:"center", gap:4, margin:"6px 0 0 6px", padding:"3px 8px", background:"rgba(255,255,255,0.80)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", borderRadius:6, border:`1px solid ${bc}66`, fontSize:10, fontWeight:700, color:"#475569", cursor:"move", userSelect:"none" }}>
                      <Square size={8} style={{ color:bc, opacity:0.8 }} />{zone.label}
                    </div>
                    {(["nw","ne","sw","se","n","s","e","w"] as ResizeEdge[]).map(edge => (
                      <RHandle key={edge} edge={edge} color={bc} onMouseDown={e => startResizeZone(e, zone, edge)} />
                    ))}
                  </div>
                );
              })}

              {/* FItems */}
              {layers.items && items.map(item => {
                const isSel = selectedItem?.id === item.id;
                return (
                  <FItemShape key={item.id} item={item} selected={isSel}
                    onMouseDown={e => startMoveItem(e, item)}
                    onClick={e => { if (!pendingKind) { e.stopPropagation(); setSelected(null); setSelectedItem(item); } }}
                    onResizeStart={(e, edge) => startResizeItem(e, item, edge)}
                  />
                );
              })}

              {/* Seats */}
              {seats.filter(s => layers[s.status]).map(seat => {
                const tags  = seat.asset_tags ?? [];
                const isHit = isSearchHit(seat.id);
                const isSel = selected?.id === seat.id;
                const accent = isHit ? "#f59e0b" : isSel ? "#6366f1" : SA[seat.status];
                const border = isHit ? "#f59e0b" : isSel ? "#6366f1" : SB[seat.status];
                return (
                  <div key={seat.id}
                    onMouseDown={e => startMoveSeat(e, seat)}
                    onClick={e => { if (!pendingKind) { e.stopPropagation(); setSelectedItem(null); setSelected(seat); } }}
                    style={{
                      position:"absolute", left:seat.x, top:seat.y, width:104, height:104,
                      backgroundColor:"#fff", border:`1.5px solid ${border}`, borderLeft:`4px solid ${accent}`,
                      borderRadius:10, outline:isHit?"3px solid rgba(245,158,11,0.22)":isSel?"3px solid rgba(99,102,241,0.22)":"none",
                      boxShadow:isSel?"0 0 0 1px rgba(99,102,241,0.18), 0 4px 16px rgba(99,102,241,0.14)":"0 1px 6px rgba(15,23,42,0.07)",
                      cursor:pendingKind?"crosshair":"grab", zIndex:isSel?8:5, userSelect:"none",
                      overflow:"hidden", display:"flex", flexDirection:"column", transition:"box-shadow 0.12s",
                    }}>
                    <div style={{ padding:"5px 6px 3px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:4, minWidth:0 }}>
                        <div style={{ width:6, height:6, borderRadius:"50%", background:SA[seat.status], flexShrink:0 }} />
                        <span style={{ fontSize:10, fontWeight:800, color:"#0f172a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{seat.label}</span>
                      </div>
                      {layers.ports && seat.rj45_port && <span style={{ fontSize:7, fontFamily:"monospace", color:"#64748b", background:"#f1f5f9", padding:"1px 3px", borderRadius:3, flexShrink:0 }}>{seat.rj45_port}</span>}
                    </div>
                    <div style={{ height:1, background:SB[seat.status], marginLeft:6, marginRight:6, opacity:0.5 }} />
                    <div style={{ padding:"3px 6px 2px", display:"flex", alignItems:"center", gap:3, flexShrink:0 }}>
                      {seat.employee ? (
                        <><span style={{ fontSize:8, opacity:0.6, flexShrink:0 }}>👤</span><span style={{ fontSize:9, color:"#374151", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{layers.names?seat.employee:"···"}</span></>
                      ) : <span style={{ fontSize:9, color:"#94a3b8", fontStyle:"italic" }}>{isTh?"ไม่ระบุ":"—"}</span>}
                    </div>
                    <div style={{ flex:1, padding:"2px 6px", display:"flex", flexDirection:"column", gap:2, overflow:"hidden" }}>
                      {layers.assets && tags.length > 0 && (
                        <>{tags.slice(0,3).map(t => {
                          const hr = repairSet.has(t);
                          return (<div key={t} style={{ display:"flex", alignItems:"center", gap:3 }}>
                            <span style={{ fontSize:10, lineHeight:1, flexShrink:0 }}>{categoryIcon(t, assets)}</span>
                            <span style={{ fontSize:8, fontFamily:"monospace", borderRadius:3, color:hr?"#dc2626":"#4338ca", background:hr?"#fef2f2":"#eef2ff", padding:"0 3px", lineHeight:"14px", maxWidth:52, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight:hr?700:400, flexShrink:1 }}>{t}</span>
                            {hr && <span style={{ fontSize:8, flexShrink:0 }}>🔧</span>}
                          </div>);
                        })}
                        {tags.length > 3 && <span style={{ fontSize:8, color:"#6366f1", fontWeight:700 }}>+{tags.length-3}</span>}</>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right: Inspector ── */}
        <div className="w-64 flex-shrink-0 border-l border-white/50 flex flex-col overflow-hidden" style={{ ...GP, background:"rgba(255,255,255,0.58)" }}>
          {selected ? (
            <>
              <div className="px-4 py-3 border-b border-white/40 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background:SA[selected.status] }} />
                  <span className="font-bold text-sm text-slate-900 truncate">{selected.label}</span>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 flex-shrink-0 ml-2"><X size={15} /></button>
              </div>
              <div className="px-3 py-2.5 border-b border-white/40 flex gap-2 flex-shrink-0">
                <button onClick={() => setEditModal({ ...selected })} className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl py-1.5 text-xs font-medium transition-colors"><Pencil size={11} />{isTh?"แก้ไข":"Edit"}</button>
                <button onClick={() => duplicateSeat(selected)} title={isTh?"ทำซ้ำ (⌘D)":"Duplicate (⌘D)"} className="flex items-center justify-center w-8 h-8 bg-white/70 border border-slate-200/80 text-slate-600 hover:bg-white rounded-xl transition-colors"><Copy size={12} /></button>
                <button onClick={async () => { const ok = await confirm({ title:isTh?`ลบโต๊ะ ${selected.label}?`:`Delete ${selected.label}?`, confirmLabel:isTh?"ลบ":"Delete", danger:true }); if (ok) { setSeats(p => p.filter(s => s.id!==selected.id)); setSelected(null); } }} className="flex items-center justify-center w-8 h-8 border border-red-200/80 text-red-500 hover:bg-red-50/80 rounded-xl transition-colors"><Trash2 size={12} /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                <div>
                  <PropLabel>{isTh?"สถานะ":"Status"}</PropLabel>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["vacant","occupied","maintenance","broken"] as SeatStatus[]).map(st => (
                      <button key={st} onClick={() => { const u={...selected,status:st}; setSeats(p=>p.map(s=>s.id===selected.id?u:s)); setSelected(u); }}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-[10px] font-semibold transition-all ${selected.status===st?"shadow-sm":"border-slate-200/70 text-slate-400 hover:border-slate-300 bg-white/40"}`}
                        style={selected.status===st?{color:SA[st],background:SC[st],borderColor:SB[st]}:{}}>
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:selected.status===st?SA[st]:"#cbd5e1" }} />{SL[st][isTh?"th":"en"]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <PropLabel>{isTh?"ตำแหน่ง":"Position"}</PropLabel>
                  <div className="grid grid-cols-2 gap-1.5">
                    <PropVal label="X" value={String(selected.x)} mono /><PropVal label="Y" value={String(selected.y)} mono />
                  </div>
                </div>
                <div>
                  <PropLabel>{isTh?"พนักงาน":"Employee"}</PropLabel>
                  {selected.employee ? <p className="text-xs text-slate-700 flex items-center gap-1.5"><span className="opacity-60">👤</span>{selected.employee}</p>
                    : <p className="text-xs text-slate-400 italic">{isTh?"ยังไม่กำหนด":"Not assigned"}</p>}
                </div>
                <div>
                  <PropLabel>{isTh?"ทรัพย์สิน":"Assets"} <span className="text-slate-300 font-normal ml-1">({(selected.asset_tags??[]).length})</span></PropLabel>
                  {(selected.asset_tags??[]).length===0 ? <p className="text-xs text-slate-400 italic">{isTh?"ยังไม่มี":"None"}</p> : (
                    <div className="space-y-1.5">
                      {(selected.asset_tags??[]).map(t => {
                        const ai = assets.find(a=>a.asset_tag===t); const owner=ai?.assigned_to_name; const diff=owner&&owner!==selected.employee;
                        return (<div key={t} className="rounded-xl border border-indigo-100/80 bg-indigo-50/60 px-2.5 py-2">
                          <div className="flex items-center gap-2"><span className="text-sm">{categoryIcon(t,assets)}</span><span className="font-mono text-indigo-700 text-[11px] flex-1 truncate">{t}</span>
                            <a href={`/tickets/new?asset_tag=${encodeURIComponent(t)}&desk=${encodeURIComponent(selected.label)}`} className="text-[9px] bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-md px-1.5 py-0.5">🔧</a>
                          </div>
                          {owner && <p className="mt-0.5 text-[10px]"><span className="text-slate-400">{isTh?"ผู้ครอบครอง: ":"Owner: "}</span><span className={diff?"text-amber-600 font-medium":"text-slate-600"}>{owner}{diff?" ⚠️":""}</span></p>}
                        </div>);
                      })}
                    </div>
                  )}
                </div>
                {selected.rj45_port && <div><PropLabel>RJ45</PropLabel><p className="font-mono text-xs text-slate-700">{selected.rj45_port}</p></div>}
              </div>
            </>
          ) : selectedItem ? (
            <>
              <div className="px-4 py-3 border-b border-white/40 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{CATALOG.find(c=>c.kind===selectedItem.kind)?.emoji}</span>
                  <span className="font-bold text-sm text-slate-900 truncate">{selectedItem.label}</span>
                </div>
                <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-700 flex-shrink-0 ml-2"><X size={15} /></button>
              </div>
              <div className="px-3 py-2.5 border-b border-white/40 flex gap-2 flex-shrink-0">
                <button onClick={async () => { const ok=await confirm({ title:isTh?`ลบ ${selectedItem.label}?`:`Delete ${selectedItem.label}?`, confirmLabel:isTh?"ลบ":"Delete", danger:true }); if (ok) { setItems(p=>p.filter(i=>i.id!==selectedItem.id)); setSelectedItem(null); } }} className="flex items-center gap-1.5 border border-red-200/80 text-red-500 hover:bg-red-50/80 rounded-xl px-3 py-1.5 text-xs transition-colors"><Trash2 size={12} />{isTh?"ลบ":"Delete"}</button>
                <div className="flex-1" />
                <button onClick={() => rotateItem(-90)} title={isTh?"หมุนซ้าย 90°":"Rotate CCW"} className="flex items-center justify-center w-8 h-8 border border-white/60 bg-white/40 text-slate-600 hover:bg-white/70 rounded-xl transition-colors"><RotateCcw size={13} /></button>
                <button onClick={() => rotateItem(90)} title={isTh?"หมุนขวา 90°":"Rotate CW"} className="flex items-center justify-center w-8 h-8 border border-white/60 bg-white/40 text-slate-600 hover:bg-white/70 rounded-xl transition-colors"><RotateCw size={13} /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                <div><PropLabel>{isTh?"ประเภท":"Type"}</PropLabel><p className="text-xs text-slate-700">{isTh?CATALOG.find(c=>c.kind===selectedItem.kind)?.label:CATALOG.find(c=>c.kind===selectedItem.kind)?.labelEn}</p></div>
                <div><PropLabel>{isTh?"ตำแหน่ง":"Position"}</PropLabel>
                  <div className="grid grid-cols-2 gap-1.5"><PropVal label="X" value={String(selectedItem.x)} mono /><PropVal label="Y" value={String(selectedItem.y)} mono /></div>
                </div>
                <div><PropLabel>{isTh?"ขนาด":"Size"}</PropLabel>
                  <div className="grid grid-cols-2 gap-1.5"><PropVal label="W" value={String(selectedItem.w)} mono /><PropVal label="H" value={String(selectedItem.h)} mono /></div>
                </div>
                <div><PropLabel>{isTh?"การหมุน":"Rotation"}</PropLabel>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {[0,90,180,270].map(deg => (
                        <button key={deg} onClick={() => { const u={...selectedItem,rotation:deg}; setItems(p=>p.map(i=>i.id===selectedItem.id?u:i)); setSelectedItem(u); }}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${selectedItem.rotation===deg?"bg-indigo-600 text-white border-indigo-600":"bg-white/50 border-slate-200 text-slate-600 hover:border-indigo-300"}`}>
                          {deg}°
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div><PropLabel>{isTh?"ชื่อ":"Label"}</PropLabel>
                  <input defaultValue={selectedItem.label}
                    onBlur={e => { const u={...selectedItem,label:e.target.value}; setItems(p=>p.map(i=>i.id===selectedItem.id?u:i)); setSelectedItem(u); }}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 bg-white/70" />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/70 border border-white/70 flex items-center justify-center shadow-sm"><MousePointer2 size={20} className="text-slate-300" /></div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">{isTh?"เลือกวัตถุจากแคตตาล็อก":"Select from catalog"}</p>
                <p className="text-[10px] text-slate-400 leading-relaxed">{isTh?"คลิกวัตถุในแผงซ้าย แล้วคลิก canvas เพื่อวาง":"Click an object in the left panel, then click the canvas to place it"}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {editModal && (
        <SeatModal seat={editModal} isTh={isTh} employees={employees} assets={assets} assignedTags={getAssignedTags(editModal.id)}
          onSave={s => {
            const floorLabel = floors.find(f => f.id===currentId)?.label ?? "";
            const hasEmployee = !!(s.employee);
            const oldTags = editModal.asset_tags ?? [], newTags = s.asset_tags ?? [];
            assetDB.getAll().then(allA => {
              oldTags.filter((t: string) => !newTags.includes(t)).forEach((t: string) => { const a=allA.find((x: any)=>x.asset_tag===t); if (a) assetDB.update(a.id,{seat_id:null,seat_label:null,room_name:null,status:a.status==="in_use"?"idle":a.status}); });
              newTags.forEach((t: string) => { const a=allA.find(x=>x.asset_tag===t); if (a) { const ns=(a.status==="idle"||a.status==="in_use")?(hasEmployee?"in_use":"idle"):a.status; assetDB.update(a.id,{seat_id:s.id,seat_label:s.label,room_name:floorLabel,status:ns}); } });
              window.dispatchEvent(new Event("itam_assets_updated"));
              setSeats(p => p.map(x => x.id===s.id ? s : x)); setSelected(s); setEditModal(null);
            });
          }}
          onClose={() => setEditModal(null)} />
      )}
      {zoneModal && (
        <ZoneModal zone={zoneModal==="new"?null:zoneModal} isTh={isTh}
          onSave={z => { if (zones.find(x=>x.id===z.id)) setZones(p=>p.map(x=>x.id===z.id?z:x)); else setZones(p=>[...p,z]); setZoneModal(null); }}
          onDelete={id => { setZones(p=>p.filter(z=>z.id!==id)); setZoneModal(null); }}
          onClose={() => setZoneModal(null)} />
      )}
      {floorModal && (
        <FloorModal floor={floorModal==="new"?null:floorModal} isTh={isTh} canDelete={floors.length>1}
          onSave={f => { if (floors.find(x=>x.id===f.id)) setFloors(p=>p.map(x=>x.id===f.id?f:x)); else setFloors(p=>[...p,f]); setFloorModal(null); }}
          onDelete={id => { setFloors(p=>p.filter(f=>f.id!==id)); setFloorData(p=>{const n={...p};delete n[id];return n;}); setCurrentId(floors.find(f=>f.id!==id)!.id); setFloorModal(null); }}
          onClose={() => setFloorModal(null)} />
      )}
    </div>
  );
}

// ── FItemShape ──────────────────────────────────────────────────────
function FItemShape({ item, selected, onMouseDown, onClick, onResizeStart }: {
  item: FItem; selected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent, edge: ResizeEdge) => void;
}) {
  const isStructure = item.kind==="partition"||item.kind==="door"||item.kind==="window"||item.kind==="screen";
  const isDark = item.kind==="server"||item.kind==="screen";

  const baseStyle: React.CSSProperties = {
    position:"absolute", left:item.x, top:item.y, width:item.w, height:item.h,
    transform:`rotate(${item.rotation}deg)`,
    transformOrigin:"center center",
    borderRadius: isStructure ? 3 : item.kind==="chair" ? "50%" : 8,
    background: item.color,
    border: isDark ? "1.5px solid #475569" : selected ? "2px solid #6366f1" : "1.5px solid #e2e8f0",
    boxShadow: selected
      ? "0 0 0 3px rgba(99,102,241,0.2), 0 4px 16px rgba(99,102,241,0.15)"
      : "0 1px 4px rgba(15,23,42,0.07)",
    cursor:"grab", userSelect:"none", zIndex:selected?7:3,
    display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden",
    flexDirection:"column", gap:2,
    transition:"box-shadow 0.12s",
  };

  // Inner decoration based on kind
  function InnerDecor() {
    if (item.kind==="cabinet") return (
      <svg width="100%" height="100%" viewBox="0 0 60 80" preserveAspectRatio="none" style={{ position:"absolute", inset:0 }}>
        <line x1="0" y1="26" x2="60" y2="26" stroke={isDark?"#475569":"#e2e8f0"} strokeWidth="1.5" />
        <line x1="0" y1="53" x2="60" y2="53" stroke={isDark?"#475569":"#e2e8f0"} strokeWidth="1.5" />
        <circle cx="30" cy="13" r="3" fill="#94a3b8" />
        <circle cx="30" cy="40" r="3" fill="#94a3b8" />
        <circle cx="30" cy="66" r="3" fill="#94a3b8" />
      </svg>
    );
    if (item.kind==="shelf") return (
      <svg width="100%" height="100%" viewBox="0 0 110 40" preserveAspectRatio="none" style={{ position:"absolute", inset:0 }}>
        <line x1="0" y1="38" x2="110" y2="38" stroke="#d97706" strokeWidth="3" />
        <line x1="5" y1="0" x2="5" y2="38" stroke="#e2e8f0" strokeWidth="1.5" />
        <line x1="105" y1="0" x2="105" y2="38" stroke="#e2e8f0" strokeWidth="1.5" />
      </svg>
    );
    if (item.kind==="server") return (
      <svg width="100%" height="100%" viewBox="0 0 60 130" preserveAspectRatio="none" style={{ position:"absolute", inset:0 }}>
        {[10,20,30,40,50,60,70,80,90,100,110].map((y,i) => (
          <rect key={i} x="4" y={y} width="52" height="8" rx="1" fill="#334155" />
        ))}
        {[10,20,30].map((y,i) => (
          <circle key={i} cx="52" cy={y+4} r="2" fill="#22c55e" />
        ))}
      </svg>
    );
    if (item.kind==="monitor") return (
      <svg width="100%" height="100%" viewBox="0 0 80 30" preserveAspectRatio="none" style={{ position:"absolute", inset:0 }}>
        <rect x="3" y="2" width="74" height="22" rx="2" fill="#1e293b" />
        <rect x="5" y="4" width="70" height="18" rx="1" fill="#0ea5e9" opacity="0.6" />
        <rect x="35" y="24" width="10" height="4" rx="1" fill="#94a3b8" />
        <rect x="28" y="28" width="24" height="2" rx="1" fill="#94a3b8" />
      </svg>
    );
    if (item.kind==="partition" || item.kind==="door" || item.kind==="window") return (
      <svg width="100%" height="100%" viewBox={`0 0 ${item.w} ${item.h}`} preserveAspectRatio="none" style={{ position:"absolute", inset:0 }}>
        {item.kind==="window" && (
          <>
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#7dd3fc" strokeWidth="1.5" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#7dd3fc" strokeWidth="1.5" />
          </>
        )}
        {item.kind==="door" && (
          <>
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#b45309" strokeWidth="2" />
            <path d={`M 0 ${item.h/2} Q ${item.w*0.7} 0 ${item.w} ${item.h/2}`} fill="none" stroke="#b45309" strokeWidth="1" strokeDasharray="3,2" />
          </>
        )}
      </svg>
    );
    if (item.kind==="screen") return (
      <svg width="100%" height="100%" viewBox={`0 0 ${item.w} ${item.h}`} preserveAspectRatio="none" style={{ position:"absolute", inset:0 }}>
        <rect x="0" y="0" width="100%" height="100%" fill="#0f172a" />
        <rect x="4" y="3" width={item.w-8} height={item.h-6} fill="#1d4ed8" opacity="0.6" rx="1" />
      </svg>
    );
    if (item.kind==="ups") return (
      <svg width="100%" height="100%" viewBox="0 0 40 90" preserveAspectRatio="none" style={{ position:"absolute", inset:0 }}>
        <rect x="8" y="8" width="24" height="12" rx="3" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1" />
        <text x="20" y="18" textAnchor="middle" fontSize="8" fill="#92400e">⚡</text>
        <rect x="4" y="28" width="32" height="50" rx="3" fill="#fef9c3" stroke="#fcd34d" strokeWidth="1" />
        <text x="20" y="56" textAnchor="middle" fontSize="9" fill="#92400e">UPS</text>
      </svg>
    );
    return null;
  }

  const showLabel = !isStructure && item.w > 36 && item.h > 36;
  const emoji = CATALOG.find(c => c.kind===item.kind)?.emoji ?? "📦";

  return (
    <div style={baseStyle} onMouseDown={onMouseDown} onClick={onClick}>
      <InnerDecor />
      {showLabel && (
        <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2, pointerEvents:"none" }}>
          <span style={{ fontSize: Math.min(item.w, item.h) > 50 ? 20 : 14 }}>{emoji}</span>
          {Math.min(item.w, item.h) > 40 && (
            <span style={{ fontSize:8, color:isDark?"#94a3b8":"#64748b", fontWeight:600, textAlign:"center", maxWidth:item.w-12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {item.label}
            </span>
          )}
        </div>
      )}
      {selected && (["nw","ne","sw","se","n","s","e","w"] as ResizeEdge[]).map(edge => (
        <RHandle key={edge} edge={edge} color="#6366f1" onMouseDown={e => onResizeStart(e, edge)} />
      ))}
    </div>
  );
}

// ── Small components ────────────────────────────────────────────────
function TBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} title={label} className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${active?"bg-white shadow-sm text-indigo-600":"text-slate-500 hover:text-slate-700 hover:bg-white/50"}`}>
      {icon}
    </button>
  );
}
function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex items-center px-1 py-0.5 bg-white/70 rounded border border-slate-200 text-[9px] font-mono text-slate-500 leading-none">{children}</kbd>;
}
function PropLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{children}</p>;
}
function PropVal({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-white/60 border border-slate-200/60 rounded-xl px-2.5 py-1.5">
      <p className="text-[9px] text-slate-400 mb-0.5">{label}</p>
      <p className={`text-xs text-slate-700 ${mono?"font-mono":""}`}>{value}</p>
    </div>
  );
}
function RHandle({ edge, onMouseDown, color="#6366f1" }: { edge: ResizeEdge; onMouseDown: (e: React.MouseEvent) => void; color?: string }) {
  const s: React.CSSProperties = { position:"absolute", background:color, borderRadius:3, zIndex:20, opacity:0.75 };
  const isV=edge==="n"||edge==="s", isH=edge==="e"||edge==="w", c=edge+"-resize";
  if (isV) Object.assign(s,{width:28,height:5,left:"50%",transform:"translateX(-50%)",cursor:c,...(edge==="n"?{top:-2}:{bottom:-2})});
  else if (isH) Object.assign(s,{width:5,height:28,top:"50%",transform:"translateY(-50%)",cursor:c,...(edge==="w"?{left:-2}:{right:-2})});
  else Object.assign(s,{width:8,height:8,cursor:c,...(edge.includes("n")?{top:-4}:{bottom:-4}),...(edge.includes("w")?{left:-4}:{right:-4})});
  return <div style={s} onMouseDown={onMouseDown} />;
}

// ── Seat Modal ──────────────────────────────────────────────────────
function SeatModal({ seat, isTh, employees, assets, assignedTags, onSave, onClose }: {
  seat: Seat; isTh: boolean;
  employees: { id: string; full_name: string }[];
  assets: { id: string; asset_tag: string; brand: string; model_name: string; status?: string }[];
  assignedTags: Set<string>;
  onSave: (s: Seat) => void; onClose: () => void;
}) {
  const [label,    setLabel]    = useState(seat.label);
  const [status,   setStatus]   = useState(seat.status);
  const [employee, setEmployee] = useState(seat.employee ?? "");
  const [tags,     setTags]     = useState<string[]>(seat.asset_tags ?? []);
  const [rj45,     setRj45]     = useState(seat.rj45_port ?? "");
  const { confirm, ConfirmUI } = useConfirm();
  function toggleTag(tag: string) { setTags(p => p.includes(tag) ? p.filter(t => t!==tag) : [...p, tag]); }
  async function handleSave() {
    const ok = await confirm({ title: isTh?`บันทึกการแก้ไขโต๊ะ ${seat.label}?`:`Save changes to ${seat.label}?`, confirmLabel: isTh?"บันทึก":"Save" });
    if (!ok) return;
    onSave({ ...seat, label, status, employee: employee||undefined, asset_tags: tags, rj45_port: rj45||undefined });
  }
  return (
    <MModal title={isTh?`แก้ไขโต๊ะ ${seat.label}`:`Edit ${seat.label}`} onClose={onClose}>
      {ConfirmUI}
      <MF label={isTh?"ชื่อโต๊ะ":"Label"}><input value={label} onChange={e => setLabel(e.target.value)} className={inp()} /></MF>
      <MF label={isTh?"สถานะ":"Status"}>
        <div className="grid grid-cols-2 gap-1.5">
          {(["vacant","occupied","maintenance","broken"] as SeatStatus[]).map(st => (
            <button key={st} onClick={() => setStatus(st)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${status===st?"shadow-sm":"border-slate-200 text-slate-400 bg-white/50 hover:border-slate-300"}`}
              style={status===st?{color:SA[st],background:SC[st],borderColor:SB[st]}:{}}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:status===st?SA[st]:"#cbd5e1" }} />{SL[st][isTh?"th":"en"]}
            </button>
          ))}
        </div>
      </MF>
      <MF label={isTh?"พนักงาน":"Employee"}>
        <select value={employee} onChange={e => setEmployee(e.target.value)} className={inp()}>
          <option value="">—{isTh?"ไม่กำหนด":"None"}—</option>
          {employees.map(e => <option key={e.id} value={e.full_name}>{e.full_name}</option>)}
        </select>
      </MF>
      <MF label={isTh?"ทรัพย์สิน (เลือกได้หลายรายการ)":"Assets (select multiple)"}>
        <div className="border border-slate-200 rounded-xl max-h-44 overflow-y-auto divide-y divide-slate-100">
          {assets.length===0 && <p className="px-3 py-2 text-slate-400 text-[11px] italic">{isTh?"ไม่มีข้อมูล":"No assets"}</p>}
          {assets.filter(a => a.status!=="returned"&&(!assignedTags.has(a.asset_tag)||tags.includes(a.asset_tag))).map(a => {
            const checked = tags.includes(a.asset_tag);
            return (<label key={a.id} className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer text-xs transition-colors ${checked?"bg-indigo-50":"hover:bg-slate-50"}`}>
              <input type="checkbox" checked={checked} onChange={() => toggleTag(a.asset_tag)} className="accent-indigo-600" />
              <span className="font-mono text-indigo-700">{a.asset_tag}</span>
              <span className="text-slate-500 truncate">{a.brand} {a.model_name}</span>
            </label>);
          })}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map(t => <span key={t} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 text-[11px]">{t}<button onClick={() => setTags(p => p.filter(x => x!==t))} className="hover:text-red-500">x</button></span>)}
          </div>
        )}
      </MF>
      <MF label="RJ45"><input value={rj45} onChange={e => setRj45(e.target.value)} placeholder="P01" className={inp()} /></MF>
      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="flex-1 border border-slate-200 rounded-xl py-2 text-sm text-slate-600 hover:bg-slate-50">{isTh?"ยกเลิก":"Cancel"}</button>
        <button onClick={handleSave} className="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-indigo-700">{isTh?"บันทึก":"Save"}</button>
      </div>
    </MModal>
  );
}

// ── Zone Modal ──────────────────────────────────────────────────────
function ZoneModal({ zone, isTh, onSave, onDelete, onClose }: { zone: Zone|null; isTh: boolean; onSave: (z: Zone) => void; onDelete: (id: string) => void; onClose: () => void }) {
  const [f, setF] = useState({ label: zone?.label??(isTh?"โซนใหม่":"New Zone"), color: zone?.color??ZONE_COLORS[0], w: zone?.w??200, h: zone?.h??220 });
  const { confirm: cfm, ConfirmUI: CUI } = useConfirm();
  return (
    <MModal title={zone?(isTh?`แก้ไขโซน ${zone.label}`:`Edit ${zone.label}`):(isTh?"เพิ่มโซน":"New Zone")} onClose={onClose}>
      {CUI}
      <MF label={isTh?"ชื่อโซน":"Name"}><input value={f.label} onChange={e => setF(p=>({...p,label:e.target.value}))} className={inp()} /></MF>
      <MF label={isTh?"สีพื้นหลัง":"Color"}>
        <div className="grid grid-cols-5 gap-1.5">
          {ZONE_COLORS.map(c => <button key={c} onClick={() => setF(p=>({...p,color:c}))} className={`h-9 rounded-xl border-2 transition-all ${f.color===c?"scale-105 shadow-md":"border-transparent hover:scale-105"}`} style={{ backgroundColor:c, borderColor:f.color===c?(ZONE_BORDER[c]??"#94a3b8"):"transparent" }} />)}
        </div>
      </MF>
      <div className="grid grid-cols-2 gap-3">
        <MF label={isTh?"กว้าง (px)":"Width"}><input type="number" value={f.w} min={80} onChange={e => setF(p=>({...p,w:+e.target.value}))} className={inp()} /></MF>
        <MF label={isTh?"สูง (px)":"Height"}><input type="number" value={f.h} min={60} onChange={e => setF(p=>({...p,h:+e.target.value}))} className={inp()} /></MF>
      </div>
      <div className="flex gap-2 pt-1">
        {zone && <button onClick={async () => { const ok=await cfm({title:isTh?`ลบโซน ${zone.label}?`:`Delete zone ${zone.label}?`,confirmLabel:isTh?"ลบ":"Delete",danger:true}); if (ok) onDelete(zone.id); }} className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl px-3 py-2 text-sm"><Trash2 size={13} /></button>}
        <button onClick={onClose} className="flex-1 border border-slate-200 rounded-xl py-2 text-sm text-slate-600 hover:bg-slate-50">{isTh?"ยกเลิก":"Cancel"}</button>
        <button onClick={async () => { const ok=await cfm({title:isTh?`บันทึกโซน ${f.label}?`:`Save zone ${f.label}?`,confirmLabel:isTh?"บันทึก":"Save"}); if (ok) onSave({id:zone?.id??uid(),x:zone?.x??20,y:zone?.y??20,...f}); }} className="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-indigo-700">{isTh?"บันทึก":"Save"}</button>
      </div>
    </MModal>
  );
}

// ── Floor Modal ─────────────────────────────────────────────────────
function FloorModal({ floor, isTh, onSave, onDelete, canDelete, onClose }: { floor: Floor|null; isTh: boolean; canDelete: boolean; onSave: (f: Floor) => void; onDelete: (id: string) => void; onClose: () => void }) {
  const [label, setLabel] = useState(floor?.label??(isTh?"พื้นที่ใหม่":"New Area"));
  const { confirm: cfm, ConfirmUI: CUI } = useConfirm();
  return (
    <MModal title={floor?(isTh?`แก้ไข ${floor.label}`:`Edit ${floor.label}`):(isTh?"เพิ่มพื้นที่":"New Area")} onClose={onClose}>
      {CUI}
      <MF label={isTh?"ชื่อพื้นที่":"Area Name"}><input value={label} onChange={e => setLabel(e.target.value)} autoFocus className={inp()} /></MF>
      <div className="flex gap-2 pt-1">
        {floor && canDelete && <button onClick={async () => { const ok=await cfm({title:isTh?`ลบพื้นที่ ${floor.label}?`:`Delete area ${floor.label}?`,message:isTh?"โต๊ะและโซนทั้งหมดจะถูกลบด้วย":"All desks and zones will be removed.",confirmLabel:isTh?"ลบ":"Delete",danger:true}); if (ok) onDelete(floor.id); }} className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl px-3 py-2 text-sm"><Trash2 size={13} /></button>}
        <button onClick={onClose} className="flex-1 border border-slate-200 rounded-xl py-2 text-sm text-slate-600 hover:bg-slate-50">{isTh?"ยกเลิก":"Cancel"}</button>
        <button onClick={async () => { const ok=await cfm({title:isTh?`บันทึกพื้นที่ ${label}?`:`Save area ${label}?`,confirmLabel:isTh?"บันทึก":"Save"}); if (ok) onSave({id:floor?.id??uid(),label}); }} className="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-indigo-700">{isTh?"บันทึก":"Save"}</button>
      </div>
    </MModal>
  );
}

// ── Shared helpers ──────────────────────────────────────────────────
function MModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm mx-4 p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ background:"rgba(255,255,255,0.90)", backdropFilter:"blur(24px) saturate(180%)", WebkitBackdropFilter:"blur(24px) saturate(180%)", borderRadius:20, border:"1px solid rgba(255,255,255,0.75)", boxShadow:"0 24px 64px rgba(15,23,42,0.18), 0 0 0 1px rgba(255,255,255,0.5)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={17} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function MF({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div className="space-y-1.5"><label className="text-xs font-medium text-slate-500">{label}</label>{children}</div>);
}
function inp() {
  return "w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 bg-white/70 transition-shadow";
}
