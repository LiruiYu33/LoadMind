ALTER TABLE public.loads
  ADD COLUMN IF NOT EXISTS length_cm numeric,
  ADD COLUMN IF NOT EXISTS width_cm numeric,
  ADD COLUMN IF NOT EXISTS height_cm numeric;