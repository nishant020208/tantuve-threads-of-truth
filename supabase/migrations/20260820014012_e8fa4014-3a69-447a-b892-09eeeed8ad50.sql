-- 1. Move retailer contact details into a protected table
CREATE TABLE IF NOT EXISTS public.retailer_contacts (
  retailer_id uuid PRIMARY KEY REFERENCES public.retailers(id) ON DELETE CASCADE,
  contact text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.retailer_contacts TO authenticated;
GRANT ALL ON public.retailer_contacts TO service_role;

ALTER TABLE public.retailer_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "retailer contact owner read" ON public.retailer_contacts
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.retailers r
      WHERE r.id = retailer_contacts.retailer_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "retailer contact owner write" ON public.retailer_contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.retailers r
      WHERE r.id = retailer_contacts.retailer_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "retailer contact owner update" ON public.retailer_contacts
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.retailers r
      WHERE r.id = retailer_contacts.retailer_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.retailers r
      WHERE r.id = retailer_contacts.retailer_id AND r.user_id = auth.uid()
    )
  );

INSERT INTO public.retailer_contacts (retailer_id, contact)
SELECT id, contact FROM public.retailers WHERE contact IS NOT NULL
ON CONFLICT (retailer_id) DO NOTHING;

ALTER TABLE public.retailers DROP COLUMN contact;

-- 2. Weaver applications must belong to an authenticated user
DROP POLICY IF EXISTS "weaver apply" ON public.weavers;
CREATE POLICY "weaver apply" ON public.weavers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND gi_registered = false AND status = 'pending');

-- 3. Lock privileged weaver columns with a trigger instead of a self-referential subquery
DROP POLICY IF EXISTS "weaver update own" ON public.weavers;
CREATE POLICY "weaver update own" ON public.weavers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.protect_weaver_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.gi_registered IS DISTINCT FROM OLD.gi_registered
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Only the GI authority can change approval status, GI registration or ownership';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_weaver_privileged_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_weaver_privileged_columns ON public.weavers;
CREATE TRIGGER protect_weaver_privileged_columns
  BEFORE UPDATE ON public.weavers
  FOR EACH ROW EXECUTE FUNCTION public.protect_weaver_privileged_columns();

-- 4. Ledger entries only by the owning weaver (or admin)
DROP POLICY IF EXISTS "ledger insert" ON public.ledger_entries;
CREATE POLICY "ledger insert" ON public.ledger_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.weavers w ON w.id = p.weaver_id
      WHERE p.id = ledger_entries.product_id AND w.user_id = auth.uid()
    )
  );

-- 5. Notifications are system-created only
DROP POLICY IF EXISTS "notifications insert" ON public.notifications;

-- 6. Retailers may only claim unassigned textiles and edit their own
DROP POLICY IF EXISTS "products retailer update" ON public.products;
CREATE POLICY "products retailer update" ON public.products
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'retailer') AND (
      retailer_id IS NULL OR EXISTS (
        SELECT 1 FROM public.retailers r
        WHERE r.id = products.retailer_id AND r.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'retailer') AND EXISTS (
      SELECT 1 FROM public.retailers r
      WHERE r.id = products.retailer_id AND r.user_id = auth.uid()
    )
  );

-- 7. Dispute reporter contact stays out of anonymous reach
REVOKE ALL ON public.disputes FROM anon;
GRANT INSERT ON public.disputes TO anon;

-- 8. Internal trigger function should not be callable through the API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;