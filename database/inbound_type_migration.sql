-- Inbound Type Migration
-- Adds inbound_type column to distinguish purchase types:
--   'purchase'    = 신품 (new part purchase)
--   'warranty'    = 보증수리 (warranty repair, free)
--   'paid_repair' = 유상수리 (paid repair)

-- 1. Add inbound_type column with default 'purchase'
ALTER TABLE inbound ADD COLUMN IF NOT EXISTS inbound_type VARCHAR(20) DEFAULT 'purchase';

-- 2. Migrate existing warranty items (unit_price = 0 or NULL)
UPDATE inbound SET inbound_type = 'warranty' WHERE unit_price IS NULL OR unit_price = 0;

-- 3. Ensure all remaining records have explicit type
UPDATE inbound SET inbound_type = 'purchase' WHERE inbound_type IS NULL;
