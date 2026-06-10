-- ============================================================
-- FILE 01: ENUMS & CUSTOM TYPES
-- IT Asset Management & Floor Plan System
-- ============================================================

-- ----------------------------------------------------------------
-- RBAC Roles
-- ----------------------------------------------------------------
CREATE TYPE public.user_role AS ENUM (
  'super_admin',   -- Full access: manage branches, all settings
  'it_support',    -- Manage assets, tickets, floor plans
  'general_user'   -- View only + raise tickets
);

-- ----------------------------------------------------------------
-- Asset Lifecycle
-- ----------------------------------------------------------------
CREATE TYPE public.asset_status AS ENUM (
  'active',        -- In use, healthy
  'idle',          -- Unassigned but functional
  'under_repair',  -- Currently being repaired
  'retired',       -- End-of-life, no longer deployable
  'lost',          -- Cannot be located
  'disposed'       -- Formally disposed/written off
);

CREATE TYPE public.asset_category AS ENUM (
  'computer',
  'monitor',
  'laptop',
  'printer',
  'network_device',  -- Switch, AP, Router
  'ups',
  'phone',
  'peripheral',      -- Keyboard, mouse, headset
  'server',
  'other'
);

CREATE TYPE public.asset_condition AS ENUM (
  'excellent',
  'good',
  'fair',
  'poor',
  'broken'
);

-- ----------------------------------------------------------------
-- Ticket Workflows
-- ----------------------------------------------------------------
CREATE TYPE public.ticket_type AS ENUM (
  'withdraw',    -- Check-out asset for use
  'return',      -- Return asset back to storage
  'repair',      -- Send for repair
  'relocation',  -- Move to different seat/room/branch
  'audit',       -- Physical audit discrepancy report
  'other'
);

CREATE TYPE public.ticket_status AS ENUM (
  'open',
  'in_progress',
  'pending_approval',
  'resolved',
  'closed',
  'rejected'
);

CREATE TYPE public.ticket_priority AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- ----------------------------------------------------------------
-- Floor Plan & Seat
-- ----------------------------------------------------------------
CREATE TYPE public.seat_status AS ENUM (
  'available',     -- Vacant, assignable
  'occupied',      -- Assigned to employee
  'reserved',      -- Held but not yet occupied
  'maintenance',   -- Under repair/renovation
  'inactive'       -- Decommissioned
);

CREATE TYPE public.floor_node_type AS ENUM (
  'desk',
  'server_rack',
  'printer_station',
  'network_cabinet',
  'meeting_room',
  'storage',
  'label'          -- Text label / landmark on map
);

-- ----------------------------------------------------------------
-- Network
-- ----------------------------------------------------------------
CREATE TYPE public.port_media AS ENUM (
  'rj45_copper',
  'fiber_sfp',
  'fiber_sfp_plus',
  'wireless'
);

CREATE TYPE public.port_speed AS ENUM (
  '10mbps',
  '100mbps',
  '1gbps',
  '2_5gbps',
  '10gbps',
  'other'
);

-- ----------------------------------------------------------------
-- Audit
-- ----------------------------------------------------------------
CREATE TYPE public.audit_finding AS ENUM (
  'matched',       -- Physical matches system record
  'missing',       -- System says here, physically absent
  'extra',         -- Found physically, not in system
  'damaged',       -- Present but damaged
  'wrong_location' -- Present but at wrong seat/room
);
