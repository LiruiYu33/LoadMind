BEGIN;

ALTER TABLE public.loads
  ADD COLUMN IF NOT EXISTS shipment_code text,
  ADD COLUMN IF NOT EXISTS cargo text,
  ADD COLUMN IF NOT EXISTS net_margin numeric,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS route_origin text,
  ADD COLUMN IF NOT EXISTS route_destination text;

CREATE TABLE IF NOT EXISTS public.shipment_id_mapping (
  old_shipment_id uuid PRIMARY KEY,
  new_load_id uuid NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'shipments'
  ) THEN
    WITH source AS (
      SELECT
        s.id AS old_shipment_id,
        gen_random_uuid() AS new_load_id,
        s.shipper_id,
        s.route_origin,
        s.route_destination,
        COALESCE(s.weight_kg, 0) AS weight_kg,
        COALESCE(s.status, 'open') AS status,
        COALESCE(s.value, 0) AS value,
        s.created_at,
        s.shipment_code,
        s.cargo,
        COALESCE(s.net_margin, 0) AS net_margin,
        s.completed_at,
        COALESCE(NULLIF(s.cargo, ''), 'Unknown') AS load_type,
        COALESCE(s.eta, s.created_at) AS pickup_time,
        CASE
          WHEN COALESCE(s.completed_at, s.eta, s.created_at + interval '8 hours') > COALESCE(s.eta, s.created_at)
            THEN COALESCE(s.completed_at, s.eta, s.created_at + interval '8 hours')
          ELSE COALESCE(s.eta, s.created_at) + interval '8 hours'
        END AS dropoff_time
      FROM public.shipments s
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.shipment_id_mapping m
        WHERE m.old_shipment_id = s.id
      )
    ),
    inserted_loads AS (
      INSERT INTO public.loads (
        id,
        shipper_id,
        origin,
        destination,
        weight_kg,
        load_type,
        pickup_time,
        dropoff_time,
        status,
        value,
        created_at,
        shipment_code,
        cargo,
        route_origin,
        route_destination,
        net_margin,
        completed_at
      )
      SELECT
        src.new_load_id,
        src.shipper_id,
        src.route_origin,
        src.route_destination,
        src.weight_kg,
        src.load_type,
        src.pickup_time,
        src.dropoff_time,
        src.status,
        src.value,
        src.created_at,
        src.shipment_code,
        src.cargo,
        src.route_origin,
        src.route_destination,
        src.net_margin,
        src.completed_at
      FROM source src
      RETURNING id
    )
    INSERT INTO public.shipment_id_mapping (old_shipment_id, new_load_id)
    SELECT src.old_shipment_id, src.new_load_id
    FROM source src
    JOIN inserted_loads il
      ON il.id = src.new_load_id
    ON CONFLICT (old_shipment_id) DO NOTHING;
  END IF;
END
$$;

COMMIT;