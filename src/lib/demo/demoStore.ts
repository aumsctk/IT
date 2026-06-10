/**
 * demoStore — localStorage-backed store for Demo Mode
 * Persists assets created/edited while Supabase is not connected.
 */

const KEY = "demo_assets_v1";

export interface DemoAsset {
  id:                 string;
  asset_tag:          string;
  serial_number:      string;
  brand:              string;
  model_name:         string;
  category:           string;
  branch_id:          string;
  branch_name:        string;
  status:             string;
  condition:          string;
  purchase_date:      string;
  purchase_price:     string;
  currency:           string;
  vendor_name:        string;
  purchase_order_ref: string;
  warranty_expiry:    string;
  lifecycle_end_date: string;
  is_critical:        boolean;
  hostname:           string;
  ip_address:         string;
  mac_address_eth:    string;
  notes:              string;
  created_at:         string;
  _demo: true;
}

function load(): DemoAsset[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(assets: DemoAsset[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(assets));
}

export function getDemoAssets(): DemoAsset[] {
  return load();
}

export function addDemoAsset(asset: Omit<DemoAsset, "id" | "created_at" | "_demo">): DemoAsset {
  const list = load();
  const newAsset: DemoAsset = {
    ...asset,
    id: `demo-${Date.now()}`,
    created_at: new Date().toISOString(),
    _demo: true,
  };
  save([newAsset, ...list]);
  return newAsset;
}

export function updateDemoAsset(id: string, data: Partial<DemoAsset>): void {
  const list = load().map((a) => a.id === id ? { ...a, ...data } : a);
  save(list);
}

export function deleteDemoAsset(id: string): void {
  save(load().filter((a) => a.id !== id));
}
