-- ═══════════════════════════════════════
-- IT Asset Manager — Supabase Schema
-- รัน SQL นี้ใน Supabase SQL Editor
-- ═══════════════════════════════════════

-- Enable UUID
create extension if not exists "pgcrypto";

-- ── ASSETS ──────────────────────────────
create table if not exists assets (
  id               uuid primary key default gen_random_uuid(),
  asset_tag        text not null unique,
  serial_number    text,
  brand            text,
  model_name       text,
  category         text,
  branch_id        text,
  branch_name      text,
  branch_code      text,
  seat_id          text,
  seat_label       text,
  room_name        text,
  status           text default 'idle',
  condition        text default 'good',
  purchase_date    date,
  purchase_price   text,
  currency         text default 'THB',
  vendor_name      text,
  purchase_order_ref text,
  warranty_expiry  date,
  lifecycle_end_date date,
  is_critical      boolean default false,
  hostname         text,
  ip_address       text,
  mac_address_eth  text,
  mac_address_wifi text,
  notes            text,
  photos           text[] default '{}',
  return_documents jsonb default '[]',
  assigned_to_id   uuid,
  assigned_to_name text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── EMPLOYEES ───────────────────────────
create table if not exists employees (
  id           uuid primary key default gen_random_uuid(),
  emp_code     text not null unique,
  full_name    text,
  nickname     text,
  email        text,
  phone        text,
  department   text,
  position     text,
  branch       text,
  seat_label   text,
  asset_tag    text,
  asset_name   text,
  status       text default 'active',
  start_date   date,
  avatar_url   text,
  created_at   timestamptz default now()
);

-- ── TICKETS ─────────────────────────────
create table if not exists tickets (
  id               uuid primary key default gen_random_uuid(),
  ticket_number    text not null unique,
  type             text,
  status           text default 'open',
  priority         text default 'medium',
  title            text,
  description      text,
  reporter_name    text,
  reporter_email   text,
  assignee_name    text,
  asset_tag        text,
  asset_id         uuid references assets(id),
  branch           text,
  resolution_notes text,
  rejection_reason text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── TICKET COMMENTS ──────────────────────
create table if not exists ticket_comments (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references tickets(id) on delete cascade,
  body        text,
  is_internal boolean default false,
  author_name text,
  created_at  timestamptz default now()
);

-- ── AUDIT SESSIONS ───────────────────────
create table if not exists audit_sessions (
  id           uuid primary key default gen_random_uuid(),
  name         text,
  notes        text,
  is_complete  boolean default false,
  started_at   timestamptz default now(),
  completed_at timestamptz,
  summary_json jsonb
);

-- ── AUDIT ITEMS ──────────────────────────
create table if not exists audit_items (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references audit_sessions(id) on delete cascade,
  asset_tag_scanned text,
  asset_id          uuid references assets(id),
  finding           text,
  scanned_at        timestamptz default now(),
  notes             text
);

-- ── FLOOR PLAN DATA ──────────────────────
create table if not exists floor_plan_data (
  id         uuid primary key default gen_random_uuid(),
  floor_key  text not null unique,
  data       jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- ── AUTO-UPDATE updated_at ───────────────
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger assets_updated_at   before update on assets   for each row execute function update_updated_at();
create trigger tickets_updated_at  before update on tickets  for each row execute function update_updated_at();

-- ── RLS (Row Level Security) ─────────────
-- เปิด RLS แต่ allow all สำหรับตอนนี้
-- ปรับทีหลังถ้าต้องการ permission แยกรายคน
alter table assets          enable row level security;
alter table employees       enable row level security;
alter table tickets         enable row level security;
alter table ticket_comments enable row level security;
alter table audit_sessions  enable row level security;
alter table audit_items     enable row level security;
alter table floor_plan_data enable row level security;

create policy "allow all" on assets          for all using (true) with check (true);
create policy "allow all" on employees       for all using (true) with check (true);
create policy "allow all" on tickets         for all using (true) with check (true);
create policy "allow all" on ticket_comments for all using (true) with check (true);
create policy "allow all" on audit_sessions  for all using (true) with check (true);
create policy "allow all" on audit_items     for all using (true) with check (true);
create policy "allow all" on floor_plan_data for all using (true) with check (true);
