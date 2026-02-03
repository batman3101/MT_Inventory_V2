# Multi-Factory Implementation - Learnings

## Task FE-1: TypeScript Types Update

### Changes Made
Successfully updated `C:\Work Drive\APP\MT_Inventory_V2\src\types\database.types.ts` to support multi-factory architecture.

### Implementation Details

**Added Factory Interface** (lines 11-21)
- `Factory` interface with all required fields: factory_id, factory_code, factory_name, description, is_active, timestamps
- `FactoryCode` type alias for 'ALT' | 'ALV'
- Placed at the top of the file (before Parts) for logical ordering

**Added factory_id to Data Interfaces**
- `Supplier.factory_id: string` (line 58)
- `Inventory.factory_id: string` (line 70)
- `Inbound.factory_id: string` (line 86)
- `Outbound.factory_id: string` (line 108)
- `PartPrice.factory_id: string` (line 143)
- `User.factory_id: string | null` (line 167) - nullable for system admins

**Updated Database.public.Tables**
- Added `factories` table definition (lines 188-192)
- Includes Row, Insert, and Update types with proper Omit patterns
- Placed first in Tables object as it's a base reference table

### Key Patterns
1. **Field placement**: Factory_id added after foreign keys but before business data fields
2. **Nullable pattern**: Only User.factory_id is nullable (for system_admin users)
3. **Comment style**: Follows existing Korean bilingual comment pattern
4. **Table ordering**: Reference tables (factories) placed before dependent tables

### Type Safety Verification
- Ran `npx tsc --noEmit`: PASS (no errors)
- All interfaces properly typed
- Insert/Update types correctly exclude auto-generated fields (factory_id, created_at, updated_at)

---

## Task FE-4: Auth Store Factory Initialization

### Changes Made
Successfully updated `src/store/auth.store.ts` to integrate factory context initialization into the authentication flow.

### Implementation Details

**signIn method (lines 65-73):**
- Added factory store initialization BEFORE setting `isAuthenticated: true`
- Uses dynamic import to avoid circular dependencies
- Calls `initializeForUser()` with user's `factory_id` and admin status
- This prevents race condition where components try to fetch factory-scoped data before factory context is ready

**signOut method (lines 99-101):**
- Added factory store reset on logout
- Clears all factory-related state including `activeFactory`, `viewingFactory`, and `isInitialized` flag
- Uses dynamic import for consistency

### Key Patterns
1. **Dynamic imports**: Using `await import('./factory.store')` prevents circular dependency issues between stores
2. **Initialization order**: Factory context MUST be set before `isAuthenticated` to prevent race conditions
3. **State cleanup**: All related stores must be reset on logout for security and state consistency

### Type Safety
- User type already has `factory_id: string | null` and `role: string` fields
- TypeScript compilation passes with no errors
- ESLint validation passes

### Verification
- TypeScript type check: PASS (no errors)
- ESLint check: PASS (no errors)
- Factory store methods exist: `initializeForUser()` and `reset()` confirmed

---

## Task FE-5: Inbound Service Factory Support

### Changes Made
Successfully updated `C:\Work Drive\APP\MT_Inventory_V2\src\services\inbound.service.ts` to support multi-factory operations with factory_id filtering and factory-aware reference number generation.

### Implementation Details

**Import Updates (lines 10-11):**
- Added `getInventoryByPartIdAndFactory` from inventory.service
- Added `getFactoryId` and `getFactoryCode` from factoryContext
- Removed unused `getInventoryByPartId` import to pass linting

**generateInboundReferenceNumber (lines 75-108):**
- Updated reference number format from `IN-YYYYMMDD-XXX` to `IN-{FACTORY_CODE}-YYYYMMDD-XXX`
- Added factory_id filter in query to prevent cross-factory counter conflicts
- Fixed counter parsing to handle 4-part reference number format (parts[3] for counter)
- Example: `IN-ALT-20250203-001` for ALT factory

**adjustInventoryQuantity (lines 21-58):**
- Replaced `getInventoryByPartId()` with `getInventoryByPartIdAndFactory(partId, factoryId)`
- Added `factory_id: factoryId` when creating new inventory records
- Ensures inventory is created and adjusted only for the correct factory

**Query Functions - All updated with factory filtering:**
- `getAllInbound()`: Added `.eq('factory_id', factoryId)` filter (line 122)
- `getInboundByDateRange()`: Added factory filter (line 166)
- `getInboundByPartId()`: Added factory filter (line 199)
- `getInboundBySupplierId()`: Added factory filter (line 233)
- `getRecentInbound()`: Added factory filter (line 423)
- `getLast7DaysInboundAmount()`: Added factory filter (line 450)
- `getInboundAmountByPeriod()`: Added factory filter (line 495)
- `getInboundStats()`: Added factory filter in initial query builder (line 385)

**createInbound (lines 274-282):**
- Added `factory_id: factoryId` to insert payload
- Ensures all new inbound records are tagged with correct factory

### Key Patterns
1. **Factory context extraction**: Always call `getFactoryId()` at the start of exported functions
2. **Factory filtering**: Add `.eq('factory_id', factoryId)` BEFORE other filters (date ranges, part_id, etc.)
3. **Reference number format**: `{PREFIX}-{FACTORY_CODE}-{DATE}-{COUNTER}` pattern for all transaction records
4. **Factory-aware inventory**: Use `getInventoryByPartIdAndFactory()` instead of `getInventoryByPartId()` to ensure correct inventory is accessed
5. **Counter parsing**: For multi-part reference numbers, use `parts[N]` where N is the correct index after factory code

### Type Safety
- All factory_id additions match the updated InsertDto<'inbound'> type
- No TypeScript errors
- ESLint passes with no warnings

### Verification
- ESLint check: PASS (no errors, no warnings)
- All 12 query functions updated with factory filtering
- Reference number generation includes factory code
- Inventory adjustments are factory-aware

---

## Task FE-5: Suppliers and PartPrice Services Multi-Factory Support

### Changes Made
Successfully updated `src/services/suppliers.service.ts` and `src/services/partPrice.service.ts` to add factory_id filtering to all queries.

### Implementation Details

**suppliers.service.ts:**
- Added `import { getFactoryId } from './factoryContext'` (line 9)
- Updated all query functions to call `getFactoryId()` and filter by `factory_id`:
  - `getAllSuppliers()`: Added `.eq('factory_id', factoryId)` (line 19)
  - `getSupplierById()`: Added factory filter (line 39)
  - `getSupplierByCode()`: Added factory filter (line 59)
  - `getSuppliersByStatus()`: Added factory filter (line 83)
  - `getSuppliersByCountry()`: Added factory filter (line 103)
  - `searchSuppliers()`: Added factory filter before OR clause (line 122)
  - `getAllCountries()`: Added factory filter (line 216)
- Updated mutation functions to inject `factory_id`:
  - `createSupplier()`: Spread supplier with `factory_id: factoryId` (line 143)
  - `updateSupplier()`: Added factory filter to WHERE clause (line 167)
  - `deleteSupplier()`: Added factory filter to WHERE clause (line 193)
- `getActiveSuppliers()` inherits factory filtering through `getSuppliersByStatus()` (line 205)

**partPrice.service.ts:**
- Added `import { getFactoryId } from './factoryContext'` (line 6)
- Updated all query functions to call `getFactoryId()` and filter by `factory_id`:
  - `getPartPrices()`: Added `.eq('factory_id', factoryId)` (line 20)
  - `getLatestPartPrice()`: Added factory filter (line 48)
  - `getLatestPartPrices()`: Pass `p_factory_id: factoryId` to RPC call (lines 73-74)
  - Added `factory_id: item.factory_id` to PartPrice mapping (line 86)
- Updated mutation functions to inject `factory_id`:
  - `createPartPrice()`: Spread data with `factory_id: factoryId` (line 112)
  - `updatePartPrice()`: Added factory filter to WHERE clause (line 141)
  - `deletePartPrice()`: Added factory filter to WHERE clause (line 170)

### Key Patterns
1. **Factory context retrieval**: Always call `getFactoryId()` at the start of each function
2. **Query filtering**: Add `.eq('factory_id', factoryId)` to all SELECT queries
3. **INSERT operations**: Spread input with `{ ...data, factory_id: factoryId }`
4. **UPDATE/DELETE operations**: Add `.eq('factory_id', factoryId)` to WHERE clause for security
5. **RPC calls**: Pass factory_id as parameter `{ p_factory_id: factoryId }`
6. **Type completeness**: Ensure returned objects include factory_id field when required by type

### Security Implications
- All queries now automatically scope to the active factory context
- Users cannot accidentally see/modify data from other factories
- UPDATE and DELETE operations verify factory ownership before executing
- RPC functions receive factory_id parameter for server-side filtering

### Type Safety
- Fixed PartPrice type error by adding `factory_id: item.factory_id` to mapping in `getLatestPartPrices()`
- All service functions maintain type consistency
- factory_id is now included in all data structures as required by TypeScript types

