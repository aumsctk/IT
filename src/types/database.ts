/**
 * Supabase Database Type Definitions
 * Auto-generated shape matching the schema in /db/*.sql
 * Run `npx supabase gen types typescript --project-id YOUR_ID > src/types/database.ts`
 * to regenerate from live schema. This file is the manual baseline.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ── Enums ──────────────────────────────────────────────────────────────────────
export type UserRole        = "super_admin" | "it_support" | "general_user";
export type AssetStatus     = "active" | "idle" | "under_repair" | "retired" | "lost" | "disposed";
export type AssetCategory   = "computer" | "monitor" | "laptop" | "printer" | "network_device" | "ups" | "phone" | "peripheral" | "server" | "other";
export type AssetCondition  = "excellent" | "good" | "fair" | "poor" | "broken";
export type TicketType      = "withdraw" | "return" | "repair" | "relocation" | "audit" | "other";
export type TicketStatus    = "open" | "in_progress" | "pending_approval" | "resolved" | "closed" | "rejected";
export type TicketPriority  = "low" | "medium" | "high" | "critical";
export type SeatStatus      = "available" | "occupied" | "reserved" | "maintenance" | "inactive";
export type FloorNodeType   = "desk" | "server_rack" | "printer_station" | "network_cabinet" | "meeting_room" | "storage" | "label";
export type PortMedia       = "rj45_copper" | "fiber_sfp" | "fiber_sfp_plus" | "wireless";
export type PortSpeed       = "10mbps" | "100mbps" | "1gbps" | "2_5gbps" | "10gbps" | "other";
export type AuditFinding    = "matched" | "missing" | "extra" | "damaged" | "wrong_location";

// ── Row types ─────────────────────────────────────────────────────────────────
export interface Profile {
  id:            string;
  full_name:     string;
  email:         string;
  phone:         string | null;
  employee_code: string | null;
  department:    string | null;
  job_title:     string | null;
  role:          UserRole;
  avatar_url:    string | null;
  is_active:     boolean;
  branch_id:     string | null;
  created_at:    string;
  updated_at:    string;
}

export interface Branch {
  id:           string;
  name:         string;
  code:         string;
  address:      string | null;
  city:         string | null;
  country:      string;
  timezone:     string;
  gps_lat:      number | null;
  gps_lng:      number | null;
  floor_count:  number;
  is_active:    boolean;
  created_by:   string | null;
  created_at:   string;
  updated_at:   string;
}

export interface Zone {
  id:           string;
  branch_id:    string;
  name:         string;
  code:         string;
  floor_number: number;
  description:  string | null;
  color_hex:    string;
  is_active:    boolean;
  created_at:   string;
  updated_at:   string;
}

export interface Room {
  id:              string;
  zone_id:         string;
  name:            string;
  code:            string;
  room_type:       string;
  capacity:        number;
  has_ac:          boolean;
  has_ups_power:   boolean;
  access_level:    string;
  floor_plan_url:  string | null;
  plan_width_px:   number | null;
  plan_height_px:  number | null;
  is_active:       boolean;
  created_at:      string;
  updated_at:      string;
}

export interface Seat {
  id:                   string;
  room_id:              string;
  label:                string;
  node_type:            FloorNodeType;
  status:               SeatStatus;
  pos_x:                number;
  pos_y:                number;
  width_px:             number;
  height_px:            number;
  rotation_deg:         number;
  rj45_wall_port:       string | null;
  patch_panel_port:     string | null;
  assigned_employee_id: string | null;
  notes:                string | null;
  is_active:            boolean;
  created_at:           string;
  updated_at:           string;
}

export interface AssetModel {
  id:                       string;
  vendor_id:                string | null;
  category:                 AssetCategory;
  brand:                    string;
  model_name:               string;
  model_number:             string | null;
  specs:                    Json | null;
  default_warranty_months:  number;
  image_url:                string | null;
  created_at:               string;
}

export interface Asset {
  id:                 string;
  asset_tag:          string;
  serial_number:      string | null;
  model_id:           string | null;
  branch_id:          string;
  seat_id:            string | null;
  status:             AssetStatus;
  condition:          AssetCondition;
  purchase_date:      string | null;
  purchase_price:     number | null;
  currency:           string;
  purchase_order_ref: string | null;
  vendor_id:          string | null;
  invoice_url:        string | null;
  warranty_expiry:    string | null;
  lifecycle_end_date: string | null;
  is_critical:        boolean;
  mac_address_eth:    string | null;
  mac_address_wifi:   string | null;
  ip_address:         string | null;
  hostname:           string | null;
  qr_code_url:        string | null;
  notes:              string | null;
  extra_fields:       Json | null;
  photos:             string[];
  created_by:         string | null;
  updated_by:         string | null;
  created_at:         string;
  updated_at:         string;
}

export interface Ticket {
  id:               string;
  ticket_number:    string;
  type:             TicketType;
  status:           TicketStatus;
  priority:         TicketPriority;
  title:            string;
  description:      string | null;
  created_by:       string;
  assigned_to:      string | null;
  asset_id:         string | null;
  seat_id:          string | null;
  branch_id:        string | null;
  from_seat_id:     string | null;
  to_seat_id:       string | null;
  repair_vendor_id: string | null;
  repair_cost:      number | null;
  repair_notes:     string | null;
  attachments:      string[];
  due_date:         string | null;
  resolved_at:      string | null;
  closed_at:        string | null;
  resolution_notes: string | null;
  approved_by:      string | null;
  approved_at:      string | null;
  rejection_reason: string | null;
  created_at:       string;
  updated_at:       string;
}

export interface Notification {
  id:         string;
  user_id:    string;
  type:       string;
  title:      string;
  body:       string | null;
  link:       string | null;
  is_read:    boolean;
  metadata:   Json | null;
  created_at: string;
}

// ── Supabase Database shape (for createBrowserClient<Database>) ───────────────
export interface Database {
  public: {
    Tables: {
      profiles:        { Row: Profile;    Insert: Partial<Profile>;    Update: Partial<Profile>    };
      branches:        { Row: Branch;     Insert: Partial<Branch>;     Update: Partial<Branch>     };
      zones:           { Row: Zone;       Insert: Partial<Zone>;       Update: Partial<Zone>       };
      rooms:           { Row: Room;       Insert: Partial<Room>;       Update: Partial<Room>       };
      seats:           { Row: Seat;       Insert: Partial<Seat>;       Update: Partial<Seat>       };
      asset_models:    { Row: AssetModel; Insert: Partial<AssetModel>; Update: Partial<AssetModel> };
      assets:          { Row: Asset;      Insert: Partial<Asset>;      Update: Partial<Asset>      };
      tickets:         { Row: Ticket;     Insert: Partial<Ticket>;     Update: Partial<Ticket>     };
      notifications:   { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> };
    };
    Views: {
      available_seats:     { Row: Seat & { room_name: string; room_code: string; zone_name: string; branch_name: string; branch_code: string } };
      available_assets:    { Row: Asset & { brand: string; model_name: string; category: AssetCategory; vendor_name: string } };
      available_employees: { Row: Profile };
    };
    Functions: {
      omnibar_search: {
        Args: { query: string; result_limit?: number };
        Returns: Array<{ id: string; entity_type: string; label: string; sublabel: string; url: string; status: string }>;
      };
    };
  };
}
