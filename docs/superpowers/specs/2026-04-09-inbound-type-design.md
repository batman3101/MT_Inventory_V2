# Inbound Type (입고 유형) Feature Design

## Overview

Add an `inbound_type` field to the inbound system to distinguish between new purchases, warranty repairs (free), and paid repairs. Currently, warranty repair items show "-" in the price column with no visual distinction from data errors.

## Inbound Types

| Type Key | Korean Label | Vietnamese Label | Tag Color | Row Background | Unit Price |
|----------|-------------|-----------------|-----------|---------------|------------|
| `purchase` | 신품 | Mới | Blue `#1565c0` on `#e3f2fd` | Default (white) | Required |
| `warranty` | 보증 | Bảo hành | Green `#2e7d32` on `#e8f5e9` | `#f1f8e9` | Disabled, auto 0 |
| `paid_repair` | 유상 | Sửa có phí | Orange `#e65100` on `#fff3e0` | `#fff8e1` | Required |

Default value: `purchase`

## Database Changes

### Migration SQL

```sql
-- Add inbound_type column
ALTER TABLE inbound ADD COLUMN IF NOT EXISTS inbound_type VARCHAR(20) DEFAULT 'purchase';

-- Migrate existing data: unit_price = 0 or NULL → warranty
UPDATE inbound SET inbound_type = 'warranty' WHERE unit_price IS NULL OR unit_price = 0;

-- Ensure remaining records are marked as purchase
UPDATE inbound SET inbound_type = 'purchase' WHERE inbound_type IS NULL;
```

Column: `inbound_type VARCHAR(20) DEFAULT 'purchase'`
Valid values: `purchase`, `warranty`, `paid_repair`

## Frontend Changes

### 1. TypeScript Types (`src/types/database.types.ts`)

Add `inbound_type` field to `Inbound` interface:
- Type: `'purchase' | 'warranty' | 'paid_repair'`
- Default: `'purchase'`

### 2. Inbound Form (`src/pages/Inbound.tsx`)

- Add **Ant Design Segmented** control as first form field after reference number
- Options: 신품 / 보증수리 / 유상수리
- When `warranty` selected:
  - `unit_price` field disabled, value set to 0
  - `unit_price` required validation removed
  - `total_price` auto-calculated as 0
- When `purchase` or `paid_repair` selected:
  - `unit_price` field enabled, required validation active

### 3. Inbound Table (`src/pages/Inbound.tsx`)

- Add "유형" column after "부품명" column
- Render colored badge/tag per type:
  - `purchase` → blue `신품` tag
  - `warranty` → green `보증` tag
  - `paid_repair` → orange `유상` tag
- Row background color per type (see table above)
- Price column: warranty items show "보증수리" text instead of "-"
- Add type filter in filter controls

### 4. Service Layer (`src/services/inbound.service.ts`)

- Include `inbound_type` in create/update operations
- When `inbound_type === 'warranty'`: set `unit_price = 0`, `total_price = 0`
- Skip price sync to `part_prices` table for warranty items

### 5. Zustand Store (`src/store/inbound.store.ts`)

- No structural changes needed; store passes through the new field

### 6. i18n (`src/i18n/locales/ko.json`, `vi.json`)

Add translations:
- `inbound.type` / `inbound.type_purchase` / `inbound.type_warranty` / `inbound.type_paid_repair`
- `inbound.warranty_repair` (for price cell display text)

### 7. Excel Export

Include inbound_type as a readable column (신품/보증/유상) in Excel exports.

## Data Migration

Existing records with `unit_price = 0` or `unit_price IS NULL` will be migrated to `inbound_type = 'warranty'`. All other existing records default to `purchase`.

## Out of Scope

- Separate statistics card for warranty vs paid counts (can be added later)
- Outbound page type field (not needed currently)
- Warranty period tracking or expiration logic
