BEGIN;

UPDATE public.loads
SET
  load_type = CASE
    WHEN lower(load_type) IN ('dry goods', 'general freight') THEN 'General Dry Freight'
    WHEN lower(load_type) IN ('reefer produce', 'refrigerated produce', 'frozen goods', 'perishable food') THEN 'Non-perishable Food & Beverages'
    WHEN lower(load_type) IN ('construction steel', 'flatbed steel', 'steel') THEN 'Packaged Building Materials'
    WHEN lower(load_type) = 'consumer electronics' THEN 'Electronics & Appliances'
    WHEN lower(load_type) IN ('hazardous', 'hazardous chemicals') THEN 'Packaged Consumer Goods'
    ELSE load_type
  END,
  cargo = CASE
    WHEN cargo IS NULL OR btrim(cargo) = '' THEN cargo
    WHEN lower(cargo) IN ('refrigerated produce pallets', 'produce pallets') THEN 'Palletized non-perishable groceries'
    WHEN lower(cargo) IN ('frozen seafood', 'frozen goods', 'perishable food') THEN 'Cartons of packaged snacks'
    WHEN lower(cargo) IN ('steel beams', 'construction steel') THEN 'Packaged building materials'
    WHEN lower(cargo) IN ('hazardous chemicals', 'hazardous') THEN 'Boxed household supplies'
    WHEN lower(cargo) LIKE '%refrigerated%' OR lower(cargo) LIKE '%reefer%' OR lower(cargo) LIKE '%produce%' THEN 'Palletized non-perishable groceries'
    WHEN lower(cargo) LIKE '%frozen%' OR lower(cargo) LIKE '%perishable%' THEN 'Cartons of packaged snacks'
    WHEN lower(cargo) LIKE '%hazard%' OR lower(cargo) LIKE '%chemical%' THEN 'Boxed household supplies'
    WHEN lower(cargo) LIKE '%steel%' OR lower(cargo) LIKE '%construction%' THEN 'Packaged building materials'
    ELSE cargo
  END
WHERE
  lower(load_type) IN (
    'dry goods',
    'general freight',
    'reefer produce',
    'refrigerated produce',
    'frozen goods',
    'perishable food',
    'construction steel',
    'flatbed steel',
    'steel',
    'consumer electronics',
    'hazardous',
    'hazardous chemicals'
  )
  OR lower(coalesce(cargo, '')) LIKE '%refrigerated%'
  OR lower(coalesce(cargo, '')) LIKE '%reefer%'
  OR lower(coalesce(cargo, '')) LIKE '%produce%'
  OR lower(coalesce(cargo, '')) LIKE '%frozen%'
  OR lower(coalesce(cargo, '')) LIKE '%perishable%'
  OR lower(coalesce(cargo, '')) LIKE '%hazard%'
  OR lower(coalesce(cargo, '')) LIKE '%chemical%'
  OR lower(coalesce(cargo, '')) LIKE '%steel%'
  OR lower(coalesce(cargo, '')) LIKE '%construction%';

COMMIT;
