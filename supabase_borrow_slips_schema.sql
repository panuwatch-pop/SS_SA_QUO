-- ================================================================
-- DATABASE MIGRATION SCRIPT FOR GOODS LOAN / BORROW SLIPS (ใบยืมสินค้า)
-- Run this script in Supabase SQL Editor
-- ================================================================

-- 1. Borrow Slips Table (ใบยืมสินค้า)
CREATE TABLE IF NOT EXISTS borrow_slips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  borrow_number TEXT NOT NULL UNIQUE,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL CHECK (company_name IN ('SST', 'Shinwa Anzen')),
  borrower_name TEXT NOT NULL,
  borrower_phone TEXT,
  borrower_email TEXT,
  borrower_address TEXT,
  contact_person TEXT, -- ผู้ประสานงาน / ผู้ส่งมอบสินค้า
  status TEXT NOT NULL DEFAULT 'borrowed' CHECK (status IN ('draft', 'borrowed', 'partially_returned', 'returned', 'overdue', 'cancelled')),
  borrow_date DATE DEFAULT CURRENT_DATE NOT NULL,
  expected_return_date DATE,
  actual_return_date DATE,
  purpose TEXT, -- เช่น 'ทดลองใช้งาน (Demo)', 'นำไปจัดแสดง (Event)', 'สำรองใช้งานระหว่างซ่อม', 'ยืมใช้งานชั่วคราว'
  project_name TEXT,
  location TEXT, -- สถานที่นำไปใช้งาน
  deposit_amount NUMERIC(12, 2) DEFAULT 0, -- เงินมัดจำถ้ามี
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0, -- มูลค่าสินค้ารวม
  notes TEXT DEFAULT '1. ผู้ยืมต้องดูแลรักษาสินค้าให้อยู่ในสภาพเรียบร้อยสมบูรณ์ หากเกิดความเสียหายหรือสูญหาย ผู้ยืมยินยอมชดใช้ตามราคาประเมินของสินค้า
2. กรุณาส่งคืนสินค้าตามกำหนดเวลาที่ระบุไว้ในเอกสารฉบับนี้
3. ผู้รับคืนจะทำการตรวจเช็คสภาพสินค้าก่อนลงนามรับคืนอย่างเป็นทางการ',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Borrow Slip Items Table (รายการสินค้าในใบยืม)
CREATE TABLE IF NOT EXISTS borrow_slip_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  borrow_slip_id UUID REFERENCES borrow_slips(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  description TEXT,
  serial_number TEXT, -- หมายเลขเครื่อง / S/N / รหัสเฉพาะ
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  returned_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0, -- มูลค่าประเมินต่อหน่วย
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  item_status TEXT DEFAULT 'borrowed' CHECK (item_status IN ('borrowed', 'returned', 'damaged', 'lost')),
  condition_notes TEXT, -- สภาพสินค้าก่อนยืม หรือ สภาพตอนส่งคืน
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_borrow_slips_company ON borrow_slips(company_name);
CREATE INDEX IF NOT EXISTS idx_borrow_slips_customer ON borrow_slips(customer_id);
CREATE INDEX IF NOT EXISTS idx_borrow_slips_quotation ON borrow_slips(quotation_id);
CREATE INDEX IF NOT EXISTS idx_borrow_slips_status ON borrow_slips(status);
CREATE INDEX IF NOT EXISTS idx_borrow_slip_items_borrow_id ON borrow_slip_items(borrow_slip_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE borrow_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrow_slip_items ENABLE ROW LEVEL SECURITY;

-- 5. Public RLS Policies for Anon & Authenticated
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access borrow_slips') THEN
    CREATE POLICY "Public Access borrow_slips" ON borrow_slips FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access borrow_slip_items') THEN
    CREATE POLICY "Public Access borrow_slip_items" ON borrow_slip_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
