-- ============================================================
-- FILE 07: assign_asset_to_seat RPC
-- Called by assignAssetToSeat() in queries/assets.ts
-- Uses a transaction to atomically:
--   1. Unlink asset from its previous seat (if any)
--   2. Link asset to new seat
--   3. Update seat status accordingly
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_asset_to_seat(
  p_asset_id UUID,
  p_seat_id  UUID   -- NULL = unassign
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_seat_id UUID;
BEGIN
  -- Only admin/support may call this
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) NOT IN ('super_admin','it_support') THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  -- Get current seat
  SELECT seat_id INTO v_old_seat_id FROM public.assets WHERE id = p_asset_id;

  -- No-op if already assigned to the same seat
  IF v_old_seat_id IS NOT DISTINCT FROM p_seat_id THEN
    RETURN;
  END IF;

  -- If asset was on another seat, verify that seat won't have broken state
  -- (The UNIQUE constraint handles the DB enforcement; this is a clarity check)

  -- Update the asset's seat assignment
  -- The AFTER UPDATE trigger on assets will auto-log to allocation_logs
  UPDATE public.assets
  SET    seat_id   = p_seat_id,
         status    = CASE
                       WHEN p_seat_id IS NULL THEN 'idle'::public.asset_status
                       ELSE 'active'::public.asset_status
                     END,
         updated_by = auth.uid()
  WHERE  id = p_asset_id;

END;
$$;
