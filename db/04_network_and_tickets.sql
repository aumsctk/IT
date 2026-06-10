-- ============================================================
-- FILE 04: NETWORK MAPPING & TICKETING
-- ============================================================

-- ----------------------------------------------------------------
-- NETWORK SWITCHES
-- ----------------------------------------------------------------
CREATE TABLE public.network_switches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  room_id       UUID REFERENCES public.rooms(id) ON DELETE SET NULL, -- physical location
  name          TEXT NOT NULL,            -- e.g., "SW-F3-CORE-01"
  ip_address    INET,
  mac_address   MACADDR,
  brand         TEXT,
  model         TEXT,
  port_count    INT NOT NULL DEFAULT 24,
  management_vlan INT,
  firmware_ver  TEXT,
  asset_id      UUID UNIQUE REFERENCES public.assets(id) ON DELETE SET NULL, -- if tracked as asset
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- VLANS
-- ----------------------------------------------------------------
CREATE TABLE public.vlans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  vlan_id     INT NOT NULL,               -- 1-4094
  name        TEXT NOT NULL,              -- e.g., "CORP-DATA", "MGMT", "GUEST"
  subnet_cidr CIDR,                       -- e.g., "192.168.10.0/24"
  gateway     INET,
  color_hex   CHAR(7) DEFAULT '#10B981',  -- Floor plan layer color
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (branch_id, vlan_id)
);

-- ----------------------------------------------------------------
-- SWITCH PORTS (individual port on a switch)
-- ----------------------------------------------------------------
CREATE TABLE public.switch_ports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  switch_id      UUID NOT NULL REFERENCES public.network_switches(id) ON DELETE CASCADE,
  port_number    INT NOT NULL,             -- 1-based
  port_label     TEXT,                     -- e.g., "Gi0/1"
  vlan_id        UUID REFERENCES public.vlans(id) ON DELETE SET NULL,
  media          public.port_media NOT NULL DEFAULT 'rj45_copper',
  speed          public.port_speed NOT NULL DEFAULT '1gbps',
  is_uplink      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,

  -- Link to seat wall port (completes the physical path: seat -> patch panel -> switch)
  seat_id        UUID REFERENCES public.seats(id) ON DELETE SET NULL,
  patch_panel_port TEXT,                   -- Patch panel port label

  notes          TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (switch_id, port_number)
);

CREATE INDEX idx_switch_ports_seat ON public.switch_ports(seat_id);
CREATE INDEX idx_switch_ports_vlan ON public.switch_ports(vlan_id);

-- ----------------------------------------------------------------
-- TICKETS
-- ----------------------------------------------------------------
CREATE TABLE public.tickets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number    TEXT NOT NULL UNIQUE,  -- e.g., "TKT-2024-00123" (auto-gen trigger)
  type             public.ticket_type NOT NULL,
  status           public.ticket_status NOT NULL DEFAULT 'open',
  priority         public.ticket_priority NOT NULL DEFAULT 'medium',
  title            TEXT NOT NULL,
  description      TEXT,

  -- Who raised it
  created_by       UUID NOT NULL REFERENCES public.profiles(id),

  -- Assignee (IT Support handling the ticket)
  assigned_to      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Related entities (all optional depending on ticket type)
  asset_id         UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  seat_id          UUID REFERENCES public.seats(id) ON DELETE SET NULL,
  branch_id        UUID REFERENCES public.branches(id) ON DELETE SET NULL,

  -- For relocations
  from_seat_id     UUID REFERENCES public.seats(id) ON DELETE SET NULL,
  to_seat_id       UUID REFERENCES public.seats(id) ON DELETE SET NULL,

  -- For repair
  repair_vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  repair_cost      NUMERIC(12, 2),
  repair_notes     TEXT,

  -- Attachments (photos, docs)
  attachments      TEXT[] DEFAULT '{}',   -- Supabase Storage URLs

  -- SLA & resolution
  due_date         TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  closed_at        TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Approval flow
  approved_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  rejection_reason TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_status     ON public.tickets(status);
CREATE INDEX idx_tickets_created_by ON public.tickets(created_by);
CREATE INDEX idx_tickets_assigned   ON public.tickets(assigned_to);
CREATE INDEX idx_tickets_asset      ON public.tickets(asset_id);
CREATE INDEX idx_tickets_type       ON public.tickets(type);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at DESC);

-- Now add FK from allocation_logs to tickets
ALTER TABLE public.allocation_logs
  ADD CONSTRAINT fk_alloc_ticket
  FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------
-- TICKET COMMENTS / TIMELINE
-- ----------------------------------------------------------------
CREATE TABLE public.ticket_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.profiles(id),
  body        TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE, -- Internal IT note vs. public reply
  attachments TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tcomments_ticket ON public.ticket_comments(ticket_id);

-- ----------------------------------------------------------------
-- PHYSICAL AUDIT SESSIONS
-- ----------------------------------------------------------------
CREATE TABLE public.audit_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id    UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  room_id      UUID REFERENCES public.rooms(id) ON DELETE SET NULL, -- null = full branch
  name         TEXT NOT NULL,             -- e.g., "Q4 2024 Full Branch Audit"
  started_by   UUID NOT NULL REFERENCES public.profiles(id),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_complete  BOOLEAN NOT NULL DEFAULT FALSE,
  summary_json JSONB,                     -- { matched: 120, missing: 3, extra: 1 }
  notes        TEXT
);

-- ----------------------------------------------------------------
-- AUDIT ITEMS (scan results per asset)
-- ----------------------------------------------------------------
CREATE TABLE public.audit_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.audit_sessions(id) ON DELETE CASCADE,
  asset_id        UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  asset_tag_scanned TEXT,                 -- Raw scanned value (in case asset not found)
  finding         public.audit_finding NOT NULL,
  expected_seat_id UUID REFERENCES public.seats(id) ON DELETE SET NULL,
  actual_seat_id   UUID REFERENCES public.seats(id) ON DELETE SET NULL,
  scanned_by      UUID REFERENCES public.profiles(id),
  photo_url       TEXT,                   -- Optional photo of physical state
  notes           TEXT,
  scanned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_items_session ON public.audit_items(session_id);
CREATE INDEX idx_audit_items_asset   ON public.audit_items(asset_id);

-- ----------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,              -- 'ticket_update','warranty_alert','audit_reminder'
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,                       -- Deep link to relevant page
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user    ON public.notifications(user_id);
CREATE INDEX idx_notif_unread  ON public.notifications(user_id) WHERE is_read = FALSE;
