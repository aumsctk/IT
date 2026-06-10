-- ============================================================
-- FILE 02: CORE HIERARCHY TABLES
-- Branches -> Zones -> Rooms -> Seats
-- ============================================================

-- ----------------------------------------------------------------
-- PROFILES (extends Supabase auth.users)
-- ----------------------------------------------------------------
CREATE TABLE public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  phone          TEXT,
  employee_code  TEXT UNIQUE,           -- HR employee ID
  department     TEXT,
  job_title      TEXT,
  role           public.user_role NOT NULL DEFAULT 'general_user',
  avatar_url     TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  branch_id      UUID,                  -- FK added after branches table
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- BRANCHES (top of hierarchy)
-- ----------------------------------------------------------------
CREATE TABLE public.branches (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  code           TEXT NOT NULL UNIQUE,  -- e.g., "BKK-HQ", "CNX-01"
  address        TEXT,
  city           TEXT,
  country        TEXT NOT NULL DEFAULT 'Thailand',
  timezone       TEXT NOT NULL DEFAULT 'Asia/Bangkok',
  gps_lat        NUMERIC(10, 7),
  gps_lng        NUMERIC(10, 7),
  floor_count    INT NOT NULL DEFAULT 1,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by     UUID REFERENCES public.profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK now that branches exists
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_branch
  FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------
-- ZONES (building / wing / floor grouping)
-- ----------------------------------------------------------------
CREATE TABLE public.zones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id      UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,         -- e.g., "Floor 3 - North Wing"
  code           TEXT NOT NULL,         -- e.g., "F3-N"
  floor_number   INT NOT NULL DEFAULT 1,
  description    TEXT,
  color_hex      CHAR(7) DEFAULT '#6366F1', -- UI highlight color
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (branch_id, code)
);

-- ----------------------------------------------------------------
-- ROOMS (office rooms / open areas within a zone)
-- ----------------------------------------------------------------
CREATE TABLE public.rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id         UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,         -- e.g., "Server Room A", "Open Office"
  code            TEXT NOT NULL,
  room_type       TEXT NOT NULL DEFAULT 'office', -- office, server_room, storage, meeting
  capacity        INT NOT NULL DEFAULT 0,         -- max seats
  has_ac          BOOLEAN NOT NULL DEFAULT TRUE,
  has_ups_power   BOOLEAN NOT NULL DEFAULT FALSE,
  access_level    TEXT NOT NULL DEFAULT 'standard', -- standard, restricted, secure
  floor_plan_url  TEXT,                  -- Supabase Storage URL for blueprint image
  plan_width_px   INT,                   -- canvas dimensions for floor plan
  plan_height_px  INT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (zone_id, code)
);

-- ----------------------------------------------------------------
-- SEATS / DESKS
-- The leaf node. Assets and Employees attach here.
-- ----------------------------------------------------------------
CREATE TABLE public.seats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,         -- e.g., "D-01", "SERVER-RACK-3"
  node_type       public.floor_node_type NOT NULL DEFAULT 'desk',
  status          public.seat_status NOT NULL DEFAULT 'available',

  -- Floor plan canvas position (pixels, relative to room blueprint)
  pos_x           NUMERIC(8,2) NOT NULL DEFAULT 0,
  pos_y           NUMERIC(8,2) NOT NULL DEFAULT 0,
  width_px        NUMERIC(8,2) NOT NULL DEFAULT 60,
  height_px       NUMERIC(8,2) NOT NULL DEFAULT 40,
  rotation_deg    NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- Network port at this physical desk location
  rj45_wall_port  TEXT,                  -- e.g., "W-B3-045" (wall plate label)
  patch_panel_port TEXT,                 -- e.g., "PP-3A-045"

  -- 1-to-1 Employee assignment (enforced by UNIQUE constraint)
  assigned_employee_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,

  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for floor plan queries (fast spatial lookups per room)
CREATE INDEX idx_seats_room_id   ON public.seats(room_id);
CREATE INDEX idx_seats_status    ON public.seats(status);
CREATE INDEX idx_seats_employee  ON public.seats(assigned_employee_id);

-- Computed view: unassigned seats only (used in allocation dropdowns)
CREATE VIEW public.available_seats AS
SELECT
  s.*,
  r.name AS room_name,
  r.code AS room_code,
  z.name AS zone_name,
  b.name AS branch_name,
  b.code AS branch_code
FROM public.seats s
JOIN public.rooms   r ON r.id = s.room_id
JOIN public.zones   z ON z.id = r.zone_id
JOIN public.branches b ON b.id = z.branch_id
WHERE s.status = 'available'
  AND s.assigned_employee_id IS NULL
  AND s.is_active = TRUE;
