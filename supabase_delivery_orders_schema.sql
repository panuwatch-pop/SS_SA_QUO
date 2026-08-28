-- ================================================================
-- DATABASE MIGRATION SCRIPT FOR TEMPORARY DELIVERY ORDERS (DO)
-- Run this script in Supabase SQL Editor
-- ================================================================

-- 1. Delivery Orders Table
CREATE TABLE IF NOT EXISTS delivery_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  do_number TEXT NOT NULL UNIQUE,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
  company_name TEXT NOT NULL CHECK (company_name IN ('SST', 'Shinwa Anzen')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'delivering', 'delivered', 'cancelled')),
  issue_date DATE DEFAULT CURRENT_DATE NOT NULL,
  expected_delivery_date DATE,
  customer_po_no TEXT,
  project_name TEXT,
  delivery_address TEXT,
  transport_by TEXT, -- e.g. 'รถบริษัท', 'Flash Express', 'Kerry', 'Grab Express', 'ลูกค้ามารับเอง'
  driver_name TEXT, -- e.g. 'สมชาย ใจดี (ทะเบียน 1กข-9999)'
  driver_phone TEXT,
  hide_price BOOLEAN DEFAULT false,
  global_discount_percent NUMERIC(5, 2) DEFAULT 0,
  has_vat BOOLEAN DEFAULT true,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '1. ได้รับสินค้าตามรายการข้างต้นถูกต้องครบถ้วนและอยู่ในสภาพเรียบร้อยสมบูรณ์\n2. กรุณาลงลายมือชื่อและประทับตราสำคัญ (ถ้ามี) เพื่อเป็นหลักฐานในการรับมอบสินค้า',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Delivery Order Items Table
CREATE TABLE IF NOT EXISTS delivery_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_order_id UUID REFERENCES delivery_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  description TEXT,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_delivery_orders_company ON delivery_orders(company_name);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_customer ON delivery_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_quotation ON delivery_orders(quotation_id);
CREATE INDEX IF NOT EXISTS idx_delivery_order_items_do_id ON delivery_order_items(delivery_order_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_order_items ENABLE ROW LEVEL SECURITY;

-- 5. Public RLS Policies for Anon & Authenticated
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access delivery_orders') THEN
    CREATE POLICY "Public Access delivery_orders" ON delivery_orders FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access delivery_order_items') THEN
    CREATE POLICY "Public Access delivery_order_items" ON delivery_order_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
