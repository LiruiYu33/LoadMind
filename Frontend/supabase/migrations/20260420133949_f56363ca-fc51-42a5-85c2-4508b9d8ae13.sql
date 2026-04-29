
-- Roles
CREATE TYPE public.app_role AS ENUM ('carrier', 'shipper');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users insert own roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Vehicles
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  unit_id text NOT NULL,
  model text NOT NULL,
  year int NOT NULL,
  capacity_t numeric NOT NULL,
  fuel_efficiency numeric NOT NULL,
  status text NOT NULL DEFAULT 'idle',
  location text,
  lat numeric,
  lng numeric,
  preferred_routes text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carrier own vehicles" ON public.vehicles FOR ALL TO authenticated
  USING (owner_id = auth.uid() AND public.has_role(auth.uid(), 'carrier'))
  WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(), 'carrier'));

-- Drivers
CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'available',
  avatar_seed text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carrier own drivers" ON public.drivers FOR ALL TO authenticated
  USING (owner_id = auth.uid() AND public.has_role(auth.uid(), 'carrier'))
  WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(), 'carrier'));

-- Loads (marketplace)
CREATE TABLE public.loads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipper_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  origin text NOT NULL,
  destination text NOT NULL,
  weight_kg numeric NOT NULL,
  load_type text NOT NULL,
  pickup_time timestamptz,
  status text NOT NULL DEFAULT 'open',
  value numeric NOT NULL DEFAULT 0,
  predicted_margin numeric NOT NULL DEFAULT 0,
  empty_miles_saved int DEFAULT 0,
  match_score int DEFAULT 0,
  ai_reasoning text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shipper manage own loads" ON public.loads FOR ALL TO authenticated
  USING (shipper_id = auth.uid() AND public.has_role(auth.uid(), 'shipper'))
  WITH CHECK (shipper_id = auth.uid() AND public.has_role(auth.uid(), 'shipper'));
CREATE POLICY "carriers view open loads" ON public.loads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'carrier') AND status = 'open');

-- Assignments
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  load_id uuid REFERENCES public.loads(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  eta timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carrier own assignments" ON public.assignments FOR ALL TO authenticated
  USING (carrier_id = auth.uid() AND public.has_role(auth.uid(), 'carrier'))
  WITH CHECK (carrier_id = auth.uid() AND public.has_role(auth.uid(), 'carrier'));

-- Shipments (shipper history/active)
CREATE TABLE public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipper_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shipment_code text NOT NULL,
  cargo text NOT NULL,
  route_origin text NOT NULL,
  route_destination text NOT NULL,
  carrier text,
  status text NOT NULL DEFAULT 'in_transit',
  eta timestamptz,
  value numeric NOT NULL DEFAULT 0,
  weight_kg numeric NOT NULL DEFAULT 0,
  net_margin numeric DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shipper own shipments" ON public.shipments FOR ALL TO authenticated
  USING (shipper_id = auth.uid() AND public.has_role(auth.uid(), 'shipper'))
  WITH CHECK (shipper_id = auth.uid() AND public.has_role(auth.uid(), 'shipper'));
