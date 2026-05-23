-- LoadMind MVP demo seed data.
--
-- Run this from the Supabase SQL editor after creating these Auth users:
--   shipper.demo@loadmind.test
--   carrier.demo@loadmind.test
--
-- The script is idempotent for rows whose demo identifiers start with DEMO-.

DO $$
DECLARE
  demo_shipper_id uuid;
  demo_carrier_id uuid;
BEGIN
  SELECT id INTO demo_shipper_id
  FROM auth.users
  WHERE email = 'shipper.demo@loadmind.test'
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT id INTO demo_carrier_id
  FROM auth.users
  WHERE email = 'carrier.demo@loadmind.test'
  ORDER BY created_at DESC
  LIMIT 1;

  IF demo_shipper_id IS NULL THEN
    RAISE EXCEPTION 'Create Supabase Auth user shipper.demo@loadmind.test before running seed_demo.sql';
  END IF;

  IF demo_carrier_id IS NULL THEN
    RAISE EXCEPTION 'Create Supabase Auth user carrier.demo@loadmind.test before running seed_demo.sql';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES
    (demo_shipper_id, 'shipper'),
    (demo_carrier_id, 'carrier')
  ON CONFLICT (user_id, role) DO NOTHING;

  DELETE FROM public.assignments
  WHERE load_id IN (
    SELECT id
    FROM public.loads
    WHERE shipment_code LIKE 'DEMO-%'
  );

  DELETE FROM public.loads
  WHERE shipment_code LIKE 'DEMO-%';

  DELETE FROM public.vehicles
  WHERE owner_id = demo_carrier_id
    AND unit_id LIKE 'DEMO-%';

  INSERT INTO public.vehicles (
    owner_id,
    unit_id,
    model,
    year,
    capacity_t,
    fuel_efficiency,
    status,
    location,
    lat,
    lng,
    preferred_routes,
    trailers,
    driver_name
  )
  VALUES
    (
      demo_carrier_id,
      'DEMO-MEL-01',
      'Volvo FH16 Dry Van',
      2023,
      28,
      34,
      'idle',
      'Melbourne, Victoria, 3000, Australia',
      -37.8136,
      144.9631,
      ARRAY['Melbourne Metro', 'Geelong', 'Dandenong'],
      '[{"type":"Dry van","capacity_t":28,"temperature_controlled":false}]'::jsonb,
      'Alex Morgan'
    ),
    (
      demo_carrier_id,
      'DEMO-GEE-02',
      'Mercedes Actros Curtainsider',
      2022,
      24,
      31,
      'idle',
      'Geelong, Victoria, 3220, Australia',
      -38.1499,
      144.3617,
      ARRAY['Melbourne', 'Geelong', 'Ballarat'],
      '[{"type":"Curtainsider","capacity_t":24,"temperature_controlled":false}]'::jsonb,
      'Priya Singh'
    );

  INSERT INTO public.loads (
    shipper_id,
    origin,
    destination,
    weight_kg,
    load_type,
    pickup_time,
    dropoff_time,
    status,
    value,
    predicted_margin,
    empty_miles_saved,
    match_score,
    ai_reasoning,
    cargo,
    length_cm,
    width_cm,
    height_cm,
    shipment_code,
    route_origin,
    route_destination
  )
  VALUES
    (
      demo_shipper_id,
      'Clayton, Victoria, 3168, Australia',
      'Melbourne, Victoria, 3000, Australia',
      12000,
      'Palletized Goods',
      now() + interval '1 day',
      now() + interval '1 day 3 hours',
      'open',
      330,
      18,
      22,
      94,
      'Short metro dry-goods lane with low empty-mile exposure.',
      'Palletized packaged stationery',
      1200,
      1000,
      1600,
      'DEMO-CLAYTON-CBD',
      'Clayton, Victoria, 3168, Australia',
      'Melbourne, Victoria, 3000, Australia'
    ),
    (
      demo_shipper_id,
      '391-395 Dynon Road, West Melbourne, Victoria, 3003, Australia',
      '9A Butler Street, Eumemmerring, Victoria, 3177, Australia',
      18000,
      'Packaged Consumer Goods',
      now() + interval '1 day 5 hours',
      now() + interval '1 day 8 hours',
      'open',
      340,
      24,
      31,
      91,
      'Strong match for a Melbourne dry-van carrier already near the pickup area.',
      'Cartons of packaged household supplies',
      1200,
      1000,
      1700,
      'DEMO-DYNON-EUMEMMERRING',
      '391-395 Dynon Road, West Melbourne, Victoria, 3003, Australia',
      '9A Butler Street, Eumemmerring, Victoria, 3177, Australia'
    ),
    (
      demo_shipper_id,
      'Melbourne, Victoria, 3000, Australia',
      'Geelong, Victoria, 3220, Australia',
      22000,
      'Electronics & Appliances',
      now() + interval '2 days',
      now() + interval '2 days 4 hours',
      'open',
      315,
      20,
      46,
      88,
      'Regional dry-goods load with predictable distance and timing.',
      'Boxed consumer electronics',
      1200,
      1000,
      1800,
      'DEMO-MEL-GEELONG',
      'Melbourne, Victoria, 3000, Australia',
      'Geelong, Victoria, 3220, Australia'
    ),
    (
      demo_shipper_id,
      'Melbourne, Victoria, 3000, Australia',
      'Adelaide, South Australia, 5000, Australia',
      22000,
      'Non-perishable Food & Beverages',
      now() + interval '3 days',
      now() + interval '3 days 11 hours',
      'open',
      1120,
      16,
      130,
      82,
      'Longer interstate dry-goods lane suited to carriers seeking higher load value.',
      'Palletized packaged pantry goods',
      1200,
      1000,
      1700,
      'DEMO-MEL-ADELAIDE',
      'Melbourne, Victoria, 3000, Australia',
      'Adelaide, South Australia, 5000, Australia'
    );
END
$$;
