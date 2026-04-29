ALTER TABLE public.loads
  ADD COLUMN IF NOT EXISTS assigned_vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_vehicle_unit text,
  ADD COLUMN IF NOT EXISTS assigned_carrier_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_carrier_name text,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_loads_assigned_carrier_id ON public.loads(assigned_carrier_id);
CREATE INDEX IF NOT EXISTS idx_loads_assigned_vehicle_id ON public.loads(assigned_vehicle_id);
