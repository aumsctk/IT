-- ============================================================
-- FILE 06: FUNCTIONS, TRIGGERS & REALTIME CONFIG
-- ============================================================

-- ================================================================
-- AUTO-UPDATE updated_at TIMESTAMP
-- ================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles','branches','zones','rooms','seats',
    'assets','network_switches','vlans','tickets'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON public.%s
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ================================================================
-- AUTO-GENERATE TICKET NUMBER
-- Format: TKT-YYYY-NNNNN (e.g., TKT-2024-00001)
-- ================================================================
CREATE SEQUENCE IF NOT EXISTS public.ticket_seq START 1 INCREMENT 1;

CREATE OR REPLACE FUNCTION public.gen_ticket_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                       LPAD(nextval('public.ticket_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tickets_gen_number
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '')
  EXECUTE FUNCTION public.gen_ticket_number();

-- ================================================================
-- AUTO-SYNC SEAT STATUS when employee assigned/unassigned
-- ================================================================
CREATE OR REPLACE FUNCTION public.sync_seat_status_on_employee_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- When assigned_employee_id is set, mark seat occupied
  IF NEW.assigned_employee_id IS NOT NULL THEN
    NEW.status := 'occupied';
  -- When cleared, mark available (only if not in maintenance/inactive)
  ELSIF OLD.status NOT IN ('maintenance', 'inactive') THEN
    NEW.status := 'available';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seats_sync_status
  BEFORE UPDATE OF assigned_employee_id ON public.seats
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_seat_status_on_employee_change();

-- ================================================================
-- ALLOCATION LOG: auto-create log entry when asset.seat_id changes
-- ================================================================
CREATE OR REPLACE FUNCTION public.log_asset_allocation_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only log if seat_id actually changed
  IF OLD.seat_id IS DISTINCT FROM NEW.seat_id THEN
    INSERT INTO public.allocation_logs (
      asset_id,
      from_seat_id,
      from_user_id,
      to_seat_id,
      to_user_id,
      action,
      performed_by
    )
    SELECT
      NEW.id,
      OLD.seat_id,
      (SELECT assigned_employee_id FROM public.seats WHERE id = OLD.seat_id),
      NEW.seat_id,
      (SELECT assigned_employee_id FROM public.seats WHERE id = NEW.seat_id),
      CASE
        WHEN OLD.seat_id IS NULL AND NEW.seat_id IS NOT NULL THEN 'assigned'
        WHEN OLD.seat_id IS NOT NULL AND NEW.seat_id IS NULL THEN 'unassigned'
        ELSE 'relocated'
      END,
      auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assets_log_allocation
  AFTER UPDATE OF seat_id ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_asset_allocation_change();

-- ================================================================
-- WARRANTY EXPIRY NOTIFICATIONS (run as scheduled job or cron)
-- Called manually or via pg_cron / Supabase Edge Function cron
-- ================================================================
CREATE OR REPLACE FUNCTION public.create_warranty_alerts(days_ahead INT DEFAULT 30)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT a.id, a.asset_tag, a.warranty_expiry, a.branch_id
    FROM public.assets a
    WHERE a.warranty_expiry BETWEEN NOW()::DATE AND (NOW() + (days_ahead || ' days')::INTERVAL)::DATE
      AND a.status NOT IN ('retired','disposed','lost')
  LOOP
    -- Notify all super_admins and it_support in the same branch
    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    SELECT
      p.id,
      'warranty_alert',
      'Warranty Expiring: ' || rec.asset_tag,
      'Asset ' || rec.asset_tag || ' warranty expires on ' || rec.warranty_expiry,
      '/assets/' || rec.id,
      jsonb_build_object('asset_id', rec.id, 'expiry', rec.warranty_expiry)
    FROM public.profiles p
    WHERE p.role IN ('super_admin','it_support')
      AND p.branch_id = rec.branch_id
      AND NOT EXISTS (
        -- Don't duplicate notification within 24h
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = p.id
          AND n.metadata->>'asset_id' = rec.id::TEXT
          AND n.created_at > NOW() - INTERVAL '24 hours'
      );
  END LOOP;
END;
$$;

-- ================================================================
-- AUTO-CREATE PROFILE on auth.users INSERT (Supabase Auth hook)
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auth_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- OMNIBAR: Universal Full-Text Search Function
-- Returns unified results across assets, employees, tickets, seats
-- ================================================================
CREATE OR REPLACE FUNCTION public.omnibar_search(query TEXT, result_limit INT DEFAULT 20)
RETURNS TABLE (
  id          UUID,
  entity_type TEXT,
  label       TEXT,
  sublabel    TEXT,
  url         TEXT,
  status      TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- Assets
  SELECT
    a.id,
    'asset'::TEXT,
    a.asset_tag || ' — ' || COALESCE(am.brand || ' ' || am.model_name, 'Unknown Model'),
    COALESCE(a.hostname, a.serial_number, ''),
    '/assets/' || a.id,
    a.status::TEXT
  FROM public.assets a
  LEFT JOIN public.asset_models am ON am.id = a.model_id
  WHERE to_tsvector('english', a.asset_tag || ' ' || COALESCE(a.serial_number,'') || ' ' || COALESCE(a.hostname,'') || ' ' || COALESCE(am.brand,'') || ' ' || COALESCE(am.model_name,''))
        @@ plainto_tsquery('english', query)

  UNION ALL

  -- Employees / Profiles
  SELECT
    p.id,
    'employee'::TEXT,
    p.full_name,
    COALESCE(p.department, '') || ' · ' || COALESCE(p.employee_code, p.email),
    '/employees/' || p.id,
    CASE WHEN p.is_active THEN 'active' ELSE 'inactive' END
  FROM public.profiles p
  WHERE to_tsvector('english', p.full_name || ' ' || p.email || ' ' || COALESCE(p.employee_code,'') || ' ' || COALESCE(p.department,''))
        @@ plainto_tsquery('english', query)

  UNION ALL

  -- Tickets
  SELECT
    t.id,
    'ticket'::TEXT,
    t.ticket_number || ' — ' || t.title,
    t.type::TEXT || ' · ' || t.status::TEXT,
    '/tickets/' || t.id,
    t.status::TEXT
  FROM public.tickets t
  WHERE to_tsvector('english', t.ticket_number || ' ' || t.title || ' ' || COALESCE(t.description,''))
        @@ plainto_tsquery('english', query)

  UNION ALL

  -- Seats / Desks
  SELECT
    s.id,
    'seat'::TEXT,
    s.label,
    r.name || ' · ' || z.name || ' · ' || b.name,
    '/floor-plan?seat=' || s.id,
    s.status::TEXT
  FROM public.seats s
  JOIN public.rooms   r ON r.id = s.room_id
  JOIN public.zones   z ON z.id = r.zone_id
  JOIN public.branches b ON b.id = z.branch_id
  WHERE to_tsvector('english', s.label || ' ' || r.name || ' ' || z.name || ' ' || b.name)
        @@ plainto_tsquery('english', query)

  ORDER BY label
  LIMIT result_limit;
$$;

-- ================================================================
-- REALTIME: Enable Supabase Realtime on key tables
-- (Run in Supabase Dashboard > Database > Replication, or via SQL)
-- ================================================================
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.seats;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.assets;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
COMMIT;

-- ================================================================
-- INDEXES for Warranty Dashboard & Lifecycle Queries
-- ================================================================
CREATE INDEX idx_assets_lifecycle ON public.assets(lifecycle_end_date)
  WHERE lifecycle_end_date IS NOT NULL;

CREATE INDEX idx_assets_purchase_date ON public.assets(purchase_date);
CREATE INDEX idx_assets_category ON public.asset_models(category);

-- Composite: find all assets at a specific seat quickly
CREATE INDEX idx_assets_seat_status ON public.assets(seat_id, status)
  WHERE seat_id IS NOT NULL;

-- ================================================================
-- MATERIALIZED VIEW: Asset Summary per Branch (for dashboard KPIs)
-- Refresh with: REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_asset_summary;
-- ================================================================
CREATE MATERIALIZED VIEW public.mv_asset_summary AS
SELECT
  b.id   AS branch_id,
  b.name AS branch_name,
  am.category,
  a.status,
  COUNT(*)                                                    AS count,
  SUM(a.purchase_price)                                       AS total_value,
  COUNT(*) FILTER (WHERE a.warranty_expiry < NOW()::DATE)    AS expired_warranty_count,
  COUNT(*) FILTER (WHERE a.warranty_expiry BETWEEN NOW()::DATE
                    AND (NOW() + INTERVAL '30 days')::DATE)  AS expiring_soon_count,
  COUNT(*) FILTER (WHERE a.seat_id IS NULL AND a.status = 'idle') AS unassigned_count
FROM public.assets a
JOIN public.branches b ON b.id = a.branch_id
LEFT JOIN public.asset_models am ON am.id = a.model_id
GROUP BY b.id, b.name, am.category, a.status
WITH DATA;

CREATE UNIQUE INDEX idx_mv_asset_summary
  ON public.mv_asset_summary(branch_id, category, status);
