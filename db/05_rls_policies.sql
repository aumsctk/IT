-- ============================================================
-- FILE 05: ROW LEVEL SECURITY (RLS) POLICIES
-- Principle: Users see only what their role permits.
-- super_admin  -> full read/write everything
-- it_support   -> full read/write assets, tickets, floor plan; read profiles
-- general_user -> read own profile + assigned assets; create tickets; read floor plan
-- ============================================================

-- ----------------------------------------------------------------
-- Helper function: get current user role without recursion
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_support()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role IN ('super_admin','it_support')
  FROM public.profiles WHERE id = auth.uid();
$$;

-- ================================================================
-- ENABLE RLS on all tables
-- ================================================================
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_models      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_documents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_switches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vlans             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.switch_ports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- PROFILES
-- ================================================================
-- Everyone can read their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Admin/support can read all profiles
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (public.is_admin_or_support());

-- Only super_admin can insert/update profiles (or user updates own non-role fields)
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT WITH CHECK (public.current_user_role() = 'super_admin');

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.current_user_role() = 'super_admin');

-- ================================================================
-- BRANCHES / ZONES / ROOMS (read for all, write for admin)
-- ================================================================
CREATE POLICY "branches_select_all" ON public.branches
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "branches_write_admin" ON public.branches
  FOR ALL USING (public.current_user_role() = 'super_admin');

CREATE POLICY "zones_select_all" ON public.zones
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "zones_write_admin_support" ON public.zones
  FOR ALL USING (public.is_admin_or_support());

CREATE POLICY "rooms_select_all" ON public.rooms
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "rooms_write_admin_support" ON public.rooms
  FOR ALL USING (public.is_admin_or_support());

-- ================================================================
-- SEATS
-- ================================================================
-- Everyone can read seats (needed to render floor plan)
CREATE POLICY "seats_select_all" ON public.seats
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admin/support can modify seats
CREATE POLICY "seats_write_admin_support" ON public.seats
  FOR ALL USING (public.is_admin_or_support());

-- ================================================================
-- VENDORS / ASSET MODELS
-- ================================================================
CREATE POLICY "vendors_select_all" ON public.vendors
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "vendors_write_admin_support" ON public.vendors
  FOR ALL USING (public.is_admin_or_support());

CREATE POLICY "asset_models_select_all" ON public.asset_models
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "asset_models_write_admin_support" ON public.asset_models
  FOR ALL USING (public.is_admin_or_support());

-- ================================================================
-- ASSETS
-- ================================================================
-- Admin/support see all assets
CREATE POLICY "assets_select_admin_support" ON public.assets
  FOR SELECT USING (public.is_admin_or_support());

-- General user sees only assets assigned to their seat
CREATE POLICY "assets_select_own_seat" ON public.assets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.seats s
      WHERE s.id = assets.seat_id
        AND s.assigned_employee_id = auth.uid()
    )
  );

-- Only admin/support can write assets
CREATE POLICY "assets_write_admin_support" ON public.assets
  FOR ALL USING (public.is_admin_or_support());

-- ================================================================
-- ASSET DOCUMENTS
-- ================================================================
CREATE POLICY "asset_docs_select_admin_support" ON public.asset_documents
  FOR SELECT USING (public.is_admin_or_support());

CREATE POLICY "asset_docs_write_admin_support" ON public.asset_documents
  FOR ALL USING (public.is_admin_or_support());

-- ================================================================
-- ALLOCATION LOGS (audit trail — read-only for general users)
-- ================================================================
CREATE POLICY "alloc_logs_select_admin_support" ON public.allocation_logs
  FOR SELECT USING (public.is_admin_or_support());

CREATE POLICY "alloc_logs_select_own" ON public.allocation_logs
  FOR SELECT USING (
    to_user_id = auth.uid() OR from_user_id = auth.uid()
  );

CREATE POLICY "alloc_logs_insert_admin_support" ON public.allocation_logs
  FOR INSERT WITH CHECK (public.is_admin_or_support());

-- ================================================================
-- NETWORK TABLES (admin/support only)
-- ================================================================
CREATE POLICY "network_switches_admin_support" ON public.network_switches
  FOR ALL USING (public.is_admin_or_support());

CREATE POLICY "vlans_select_all" ON public.vlans
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "vlans_write_admin_support" ON public.vlans
  FOR ALL USING (public.is_admin_or_support());

CREATE POLICY "switch_ports_admin_support" ON public.switch_ports
  FOR ALL USING (public.is_admin_or_support());

-- ================================================================
-- TICKETS
-- ================================================================
-- Admin/support see all tickets
CREATE POLICY "tickets_select_admin_support" ON public.tickets
  FOR SELECT USING (public.is_admin_or_support());

-- Users see tickets they created or are assigned to
CREATE POLICY "tickets_select_own" ON public.tickets
  FOR SELECT USING (
    created_by = auth.uid() OR assigned_to = auth.uid()
  );

-- Any authenticated user can create a ticket
CREATE POLICY "tickets_insert_any" ON public.tickets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Admin/support can update any ticket; users can only update their own open tickets
CREATE POLICY "tickets_update_admin_support" ON public.tickets
  FOR UPDATE USING (public.is_admin_or_support());

CREATE POLICY "tickets_update_own" ON public.tickets
  FOR UPDATE USING (
    created_by = auth.uid() AND status = 'open'
  );

-- ================================================================
-- TICKET COMMENTS
-- ================================================================
CREATE POLICY "tcomments_select" ON public.ticket_comments
  FOR SELECT USING (
    -- Must be able to see the parent ticket
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_comments.ticket_id
        AND (t.created_by = auth.uid()
             OR t.assigned_to = auth.uid()
             OR public.is_admin_or_support())
    )
    -- Hide internal notes from general users
    AND (is_internal = FALSE OR public.is_admin_or_support())
  );

CREATE POLICY "tcomments_insert" ON public.ticket_comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_comments.ticket_id
        AND (t.created_by = auth.uid()
             OR t.assigned_to = auth.uid()
             OR public.is_admin_or_support())
    )
  );

-- ================================================================
-- AUDIT SESSIONS & ITEMS
-- ================================================================
CREATE POLICY "audit_sessions_admin_support" ON public.audit_sessions
  FOR ALL USING (public.is_admin_or_support());

CREATE POLICY "audit_items_admin_support" ON public.audit_items
  FOR ALL USING (public.is_admin_or_support());

-- ================================================================
-- NOTIFICATIONS (users see only their own)
-- ================================================================
CREATE POLICY "notif_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notif_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notif_insert_admin_support" ON public.notifications
  FOR INSERT WITH CHECK (public.is_admin_or_support());
