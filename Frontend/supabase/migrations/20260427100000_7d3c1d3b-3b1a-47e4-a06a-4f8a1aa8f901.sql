BEGIN;

ALTER TABLE public.loads
  ADD COLUMN IF NOT EXISTS pickup_confirmed_by_shipper_at timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_confirmed_by_carrier_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_confirmed_by_shipper_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_confirmed_by_carrier_at timestamptz;

UPDATE public.loads
SET completed_at = COALESCE(completed_at, now())
WHERE status = 'delivered'
  AND completed_at IS NULL;

COMMIT;
