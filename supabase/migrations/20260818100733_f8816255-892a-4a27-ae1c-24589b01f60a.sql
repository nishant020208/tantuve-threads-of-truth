
CREATE TYPE public.app_role AS ENUM ('weaver','admin','retailer');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "own profile write" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.gi_registry (
  craft_type text PRIMARY KEY,
  region text NOT NULL,
  official_description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gi_registry TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gi_registry TO authenticated;
GRANT ALL ON public.gi_registry TO service_role;
ALTER TABLE public.gi_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registry public read" ON public.gi_registry FOR SELECT USING (true);
CREATE POLICY "registry admin write" ON public.gi_registry FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.weavers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  photo_url text,
  region text NOT NULL,
  craft_type text NOT NULL,
  gi_registered boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  bio text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.weavers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.weavers TO authenticated;
GRANT INSERT ON public.weavers TO anon;
GRANT ALL ON public.weavers TO service_role;
ALTER TABLE public.weavers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weavers public read" ON public.weavers FOR SELECT USING (true);
CREATE POLICY "weaver apply" ON public.weavers FOR INSERT WITH CHECK (gi_registered = false AND status = 'pending');
CREATE POLICY "weaver update own" ON public.weavers FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND gi_registered = (SELECT w.gi_registered FROM public.weavers w WHERE w.id = weavers.id));
CREATE POLICY "weaver admin all" ON public.weavers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.retailers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  location text,
  contact text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.retailers TO anon, authenticated;
GRANT INSERT, UPDATE ON public.retailers TO authenticated;
GRANT ALL ON public.retailers TO service_role;
ALTER TABLE public.retailers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "retailers public read" ON public.retailers FOR SELECT USING (true);
CREATE POLICY "retailer own write" ON public.retailers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "retailer own update" ON public.retailers FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.products (
  id text PRIMARY KEY,
  weaver_id uuid NOT NULL REFERENCES public.weavers(id) ON DELETE CASCADE,
  craft_type text NOT NULL,
  yarn_source text,
  lot_id text,
  title text,
  photo_url text,
  status text NOT NULL DEFAULT 'in_progress',
  flagged boolean NOT NULL DEFAULT false,
  retailer_id uuid REFERENCES public.retailers(id) ON DELETE SET NULL,
  listed boolean NOT NULL DEFAULT false,
  price numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT USING (true);
CREATE POLICY "products weaver insert" ON public.products FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.weavers w WHERE w.id = weaver_id AND w.user_id = auth.uid()));
CREATE POLICY "products weaver update" ON public.products FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weavers w WHERE w.id = products.weaver_id AND w.user_id = auth.uid()));
CREATE POLICY "products retailer update" ON public.products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'retailer'));
CREATE POLICY "products admin all" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  seq integer NOT NULL,
  step_name text NOT NULL,
  step_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  entry_hash text NOT NULL,
  previous_entry_hash text,
  UNIQUE (product_id, seq)
);
GRANT SELECT ON public.ledger_entries TO anon, authenticated;
GRANT INSERT ON public.ledger_entries TO authenticated;
GRANT ALL ON public.ledger_entries TO service_role;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger public read" ON public.ledger_entries FOR SELECT USING (true);
CREATE POLICY "ledger insert" ON public.ledger_entries FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  reason text NOT NULL,
  reporter_contact text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.disputes TO authenticated;
GRANT INSERT ON public.disputes TO anon, authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disputes report" ON public.disputes FOR INSERT WITH CHECK (status = 'open');
CREATE POLICY "disputes admin read" ON public.disputes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.products p JOIN public.weavers w ON w.id = p.weaver_id WHERE p.id = disputes.product_id AND w.user_id = auth.uid()));
CREATE POLICY "disputes admin update" ON public.disputes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.scans TO anon, authenticated;
GRANT ALL ON public.scans TO service_role;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scans public read" ON public.scans FOR SELECT USING (true);
CREATE POLICY "scans public insert" ON public.scans FOR INSERT WITH CHECK (true);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''))
  ON CONFLICT (id) DO NOTHING;
  IF COALESCE(NEW.raw_user_meta_data->>'role','') IN ('weaver','admin','retailer') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.gi_registry (craft_type, region, official_description) VALUES
  ('Patola', 'Patan, Gujarat', 'Patan Patola is a double ikat woven silk textile from Patan, Gujarat, registered under the Geographical Indications of Goods Act. Genuine Patola is woven on a slanted handloom by resist-dyeing both warp and weft.'),
  ('Sambalpuri Bandha', 'Sambalpur, Odisha', 'Sambalpuri Bandha ikat is a tie-dye handloom textile of western Odisha where threads are bound and dyed before weaving, producing motifs of shankha, chakra and phula.'),
  ('Pochampally Ikat', 'Bhoodan Pochampally, Telangana', 'Pochampally Ikat is a GI-registered resist-dyed handloom silk and cotton weave from Telangana known for geometric diffusion-edged motifs.'),
  ('Banarasi Brocade', 'Varanasi, Uttar Pradesh', 'Banarasi brocade is a GI-registered handwoven silk textile of Varanasi with zari brocade work in gold and silver thread.');
