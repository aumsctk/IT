-- ============================================================
-- FILE 03: ASSETS & EMPLOYEE ALLOCATIONS
-- ============================================================

-- ----------------------------------------------------------------
-- VENDORS / SUPPLIERS
-- ----------------------------------------------------------------
CREATE TABLE public.vendors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  code         TEXT UNIQUE,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website      TEXT,
  notes        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- ASSET MODELS (catalog of known hardware models)
-- ----------------------------------------------------------------
CREATE TABLE public.asset_models (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id      UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  category       public.asset_category NOT NULL,
  brand          TEXT NOT NULL,          -- e.g., "Dell", "HP"
  model_name     TEXT NOT NULL,          -- e.g., "OptiPlex 7090"
  model_number   TEXT,
  specs          JSONB,                  -- { "cpu": "i7-12700", "ram": "16GB", ... }
  default_warranty_months INT DEFAULT 36,
  image_url      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (brand, model_name)
);

-- ----------------------------------------------------------------
-- ASSETS (individual physical items)
-- ----------------------------------------------------------------
CREATE TABLE public.assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_tag           TEXT NOT NULL UNIQUE,  -- e.g., "IT-PC-00234" — printed on QR
  serial_number       TEXT UNIQUE,
  model_id            UUID REFERENCES public.asset_models(id) ON DELETE RESTRICT,
  branch_id           UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,

  -- 1-to-1 Seat assignment (UNIQUE enforces single seat per asset)
  seat_id             UUID UNIQUE REFERENCES public.seats(id) ON DELETE SET NULL,

  -- Lifecycle
  status              public.asset_status NOT NULL DEFAULT 'idle',
  condition           public.asset_condition NOT NULL DEFAULT 'good',
  purchase_date       DATE,
  purchase_price      NUMERIC(12, 2),
  currency            CHAR(3) DEFAULT 'THB',
  purchase_order_ref  TEXT,              -- PO number
  vendor_id           UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  invoice_url         TEXT,              -- Supabase Storage URL
  warranty_expiry     DATE,
  lifecycle_end_date  DATE,              -- Planned retirement date
  is_critical         BOOLEAN NOT NULL DEFAULT FALSE, -- Critical infrastructure flag

  -- Network identity
  mac_address_eth     MACADDR,
  mac_address_wifi    MACADDR,
  ip_address          INET,              -- Last known static/DHCP IP
  hostname            TEXT,

  -- Physical
  qr_code_url         TEXT,              -- Generated QR image stored in Storage
  notes               TEXT,
  extra_fields        JSONB,             -- Flexible custom fields per category

  -- Photos (up to 5 image URLs, compressed before upload)
  photos              TEXT[] DEFAULT '{}',

  created_by          UUID REFERENCES public.profiles(id),
  updated_by          UUID REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_assets_branch_id  ON public.assets(branch_id);
CREATE INDEX idx_assets_seat_id    ON public.assets(seat_id);
CREATE INDEX idx_assets_status     ON public.assets(status);
CREATE INDEX idx_assets_warranty   ON public.assets(warranty_expiry);
CREATE INDEX idx_assets_tag        ON public.assets(asset_tag);
-- Full-text search index
CREATE INDEX idx_assets_fts ON public.assets
  USING GIN (to_tsvector('english', coalesce(asset_tag,'') || ' ' || coalesce(serial_number,'') || ' ' || coalesce(hostname,'')));

-- ----------------------------------------------------------------
-- ASSET DOCUMENTS (receipts, manuals, warranties)
-- ----------------------------------------------------------------
CREATE TABLE public.asset_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id    UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  doc_type    TEXT NOT NULL DEFAULT 'other', -- 'invoice','warranty','manual','other'
  file_name   TEXT NOT NULL,
  file_url    TEXT NOT NULL,              -- Supabase Storage URL (compressed)
  file_size   INT,                        -- bytes after compression
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- ALLOCATION HISTORY LOG
-- Every time an asset is assigned/unassigned from a seat, log it.
-- ----------------------------------------------------------------
CREATE TABLE public.allocation_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id       UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,

  -- Previous state
  from_seat_id   UUID REFERENCES public.seats(id) ON DELETE SET NULL,
  from_user_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- New state
  to_seat_id     UUID REFERENCES public.seats(id) ON DELETE SET NULL,
  to_user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  action         TEXT NOT NULL, -- 'assigned','unassigned','relocated','retired'
  performed_by   UUID REFERENCES public.profiles(id),
  reason         TEXT,
  ticket_id      UUID,          -- FK to tickets added in file 04
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alloc_asset   ON public.allocation_logs(asset_id);
CREATE INDEX idx_alloc_created ON public.allocation_logs(created_at DESC);

-- ----------------------------------------------------------------
-- VIEWS: Strict "unassigned" filters for dropdowns
-- These guarantee dropdowns NEVER show already-assigned items.
-- ----------------------------------------------------------------

-- Unassigned assets (seat_id IS NULL and status = 'idle')
CREATE VIEW public.available_assets AS
SELECT
  a.*,
  am.brand,
  am.model_name,
  am.category,
  v.name AS vendor_name
FROM public.assets a
LEFT JOIN public.asset_models am ON am.id = a.model_id
LEFT JOIN public.vendors       v  ON v.id  = a.vendor_id
WHERE a.seat_id IS NULL
  AND a.status = 'idle';

-- Unassigned employees (no seat allocated)
CREATE VIEW public.available_employees AS
SELECT p.*
FROM public.profiles p
WHERE p.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.seats s
    WHERE s.assigned_employee_id = p.id
  );
