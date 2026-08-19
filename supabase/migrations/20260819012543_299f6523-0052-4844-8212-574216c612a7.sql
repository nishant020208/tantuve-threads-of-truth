
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  weaver_user uuid;
  retailer_user uuid;
  w1 uuid;
  w2 uuid;
  r1 uuid;
  prod record;
  steps text[][];
  i int;
  seqn int;
  prev text;
  ts timestamptz;
  payload text;
  h text;
  sd jsonb;
BEGIN
  SELECT id INTO weaver_user FROM auth.users WHERE email = 'weaver.demo@tantuve.app';
  SELECT id INTO retailer_user FROM auth.users WHERE email = 'retailer.demo@tantuve.app';

  INSERT INTO public.weavers (user_id, name, region, craft_type, gi_registered, status, bio, photo_url)
  VALUES (weaver_user, 'Meera Devi Weaving Collective', 'Sambalpur, Odisha', 'Sambalpuri Ikat', true, 'approved',
    'Third-generation ikat weavers working with natural dyes and pit looms in Sambalpur.', null)
  RETURNING id INTO w1;

  INSERT INTO public.weavers (user_id, name, region, craft_type, gi_registered, status, bio)
  VALUES (null, 'Patan Patola Karigars', 'Patan, Gujarat', 'Patan Patola', true, 'approved',
    'Double-ikat Patola specialists; a single saree can take six months on the loom.')
  RETURNING id INTO w2;

  INSERT INTO public.retailers (user_id, name, location, contact)
  VALUES (retailer_user, 'Tantuve Flagship Store', 'Bengaluru, Karnataka', 'retailer.demo@tantuve.app')
  RETURNING id INTO r1;

  INSERT INTO public.products (id, weaver_id, craft_type, yarn_source, lot_id, title, status, listed, price, retailer_id)
  VALUES
    ('TNT-7K2M-9QXA', w1, 'Sambalpuri Ikat', 'Handspun mulberry silk, Berhampur', 'LOT-SB-014', 'Sambalpuri Ikat silk saree — vermilion field', 'sold', true, 18500, r1),
    ('TNT-3B8V-5HTN', w2, 'Patan Patola', 'Degummed silk yarn, Surat', 'LOT-PT-002', 'Patan Patola double-ikat saree — navratna motif', 'in_retail', true, 145000, r1),
    ('TNT-9D4L-2WRE', w1, 'Sambalpuri Ikat', 'Handspun cotton, Bargarh', 'LOT-SB-015', 'Sambalpuri cotton dupatta — indigo bandha', 'completed', false, 4200, null);

  FOR prod IN SELECT id, created_at FROM public.products LOOP
    steps := ARRAY[
      ARRAY['yarn_sourcing', 'Yarn purchased from the registered cooperative and lot-tagged.'],
      ARRAY['dyeing', 'Tie-and-dye with natural madder, indigo and turmeric baths.'],
      ARRAY['weaving', 'Woven on a traditional pit loom over several weeks.'],
      ARRAY['finishing', 'Washed, pressed, quality checked and tagged for dispatch.']
    ];
    prev := null;
    seqn := 0;
    FOR i IN 1..4 LOOP
      seqn := seqn + 1;
      ts := now() - ((5 - i) * interval '11 days');
      sd := jsonb_build_object('note', steps[i][2]);
      payload := prod.id || '|' || seqn::text || '|' || steps[i][1] || '|' ||
        '{"note":' || to_json(steps[i][2])::text || '}' || '|' ||
        to_char(ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') || '|' ||
        COALESCE(prev, 'GENESIS');
      h := encode(extensions.digest(payload, 'sha256'), 'hex');
      INSERT INTO public.ledger_entries (product_id, seq, step_name, step_data, actor, timestamp, entry_hash, previous_entry_hash)
      VALUES (prod.id, seqn, steps[i][1], sd, 'Weaver', ts, h, prev);
      prev := h;
    END LOOP;
  END LOOP;

  INSERT INTO public.scans (product_id)
  SELECT id FROM public.products, generate_series(1, 7);
END $$;
