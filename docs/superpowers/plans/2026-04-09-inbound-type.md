# Inbound Type (입고 유형) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `inbound_type` field (신품/보증수리/유상수리) to distinguish warranty repair items from regular purchases in the inbound management page.

**Architecture:** Add `inbound_type VARCHAR(20)` column to the `inbound` table with values `purchase`, `warranty`, `paid_repair`. The Inbound page form gains an Ant Design Segmented control; when `warranty` is selected, unit_price is disabled and auto-set to 0. The table shows colored type badges and row backgrounds. Existing records with unit_price=0 are migrated to `warranty`.

**Tech Stack:** React 18, TypeScript, Ant Design 5 (Segmented component), Zustand, Supabase PostgreSQL, i18next

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `database/inbound_type_migration.sql` | Create | SQL migration: add column + migrate existing data |
| `src/types/database.types.ts` | Modify (lines 81-99) | Add `inbound_type` to `Inbound` interface |
| `src/i18n/locales/ko.json` | Modify (lines 104-132) | Add Korean translations for type labels |
| `src/i18n/locales/vi.json` | Modify (lines 104-132) | Add Vietnamese translations for type labels |
| `src/services/inbound.service.ts` | Modify (lines 271-318) | Skip price sync for warranty; include type in CRUD |
| `src/pages/Inbound.tsx` | Modify | Add Segmented control to form, type column to table, row styling |

---

### Task 1: Database Migration

**Files:**
- Create: `database/inbound_type_migration.sql`

- [ ] **Step 1: Create migration SQL file**

```sql
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
```

- [ ] **Step 2: Run migration on Supabase**

Run the SQL in Supabase SQL Editor (Dashboard → SQL Editor → paste and run).

Expected: Success with rows affected count for each UPDATE statement.

- [ ] **Step 3: Verify migration**

Run in Supabase SQL Editor:
```sql
SELECT inbound_type, COUNT(*) FROM inbound GROUP BY inbound_type;
```

Expected: Shows `purchase` and `warranty` counts. `paid_repair` will be 0 (no existing data).

- [ ] **Step 4: Commit**

```bash
git add database/inbound_type_migration.sql
git commit -m "feat: add inbound_type migration SQL"
```

---

### Task 2: TypeScript Types + i18n

**Files:**
- Modify: `src/types/database.types.ts:81-99`
- Modify: `src/i18n/locales/ko.json:104-132`
- Modify: `src/i18n/locales/vi.json:104-132`

- [ ] **Step 1: Add inbound_type to Inbound interface**

In `src/types/database.types.ts`, add `inbound_type` field to the `Inbound` interface after the `currency` field (line 90):

```typescript
export interface Inbound {
  inbound_id: string;
  inbound_date: string;
  part_id: string;
  supplier_id: string;
  factory_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  inbound_type: 'purchase' | 'warranty' | 'paid_repair'; // 입고 유형
  notes: string;
  created_at: string;
  created_by: string;
  reference_number: string;
  part_code: string;
  part_name: string;
  supplier_name: string;
  part_unit: string;
}
```

- [ ] **Step 2: Add Korean translations**

In `src/i18n/locales/ko.json`, add these keys inside the `"inbound"` section (after line 131, before the closing `}`):

```json
    "type": "유형",
    "typePurchase": "신품",
    "typeWarranty": "보증수리",
    "typePaidRepair": "유상수리",
    "warrantyRepair": "보증수리",
    "typeFilter": "유형 필터"
```

- [ ] **Step 3: Add Vietnamese translations**

In `src/i18n/locales/vi.json`, add these keys inside the `"inbound"` section (after line 131, before the closing `}`):

```json
    "type": "Loại",
    "typePurchase": "Mới",
    "typeWarranty": "Bảo hành",
    "typePaidRepair": "Sửa có phí",
    "warrantyRepair": "Bảo hành",
    "typeFilter": "Lọc theo loại"
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd "C:/Work Drive/APP/MT_Inventory_V2" && npx tsc --noEmit 2>&1 | head -20`

Expected: No new type errors (existing errors unrelated to our change are OK).

- [ ] **Step 5: Commit**

```bash
git add src/types/database.types.ts src/i18n/locales/ko.json src/i18n/locales/vi.json
git commit -m "feat: add inbound_type to TypeScript types and i18n"
```

---

### Task 3: Service Layer Changes

**Files:**
- Modify: `src/services/inbound.service.ts:271-318`

- [ ] **Step 1: Skip price sync for warranty items in createInbound**

In `src/services/inbound.service.ts`, modify the `createInbound` function (around line 302). Wrap the auto-sync block with a condition that checks `inbound_type`:

Find the block starting at line 302:
```typescript
  // Auto-sync: 입고 단가를 part_prices 테이블에 자동 동기화
  try {
    const { createPartPrice } = await import('./partPrice.service');
    await createPartPrice({
```

Replace the entire auto-sync block (lines 302-315) with:

```typescript
  // Auto-sync: 입고 단가를 part_prices 테이블에 자동 동기화 (보증수리 제외)
  if (inbound.inbound_type !== 'warranty') {
    try {
      const { createPartPrice } = await import('./partPrice.service');
      await createPartPrice({
        part_id: inbound.part_id,
        unit_price: inbound.unit_price,
        currency: inbound.currency || '₫',
        supplier_id: inbound.supplier_id || null,
        effective_from: inbound.inbound_date || dayjs().format('YYYY-MM-DD'),
        created_by: inbound.created_by || 'system',
      });
    } catch (syncError) {
      console.warn('단가 자동 동기화 실패 (무시):', syncError);
    }
  }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "C:/Work Drive/APP/MT_Inventory_V2" && npx tsc --noEmit 2>&1 | head -20`

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/inbound.service.ts
git commit -m "feat: skip price sync for warranty inbound items"
```

---

### Task 4: Inbound Page - Form Changes

**Files:**
- Modify: `src/pages/Inbound.tsx`

- [ ] **Step 1: Add Segmented import**

At line 3, add `Segmented` to the Ant Design imports:

```typescript
import { Card, Input, Button, Space, Typography, Row, Col, Statistic, Modal, Form, message, DatePicker, Select, Spin, Alert, InputNumber, Segmented } from 'antd';
```

- [ ] **Step 2: Add inbound_type state for form behavior**

Inside the component (after line 34, after `const [form] = Form.useForm();`), add:

```typescript
  const [inboundType, setInboundType] = useState<'purchase' | 'warranty' | 'paid_repair'>('purchase');
```

- [ ] **Step 3: Reset inbound_type in showAddModal**

In the `showAddModal` function (line 65-76), add type reset after `form.resetFields()`:

```typescript
  const showAddModal = async () => {
    setEditingItem(null);
    form.resetFields();
    setInboundType('purchase');
    // 오늘 날짜로 참조번호 자동 생성
    const today = dayjs();
    const refNumber = await generateInboundReferenceNumber(today.format('YYYY-MM-DD'));
    setReferenceNumber(refNumber);
    form.setFieldsValue({
      inbound_date: today,
      inbound_type: 'purchase',
    });
    setIsModalOpen(true);
  };
```

- [ ] **Step 4: Set inbound_type in showEditModal**

In the `showEditModal` function (line 78-91), add type loading:

```typescript
  const showEditModal = (item: Inbound) => {
    setEditingItem(item);
    setReferenceNumber(item.reference_number || '');
    const type = item.inbound_type || 'purchase';
    setInboundType(type);
    form.setFieldsValue({
      part_id: item.part_id,
      supplier_id: item.supplier_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      inbound_date: item.inbound_date ? dayjs(item.inbound_date) : undefined,
      currency: item.currency || '₫',
      notes: item.notes,
      inbound_type: type,
    });
    setIsModalOpen(true);
  };
```

- [ ] **Step 5: Handle warranty type in handleOk**

In the `handleOk` function (lines 118-147), modify `formattedValues` to include type and handle warranty pricing:

```typescript
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const isWarranty = values.inbound_type === 'warranty';
      const unitPrice = isWarranty ? 0 : values.unit_price;
      const formattedValues = {
        ...values,
        inbound_date: values.inbound_date.format('YYYY-MM-DD'),
        unit_price: unitPrice,
        total_price: values.quantity * unitPrice,
        reference_number: referenceNumber,
      };

      if (editingItem) {
        await updateInbound(editingItem.inbound_id, formattedValues);
        messageApi.success(t('inbound.inboundUpdated'));
      } else {
        await createInbound({
          ...formattedValues,
          created_by: 'current_user',
        });
        messageApi.success(t('inbound.inboundAdded'));
      }

      setIsModalOpen(false);
      form.resetFields();
      setReferenceNumber('');
      setInboundType('purchase');
    } catch (error) {
      messageApi.error(translateError(error instanceof Error ? error.message : t('common.error')));
    }
  };
```

- [ ] **Step 6: Reset type in handleCancel**

In the `handleCancel` function (lines 149-153):

```typescript
  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    setReferenceNumber('');
    setInboundType('purchase');
  };
```

- [ ] **Step 7: Add inbound_type Segmented control to form**

In the Modal's Form (after the reference_number Form.Item at line 417, before the part_id Form.Item):

```tsx
          <Form.Item
            name="inbound_type"
            label={t('inbound.type')}
            initialValue="purchase"
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Segmented
              options={[
                { label: t('inbound.typePurchase'), value: 'purchase' },
                { label: t('inbound.typeWarranty'), value: 'warranty' },
                { label: t('inbound.typePaidRepair'), value: 'paid_repair' },
              ]}
              onChange={(value) => {
                const type = value as 'purchase' | 'warranty' | 'paid_repair';
                setInboundType(type);
                if (type === 'warranty') {
                  form.setFieldsValue({ unit_price: 0 });
                }
              }}
              block
            />
          </Form.Item>
```

- [ ] **Step 8: Make unit_price conditionally disabled**

Replace the existing unit_price Form.Item (lines 475-481) with:

```tsx
          <Form.Item
            name="unit_price"
            label={
              inboundType === 'warranty'
                ? `${t('inbound.unitPrice')} (${t('inbound.warrantyRepair')} - 0₫)`
                : t('inbound.unitPrice')
            }
            rules={inboundType === 'warranty' ? [] : [{ required: true, message: t('common.required') }]}
          >
            <InputNumber
              min={0}
              precision={0}
              style={{ width: '100%' }}
              addonAfter="₫"
              disabled={inboundType === 'warranty'}
            />
          </Form.Item>
```

- [ ] **Step 9: Verify dev server renders correctly**

Run: `cd "C:/Work Drive/APP/MT_Inventory_V2" && npm run dev`

Open http://localhost:5173, navigate to 입고 → click "새 입고" → verify:
1. Segmented control shows 신품/보증수리/유상수리
2. Clicking "보증수리" disables the unit_price field
3. Clicking "신품" re-enables it

- [ ] **Step 10: Commit**

```bash
git add src/pages/Inbound.tsx
git commit -m "feat: add inbound_type Segmented control to inbound form"
```

---

### Task 5: Inbound Page - Table Changes

**Files:**
- Modify: `src/pages/Inbound.tsx`

- [ ] **Step 1: Add Tag import**

Add `Tag` to the Ant Design imports at line 3:

```typescript
import { Card, Input, Button, Space, Typography, Row, Col, Statistic, Modal, Form, message, DatePicker, Select, Spin, Alert, InputNumber, Segmented, Tag } from 'antd';
```

- [ ] **Step 2: Add type column to columns definition**

In the `columns` array, add a new column AFTER the `part_name` column (after line 195) and BEFORE the `quantity` column:

```typescript
    {
      title: t('inbound.type'),
      dataIndex: 'inbound_type',
      key: 'inbound_type',
      width: 80,
      align: 'center',
      filters: [
        { text: t('inbound.typePurchase'), value: 'purchase' },
        { text: t('inbound.typeWarranty'), value: 'warranty' },
        { text: t('inbound.typePaidRepair'), value: 'paid_repair' },
      ],
      onFilter: (value, record) => (record.inbound_type || 'purchase') === value,
      render: (type: string) => {
        switch (type) {
          case 'warranty':
            return <Tag color="green">{t('inbound.typeWarranty')}</Tag>;
          case 'paid_repair':
            return <Tag color="orange">{t('inbound.typePaidRepair')}</Tag>;
          default:
            return <Tag color="blue">{t('inbound.typePurchase')}</Tag>;
        }
      },
    },
```

- [ ] **Step 3: Update unit_price column render**

Replace the unit_price column render (line 212) to show "보증수리" text for warranty items:

```typescript
    {
      title: t('inbound.unitPrice'),
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 120,
      align: 'right',
      sorter: (a, b) => (a.unit_price || 0) - (b.unit_price || 0),
      render: (price: number, record: Inbound) => {
        if (record.inbound_type === 'warranty') {
          return <span style={{ color: '#2e7d32', fontSize: '12px' }}>{t('inbound.warrantyRepair')}</span>;
        }
        return price ? `${price.toLocaleString()} ${record.currency || '₫'}` : '-';
      },
    },
```

- [ ] **Step 4: Update total_price column render**

Replace the total_price column render (line 221) similarly:

```typescript
    {
      title: t('inbound.totalPrice'),
      dataIndex: 'total_price',
      key: 'total_price',
      width: 140,
      align: 'right',
      sorter: (a, b) => (a.total_price || 0) - (b.total_price || 0),
      render: (price: number, record: Inbound) => {
        if (record.inbound_type === 'warranty') {
          return <span style={{ color: '#2e7d32' }}>-</span>;
        }
        return price ? `${price.toLocaleString()} ${record.currency || '₫'}` : '-';
      },
    },
```

- [ ] **Step 5: Add row background color styling**

On the `ResizableTable` component (line 385), add `rowClassName` prop:

```tsx
          <ResizableTable
            columns={columns}
            dataSource={filteredList}
            rowKey="inbound_id"
            rowClassName={(record: Inbound) => {
              if (record.inbound_type === 'warranty') return 'row-warranty';
              if (record.inbound_type === 'paid_repair') return 'row-paid-repair';
              return '';
            }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `${t('common.total')} ${total} ${t('common.items')}`
            }}
            scroll={{ x: 1400 }}
          />
```

- [ ] **Step 6: Add CSS for row backgrounds**

Add a `<style>` block at the end of the component's return, just before the closing `</div>` (before line 503):

```tsx
      <style>{`
        .row-warranty td { background-color: #f1f8e9 !important; }
        .row-warranty:hover td { background-color: #e8f5e9 !important; }
        .row-paid-repair td { background-color: #fff8e1 !important; }
        .row-paid-repair:hover td { background-color: #fff3e0 !important; }
      `}</style>
```

- [ ] **Step 7: Add inbound_type to Excel export**

In the `handleExportExcel` function (lines 268-285), add the type column to the export columns array. Insert after the `part_name` column config:

```typescript
        { header: t('inbound.type'), key: 'inbound_type', width: 12 },
```

Also, to export human-readable labels instead of raw values, transform the data before export. Replace `filteredList` in the `exportToExcel` call with a mapped version:

```typescript
  const handleExportExcel = () => {
    const typeLabels: Record<string, string> = {
      purchase: t('inbound.typePurchase'),
      warranty: t('inbound.typeWarranty'),
      paid_repair: t('inbound.typePaidRepair'),
    };
    const exportData = filteredList.map(item => ({
      ...item,
      inbound_type: typeLabels[item.inbound_type] || typeLabels.purchase,
    }));
    exportToExcel(
      exportData,
      [
        { header: t('inbound.reference'), key: 'reference_number', width: 18 },
        { header: t('inbound.date'), key: 'inbound_date', width: 15 },
        { header: t('inbound.supplier'), key: 'supplier_name', width: 20 },
        { header: t('parts.partCode'), key: 'part_code', width: 15 },
        { header: t('inbound.partName'), key: 'part_name', width: 25 },
        { header: t('inbound.type'), key: 'inbound_type', width: 12 },
        { header: t('inbound.quantity'), key: 'quantity', width: 12 },
        { header: t('inbound.unitPrice'), key: 'unit_price', width: 15 },
        { header: t('inbound.totalPrice'), key: 'total_price', width: 15 },
        { header: t('inbound.currency'), key: 'currency', width: 10 },
      ],
      t('inbound.title')
    );
    messageApi.success(t('common.exportExcel'));
  };
```

- [ ] **Step 8: Verify in browser**

Open http://localhost:5173, navigate to 입고 page:
1. Table shows "유형" column with colored tags (신품=blue, 보증=green)
2. Warranty rows have green background
3. Warranty items show "보증수리" in unit_price column instead of "-"
4. Type filter works in column header
5. Excel export includes type column

- [ ] **Step 9: Commit**

```bash
git add src/pages/Inbound.tsx
git commit -m "feat: add inbound_type column, row styling, and Excel export to inbound table"
```

---

### Task 6: Final Verification

- [ ] **Step 1: End-to-end test - Create warranty inbound**

1. Navigate to 입고 → "새 입고"
2. Select "보증수리" type
3. Pick a part (e.g., SPINDLE MOTOR)
4. Pick a supplier (e.g., SEVT)
5. Enter quantity: 1
6. Verify unit_price is disabled and 0
7. Click 저장
8. Verify the new row appears with green "보증" tag and green background

- [ ] **Step 2: End-to-end test - Create paid repair inbound**

1. "새 입고" → Select "유상수리"
2. Pick part and supplier
3. Enter quantity and unit_price (e.g., 5,000,000)
4. Click 저장
5. Verify orange "유상" tag and yellow background

- [ ] **Step 3: End-to-end test - Edit existing item**

1. Click "편집" on a warranty item
2. Verify type is pre-selected as "보증수리"
3. Change to "유상수리" → verify unit_price field becomes enabled
4. Save and verify tag changes

- [ ] **Step 4: Verify Excel export**

1. Click "Excel 내보내기"
2. Open the file → verify "유형" column exists with readable labels

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete inbound type feature (warranty/paid repair distinction)"
```
