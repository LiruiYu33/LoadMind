DROP POLICY IF EXISTS "carriers view open loads" ON public.loads;

CREATE POLICY "carriers view open and assigned loads"
ON public.loads
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'carrier')
  AND (
    status = 'open'
    OR assigned_carrier_id = auth.uid()
  )
);
