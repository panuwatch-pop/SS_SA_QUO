-- Create customers table
CREATE TABLE customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  contact_line TEXT,
  credit_terms TEXT,
  company TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create products table
CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  image_url TEXT,
  product_code TEXT,
  category TEXT,
  company TEXT,
  unit TEXT,
  barcode TEXT,
  additional_images TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create quotations table
CREATE TABLE quotations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quotation_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL CHECK (company_name IN ('SST', 'Shinwa Anzen')),
  project_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  global_discount_percent NUMERIC(5, 2) DEFAULT 0,
  has_vat BOOLEAN DEFAULT true,
  has_wht BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create quotation_items table
CREATE TABLE quotation_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  discount NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all authenticated users to full access
CREATE POLICY "Allow full access to authenticated users" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to authenticated users" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to authenticated users" ON quotations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to authenticated users" ON quotation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create companies table for settings
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  address TEXT,
  tax_id TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to authenticated users" ON companies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default companies
INSERT INTO companies (id, full_name, address, tax_id) 
VALUES 
('SST', 'Siam Safety Tech Co., Ltd.', '123 Safety Road, Bangkok 10110', '0105555555555'),
('Shinwa Anzen', 'Shinwa Anzen Co., Ltd.', '456 Japan Ave, Bangkok 10110', '0106666666666')
ON CONFLICT (id) DO NOTHING;
