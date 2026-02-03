-- ============================================================
-- MULTI-FACTORY MIGRATION - UP
-- ============================================================

-- 1. Create factories lookup table
CREATE TABLE factories (
  factory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_code VARCHAR(10) NOT NULL UNIQUE,  -- 'ALT', 'ALV'
  factory_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Seed factory data
INSERT INTO factories (factory_code, factory_name, description) VALUES
  ('ALT', '1공장 (ALT)', 'ALMUS Technology - 1공장'),
  ('ALV', '2공장 (ALV)', 'ALMUS Vietnam - 2공장');

-- 3. Add factory_id to factory-specific tables
ALTER TABLE inventory ADD COLUMN factory_id UUID REFERENCES factories(factory_id);
ALTER TABLE inbound ADD COLUMN factory_id UUID REFERENCES factories(factory_id);
ALTER TABLE outbound ADD COLUMN factory_id UUID REFERENCES factories(factory_id);
ALTER TABLE part_prices ADD COLUMN factory_id UUID REFERENCES factories(factory_id);
ALTER TABLE suppliers ADD COLUMN factory_id UUID REFERENCES factories(factory_id);

-- 4. Add factory assignment to users
ALTER TABLE users ADD COLUMN factory_id UUID REFERENCES factories(factory_id);

-- 5. Backfill existing data to ALT (1공장) as default
UPDATE inventory SET factory_id = (SELECT factory_id FROM factories WHERE factory_code = 'ALT');
UPDATE inbound SET factory_id = (SELECT factory_id FROM factories WHERE factory_code = 'ALT');
UPDATE outbound SET factory_id = (SELECT factory_id FROM factories WHERE factory_code = 'ALT');
UPDATE part_prices SET factory_id = (SELECT factory_id FROM factories WHERE factory_code = 'ALT');
UPDATE suppliers SET factory_id = (SELECT factory_id FROM factories WHERE factory_code = 'ALT');
UPDATE users SET factory_id = (SELECT factory_id FROM factories WHERE factory_code = 'ALT');

-- 6. Make factory_id NOT NULL after backfill
ALTER TABLE inventory ALTER COLUMN factory_id SET NOT NULL;
ALTER TABLE inbound ALTER COLUMN factory_id SET NOT NULL;
ALTER TABLE outbound ALTER COLUMN factory_id SET NOT NULL;
ALTER TABLE part_prices ALTER COLUMN factory_id SET NOT NULL;
ALTER TABLE suppliers ALTER COLUMN factory_id SET NOT NULL;
-- users.factory_id stays nullable (system_admin may not have a factory)

-- 7. Create indexes for performance
CREATE INDEX idx_inventory_factory ON inventory(factory_id);
CREATE INDEX idx_inbound_factory ON inbound(factory_id);
CREATE INDEX idx_outbound_factory ON outbound(factory_id);
CREATE INDEX idx_part_prices_factory ON part_prices(factory_id);
CREATE INDEX idx_suppliers_factory ON suppliers(factory_id);
CREATE INDEX idx_users_factory ON users(factory_id);

-- 8. Unique constraint: one inventory record per part per factory
ALTER TABLE inventory ADD CONSTRAINT uq_inventory_part_factory UNIQUE (part_id, factory_id);
