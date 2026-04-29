BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'shipments'
  ) THEN
    DROP TABLE public.shipments;
  END IF;
END
$$;

DROP TABLE IF EXISTS public.shipment_id_mapping;

COMMIT;