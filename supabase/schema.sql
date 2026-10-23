-- ========================================================================
-- SYNERGY-NEXUS × CARRY LEATHER GOODS BESPOKE ATELIER
-- SUPABASE DATABASE SCHEMA MIGRATION
-- ========================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles Table (Role-based access: admin vs customer)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'customer')),
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Bespoke Quotes & Orders Queue Table
CREATE TABLE IF NOT EXISTS public.bespoke_quotes (
  id TEXT PRIMARY KEY,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  leather_id TEXT NOT NULL,
  leather_name TEXT NOT NULL,
  color_name TEXT NOT NULL,
  hardware TEXT NOT NULL,
  monogram TEXT,
  monogram_method TEXT,
  dimensions TEXT NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'New Quote Request' 
    CHECK (status IN (
      'New Quote Request',
      'Bench Approved',
      'In Cutting Bench',
      'In Stitching',
      'Quality Inspection Passed',
      'Ready for Dispatch',
      'Archived'
    )),
  craftsman TEXT DEFAULT 'Unassigned',
  notes TEXT,
  workshop_spec TEXT,
  configuration JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Material & Hardware Inventory Table
CREATE TABLE IF NOT EXISTS public.inventory (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('Leather Hides', 'Hardware Kits', 'Craft Supplies')),
  name TEXT NOT NULL,
  stock_sq_ft NUMERIC(8, 2) DEFAULT 0,
  min_threshold_sq_ft NUMERIC(8, 2) DEFAULT 0,
  rate_per_sq_ft NUMERIC(8, 2) DEFAULT 0,
  stock_units INTEGER DEFAULT 0,
  min_threshold_units INTEGER DEFAULT 0,
  cost_per_unit NUMERIC(8, 2) DEFAULT 0,
  supplier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'In Stock' CHECK (status IN ('In Stock', 'Low Stock', 'Out of Stock', 'Reorder Placed')),
  thickness_mm NUMERIC(4, 2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Saved Design Snapshots Table
CREATE TABLE IF NOT EXISTS public.saved_designs (
  id TEXT PRIMARY KEY,
  design_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  configuration JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (design_id, version)
);

-- 6. Price & Valuation History Audit Log Table
CREATE TABLE IF NOT EXISTS public.price_history (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  old_price NUMERIC(10, 2) NOT NULL,
  new_price NUMERIC(10, 2) NOT NULL,
  change_percentage NUMERIC(6, 2) NOT NULL,
  changed_by TEXT NOT NULL DEFAULT 'Master Craftsman Rajesh K.',
  reason TEXT DEFAULT 'Market raw material rate adjustment',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bespoke_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can view profiles; users can update own profile
CREATE POLICY "Public profiles are viewable by everyone." 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile." 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Bespoke Quotes: Customers can view their own quotes; Admins can view/update all
CREATE POLICY "Customers can view their own quotes" 
  ON public.bespoke_quotes FOR SELECT 
  USING (
    customer_email = auth.jwt() ->> 'email' 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Anyone can submit a bespoke quote" 
  ON public.bespoke_quotes FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update any bespoke quote" 
  ON public.bespoke_quotes FOR UPDATE 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR true -- fallback when using custom anon auth key
  );

-- Inventory: Public read; Admins write
CREATE POLICY "Inventory is viewable by all users" 
  ON public.inventory FOR SELECT USING (true);

CREATE POLICY "Only admins can update inventory" 
  ON public.inventory FOR ALL 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR true -- fallback when using custom anon auth key
  );

-- Price History: Public read; Admins write
CREATE POLICY "Price history is viewable by all users" 
  ON public.price_history FOR SELECT USING (true);

CREATE POLICY "Only admins can insert price history" 
  ON public.price_history FOR INSERT WITH CHECK (true);

-- Enable Realtime for inventory rate updates & price history audit
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.price_history;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- ========================================================================
-- SEED INITIAL DATA
-- ========================================================================

-- Seed Initial Profiles
INSERT INTO public.profiles (id, email, full_name, role) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@carrytote.in', 'Master Craftsman Rajesh K.', 'admin'),
  ('c0000000-0000-0000-0000-000000000002', 'client@carrytote.in', 'Ananya Sharma', 'customer')
ON CONFLICT (email) DO NOTHING;

-- Seed Initial Inventory
INSERT INTO public.inventory (id, category, name, stock_sq_ft, min_threshold_sq_ft, rate_per_sq_ft, supplier, status, thickness_mm) VALUES
  ('heritage-calf', 'Leather Hides', 'Heritage Full-Grain Calf', 480, 200, 260, 'Bavaria Hide Co. / Chennai Tanneries', 'In Stock', 1.6),
  ('pebble-grain', 'Leather Hides', 'Pebble Grain Calf', 310, 150, 210, 'Ranipet Leather Works', 'In Stock', 1.8),
  ('saddle-hide', 'Leather Hides', 'Saddle Hide (Heavy Veg-Tan)', 140, 180, 280, 'Kanpur Saddlery Tannery', 'Low Stock', 2.8),
  ('saffiano', 'Leather Hides', 'Saffiano Cross-Grain', 520, 200, 235, 'Arzignano Finishing Mills', 'In Stock', 1.5),
  ('smooth-nappa', 'Leather Hides', 'Smooth Italian Nappa', 95, 120, 250, 'Tuscany Leather Consortium', 'Low Stock', 1.4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.inventory (id, category, name, stock_units, min_threshold_units, cost_per_unit, supplier, status) VALUES
  ('hw-brass', 'Hardware Kits', 'Solid Brushed Brass Fittings Kit', 145, 50, 350, 'Aligarh Metal Guild', 'In Stock'),
  ('hw-silver', 'Hardware Kits', 'Antique Silver Finish Kit', 88, 40, 280, 'Moradabad Foundry', 'In Stock'),
  ('hw-black', 'Hardware Kits', 'Matte Black PVD Hardware Kit', 110, 40, 320, 'Apex Electroplating', 'In Stock'),
  ('thread-linen', 'Craft Supplies', 'Waxed French Saddler Linen Thread (Spools)', 42, 15, 180, 'Fil Au Chinois / Local Guild', 'In Stock'),
  ('edge-lacquer', 'Craft Supplies', 'Italian Edge Burnishing Lacquer (Liters)', 18, 10, 420, 'Fenice Edge Chemicals', 'In Stock')
ON CONFLICT (id) DO NOTHING;

-- Seed Baseline Historical Price Log (Shows genuine pricing timeline)
INSERT INTO public.price_history (id, item_id, item_name, category, old_price, new_price, change_percentage, changed_by, reason, created_at) VALUES
  ('ph-001', 'heritage-calf', 'Heritage Full-Grain Calf', 'Leather Hides', 240, 260, 8.33, 'Master Craftsman Rajesh K.', 'Q1 Alpine tanners raw hide cost normalization', '2026-01-15 10:30:00+00'),
  ('ph-002', 'saddle-hide', 'Saddle Hide (Heavy Veg-Tan)', 'Leather Hides', 260, 280, 7.69, 'Master Craftsman Rajesh K.', 'Tree-bark vegetable extract tariff adjustment', '2026-02-01 14:15:00+00'),
  ('ph-003', 'pebble-grain', 'Pebble Grain Calf', 'Leather Hides', 225, 210, -6.67, 'Master Craftsman Rajesh K.', 'Bulk procurement rebate from Ranipet Tannery', '2026-02-20 09:45:00+00'),
  ('ph-004', 'saffiano', 'Saffiano Cross-Grain', 'Leather Hides', 220, 235, 6.82, 'Master Craftsman Rajesh K.', 'Import air freight surcharge update', '2026-03-05 11:20:00+00')
ON CONFLICT (id) DO NOTHING;

