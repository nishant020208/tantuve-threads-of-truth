-- Feature 1: Fair-wage transparency
ALTER TABLE products ADD COLUMN IF NOT EXISTS retail_listed_price numeric;

-- Feature 3: Weaver craft badges
ALTER TABLE weavers ADD COLUMN IF NOT EXISTS badges jsonb DEFAULT '[]'::jsonb;

-- Feature 4: Direct buyer inquiries
CREATE TABLE IF NOT EXISTS inquiries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  weaver_id uuid NOT NULL REFERENCES weavers(id) ON DELETE CASCADE,
  message text NOT NULL,
  contact_info text NOT NULL,
  submitted_at timestamptz DEFAULT now(),
  read boolean DEFAULT false
);
ALTER TABLE inquiries DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_inquiries_weaver_id ON inquiries(weaver_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_product_id ON inquiries(product_id);
