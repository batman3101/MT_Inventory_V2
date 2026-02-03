-- Update auth.current_user_info to include factory_id
CREATE OR REPLACE FUNCTION auth.current_user_info()
RETURNS TABLE (
    user_id UUID,
    username VARCHAR(50),
    role VARCHAR(20),
    department_id UUID,
    is_active BOOLEAN,
    factory_id UUID
)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT u.user_id, u.username, u.role, u.department_id, u.is_active, u.factory_id
  FROM public.users u
  WHERE u.user_id = (current_setting('app.current_user_id', true))::UUID
    AND u.is_active = true;
$$;

-- Helper: check if user is system_admin
CREATE OR REPLACE FUNCTION auth.is_system_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.current_user_info() WHERE role = 'system_admin'
  );
$$;

-- Example RLS policy pattern for factory-specific tables (apply to inventory, inbound, outbound, suppliers, part_prices):
-- SELECT: everyone can read all factories (observer mode)
-- INSERT/UPDATE/DELETE: only own factory OR system_admin

-- inventory example:
DROP POLICY IF EXISTS "factory_read_inventory" ON inventory;
CREATE POLICY "factory_read_inventory" ON inventory FOR SELECT USING (true);

DROP POLICY IF EXISTS "factory_write_inventory" ON inventory;
CREATE POLICY "factory_write_inventory" ON inventory FOR INSERT
WITH CHECK (
  auth.is_system_admin()
  OR factory_id = (SELECT factory_id FROM auth.current_user_info() LIMIT 1)
);

DROP POLICY IF EXISTS "factory_update_inventory" ON inventory;
CREATE POLICY "factory_update_inventory" ON inventory FOR UPDATE
USING (
  auth.is_system_admin()
  OR factory_id = (SELECT factory_id FROM auth.current_user_info() LIMIT 1)
);

DROP POLICY IF EXISTS "factory_delete_inventory" ON inventory;
CREATE POLICY "factory_delete_inventory" ON inventory FOR DELETE
USING (
  auth.is_system_admin()
  OR factory_id = (SELECT factory_id FROM auth.current_user_info() LIMIT 1)
);

-- Repeat same pattern for: inbound, outbound, suppliers, part_prices
