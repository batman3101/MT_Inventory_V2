# Multi-Factory Support Implementation Plan

## Context

### Original Request
다중 공장(ALT/ALV) 지원 기능 구현 - 1공장(ALT) / 2공장(ALV) 분리하여 재고, 입출고, 공급업체/단가를 공장별로 관리. 부품 마스터 데이터는 공용.

### Architecture Summary
- Frontend: React + TypeScript, Ant Design 5, Zustand stores, Supabase JS client direct
- 8 services (parts, inventory, inbound, outbound, suppliers, partPrice, departments, users)
- 9 Zustand stores (same names + auth)
- All services use pattern: `supabase.from('table').select().eq()` - no factory_id filtering exists
- Sidebar bottom: user email -> logout button -> LanguageSwitcher (button group style)
- Auth store persists to localStorage via Zustand persist middleware
- User has `user_settings: Record<string, unknown>` JSON field available
- UserRole: system_admin, admin, user, viewer (Note: `manager` role exists in i18n but NOT in UserRole enum - treat as alias for `admin`)
- RLS uses `auth.current_user_info()` and `auth.has_permission()` functions

### Key Insight
The `suppliers` table is currently global. Requirement says suppliers+prices are factory-specific. The `inventory`, `inbound`, `outbound`, `part_prices` tables all need `factory_id`. The `parts` table stays shared. `suppliers` needs a junction table or `factory_id` column.

---

## Work Objectives

### Core Objective
Add `factory_id` column to factory-specific tables, create a factory selector UI, modify all services/stores to filter by active factory, and implement observer (view-only) mode for other factories.

### Deliverables
1. Database migration SQL (new `factories` table + `factory_id` columns) + ROLLBACK script
2. Factory selector component in sidebar
3. Factory-aware Zustand store (`useFactoryStore`)
4. All services updated with `factory_id` filtering
5. Observer mode for cross-factory viewing
6. system_admin full access across factories
7. i18n translations for factory-related UI
8. Updated TypeScript types
9. Analytics page factory filtering
10. Form components with factory-filtered dropdowns

### Definition of Done
- Switching factory selector reloads all data for selected factory
- Non-system_admin users can only write to their assigned factory
- Non-system_admin users can view (read-only) other factories
- Parts master data (code, name, category, unit, min_stock, status) is shared across factories
- Suppliers and prices are factory-specific
- All existing functionality works unchanged for a single factory
- Analytics page respects factory selection
- Reference numbers include factory code (e.g., `IN-ALT-20250518-001`)

---

## Guardrails

### MUST Have
- `factories` lookup table with `factory_id`, `factory_code` (ALT/ALV), `factory_name`
- `factory_id` column on: `inventory`, `inbound`, `outbound`, `part_prices`, `suppliers`
- Factory selector in sidebar between logout button and LanguageSwitcher
- Observer badge/indicator when viewing another factory
- Disable all create/edit/delete buttons in observer mode
- system_admin bypasses all factory restrictions
- Migration script that sets existing data to a default factory (ALT)
- DOWN migration (rollback) script for safety

### MUST NOT Have
- `factory_id` on `parts` table (parts are shared)
- `factory_id` on `departments` table (departments are shared)
- Breaking changes to existing data (migration must preserve all current records)
- Multiple Supabase projects (single project, single database)

---

## Database Design

### Task DB-1: Create factories table and add factory_id columns

**SQL Migration (UP):**

```sql
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
```

**Acceptance Criteria:**
- All existing data preserved with ALT factory_id
- factories table has ALT and ALV rows
- All factory-specific tables have factory_id NOT NULL (except users)
- Indexes created for query performance

---

### Task DB-1-ROLLBACK: DOWN migration script (CRITICAL - Issue #5)

**SQL Migration (DOWN):**

```sql
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
```

**Acceptance Criteria:**
- Complete rollback removes all factory-related schema changes
- Original data is preserved (minus factory associations)
- No orphaned constraints or indexes remain
- Original RLS policies can be restored

---

### Task DB-2: Update RLS policies for factory-aware access

```sql
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
```

**Acceptance Criteria:**
- All users can SELECT from any factory (observer mode)
- Only own-factory or system_admin can INSERT/UPDATE/DELETE
- RLS enforced at database level as safety net

---

### Task DB-3: Update get_latest_part_prices RPC function (CRITICAL - Issue #4)

**File:** Supabase SQL Editor (RPC function)

**Current function at `partPrice.service.ts` line 67:**
```typescript
const { data, error } = await supabase.rpc('get_latest_part_prices');
```

**Updated RPC function with factory_id parameter:**

```sql
-- Drop old function
DROP FUNCTION IF EXISTS get_latest_part_prices();

-- Create new function with factory_id parameter
CREATE OR REPLACE FUNCTION get_latest_part_prices(p_factory_id UUID)
RETURNS TABLE (
    price_id UUID,
    part_id UUID,
    unit_price NUMERIC,
    currency VARCHAR(10),
    supplier_id UUID,
    effective_from DATE,
    effective_to DATE,
    is_current BOOLEAN,
    created_at TIMESTAMPTZ,
    created_by VARCHAR(100),
    supplier_name VARCHAR(100),
    source TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Get latest prices from part_prices table for the specific factory
    WITH ranked_prices AS (
        SELECT
            pp.price_id,
            pp.part_id,
            pp.unit_price,
            pp.currency,
            pp.supplier_id,
            pp.effective_from,
            pp.effective_to,
            pp.is_current,
            pp.created_at,
            pp.created_by,
            s.supplier_name,
            'part_prices'::TEXT as source,
            ROW_NUMBER() OVER (PARTITION BY pp.part_id ORDER BY pp.effective_from DESC) as rn
        FROM part_prices pp
        LEFT JOIN suppliers s ON pp.supplier_id = s.supplier_id
        WHERE pp.factory_id = p_factory_id
    ),
    -- Fallback to inbound prices for parts without part_prices
    inbound_prices AS (
        SELECT
            i.inbound_id as price_id,
            i.part_id,
            i.unit_price,
            i.currency,
            i.supplier_id,
            i.inbound_date as effective_from,
            NULL::DATE as effective_to,
            false as is_current,
            i.created_at,
            i.created_by,
            s.supplier_name,
            'inbound'::TEXT as source,
            ROW_NUMBER() OVER (PARTITION BY i.part_id ORDER BY i.inbound_date DESC) as rn
        FROM inbound i
        LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
        WHERE i.factory_id = p_factory_id
          AND i.part_id NOT IN (
              SELECT DISTINCT part_id FROM part_prices WHERE factory_id = p_factory_id
          )
    )
    SELECT
        rp.price_id, rp.part_id, rp.unit_price, rp.currency, rp.supplier_id,
        rp.effective_from, rp.effective_to, rp.is_current, rp.created_at,
        rp.created_by, rp.supplier_name, rp.source
    FROM ranked_prices rp
    WHERE rp.rn = 1
    UNION ALL
    SELECT
        ip.price_id, ip.part_id, ip.unit_price, ip.currency, ip.supplier_id,
        ip.effective_from, ip.effective_to, ip.is_current, ip.created_at,
        ip.created_by, ip.supplier_name, ip.source
    FROM inbound_prices ip
    WHERE ip.rn = 1;
END;
$$;
```

**Service update (`partPrice.service.ts` line 66-67):**
```typescript
// BEFORE:
const { data, error } = await supabase.rpc('get_latest_part_prices');

// AFTER:
export async function getLatestPartPrices(): Promise<Record<string, PartPrice>> {
  const factoryId = getFactoryId();  // Use shared helper
  const { data, error } = await supabase.rpc('get_latest_part_prices', {
    p_factory_id: factoryId
  });
  // ... rest of function unchanged
}
```

**Acceptance Criteria:**
- RPC function accepts factory_id parameter
- Returns only prices for the specified factory
- Fallback to inbound prices respects factory filter
- Service passes factory_id to RPC call

---

## Frontend Implementation

### Task FE-1: TypeScript types update

**File:** `C:\Work Drive\APP\MT_Inventory_V2\src\types\database.types.ts`

**Changes:**
```typescript
// Add Factory interface
export interface Factory {
  factory_id: string;
  factory_code: string;  // 'ALT' | 'ALV'
  factory_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Add factory_id to existing interfaces:
// Inventory: add factory_id: string;
// Inbound: add factory_id: string;
// Outbound: add factory_id: string;
// PartPrice: add factory_id: string;
// Supplier: add factory_id: string;
// User: add factory_id: string | null;

// Add to Database interface Tables:
// factories: { Row: Factory; Insert: ...; Update: ... }

// Add FactoryCode type
export type FactoryCode = 'ALT' | 'ALV';
```

**Acceptance Criteria:**
- All factory-specific interfaces include `factory_id`
- Factory type exported
- Database type includes factories table
- No TypeScript errors after changes

---

### Task FE-2: Factory store (Zustand) + Factory Initialization on Login (Issue #8)

**New File:** `C:\Work Drive\APP\MT_Inventory_V2\src\store\factory.store.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Factory } from '../types/database.types';
import { supabase } from '@/lib/supabase';

interface FactoryState {
  factories: Factory[];
  activeFactory: Factory | null;
  viewingFactory: Factory | null;  // for observer mode
  isObserverMode: boolean;
  isLoading: boolean;
  isInitialized: boolean;  // CRITICAL: Prevent race condition on login

  fetchFactories: () => Promise<void>;
  setActiveFactory: (factory: Factory) => void;
  setViewingFactory: (factory: Factory | null) => void;
  getEffectiveFactoryId: () => string | null;  // returns viewingFactory or activeFactory id
  initializeForUser: (userFactoryId: string | null, isSystemAdmin: boolean) => Promise<void>;
  reset: () => void;
}

export const useFactoryStore = create<FactoryState>()(
  persist(
    (set, get) => ({
      factories: [],
      activeFactory: null,
      viewingFactory: null,
      isObserverMode: false,
      isLoading: false,
      isInitialized: false,

      fetchFactories: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase
            .from('factories')
            .select('*')
            .eq('is_active', true)
            .order('factory_code');

          if (error) throw error;
          set({ factories: data || [], isLoading: false });
        } catch (error) {
          console.error('Failed to fetch factories:', error);
          set({ isLoading: false });
        }
      },

      setActiveFactory: (factory: Factory) => {
        set({
          activeFactory: factory,
          viewingFactory: null,
          isObserverMode: false,
        });
      },

      setViewingFactory: (factory: Factory | null) => {
        const { activeFactory } = get();
        const isObserver = factory !== null &&
          factory.factory_id !== activeFactory?.factory_id;
        set({
          viewingFactory: factory,
          isObserverMode: isObserver,
        });
      },

      getEffectiveFactoryId: () => {
        const { viewingFactory, activeFactory, isInitialized } = get();
        // CRITICAL: Return null if not initialized (prevents race condition)
        if (!isInitialized) {
          console.warn('Factory store not initialized yet');
          return null;
        }
        return viewingFactory?.factory_id ?? activeFactory?.factory_id ?? null;
      },

      // Called on login - MUST complete before any factory-aware queries
      initializeForUser: async (userFactoryId: string | null, isSystemAdmin: boolean) => {
        set({ isLoading: true, isInitialized: false });

        // Fetch factories first
        const { data: factories, error } = await supabase
          .from('factories')
          .select('*')
          .eq('is_active', true)
          .order('factory_code');

        if (error) {
          console.error('Failed to fetch factories:', error);
          set({ isLoading: false });
          return;
        }

        const factoryList = factories || [];
        set({ factories: factoryList });

        // Set active factory
        if (isSystemAdmin) {
          // system_admin defaults to first factory but can switch freely
          const defaultFactory = factoryList[0] || null;
          set({
            activeFactory: defaultFactory,
            viewingFactory: null,
            isObserverMode: false,
            isLoading: false,
            isInitialized: true,
          });
        } else if (userFactoryId) {
          // Regular user - set their assigned factory
          const userFactory = factoryList.find(f => f.factory_id === userFactoryId) || null;
          if (!userFactory) {
            console.error('User factory not found:', userFactoryId);
          }
          set({
            activeFactory: userFactory,
            viewingFactory: null,
            isObserverMode: false,
            isLoading: false,
            isInitialized: true,
          });
        } else {
          // No factory assigned - default to first
          console.warn('User has no factory assigned, defaulting to first');
          set({
            activeFactory: factoryList[0] || null,
            viewingFactory: null,
            isObserverMode: false,
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      reset: () => {
        set({
          factories: [],
          activeFactory: null,
          viewingFactory: null,
          isObserverMode: false,
          isLoading: false,
          isInitialized: false,
        });
      },
    }),
    {
      name: 'factory-storage',
      partialize: (state) => ({
        activeFactory: state.activeFactory,
        viewingFactory: state.viewingFactory,
        isInitialized: state.isInitialized,
      }),
    }
  )
);
```

**Key Design Decisions:**
- `isInitialized` flag prevents race condition where services query before factory is set
- `initializeForUser()` is called by auth store after successful login
- `getEffectiveFactoryId()` returns null if not initialized (services should handle this)
- Persisted to localStorage (same pattern as auth store)
- system_admin: activeFactory can be any, never in observer mode

**Also update:** `C:\Work Drive\APP\MT_Inventory_V2\src\store\index.ts` to export factory store.

**Acceptance Criteria:**
- Factory switch persists across page refreshes
- Observer mode correctly computed
- system_admin never restricted
- Race condition prevented by isInitialized check

---

### Task FE-3: Factory selector component

**New File:** `C:\Work Drive\APP\MT_Inventory_V2\src\components\FactorySelector.tsx`

Style: Match LanguageSwitcher exactly (button group, same width, same styling pattern).

```
Layout in Sidebar bottom section:
  [user email]
  [logout button]        (marginBottom: 12)
  [FactorySelector]      (marginBottom: 12)  <-- NEW
  [LanguageSwitcher]
```

- Two buttons side by side: "ALT" / "ALV" (with factory icon or label)
- Active factory highlighted (blue bg like LanguageSwitcher active language)
- When viewing other factory (observer mode), show orange/yellow highlight + observer badge
- system_admin: both buttons always clickable, no observer badge
- Non-system_admin: both clickable but observer mode badge shows for non-home factory

**File to modify:** `C:\Work Drive\APP\MT_Inventory_V2\src\components\layout\Sidebar.tsx`
- Import FactorySelector
- Add between logout button and LanguageSwitcher

**Acceptance Criteria:**
- Visually matches LanguageSwitcher style
- Observer mode visually distinct (badge or color change)
- Click switches factory and triggers data reload

---

### Task FE-4: Update auth store with factory initialization

**File:** `C:\Work Drive\APP\MT_Inventory_V2\src\store\auth.store.ts`

**Changes (lines 49-83, signIn method):**

```typescript
// BEFORE (line 49-70):
signIn: async (email: string, password: string) => {
  set({ isLoading: true, error: null });
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email,
      password,
    });
    const { user } = response.data;
    const session: Session = {
      access_token: `token_${user.user_id}`,
      user,
    };
    set({
      user,
      session,
      isAuthenticated: true,
      isLoading: false,
    });
  } catch ...

// AFTER:
signIn: async (email: string, password: string) => {
  set({ isLoading: true, error: null });
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email,
      password,
    });
    const { user } = response.data;
    const session: Session = {
      access_token: `token_${user.user_id}`,
      user,
    };

    // CRITICAL: Initialize factory store BEFORE setting isAuthenticated
    // This prevents race condition where components try to fetch data
    // before factory context is available
    const { useFactoryStore } = await import('./factory.store');
    const factoryStore = useFactoryStore.getState();
    await factoryStore.initializeForUser(
      user.factory_id,
      user.role === 'system_admin'
    );

    set({
      user,
      session,
      isAuthenticated: true,
      isLoading: false,
    });
  } catch ...
```

**Changes (line 86-104, signOut method):**
```typescript
// BEFORE:
signOut: async () => {
  set({ isLoading: true, error: null });
  try {
    set({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
    });
  } catch ...

// AFTER:
signOut: async () => {
  set({ isLoading: true, error: null });
  try {
    // Clear factory store on logout
    const { useFactoryStore } = await import('./factory.store');
    useFactoryStore.getState().reset();

    set({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
    });
  } catch ...
```

**File:** `C:\Work Drive\APP\MT_Inventory_V2\server\index.js` (or equivalent auth endpoint)
- Login response should include user's `factory_id` field (already in users table after migration)

**Acceptance Criteria:**
- Login initializes factory context BEFORE isAuthenticated is set
- Logout clears factory context
- Race condition on login is prevented

---

### Task FE-5: Update ALL services with factory_id filtering

This is the highest-effort task. Every service that queries factory-specific tables must filter by factory_id.

**Shared Helper (create new file or add to existing utils):**

**File:** `C:\Work Drive\APP\MT_Inventory_V2\src\services\factoryContext.ts`

```typescript
import { useFactoryStore } from '@/store/factory.store';

/**
 * Get the effective factory_id for service queries.
 * Throws if factory store is not initialized (race condition protection).
 */
export function getFactoryId(): string {
  const store = useFactoryStore.getState();
  const factoryId = store.getEffectiveFactoryId();
  if (!factoryId) {
    throw new Error('Factory not initialized. Ensure user is logged in and factory is selected.');
  }
  return factoryId;
}

/**
 * Get factory code (e.g., 'ALT', 'ALV') for reference number generation.
 */
export function getFactoryCode(): string {
  const store = useFactoryStore.getState();
  const factory = store.viewingFactory ?? store.activeFactory;
  if (!factory) {
    throw new Error('Factory not initialized.');
  }
  return factory.factory_code;
}
```

---

**Files to modify:**

#### `src/services/inventory.service.ts` (Issue #3 - getInventoryByPartId)

**Current function (line 54-71):**
```typescript
export async function getInventoryByPartId(partId: string): Promise<Inventory | null> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('part_id', partId)
    .single();
  // ...
}
```

**New function signature (DO NOT rename, add new function):**
```typescript
import { getFactoryId } from './factoryContext';

/**
 * Get inventory by part_id for the CURRENT factory.
 * Use getInventoryByPartIdAndFactory if you need a specific factory.
 */
export async function getInventoryByPartId(partId: string): Promise<Inventory | null> {
  return getInventoryByPartIdAndFactory(partId, getFactoryId());
}

/**
 * Get inventory by part_id for a SPECIFIC factory.
 * Used by inbound/outbound services that need explicit factory context.
 */
export async function getInventoryByPartIdAndFactory(
  partId: string,
  factoryId: string
): Promise<Inventory | null> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('part_id', partId)
    .eq('factory_id', factoryId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('재고 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}
```

**Also update getAllInventory, getLowStockItems, etc.:**
```typescript
export async function getAllInventory(): Promise<InventoryWithPart[]> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('inventory')
    .select(`*, part:parts(*)`)
    .eq('factory_id', factoryId)  // ADD THIS
    .order('updated_at', { ascending: false });
  // ...
}

export async function createInventory(inventory: InsertDto<'inventory'>): Promise<Inventory> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('inventory')
    .insert({ ...inventory, factory_id: factoryId })  // ADD factory_id
    .select()
    .single();
  // ...
}
```

---

#### `src/services/inbound.service.ts` (Issue #2 - Reference Number)

**Current reference number function (lines 69-99):**
```typescript
export async function generateInboundReferenceNumber(date?: string): Promise<string> {
  const targetDate = date || dayjs().format('YYYY-MM-DD');
  const dateStr = dayjs(targetDate).format('YYYYMMDD');

  const { data, error } = await supabase
    .from('inbound')
    .select('reference_number')
    .like('reference_number', `IN-${dateStr}%`)  // OLD: No factory code
    .order('reference_number', { ascending: false })
    .limit(1);
  // ...
  return `IN-${dateStr}-${counterStr}`;  // OLD: No factory code
}
```

**Updated function with factory code (Issue #2):**
```typescript
import { getFactoryId, getFactoryCode } from './factoryContext';

export async function generateInboundReferenceNumber(date?: string): Promise<string> {
  const targetDate = date || dayjs().format('YYYY-MM-DD');
  const dateStr = dayjs(targetDate).format('YYYYMMDD');
  const factoryId = getFactoryId();
  const factoryCode = getFactoryCode();

  // Query pattern: IN-ALT-20250518-001 (with factory code)
  const { data, error } = await supabase
    .from('inbound')
    .select('reference_number')
    .eq('factory_id', factoryId)
    .like('reference_number', `IN-${factoryCode}-${dateStr}%`)  // UPDATED pattern
    .order('reference_number', { ascending: false })
    .limit(1);

  if (error) {
    console.error('참조번호 생성 에러:', error);
    throw new Error(error.message);
  }

  let counter = 1;
  if (data && data.length > 0 && data[0].reference_number) {
    const lastRef = data[0].reference_number;
    // Parse: IN-ALT-20250518-001 -> parts[3] = '001'
    const parts = lastRef.split('-');
    const lastCounter = parseInt(parts[3] || '0');
    counter = lastCounter + 1;
  }

  const counterStr = counter.toString().padStart(3, '0');
  return `IN-${factoryCode}-${dateStr}-${counterStr}`;  // NEW format
}
```

**Update adjustInventoryQuantity (line 20-54):**
```typescript
async function adjustInventoryQuantity(
  partId: string,
  quantityChange: number,
  createdBy: string = 'system'
): Promise<void> {
  const factoryId = getFactoryId();  // ADD: Get factory context

  // Use factory-aware inventory lookup
  const inventory = await getInventoryByPartIdAndFactory(partId, factoryId);  // UPDATED

  if (!inventory) {
    if (quantityChange < 0) {
      throw new Error(createErrorCode('INVENTORY_NOT_FOUND_FOR_INBOUND'));
    }

    await createInventory({
      part_id: partId,
      current_quantity: quantityChange,
      location: 'main',
      updated_by: createdBy,
      factory_id: factoryId,  // ADD: Pass factory_id
    });
    return;
  }
  // ... rest unchanged
}
```

**Update createInbound (line 254-296):**
```typescript
export async function createInbound(inbound: InsertDto<'inbound'>): Promise<Inbound> {
  const factoryId = getFactoryId();

  const { data, error } = await supabase
    .from('inbound')
    .insert({
      ...inbound,
      factory_id: factoryId,  // ADD factory_id
    })
    .select()
    .single();
  // ... rest unchanged
}
```

**Update getAllInbound and other query functions:**
```typescript
export async function getAllInbound(): Promise<Inbound[]> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('inbound')
    .select(`*, parts!inner(...), suppliers!inner(...)`)
    .eq('factory_id', factoryId)  // ADD THIS
    .order('inbound_date', { ascending: false });
  // ...
}
```

---

#### `src/services/outbound.service.ts` (Issue #2 - Reference Number)

**Same pattern as inbound.service.ts:**

```typescript
import { getFactoryId, getFactoryCode } from './factoryContext';

export async function generateOutboundReferenceNumber(date?: string): Promise<string> {
  const targetDate = date || dayjs().format('YYYY-MM-DD');
  const dateStr = dayjs(targetDate).format('YYYYMMDD');
  const factoryId = getFactoryId();
  const factoryCode = getFactoryCode();

  const { data, error } = await supabase
    .from('outbound')
    .select('reference_number')
    .eq('factory_id', factoryId)
    .like('reference_number', `OUT-${factoryCode}-${dateStr}%`)  // UPDATED
    .order('reference_number', { ascending: false })
    .limit(1);

  // ... same counter logic ...

  return `OUT-${factoryCode}-${dateStr}-${counterStr}`;  // NEW format
}

// Update adjustInventoryQuantity (line 19-42):
async function adjustInventoryQuantity(partId: string, quantityChange: number): Promise<void> {
  const factoryId = getFactoryId();
  const inventory = await getInventoryByPartIdAndFactory(partId, factoryId);  // UPDATED
  // ... rest unchanged
}
```

---

#### `src/services/suppliers.service.ts`

```typescript
import { getFactoryId } from './factoryContext';

export async function getAllSuppliers(): Promise<Supplier[]> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('factory_id', factoryId)  // ADD THIS
    .order('supplier_name');
  // ...
}

export async function createSupplier(supplier: InsertDto<'suppliers'>): Promise<Supplier> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('suppliers')
    .insert({ ...supplier, factory_id: factoryId })  // ADD factory_id
    .select()
    .single();
  // ...
}
```

---

#### `src/services/partPrice.service.ts`

```typescript
import { getFactoryId } from './factoryContext';

export async function getPartPrices(partId: string): Promise<PartPrice[]> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('part_prices')
    .select(`*, suppliers(supplier_name)`)
    .eq('part_id', partId)
    .eq('factory_id', factoryId)  // ADD THIS
    .order('effective_from', { ascending: false });
  // ...
}

// Line 66-67: Update RPC call (see Task DB-3)
export async function getLatestPartPrices(): Promise<Record<string, PartPrice>> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase.rpc('get_latest_part_prices', {
    p_factory_id: factoryId  // PASS factory_id to RPC
  });
  // ...
}

export async function createPartPrice(data: InsertDto<'part_prices'>): Promise<PartPrice> {
  const factoryId = getFactoryId();
  const { data: created, error } = await supabase
    .from('part_prices')
    .insert({ ...data, factory_id: factoryId })  // ADD factory_id
    .select(`*, suppliers(supplier_name)`)
    .single();
  // ...
}
```

---

#### `src/services/users.service.ts` (Issue #7 - Users Page Observer)

**Clarification:** Non-system_admin users should:
- See all users in their OWN factory
- NOT see users from other factories (even in observer mode for data privacy)
- system_admin sees ALL users across all factories

```typescript
import { getFactoryId } from './factoryContext';
import { useAuthStore } from '@/store/auth.store';

export async function getAllUsers(): Promise<User[]> {
  const authStore = useAuthStore.getState();
  const isSystemAdmin = authStore.user?.role === 'system_admin';

  let query = supabase.from('users').select('*');

  if (!isSystemAdmin) {
    // Non-system_admin: only see users in their assigned factory
    // (NOT the viewing factory - this is for privacy)
    const userFactoryId = authStore.user?.factory_id;
    if (userFactoryId) {
      query = query.eq('factory_id', userFactoryId);
    }
  }
  // system_admin sees all users

  const { data, error } = await query.order('username');
  // ...
}
```

---

**Summary Table:**

| File | Changes |
|------|---------|
| `src/services/inventory.service.ts` | Add `.eq('factory_id', getFactoryId())` to all queries; add `factory_id` to createInventory; add `getInventoryByPartIdAndFactory()` |
| `src/services/inbound.service.ts` | Factory-filtered queries; reference `IN-ALT-20250518-001`; update adjustInventoryQuantity |
| `src/services/outbound.service.ts` | Factory-filtered queries; reference `OUT-ALT-20250518-001`; update adjustInventoryQuantity |
| `src/services/suppliers.service.ts` | Add `.eq('factory_id', getFactoryId())` to all queries; add `factory_id` to createSupplier |
| `src/services/partPrice.service.ts` | Add `.eq('factory_id', getFactoryId())` to all queries; add `factory_id` to createPartPrice; update RPC call |
| `src/services/parts.service.ts` | NO CHANGE - parts are shared |
| `src/services/departments.service.ts` | NO CHANGE - departments are shared |
| `src/services/users.service.ts` | Add factory_id filter for non-system_admin (privacy-based, not observer-based) |

**Acceptance Criteria:**
- Every factory-specific query includes factory_id filter
- Creating records includes factory_id
- Reference numbers include factory code (e.g., `IN-ALT-20250518-001`)
- Parts/departments queries remain unfiltered
- adjustInventoryQuantity works per-factory

---

### Task FE-5b: Analytics.tsx factory filtering (CRITICAL - Issue #1)

**File:** `C:\Work Drive\APP\MT_Inventory_V2\src\pages\Analytics.tsx`

**Current problem:** Direct Supabase queries at lines 197-389 bypass services and will NOT be factory-filtered.

**Direct queries to update:**

| Line | Current Query | Change |
|------|---------------|--------|
| 197-201 | `supabase.from('inbound').select(...)` | Add `.eq('factory_id', factoryId)` |
| 206-210 | `supabase.from('outbound').select(...)` | Add `.eq('factory_id', factoryId)` |
| 215-219 | `supabase.from('inbound').select(...)` (prev period) | Add `.eq('factory_id', factoryId)` |
| 222-226 | `supabase.from('outbound').select(...)` (prev period) | Add `.eq('factory_id', factoryId)` |
| 255-259 | `supabase.from('inbound').select(...)` (detailed) | Add `.eq('factory_id', factoryId)` |
| 318-322 | `supabase.from('outbound').select(...)` (detailed) | Add `.eq('factory_id', factoryId)` |
| 345-349 | `supabase.from('inbound').select(...)` (category) | Add `.eq('factory_id', factoryId)` |
| 369-373 | `supabase.from('inbound').select(...)` (supplier) | Add `.eq('factory_id', factoryId)` |

**Implementation:**

```typescript
// At top of Analytics.tsx, add import:
import { useFactoryStore } from '../store/factory.store';

// Inside Analytics component:
const Analytics = () => {
  const { t } = useTranslation();
  const { getEffectiveFactoryId, isObserverMode } = useFactoryStore();  // ADD

  // ... existing state ...

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);

    const factoryId = getEffectiveFactoryId();  // ADD
    if (!factoryId) {
      setError('Factory not selected');
      setIsLoading(false);
      return;
    }

    try {
      // ... date calculations ...

      // Line 197-201: Add factory filter
      const { data: inboundData, error: inboundError } = await supabase
        .from('inbound')
        .select('quantity, total_price')
        .eq('factory_id', factoryId)  // ADD THIS
        .gte('inbound_date', startDate.format('YYYY-MM-DD'))
        .lte('inbound_date', endDate.format('YYYY-MM-DD'));

      // Line 206-210: Add factory filter
      const { data: outboundData, error: outboundError } = await supabase
        .from('outbound')
        .select('quantity')
        .eq('factory_id', factoryId)  // ADD THIS
        .gte('outbound_date', startDate.format('YYYY-MM-DD'))
        .lte('outbound_date', endDate.format('YYYY-MM-DD'));

      // ... repeat for all other queries (lines 215-226, 255-259, 318-322, 345-349, 369-373) ...
    }
  };

  const fetchDetailedAnalytics = async (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs) => {
    const factoryId = getEffectiveFactoryId();
    if (!factoryId) return;

    // Line 255-259: Add factory filter
    const { data: inboundPartsData } = await supabase
      .from('inbound')
      .select('part_id, quantity, total_price, unit_price, parts(part_code, part_name), suppliers(supplier_name)')
      .eq('factory_id', factoryId)  // ADD THIS
      .gte('inbound_date', startDate.format('YYYY-MM-DD'))
      .lte('inbound_date', endDate.format('YYYY-MM-DD'));

    // ... repeat for all detailed queries ...
  };

  // Re-fetch when factory changes
  useEffect(() => {
    fetchAnalytics();
  }, [period, dateRange, getEffectiveFactoryId()]);  // ADD factory dependency
```

**Also add observer mode banner:**
```typescript
// In JSX (after Title):
{isObserverMode && (
  <Alert
    type="warning"
    message={t('factory.observerBanner')}
    banner
    style={{ marginBottom: 16 }}
  />
)}
```

**Acceptance Criteria:**
- All 8+ direct Supabase queries in Analytics.tsx include factory_id filter
- Analytics re-fetches when factory selection changes
- Observer mode banner shown when viewing other factory's data

---

### Task FE-5c: Form components supplier dropdown filtering (CRITICAL - Issue #9)

**File:** `C:\Work Drive\APP\MT_Inventory_V2\src\pages\Inbound.tsx`

**Current problem (lines 36-39, 57):**
```typescript
const { suppliers, fetchSuppliers } = useSuppliersStore();
// ...
useEffect(() => {
  // ...
  fetchSuppliers();  // Fetches ALL suppliers, not factory-filtered
}, []);
```

**Solution:** The suppliers store will be updated to be factory-aware (Task FE-6), so when `fetchSuppliers()` is called, it will automatically filter by the current factory. However, we need to re-fetch when factory changes.

**Add factory change listener:**
```typescript
import { useFactoryStore } from '../store/factory.store';

const Inbound = () => {
  // ... existing ...
  const { getEffectiveFactoryId, isObserverMode } = useFactoryStore();

  // Re-fetch when factory changes
  useEffect(() => {
    fetchInbounds();
    fetchInboundStats();
    fetchParts();  // Parts don't need re-fetch (shared)
    fetchSuppliers();  // Will now be factory-filtered
  }, [getEffectiveFactoryId()]);  // ADD factory dependency

  // Disable form submission in observer mode
  const handleOk = async () => {
    if (isObserverMode) {
      messageApi.error(t('factory.observerMode'));
      return;
    }
    // ... existing logic ...
  };
```

**Same changes for `src/pages/Outbound.tsx` (if it has supplier dropdown).**

**Acceptance Criteria:**
- Supplier dropdown only shows suppliers from current factory
- Re-fetches when factory changes
- Form submission blocked in observer mode

---

### Task FE-6: Update ALL stores to re-fetch on factory switch

**Files:** All stores in `C:\Work Drive\APP\MT_Inventory_V2\src\store\`

When factory changes in factory store, all data stores must refetch. Two approaches:

**Recommended approach:** Subscribe to factory store changes in each data store, or create a central `refetchAll()` function called when factory switches.

```typescript
// In factory.store.ts setViewingFactory:
setViewingFactory: (factory) => {
  set({ viewingFactory: factory, isObserverMode: ... });
  // Trigger refetch of all factory-aware stores
  // Import and call each store's fetch method
}
```

**Alternatively:** Each page component can `useEffect` on factory change to refetch.

**Acceptance Criteria:**
- Switching factory immediately shows correct data
- No stale data from previous factory visible
- Loading states shown during refetch

---

### Task FE-7: Observer mode - disable mutations

**All page components and forms must check observer mode.**

**Pattern:**
```typescript
const { isObserverMode } = useFactoryStore();

// In JSX:
<Button disabled={isObserverMode} onClick={handleCreate}>...</Button>

// Observer badge at top of page:
{isObserverMode && (
  <Alert
    type="info"
    message="다른 공장 데이터를 조회 중입니다 (읽기 전용)"
    banner
  />
)}
```

**Files to modify (all page components):**
- `src/pages/InventoryPage.tsx` (or similar)
- `src/pages/InboundPage.tsx`
- `src/pages/OutboundPage.tsx`
- `src/pages/SuppliersPage.tsx`
- `src/pages/PartsPage.tsx` - special: parts are shared, so NO observer restriction on parts
- `src/pages/DashboardPage.tsx` - show factory name in dashboard header
- `src/pages/Analytics.tsx` - show observer banner
- `src/pages/Users.tsx` - see Issue #7 clarification below
- All modal/drawer forms: disable submit in observer mode

**system_admin exception:** Never in observer mode, all buttons always enabled.

**Issue #7 Clarification (Users page observer behavior):**
- Users page does NOT use factory observer mode
- Non-system_admin users only see users in their OWN factory (not viewing factory)
- This is for privacy, not observer mode
- system_admin sees ALL users

**Acceptance Criteria:**
- All create/edit/delete buttons disabled in observer mode
- Banner shown when viewing other factory
- Parts page has no observer restrictions
- system_admin always has full access
- Users page uses privacy-based filtering, not observer mode

---

### Task FE-8: i18n translations

**Files:**
- `C:\Work Drive\APP\MT_Inventory_V2\src\i18n\locales\ko.json`
- `C:\Work Drive\APP\MT_Inventory_V2\src\i18n\locales\vi.json`

**Add keys:**
```json
{
  "factory": {
    "selectFactory": "공장 선택",
    "factory1": "1공장 (ALT)",
    "factory2": "2공장 (ALV)",
    "observerMode": "읽기 전용 모드",
    "observerBanner": "다른 공장의 데이터를 조회 중입니다 (읽기 전용)",
    "allFactories": "전체 공장",
    "notInitialized": "공장 정보를 불러오는 중..."
  }
}
```

Vietnamese equivalents:
```json
{
  "factory": {
    "selectFactory": "Chon nha may",
    "factory1": "Nha may 1 (ALT)",
    "factory2": "Nha may 2 (ALV)",
    "observerMode": "Che do chi xem",
    "observerBanner": "Dang xem du lieu nha may khac (chi doc)",
    "allFactories": "Tat ca nha may",
    "notInitialized": "Dang tai thong tin nha may..."
  }
}
```

**Issue #6 Clarification (manager role in i18n):**
- `manager` role exists in some i18n files but NOT in UserRole enum
- UserRole enum has: `system_admin`, `admin`, `user`, `viewer`
- Treat `manager` as display alias for `admin` in translations if encountered
- No code changes needed for this - just a translation concern

**Acceptance Criteria:**
- All factory-related UI text uses i18n keys
- Both ko and vi translations complete

---

## Task Flow and Dependencies

```
DB-1 (migration) ──> DB-1-ROLLBACK (create but don't run)
       │
       └──> DB-2 (RLS) ──> DB-3 (RPC function)
              │
              v
FE-1 (types) ──> FE-2 (factory store) ──> FE-3 (selector component)
                        │                         │
                        v                         v
                  FE-4 (auth store) ──> FE-5 (services) ──> FE-5b (Analytics)
                                              │                    │
                                              └──> FE-5c (Forms) ──┘
                                                        │
                                                        v
                                                  FE-6 (store refetch)
                                                        │
                                                        v
                                                  FE-7 (observer mode)
                                                        │
                                                        v
                                                  FE-8 (i18n)
```

**Parallelizable:**
- DB-1 + FE-1 can start together
- FE-3 + FE-4 can run in parallel after FE-2
- FE-5b + FE-5c can run in parallel after FE-5
- FE-8 can run anytime

---

## Commit Strategy

| Commit | Scope | Description |
|--------|-------|-------------|
| 1 | DB | `database/multi_factory_migration.sql` - factories table + factory_id columns |
| 2 | DB | `database/multi_factory_rollback.sql` - DOWN migration (create but don't run) |
| 3 | DB | `database/multi_factory_rls.sql` - Updated RLS policies |
| 4 | DB | `database/multi_factory_rpc.sql` - Updated get_latest_part_prices RPC |
| 5 | FE | Types + factory store + factory selector component |
| 6 | FE | Auth store update + factory initialization |
| 7 | FE | All services factory-aware (inventory, inbound, outbound, suppliers, partPrice) |
| 8 | FE | Analytics.tsx factory filtering |
| 9 | FE | Form components (Inbound/Outbound) supplier dropdown filtering |
| 10 | FE | All stores refetch on factory switch |
| 11 | FE | Observer mode across all pages |
| 12 | FE | i18n translations |

---

## Additional Recommendations

### 1. Dashboard factory comparison view
Add a toggle on the dashboard to show side-by-side comparison of both factories' KPIs (total inventory, low stock counts, inbound/outbound amounts). Only available to system_admin or users in observer mode.

### 2. Factory-prefixed reference numbers
Change reference number format from `IN-20250518-001` to `IN-ALT-20250518-001` to prevent collisions and make cross-factory audit easier.

### 3. Excel export with factory label
When exporting to Excel, include factory name in the sheet title and filename (e.g., `inventory_ALT_20250603.xlsx`).

### 4. User management: factory assignment UI
In the users management page, add a factory dropdown when creating/editing users. system_admin can assign users to any factory.

### 5. Future-proofing: factory_id as a central service pattern
Create a shared utility `getFactoryContext()` that all services import, rather than duplicating the factory_id logic in every service. This makes adding a 3rd factory trivial.

### 6. Data migration verification script
After running the migration, include a verification query that counts records per factory to confirm all existing data was properly assigned to ALT.

```sql
SELECT 'inventory' as tbl, factory_id, count(*) FROM inventory GROUP BY factory_id
UNION ALL
SELECT 'inbound', factory_id, count(*) FROM inbound GROUP BY factory_id
UNION ALL
SELECT 'outbound', factory_id, count(*) FROM outbound GROUP BY factory_id
UNION ALL
SELECT 'suppliers', factory_id, count(*) FROM suppliers GROUP BY factory_id
UNION ALL
SELECT 'part_prices', factory_id, count(*) FROM part_prices GROUP BY factory_id;
```

---

## Success Criteria

1. User logs in -> sees their factory's data by default
2. User clicks other factory button -> sees that factory's data, all write operations disabled
3. system_admin clicks any factory -> sees data with full CRUD access
4. Parts page shows same parts regardless of factory selection
5. Suppliers page shows different suppliers per factory
6. Inventory page shows different quantities per factory for the same part
7. Inbound/outbound reference numbers include factory code (e.g., `IN-ALT-20250518-001`)
8. Factory selection persists across page refreshes
9. No data leaks between factories at RLS level
10. All existing data preserved and assigned to ALT factory
11. Analytics page respects factory selection
12. Factory store initializes BEFORE any data fetches (no race condition)
13. Users page shows factory-appropriate user list (privacy-based, not observer-based)
14. RPC function `get_latest_part_prices` accepts and filters by factory_id
15. Rollback migration script exists and is tested
