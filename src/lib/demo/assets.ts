/**
 * Demo data สำหรับ Assets
 * ใช้แทน Supabase ในช่วง Demo Mode
 */

export interface DemoAsset {
  id:                 string;
  asset_tag:          string;
  serial_number:      string | null;
  branch_id:          string;
  seat_id:            string | null;
  status:             "active" | "idle" | "under_repair" | "retired" | "lost" | "disposed";
  condition:          "excellent" | "good" | "fair" | "poor" | "broken";
  purchase_date:      string | null;
  purchase_price:     number | null;
  currency:           string;
  vendor_name:        string | null;
  purchase_order_ref: string | null;
  warranty_expiry:    string | null;
  lifecycle_end_date: string | null;
  is_critical:        boolean;
  hostname:           string | null;
  ip_address:         string | null;
  mac_address_eth:    string | null;
  notes:              string | null;
  photos:             string[];
  created_at:         string;
  // joined
  brand:              string;
  model_name:         string;
  category:           string;
  image_url:          string | null;
  seat_label:         string | null;
  room_name:          string | null;
  zone_name:          string | null;
  branch_name:        string;
  branch_code:        string;
  rj45_wall_port:     string | null;
  vlan_name:          string | null;
}

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString().split("T")[0];
const daysFrom = (d: number) => new Date(now.getTime() + d * 86400000).toISOString().split("T")[0];

export const DEMO_ASSETS: DemoAsset[] = [
  {
    id: "a001", asset_tag: "IT-PC-00142", serial_number: "DLLX9200142",
    branch_id: "b01", seat_id: "s01", status: "active", condition: "good",
    purchase_date: daysAgo(730), purchase_price: 28500, currency: "THB",
    vendor_name: "Dell Thailand", purchase_order_ref: "PO-2023-0412",
    warranty_expiry: daysFrom(3), lifecycle_end_date: daysFrom(365 * 3),
    is_critical: true, hostname: "PC-BKK-142", ip_address: "192.168.1.142",
    mac_address_eth: "AA:BB:CC:DD:EE:01", notes: "เครื่องหลักของฝ่ายบัญชี",
    photos: [], created_at: daysAgo(730),
    brand: "Dell", model_name: "OptiPlex 7090", category: "computer", image_url: null,
    seat_label: "D-01", room_name: "Open Office A", zone_name: "ชั้น 3 — เหนือ",
    branch_name: "สำนักงานใหญ่ กรุงเทพ", branch_code: "BKK-HQ",
    rj45_wall_port: "W-B3-001", vlan_name: "CORP-DATA",
  },
  {
    id: "a002", asset_tag: "IT-NB-00034", serial_number: "LVTP-X1-00034",
    branch_id: "b01", seat_id: "s02", status: "active", condition: "excellent",
    purchase_date: daysAgo(365), purchase_price: 52000, currency: "THB",
    vendor_name: "Lenovo Thailand", purchase_order_ref: "PO-2024-0089",
    warranty_expiry: daysFrom(12), lifecycle_end_date: daysFrom(365 * 4),
    is_critical: true, hostname: "NB-BKK-034", ip_address: "192.168.1.34",
    mac_address_eth: "AA:BB:CC:DD:EE:02", notes: "Laptop ผู้จัดการฝ่าย IT",
    photos: [], created_at: daysAgo(365),
    brand: "Lenovo", model_name: "ThinkPad X1 Carbon", category: "laptop", image_url: null,
    seat_label: "D-02", room_name: "IT Room", zone_name: "ชั้น 3 — เหนือ",
    branch_name: "สำนักงานใหญ่ กรุงเทพ", branch_code: "BKK-HQ",
    rj45_wall_port: "W-B3-002", vlan_name: "MGMT",
  },
  {
    id: "a003", asset_tag: "IT-PC-00087", serial_number: "HPD400-00087",
    branch_id: "b01", seat_id: null, status: "idle", condition: "good",
    purchase_date: daysAgo(540), purchase_price: 22000, currency: "THB",
    vendor_name: "HP Thailand", purchase_order_ref: "PO-2023-0201",
    warranty_expiry: daysFrom(7), lifecycle_end_date: daysFrom(365 * 2),
    is_critical: false, hostname: null, ip_address: null,
    mac_address_eth: "AA:BB:CC:DD:EE:03", notes: "รอ assign ให้พนักงานใหม่",
    photos: [], created_at: daysAgo(540),
    brand: "HP", model_name: "ProDesk 400 G9", category: "computer", image_url: null,
    seat_label: null, room_name: null, zone_name: null,
    branch_name: "สำนักงานใหญ่ กรุงเทพ", branch_code: "BKK-HQ",
    rj45_wall_port: null, vlan_name: null,
  },
  {
    id: "a004", asset_tag: "IT-MN-00055", serial_number: "LG27UL-00055",
    branch_id: "b01", seat_id: "s03", status: "active", condition: "good",
    purchase_date: daysAgo(400), purchase_price: 12500, currency: "THB",
    vendor_name: "LG Electronics", purchase_order_ref: "PO-2023-0310",
    warranty_expiry: daysAgo(2), lifecycle_end_date: daysFrom(365),
    is_critical: false, hostname: null, ip_address: null,
    mac_address_eth: null, notes: "จอ 27 นิ้ว 4K",
    photos: [], created_at: daysAgo(400),
    brand: "LG", model_name: "27UL600-W", category: "monitor", image_url: null,
    seat_label: "D-03", room_name: "Open Office A", zone_name: "ชั้น 3 — เหนือ",
    branch_name: "สำนักงานใหญ่ กรุงเทพ", branch_code: "BKK-HQ",
    rj45_wall_port: null, vlan_name: null,
  },
  {
    id: "a005", asset_tag: "IT-PC-00201", serial_number: "DLLX9200201",
    branch_id: "b01", seat_id: "s04", status: "under_repair", condition: "poor",
    purchase_date: daysAgo(900), purchase_price: 26000, currency: "THB",
    vendor_name: "Dell Thailand", purchase_order_ref: "PO-2022-0144",
    warranty_expiry: daysAgo(170), lifecycle_end_date: daysFrom(180),
    is_critical: false, hostname: "PC-BKK-201", ip_address: "192.168.1.201",
    mac_address_eth: "AA:BB:CC:DD:EE:05", notes: "ส่งซ่อม PSU เสีย — รอ 7 วัน",
    photos: [], created_at: daysAgo(900),
    brand: "Dell", model_name: "OptiPlex 5090", category: "computer", image_url: null,
    seat_label: "D-04", room_name: "Open Office B", zone_name: "ชั้น 3 — ใต้",
    branch_name: "สำนักงานใหญ่ กรุงเทพ", branch_code: "BKK-HQ",
    rj45_wall_port: "W-B3-045", vlan_name: "CORP-DATA",
  },
  {
    id: "a006", asset_tag: "IT-NB-00012", serial_number: "ASUS-ZB-00012",
    branch_id: "b02", seat_id: "s05", status: "active", condition: "fair",
    purchase_date: daysAgo(1100), purchase_price: 38000, currency: "THB",
    vendor_name: "Asus Thailand", purchase_order_ref: "PO-2022-0011",
    warranty_expiry: daysFrom(60), lifecycle_end_date: daysFrom(365),
    is_critical: false, hostname: "NB-CNX-012", ip_address: "10.0.1.12",
    mac_address_eth: "BB:CC:DD:EE:FF:01", notes: null,
    photos: [], created_at: daysAgo(1100),
    brand: "ASUS", model_name: "ExpertBook B9", category: "laptop", image_url: null,
    seat_label: "D-11", room_name: "Sales Room", zone_name: "ชั้น 1",
    branch_name: "สาขาเชียงใหม่", branch_code: "CNX-01",
    rj45_wall_port: "W-F1-011", vlan_name: "SALES",
  },
  {
    id: "a007", asset_tag: "IT-SW-00003", serial_number: "CSCO-SG350-00003",
    branch_id: "b01", seat_id: "s06", status: "active", condition: "excellent",
    purchase_date: daysAgo(500), purchase_price: 85000, currency: "THB",
    vendor_name: "Cisco Systems", purchase_order_ref: "PO-2023-0488",
    warranty_expiry: daysFrom(365 * 3), lifecycle_end_date: daysFrom(365 * 7),
    is_critical: true, hostname: "SW-BKK-CORE-01", ip_address: "192.168.0.1",
    mac_address_eth: "CC:DD:EE:FF:00:01", notes: "Core Switch ชั้น 3",
    photos: [], created_at: daysAgo(500),
    brand: "Cisco", model_name: "SG350-28", category: "network_device", image_url: null,
    seat_label: "RACK-01", room_name: "Server Room A", zone_name: "ชั้น 3 — เหนือ",
    branch_name: "สำนักงานใหญ่ กรุงเทพ", branch_code: "BKK-HQ",
    rj45_wall_port: null, vlan_name: null,
  },
  {
    id: "a008", asset_tag: "IT-PR-00021", serial_number: "BRHLL3-00021",
    branch_id: "b01", seat_id: null, status: "idle", condition: "good",
    purchase_date: daysAgo(800), purchase_price: 18000, currency: "THB",
    vendor_name: "Brother Thailand", purchase_order_ref: "PO-2022-0321",
    warranty_expiry: daysFrom(200), lifecycle_end_date: daysFrom(365 * 3),
    is_critical: false, hostname: null, ip_address: "192.168.1.210",
    mac_address_eth: null, notes: "เครื่องพิมพ์สำรอง ชั้น 2",
    photos: [], created_at: daysAgo(800),
    brand: "Brother", model_name: "HL-L3270CDW", category: "printer", image_url: null,
    seat_label: null, room_name: null, zone_name: null,
    branch_name: "สำนักงานใหญ่ กรุงเทพ", branch_code: "BKK-HQ",
    rj45_wall_port: null, vlan_name: null,
  },
  {
    id: "a009", asset_tag: "IT-PC-00315", serial_number: null,
    branch_id: "b01", seat_id: null, status: "retired", condition: "poor",
    purchase_date: daysAgo(1800), purchase_price: 18000, currency: "THB",
    vendor_name: "HP Thailand", purchase_order_ref: "PO-2020-0012",
    warranty_expiry: daysAgo(800), lifecycle_end_date: daysAgo(30),
    is_critical: false, hostname: null, ip_address: null,
    mac_address_eth: null, notes: "เลิกใช้งาน — รอทำลาย",
    photos: [], created_at: daysAgo(1800),
    brand: "HP", model_name: "EliteDesk 800 G5", category: "computer", image_url: null,
    seat_label: null, room_name: null, zone_name: null,
    branch_name: "สำนักงานใหญ่ กรุงเทพ", branch_code: "BKK-HQ",
    rj45_wall_port: null, vlan_name: null,
  },
  {
    id: "a010", asset_tag: "IT-UPS-00008", serial_number: "APC-SMT-00008",
    branch_id: "b01", seat_id: "s07", status: "active", condition: "good",
    purchase_date: daysAgo(600), purchase_price: 32000, currency: "THB",
    vendor_name: "APC by Schneider", purchase_order_ref: "PO-2023-0055",
    warranty_expiry: daysFrom(365 * 2), lifecycle_end_date: daysFrom(365 * 5),
    is_critical: true, hostname: null, ip_address: "192.168.0.50",
    mac_address_eth: null, notes: "UPS Server Room ชั้น 3",
    photos: [], created_at: daysAgo(600),
    brand: "APC", model_name: "Smart-UPS 1500VA", category: "ups", image_url: null,
    seat_label: "RACK-02", room_name: "Server Room A", zone_name: "ชั้น 3 — เหนือ",
    branch_name: "สำนักงานใหญ่ กรุงเทพ", branch_code: "BKK-HQ",
    rj45_wall_port: null, vlan_name: null,
  },
];

export const DEMO_BRANCHES = [
  { id: "b01", name: "ศูนย์ฯนครราชสีมา", code: "NMA-01" },
];

// Filter helper
export function filterAssets(
  assets: DemoAsset[],
  opts: {
    search?:    string;
    status?:    string;
    category?:  string;
    branch_id?: string;
  }
) {
  let result = [...assets];
  if (opts.branch_id) result = result.filter((a) => a.branch_id === opts.branch_id);
  if (opts.status)    result = result.filter((a) => a.status    === opts.status);
  if (opts.category)  result = result.filter((a) => a.category  === opts.category);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    result = result.filter((a) =>
      a.asset_tag.toLowerCase().includes(q) ||
      (a.serial_number?.toLowerCase().includes(q) ?? false) ||
      (a.hostname?.toLowerCase().includes(q)      ?? false) ||
      a.brand.toLowerCase().includes(q) ||
      a.model_name.toLowerCase().includes(q)
    );
  }
  return result;
}
