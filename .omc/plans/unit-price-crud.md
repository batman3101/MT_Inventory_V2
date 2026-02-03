# Unit Price (단가) CRUD - Implementation Plan (v2)

## Context

### Original Request
부품별 단가(Unit Price) 관리를 위한 독립 테이블 `part_prices` 생성 및 CRUD UI/UX 구현. 현재 단가는 inbound 테이블에만 존재하며 별도 관리 체계가 없음.

### Current Architecture
- **Pattern**: Pages -> Zustand stores (`use[Feature]Store`) -> Services (`[feature].service.ts`) -> Supabase client
- **Price data**: Only in `inbound` table (`unit_price`, `total_price`, `currency`)
- **Outbound pricing**: Dynamically queries latest inbound `unit_price` (outbound.service.ts lines 502-525, 585-607)
- **Currency format**: Symbol-based storage (`'₫'`, `'$'`, `'￥'`) - confirmed in Inbound.tsx line 484-488 Select options and inbound form `initialValue="₫"`
- **Stack**: React 18, TypeScript, Ant Design 5, Zustand 5, Supabase, i18next (ko/vi)

### Research Findings
- `src/types/database.types.ts` - All DB types defined here. Pattern: `Row` = full interface, `Insert` = `Omit<Row, 'pk' | 'created_at' | 'updated_at' | joined_fields>`, `Update` = `Partial<Omit<Row, 'pk' | 'created_at'>>`
- `src/services/inbound.service.ts` - `createInbound` returns at line 280. Auto-sync code inserts before this `return` statement.
- `src/services/outbound.service.ts` - `getLast7DaysOutboundAmount` at line 476, `getOutboundAmountByPeriod` at line 554. Both build priceMap from inbound table (lines 502-524 and 585-607 respectively).
- `src/pages/Parts.tsx` - Detail modal already shows recent inbound with prices (lines 669-720)
- `src/store/index.ts` - Central re-export of all stores
- **Currency values in DB**: Stored as symbols `'₫'`, `'$'`, `'￥'` (NOT ISO codes like 'VND')

---

## Work Objectives

### Core Objective
Create a `part_prices` table and full CRUD system so unit prices are managed independently from inbound records, with UI integrated into the Parts page.

### Deliverables
1. `part_prices` Supabase table with RLS policy (via Supabase Dashboard SQL Editor)
2. TypeScript types in `database.types.ts` with explicit Insert/Update Omit fields
3. `partPrice.service.ts` - CRUD service with concrete `getLatestPartPrices()` implementation
4. `partPrice.store.ts` - Zustand store
5. Parts page: unit price column + detail modal price management section + Popover quick edit
6. Updated outbound service to prefer `part_prices` over inbound fallback
7. Optional: auto-sync from inbound to `part_prices`
8. i18n keys (ko/vi)

### Definition of Done
- part_prices CRUD works end-to-end
- Parts table shows latest unit price per part
- Detail modal has price history + add/edit/delete
- Popover inline edit on Parts table price column
- Outbound amount calculation uses part_prices first, falls back to inbound
- All strings translated (ko/vi)
- No TypeScript compilation errors (`npx tsc --noEmit` passes)

---

## Must Have
- `part_prices` table with: price_id, part_id, unit_price, currency, supplier_id (nullable), effective_date, notes, created_at, created_by, updated_at
- **RLS policy** explicitly defined (or RLS disabled on this table)
- CRUD service following existing patterns (supabase direct calls)
- Zustand store following `useInboundStore` pattern
- Price column in Parts table with currency symbol
- Price management section in Part detail modal (list + add/edit/delete)
- Popover quick edit (click price cell -> Popover with InputNumber + currency + save)
- Outbound service fallback: part_prices -> inbound unit_price
- Currency stored as symbol (`'₫'`, `'$'`, `'￥'`) matching existing inbound convention
- All user roles can access (no RLS restrictions beyond existing)

## Must NOT Have
- Separate dedicated price management page (integrate into Parts only)
- Price approval workflow
- Historical price analytics/charts (out of scope)
- Bulk price import

---

## Task Flow

```
Task 1: DB Table + RLS + Types
    |
    v
Task 2: Service Layer (with concrete getLatestPartPrices)
    |
    v
Task 3: Zustand Store
    |
    v
Task 4: i18n Keys
    |
    v
Task 5: Parts Page UI (column + detail modal + popover)
    |
    v
Task 6: Outbound Service Integration
    |
    v
Task 7: Inbound Auto-Sync (optional)
```

---

## Detailed TODOs

### Task 1: Database Table + RLS + Types

**Files:**
- Supabase Dashboard SQL Editor (no MCP tool available - execute SQL manually)
- `C:\Work Drive\APP\MT_Inventory_V2\src\types\database.types.ts`

**Actions:**

1.1 Create `part_prices` table via **Supabase Dashboard SQL Editor** (navigate to SQL Editor in Supabase Dashboard and run):
```sql
CREATE TABLE part_prices (
  price_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES parts(part_id) ON DELETE CASCADE,
  unit_price NUMERIC(15,2) NOT NULL,
  currency VARCHAR(5) NOT NULL DEFAULT '₫',
  supplier_id UUID REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL DEFAULT 'system',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_part_prices_part_id ON part_prices(part_id);
CREATE INDEX idx_part_prices_effective_date ON part_prices(part_id, effective_date DESC);
```

1.2 **RLS Policy** - Run immediately after table creation:
```sql
-- Option A: Disable RLS (simple, matches current app pattern where auth is app-level)
ALTER TABLE part_prices DISABLE ROW LEVEL SECURITY;

-- Option B (if RLS must be enabled): Allow all authenticated users
-- ALTER TABLE part_prices ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all access to part_prices" ON part_prices
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);
```

> **NOTE:** Check existing tables' RLS status first. If other tables (parts, inbound, etc.) have RLS disabled, use Option A. If they use RLS with permissive policies, use Option B to be consistent.

1.3 Add `PartPrice` interface to `database.types.ts` (after the `Department` interface, before the `User` interface):
```typescript
// ============================================================================
// Part Prices (부품 단가)
// ============================================================================
export interface PartPrice {
  price_id: string; // UUID
  part_id: string; // UUID - parts 테이블과 연결
  unit_price: number;
  currency: string; // '₫', '$', '￥'
  supplier_id: string | null; // UUID - suppliers 테이블과 연결 (nullable)
  effective_date: string; // YYYY-MM-DD 형식
  notes: string;
  created_at: string; // ISO 8601 timestamp
  created_by: string;
  updated_at: string; // ISO 8601 timestamp
  // Joined data (not in DB, populated by service)
  part_code?: string;
  part_name?: string;
  supplier_name?: string;
}
```

1.4 Add `part_prices` to `Database` interface `Tables` section (after `outbound`, before `users` - around line 177 in `database.types.ts`):
```typescript
part_prices: {
  Row: PartPrice;
  Insert: Omit<PartPrice, 'price_id' | 'created_at' | 'updated_at' | 'part_code' | 'part_name' | 'supplier_name'>;
  Update: Partial<Omit<PartPrice, 'price_id' | 'created_at' | 'part_code' | 'part_name' | 'supplier_name'>>;
};
```

**Verification:** Run `npx tsc --noEmit` - no errors related to PartPrice types. Table visible in Supabase Dashboard Table Editor.

---

### Task 2: Service Layer

**File:** `C:\Work Drive\APP\MT_Inventory_V2\src\services\partPrice.service.ts` (NEW)

**Functions to implement:**

- `getPartPrices(partId: string): Promise<PartPrice[]>` - All prices for a part, ordered by effective_date DESC. Join suppliers for supplier_name.
- `getLatestPartPrice(partId: string): Promise<PartPrice | null>` - Most recent price for a single part.
- `getLatestPartPrices(): Promise<Record<string, PartPrice>>` - Latest price per part for Parts table column. **Concrete implementation below.**
- `createPartPrice(data: InsertDto<'part_prices'>): Promise<PartPrice>`
- `updatePartPrice(priceId: string, updates: UpdateDto<'part_prices'>): Promise<PartPrice>`
- `deletePartPrice(priceId: string): Promise<void>`

**`getLatestPartPrices()` concrete implementation** (fetch all, dedupe in JS - chosen over RPC for simplicity, acceptable performance for <10K parts):
```typescript
export async function getLatestPartPrices(): Promise<Record<string, PartPrice>> {
  const { data, error } = await supabase
    .from('part_prices')
    .select(`
      *,
      suppliers(supplier_name)
    `)
    .order('effective_date', { ascending: false });

  if (error) {
    console.error('최신 단가 조회 에러:', error);
    throw new Error(error.message);
  }

  // Dedupe: keep only the first (latest) price per part_id
  const latestMap: Record<string, PartPrice> = {};
  (data || []).forEach((item: any) => {
    if (!latestMap[item.part_id]) {
      latestMap[item.part_id] = {
        ...item,
        supplier_name: item.suppliers?.supplier_name || '',
        suppliers: undefined,
      } as PartPrice;
    }
  });

  return latestMap;
}
```

**Pattern:** Follow `inbound.service.ts` exactly - import supabase, typed responses, error handling with console.error + throw.

**Verification:** Manually call `getLatestPartPrices()` from browser console or a test component - returns Record with part_id keys.

---

### Task 3: Zustand Store

**File:** `C:\Work Drive\APP\MT_Inventory_V2\src\store\partPrice.store.ts` (NEW)

**State:**
```typescript
import { create } from 'zustand';
import type { PartPrice, InsertDto, UpdateDto } from '../types/database.types';
import * as partPriceService from '../services/partPrice.service';

interface PartPriceState {
  pricesByPart: Record<string, PartPrice[]>; // part_id -> prices array
  latestPrices: Record<string, PartPrice>;   // part_id -> latest price
  isLoading: boolean;
  error: string | null;

  fetchPricesByPartId: (partId: string) => Promise<void>;
  fetchLatestPrices: () => Promise<void>;
  createPrice: (data: InsertDto<'part_prices'>) => Promise<void>;
  updatePrice: (priceId: string, updates: UpdateDto<'part_prices'>) => Promise<void>;
  deletePrice: (priceId: string, partId: string) => Promise<void>;
  clearError: () => void;
}
```

**Also:** Add `export * from './partPrice.store';` to `C:\Work Drive\APP\MT_Inventory_V2\src\store\index.ts`

**Verification:** Import `usePartPriceStore` from store index - no import errors. Call `fetchLatestPrices()` - state updates with data from Supabase.

---

### Task 4: i18n Keys

**Files:**
- `C:\Work Drive\APP\MT_Inventory_V2\src\i18n\locales\ko.json`
- `C:\Work Drive\APP\MT_Inventory_V2\src\i18n\locales\vi.json`

**Add `partPrice` section to ko.json:**
```json
"partPrice": {
  "title": "단가 관리",
  "unitPrice": "단가",
  "currency": "통화",
  "effectiveDate": "적용일",
  "supplier": "공급업체",
  "notes": "비고",
  "addPrice": "단가 추가",
  "editPrice": "단가 수정",
  "deletePrice": "단가 삭제",
  "deleteConfirm": "이 단가를 삭제하시겠습니까?",
  "priceAdded": "단가가 추가되었습니다",
  "priceUpdated": "단가가 수정되었습니다",
  "priceDeleted": "단가가 삭제되었습니다",
  "noPrice": "단가 없음",
  "priceHistory": "단가 이력",
  "latestPrice": "최근 단가",
  "quickEdit": "빠른 편집"
}
```

**Add `partPrice` section to vi.json:**
```json
"partPrice": {
  "title": "Quan ly don gia",
  "unitPrice": "Don gia",
  "currency": "Loai tien",
  "effectiveDate": "Ngay ap dung",
  "supplier": "Nha cung cap",
  "notes": "Ghi chu",
  "addPrice": "Them don gia",
  "editPrice": "Sua don gia",
  "deletePrice": "Xoa don gia",
  "deleteConfirm": "Ban co muon xoa don gia nay khong?",
  "priceAdded": "Da them don gia",
  "priceUpdated": "Da cap nhat don gia",
  "priceDeleted": "Da xoa don gia",
  "noPrice": "Chua co don gia",
  "priceHistory": "Lich su don gia",
  "latestPrice": "Don gia moi nhat",
  "quickEdit": "Chinh sua nhanh"
}
```

**Verification:** `t('partPrice.title')` renders correctly in both ko and vi locales.

---

### Task 5: Parts Page UI

**File:** `C:\Work Drive\APP\MT_Inventory_V2\src\pages\Parts.tsx`

**5.1 Add unit price column to Parts table (after `min_stock` column, before `status`):**
```typescript
{
  title: t('partPrice.latestPrice'),
  key: 'latest_price',
  width: 140,
  align: 'right',
  render: (_, record) => {
    const price = latestPrices[record.part_id];
    if (!price) return <span style={{ color: '#999' }}>{t('partPrice.noPrice')}</span>;
    return (
      <Popover
        trigger="click"
        content={<PriceQuickEdit partId={record.part_id} currentPrice={price} />}
      >
        <span style={{ cursor: 'pointer', color: '#1890ff' }}>
          {price.unit_price.toLocaleString()} {price.currency}
        </span>
      </Popover>
    );
  },
}
```

**5.2 Create `PriceQuickEdit` inline component (or separate component file):**
- Popover content: InputNumber (unit_price) + Select (currency with options `'₫'`, `'$'`, `'￥'`) + Save/Cancel buttons
- On save: call `usePartPriceStore().createPrice(...)` (creates new price record, not update - preserves history)
- Compact layout using Ant Design Space

**5.3 Add price management section in detail modal (after inventory status, before recent inbound):**
- Title: "단가 관리" with "단가 추가" button
- Table showing price history: effective_date, unit_price, currency, supplier_name, notes, actions (edit/delete)
- Add/Edit via inline form or sub-modal (Form with: unit_price, currency select `['₫','$','￥']`, supplier_id select, effective_date DatePicker, notes)

**5.4 Wire up store:**
- Import `usePartPriceStore` from store
- Call `fetchLatestPrices()` in useEffect alongside `fetchParts()`
- Call `fetchPricesByPartId(partId)` when opening detail modal

**Verification:**
- Parts table renders a "최근 단가" column with price values or "단가 없음"
- Clicking a price cell opens a Popover with InputNumber + currency Select + Save button
- Saving creates a new part_prices record and refreshes the column
- Detail modal shows price history table with add/edit/delete actions
- Adding a price via detail modal appears in both the history table and the Parts table column

---

### Task 6: Outbound Service Integration

**File:** `C:\Work Drive\APP\MT_Inventory_V2\src\services\outbound.service.ts`

**Modify `getLast7DaysOutboundAmount` (line 476) and `getOutboundAmountByPeriod` (line 554):**

Replace the inbound price lookup logic in both functions. Specifically:

**In `getLast7DaysOutboundAmount` - replace lines 502-524** (the "최근 30일 입고 데이터" block and priceMap building):
```typescript
// NEW: First try part_prices table for latest price per part
const { data: partPricesData } = await supabase
  .from('part_prices')
  .select('part_id, unit_price')
  .order('effective_date', { ascending: false });

// Build price map from part_prices (keep only first = latest per part)
const priceMap = new Map<string, number>();
(partPricesData || []).forEach((pp: { part_id: string; unit_price: number }) => {
  if (!priceMap.has(pp.part_id)) {
    priceMap.set(pp.part_id, pp.unit_price);
  }
});

// Fallback: For parts not in part_prices, use inbound
const missingPartIds = [...new Set(
  (outboundData as OutboundAmountRow[])
    .map(o => o.part_id)
    .filter(id => !priceMap.has(id))
)];

if (missingPartIds.length > 0) {
  const priceStartDate = endDate.subtract(30, 'day');
  const { data: recentInbounds } = await supabase
    .from('inbound')
    .select('part_id, unit_price, inbound_date')
    .in('part_id', missingPartIds)
    .gte('inbound_date', priceStartDate.format('YYYY-MM-DD'))
    .order('inbound_date', { ascending: false });

  const typedRecentInbounds = recentInbounds as InboundPriceRow[] | null;
  missingPartIds.forEach(partId => {
    const partInbound = typedRecentInbounds?.find(ib => ib.part_id === partId);
    priceMap.set(partId, partInbound?.unit_price || 0);
  });
}
```

**In `getOutboundAmountByPeriod` - replace lines 585-607** with the same pattern (using `end` instead of `endDate`).

**Verification:**
- Dashboard outbound amount charts still render correctly
- If a part has a `part_prices` record, that price is used (not inbound)
- If a part has no `part_prices` record, inbound fallback still works
- Add a part_price record manually, verify chart amount changes accordingly

---

### Task 7: Inbound Auto-Sync (Optional)

**File:** `C:\Work Drive\APP\MT_Inventory_V2\src\services\inbound.service.ts`

**In `createInbound` function, insert BEFORE the `return inboundData;` statement (line 280):**
```typescript
// Auto-sync: Create part_prices record with this inbound's unit_price
try {
  const { createPartPrice } = await import('./partPrice.service');
  await createPartPrice({
    part_id: inbound.part_id,
    unit_price: inbound.unit_price,
    currency: inbound.currency || '₫',
    supplier_id: inbound.supplier_id,
    effective_date: inbound.inbound_date,
    notes: `Auto-synced from inbound ${inboundData.reference_number || ''}`,
    created_by: inbound.created_by || 'system',
  });
} catch (syncError) {
  console.warn('단가 자동 동기화 실패 (무시):', syncError);
  // Don't throw - inbound succeeded, price sync is optional
}
```

> **Insertion point:** Between line 278 (`}`) and line 280 (`return inboundData;`). The try/catch for inventory adjustment ends at line 278, then the auto-sync block goes before the return.

**Verification:**
- Create a new inbound record via the Inbound page
- Check `part_prices` table in Supabase Dashboard - a new record should exist with matching part_id, unit_price, currency, supplier_id
- If auto-sync fails, the inbound record is still created successfully (check console for warn message)

---

## Commit Strategy

| Commit | Scope | Description |
|--------|-------|-------------|
| 1 | Task 1 | feat: add part_prices table SQL, RLS policy, and TypeScript types |
| 2 | Task 2 + 3 | feat: add partPrice service and Zustand store |
| 3 | Task 4 | feat: add i18n keys for unit price management (ko/vi) |
| 4 | Task 5 | feat: add unit price column, popover edit, and price management in Parts page |
| 5 | Task 6 | refactor: outbound amount calculation to prefer part_prices |
| 6 | Task 7 | feat: auto-sync inbound unit price to part_prices |

---

## Success Criteria

1. **Parts table displays latest unit price** with currency symbol for each part (or "단가 없음" if none)
2. **Clicking price cell opens Popover** with InputNumber + currency Select; saving creates a new part_prices record
3. **Part detail modal shows full price history** table with add/edit/delete; form includes currency Select with `['₫','$','￥']`
4. **Outbound amount charts use part_prices when available**, fall back to inbound (verify by adding a part_price and checking chart)
5. **New inbound records auto-create part_price entries** (verify in Supabase table after inbound creation)
6. **All UI text translated** in Korean and Vietnamese - no hardcoded strings
7. **No TypeScript compilation errors** - `npx tsc --noEmit` passes cleanly
8. **Existing inbound/outbound functionality unaffected** - create/edit/delete inbound still works, outbound charts still render

---

## Critic Feedback Resolution Summary

| # | Feedback | Resolution |
|---|----------|------------|
| 1 | RLS Policy 누락 | Task 1.2에 명시적 RLS SQL 추가 (Option A: DISABLE, Option B: permissive policy) |
| 2 | Supabase MCP 도구 미상세 | "Supabase Dashboard SQL Editor" 사용으로 명시. MCP 도구 불확실하므로 대안 제시 |
| 3 | Insert/Update 타입 정의 불완전 | Task 1.4에 Omit 필드 명시: `Omit<PartPrice, 'price_id' \| 'created_at' \| 'updated_at' \| 'part_code' \| 'part_name' \| 'supplier_name'>` |
| 4 | `getLatestPartPrices()` 구현 전략 모호 | "fetch all + dedupe in JS" 확정, 전체 구현 코드 제시 |
| 5 | 통화 기호 불일치 | Inbound.tsx 확인 결과 `'₫'`, `'$'`, `'￥'` 심볼 사용 확인. part_prices도 동일 |
| + | getOutboundAmountByPeriod 위치 | line 554 명시 |
| + | Task 7 코드 삽입 위치 | "return 문 이전 (line 280)" 명시 |
| + | 검증 기준 구체화 | 각 Task에 구체적이고 테스트 가능한 Verification 섹션 추가 |
