BEGIN;

UPDATE public.loads
SET
  pickup_time = COALESCE(pickup_time, created_at),
  dropoff_time = COALESCE(
    dropoff_time,
    pickup_time + interval '8 hours',
    created_at + interval '8 hours'
  )
WHERE
  pickup_time IS NULL
  OR dropoff_time IS NULL
  OR dropoff_time <= pickup_time;

ALTER TABLE public.loads
  ALTER COLUMN pickup_time SET NOT NULL,
  ALTER COLUMN dropoff_time SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'loads_pickup_before_dropoff'
  ) THEN
    ALTER TABLE public.loads DROP CONSTRAINT loads_pickup_before_dropoff;
  END IF;

  ALTER TABLE public.loads
    ADD CONSTRAINT loads_pickup_before_dropoff CHECK (dropoff_time > pickup_time);
END
$$;

COMMIT;
