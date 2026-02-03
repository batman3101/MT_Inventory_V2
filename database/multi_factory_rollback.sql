-- ============================================================
-- MULTI-FACTORY MIGRATION - DOWN (ROLLBACK)
-- ============================================================
-- WARNING: Run this only if you need to completely reverse the migration
-- This will remove all factory associations but preserve the data

-- 1. Remove unique constraint
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS uq_inventory_part_factory;

-- 2. Drop indexes
DROP INDEX IF EXISTS idx_inventory_factory;
DROP INDEX IF EXISTS idx_inbound_factory;
DROP INDEX IF EXISTS idx_outbound_factory;
DROP INDEX IF EXISTS idx_part_prices_factory;
DROP INDEX IF EXISTS idx_suppliers_factory;
DROP INDEX IF EXISTS idx_users_factory;

-- 3. Remove factory_id columns from all tables
ALTER TABLE users DROP COLUMN IF EXISTS factory_id;
ALTER TABLE suppliers DROP COLUMN IF EXISTS factory_id;
ALTER TABLE part_prices DROP COLUMN IF EXISTS factory_id;
ALTER TABLE outbound DROP COLUMN IF EXISTS factory_id;
ALTER TABLE inbound DROP COLUMN IF EXISTS factory_id;
ALTER TABLE inventory DROP COLUMN IF EXISTS factory_id;

-- 4. Drop RLS policies that reference factory_id
DROP POLICY IF EXISTS "factory_read_inventory" ON inventory;
DROP POLICY IF EXISTS "factory_write_inventory" ON inventory;
DROP POLICY IF EXISTS "factory_update_inventory" ON inventory;
DROP POLICY IF EXISTS "factory_delete_inventory" ON inventory;
-- Repeat for inbound, outbound, suppliers, part_prices...
DROP POLICY IF EXISTS "factory_read_inbound" ON inbound;
DROP POLICY IF EXISTS "factory_write_inbound" ON inbound;
DROP POLICY IF EXISTS "factory_update_inbound" ON inbound;
DROP POLICY IF EXISTS "factory_delete_inbound" ON inbound;
DROP POLICY IF EXISTS "factory_read_outbound" ON outbound;
DROP POLICY IF EXISTS "factory_write_outbound" ON outbound;
DROP POLICY IF EXISTS "factory_update_outbound" ON outbound;
DROP POLICY IF EXISTS "factory_delete_outbound" ON outbound;
DROP POLICY IF EXISTS "factory_read_suppliers" ON suppliers;
DROP POLICY IF EXISTS "factory_write_suppliers" ON suppliers;
DROP POLICY IF EXISTS "factory_update_suppliers" ON suppliers;
DROP POLICY IF EXISTS "factory_delete_suppliers" ON suppliers;
DROP POLICY IF EXISTS "factory_read_part_prices" ON part_prices;
DROP POLICY IF EXISTS "factory_write_part_prices" ON part_prices;
DROP POLICY IF EXISTS "factory_update_part_prices" ON part_prices;
DROP POLICY IF EXISTS "factory_delete_part_prices" ON part_prices;

-- 5. Drop helper functions
DROP FUNCTION IF EXISTS auth.is_system_admin();

-- 6. Restore original auth.current_user_info (remove factory_id)
CREATE OR REPLACE FUNCTION auth.current_user_info()
RETURNS TABLE (
    user_id UUID,
    username VARCHAR(50),
    role VARCHAR(20),
    department_id UUID,
    is_active BOOLEAN
)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT u.user_id, u.username, u.role, u.department_id, u.is_active
  FROM public.users u
  WHERE u.user_id = (current_setting('app.current_user_id', true))::UUID
    AND u.is_active = true;
$$;

-- 7. Drop factories table
DROP TABLE IF EXISTS factories CASCADE;

-- 8. Re-create original RLS policies if needed (application-specific)
-- [Add your original RLS policies here if you had any]
