-- ==========================================
-- ADD DESCRIPTION COLUMN TO QUOTATION ITEMS
-- ==========================================

ALTER TABLE public.quotation_items ADD COLUMN IF NOT EXISTS description TEXT;
