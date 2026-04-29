ALTER TABLE public.loads
  ADD COLUMN IF NOT EXISTS dropoff_time timestamptz;

UPDATE public.loads
SET
  pickup_time = COALESCE(pickup_time, pickup_window_start, created_at),
  dropoff_time = COALESCE(dropoff_time, dropoff_window_end, dropoff_window_start, pickup_time + interval '8 hours', created_at + interval '8 hours')
WHERE
  pickup_time IS NULL
  OR dropoff_time IS NULL;

ALTER TABLE public.loads
  ALTER COLUMN pickup_time SET NOT NULL,
  ALTER COLUMN dropoff_time SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'loads_pickup_window_order'
  ) THEN
    ALTER TABLE public.loads DROP CONSTRAINT loads_pickup_window_order;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'loads_dropoff_window_order'
  ) THEN
    ALTER TABLE public.loads DROP CONSTRAINT loads_dropoff_window_order;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'loads_pickup_dropoff_sequence'
  ) THEN
    ALTER TABLE public.loads DROP CONSTRAINT loads_pickup_dropoff_sequence;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'loads_pickup_before_dropoff'
  ) THEN
    ALTER TABLE public.loads
      ADD CONSTRAINT loads_pickup_before_dropoff CHECK (dropoff_time > pickup_time);
  END IF;
END
$$;

ALTER TABLE public.loads
  DROP COLUMN IF EXISTS pickup_window_start,
  DROP COLUMN IF EXISTS pickup_window_end,
  DROP COLUMN IF EXISTS dropoff_window_start,
  DROP COLUMN IF EXISTS dropoff_window_end;
