-- ================================================================
-- DATABASE MIGRATION SCRIPT FOR PURCHASE ORDERS, INVENTORY & AP
-- Run this script in Supabase SQL Editor
-- ================================================================

-- 1. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  tax_id TEXT,
  credit_terms INTEGER DEFAULT 30, -- Days
  bank_name TEXT,
  bank_account_no TEXT,
  bank_account_name TEXT,
  company TEXT DEFAULT 'Shared', -- 'SST', 'Shinwa Anzen', 'Shared'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  po_number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
  company_name TEXT NOT NULL CHECK (company_name IN ('SST', 'Shinwa Anzen')),
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'ordered', 'partially_received', 'received', 'cancelled'
  issue_date DATE DEFAULT CURRENT_DATE NOT NULL,
  expected_delivery_date DATE,
  credit_terms INTEGER DEFAULT 30,
  global_discount_percent NUMERIC(5, 2) DEFAULT 0,
  has_vat BOOLEAN DEFAULT true,
  has_wht BOOLEAN DEFAULT false,
  wht_percent NUMERIC(5, 2) DEFAULT 3.00,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Purchase Order Items Table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  description TEXT,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  received_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Goods Receipts Table (GRN)
CREATE TABLE IF NOT EXISTS goods_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grn_number TEXT NOT NULL UNIQUE,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
  company_name TEXT NOT NULL,
  delivery_note_no TEXT, -- เลขที่ใบส่งของ / ใบกำกับภาษีของผู้ขาย
  received_date DATE DEFAULT CURRENT_DATE NOT NULL,
  received_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Goods Receipt Items Table
CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goods_receipt_id UUID REFERENCES goods_receipts(id) ON DELETE CASCADE,
  purchase_order_item_id UUID REFERENCES purchase_order_items(id) ON DELETE RESTRICT,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  quantity_received NUMERIC(10, 2) NOT NULL DEFAULT 1,
  company_target TEXT DEFAULT 'Shared', -- 'SST', 'Shinwa Anzen', 'Shared'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Inventory Table (Stock on Hand)
CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  company TEXT NOT NULL DEFAULT 'Shared', -- 'SST', 'Shinwa Anzen', 'Shared'
  quantity_on_hand NUMERIC(10, 2) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(10, 2) DEFAULT 5, -- Minimum stock alert level
  last_cost_price NUMERIC(12, 2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(product_id, company)
);

-- 7. Stock Movement Log
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  company TEXT NOT NULL DEFAULT 'Shared',
  movement_type TEXT NOT NULL, -- 'IN_PO', 'OUT_SALE', 'ADJUST_ADD', 'ADJUST_SUB'
  reference_type TEXT, -- 'GRN', 'QUOTATION', 'MANUAL'
  reference_id UUID,
  reference_number TEXT,
  quantity_change NUMERIC(10, 2) NOT NULL,
  quantity_after NUMERIC(10, 2) NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Supplier Bills Table (Accounts Payable)
CREATE TABLE IF NOT EXISTS supplier_bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_number TEXT NOT NULL, -- เลขที่ใบแจ้งหนี้ / ใบกำกับภาษีของผู้ขาย
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
  company_name TEXT NOT NULL,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  credit_terms_days INTEGER DEFAULT 30,
  due_date DATE NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(12, 2) DEFAULT 0,
  wht_amount NUMERIC(12, 2) DEFAULT 0,
  net_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid', 'paid', 'overdue'
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_slip_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_bills ENABLE ROW LEVEL SECURITY;

-- Allow full access to authenticated users
CREATE POLICY "Allow all to authenticated users" ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to authenticated users" ON purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to authenticated users" ON purchase_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to authenticated users" ON goods_receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to authenticated users" ON goods_receipt_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to authenticated users" ON inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to authenticated users" ON stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to authenticated users" ON supplier_bills FOR ALL TO authenticated USING (true) WITH CHECK (true);
