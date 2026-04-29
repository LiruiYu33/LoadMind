ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS driver_name text;

UPDATE public.vehicles
SET driver_name = CASE unit_id
  WHEN 'UNIT_BAL_12' THEN 'M. O''Connor'
  WHEN 'UNIT_GEE_04' THEN 'S. Patel'
  WHEN 'UNIT_MEL_01' THEN 'L. Nguyen'
  WHEN 'UNIT_ALB_22' THEN 'R. Cameron'
  ELSE 'Unassigned Driver'
END
WHERE driver_name IS NULL;

ALTER TABLE public.vehicles
  ALTER COLUMN driver_name SET NOT NULL;
