ALTER TABLE public.loads
  ADD COLUMN IF NOT EXISTS pickup_window_start timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_window_end timestamptz,
  ADD COLUMN IF NOT EXISTS dropoff_window_start timestamptz,
  ADD COLUMN IF NOT EXISTS dropoff_window_end timestamptz;

UPDATE public.loads
SET
  pickup_window_start = COALESCE(pickup_window_start, pickup_time, created_at),
  pickup_window_end = COALESCE(pickup_window_end, pickup_time + interval '2 hours', created_at + interval '2 hours'),
  dropoff_window_start = COALESCE(dropoff_window_start, pickup_time + interval '8 hours', created_at + interval '8 hours'),
  dropoff_window_end = COALESCE(dropoff_window_end, pickup_time + interval '10 hours', created_at + interval '10 hours')
WHERE
  pickup_window_start IS NULL
  OR pickup_window_end IS NULL
  OR dropoff_window_start IS NULL
  OR dropoff_window_end IS NULL;

ALTER TABLE public.loads
  ALTER COLUMN pickup_window_start SET NOT NULL,
  ALTER COLUMN pickup_window_end SET NOT NULL,
  ALTER COLUMN dropoff_window_start SET NOT NULL,
  ALTER COLUMN dropoff_window_end SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'loads_pickup_window_order'
  ) THEN
    ALTER TABLE public.loads
      ADD CONSTRAINT loads_pickup_window_order CHECK (pickup_window_end > pickup_window_start);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'loads_dropoff_window_order'
  ) THEN
    ALTER TABLE public.loads
      ADD CONSTRAINT loads_dropoff_window_order CHECK (dropoff_window_end > dropoff_window_start);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'loads_pickup_dropoff_sequence'
  ) THEN
    ALTER TABLE public.loads
      ADD CONSTRAINT loads_pickup_dropoff_sequence CHECK (dropoff_window_start >= pickup_window_end);
  END IF;
END
$$;