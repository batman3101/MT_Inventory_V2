# Excel Bulk Import Feature - Implementation Plan

## Context

### Original Request
Excel 일괄 등록 기능 구현 for CNC 재고 관리 시스템:
1. **Target Data**: Inventory, Part Prices, Suppliers
2. **Template Downloads**: Korean/Vietnamese templates
3. **Template Structure**: Data entry sheet + Usage guide tab with examples
4. **Bulk Import**: Data validation before save
5. **UI/UX**: User-friendly interface

### Research Findings

**Existing Patterns Identified:**
- Excel export utility exists at `src/utils/excelExport.ts` using XLSX library
- Service layer pattern: `src/services/*.service.ts` with Supabase direct calls
- i18n structure: `src/i18n/locales/ko.json` and `vi.json`
- Factory context pattern for multi-factory support via `getFactoryId()`
- Zustand stores for state management with persist middleware

**Database Schema (from `src/types/database.types.ts`):**
- **Inventory**: `inventory_id`, `part_id`, `factory_id`, `current_quantity`, `location`, `last_count_date`
- **Parts**: `part_id`, `part_code`, `part_name`, `vietnamese_name`, `korean_name`, `spec`, `unit`, `category`, `status`, `min_stock`
- **Suppliers**: `supplier_id`, `supplier_code`, `supplier_name`, `contact_person`, `phone`, `email`, `country`, `status`, `factory_id`
- **PartPrice**: `price_id`, `part_id`, `factory_id`, `unit_price`, `currency`, `supplier_id`, `effective_from`, `is_current`

**Existing UI Patterns:**
- Ant Design 5 modals, forms, tables
- `exportToExcel()` function for downloads
- ResizableTable component for data display
- Observer mode check via `isObserverMode` from factory store

---

## Work Objectives

### Core Objective
Implement a complete Excel bulk import system for Inventory, Part Prices, and Suppliers with bilingual template support (Korean/Vietnamese), comprehensive validation, and transaction-based data persistence.

### Deliverables
1. **Excel Import Utility Module** (`src/utils/excelImport.ts`)
2. **Bulk Import Service Layer** (`src/services/bulkImport.service.ts`)
3. **Reusable BulkImportModal Component** (`src/components/BulkImportModal.tsx`)
4. **Template Generation Utility** (`src/utils/excelTemplates.ts`)
5. **i18n Keys** for Korean and Vietnamese
6. **Integration** into Inventory, Parts, and Suppliers pages

### Definition of Done
- [ ] Templates download correctly with bilingual headers and usage guide
- [ ] File upload supports drag-and-drop and click-to-browse
- [ ] Parsed data displays in preview table with validation status
- [ ] Validation errors are clearly displayed per row
- [ ] Valid data imports successfully with transaction rollback on failure
- [ ] All text is internationalized (ko/vi)
- [ ] Observer mode disables import functionality

---

## Guardrails

### Must Have
- Transaction-based insert (all rows succeed or all fail)
- Part code validation (must exist in DB for inventory/price imports)
- Supplier code uniqueness check
- Email format validation for suppliers
- Duplicate detection within upload file
- Clear error messages per row with field-level detail
- Template includes "Usage Guide" sheet with examples and validation rules

### Must NOT Have
- Direct file write to server (client-side only with Supabase)
- Auto-correction of invalid data
- Partial imports (must be all-or-nothing)

---

## Architecture Overview

```
+-------------------+     +----------------------+     +------------------+
|   Page Component  | --> | BulkImportModal.tsx  | --> | bulkImport.service.ts
|   (Inventory/     |     | - File upload        |     | - validateRow()
|    Parts/         |     | - Preview table      |     | - bulkInsert()
|    Suppliers)     |     | - Validation display |     | - transaction handling
+-------------------+     +----------------------+     +------------------+
                                  |                           |
                                  v                           v
                         +------------------+         +------------------+
                         | excelImport.ts   |         | Supabase Client  |
                         | - parseExcel()   |         | - batch insert   |
                         | - validateData() |         | - FK validation  |
                         +------------------+         +------------------+
                                  |
                                  v
                         +------------------+
                         | excelTemplates.ts|
                         | - generateTemplate()
                         | - getValidationRules()
                         +------------------+
```

---

## File Structure

### New Files to Create

```
src/
├── components/
│   └── BulkImportModal.tsx          # Reusable modal for bulk import
├── services/
│   └── bulkImport.service.ts        # Validation and bulk insert logic
├── utils/
│   ├── excelImport.ts               # Excel file parsing utilities
│   └── excelTemplates.ts            # Template generation utilities
└── types/
    └── bulkImport.types.ts          # Type definitions for bulk import
```

### Files to Modify

```
src/
├── pages/
│   ├── Inventory.tsx                # Add "Excel Import" button
│   ├── Parts.tsx                    # Add "Excel Import" button (for prices)
│   └── Suppliers.tsx                # Add "Excel Import" button
└── i18n/
    └── locales/
        ├── ko.json                  # Add bulkImport namespace
        └── vi.json                  # Add bulkImport namespace
```

---

## Component Design

### BulkImportModal.tsx

```typescript
interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  importType: 'inventory' | 'partPrices' | 'suppliers';
  onSuccess: () => void;  // Callback to refresh parent data
}

// State
interface BulkImportState {
  step: 'upload' | 'preview' | 'importing' | 'complete';
  file: File | null;
  parsedData: ParsedRow[];
  validationResults: ValidationResult[];
  importProgress: number;
  importError: string | null;
}

// Key UI Elements
- Ant Design Upload.Dragger for file upload
- Ant Design Table for preview with validation status column
- Ant Design Progress for import progress
- Summary statistics: total, valid, invalid rows
```

### Template Structure (Excel)

**Sheet 1: Data Entry**
| Column A | Column B | Column C | ... |
|----------|----------|----------|-----|
| Header (localized) | Header | Header | ... |
| (empty for user input) | | | |

**Sheet 2: Usage Guide (사용방법/Huong dan)**
| Field Name | Required | Format | Example | Description |
|------------|----------|--------|---------|-------------|
| part_code | Yes | Text | MT001 | Must exist in Parts table |
| quantity | Yes | Number >= 0 | 100 | Current stock quantity |
| ... | ... | ... | ... | ... |

---

## Service Layer Design

### bulkImport.service.ts

```typescript
// Core functions
export async function validateInventoryRow(row: InventoryImportRow): Promise<ValidationResult>
export async function validatePartPriceRow(row: PartPriceImportRow): Promise<ValidationResult>
export async function validateSupplierRow(row: SupplierImportRow): Promise<ValidationResult>

export async function bulkImportInventory(rows: InventoryImportRow[], userId: string): Promise<BulkImportResult>
export async function bulkImportPartPrices(rows: PartPriceImportRow[], userId: string): Promise<BulkImportResult>
export async function bulkImportSuppliers(rows: SupplierImportRow[], userId: string): Promise<BulkImportResult>

// Validation helpers (internal)
async function checkPartCodeExists(partCode: string): Promise<string | null>  // Returns part_id or null
async function checkSupplierCodeUnique(supplierCode: string): Promise<boolean>
async function checkDuplicatesInBatch(rows: any[], keyField: string): Promise<number[]>  // Returns duplicate row indices
```

### User Context (created_by Field Population)

All bulk import functions receive the current user ID from the component layer:

```typescript
// In BulkImportModal.tsx
import { useAuthStore } from '@/store/useAuthStore';

// Inside component
const user = useAuthStore.getState().user;
const userId = user?.user_id || user?.email || 'system';

// Pass to service
await bulkImportInventory(validRows, userId);
await bulkImportPartPrices(validRows, userId);
await bulkImportSuppliers(validRows, userId);

// In bulkImport.service.ts
export async function bulkImportInventory(
  rows: InventoryImportRow[],
  userId: string
): Promise<BulkImportResult> {
  const preparedRows = rows.map(row => ({
    ...row,
    created_by: userId,
    created_at: new Date().toISOString()
  }));
  // ... rest of import logic
}
```

### Transaction-like Rollback (Client-Side)

Since Supabase doesn't support true database transactions in the JS client, we implement client-side rollback:

```typescript
// Pseudo-code for transaction-like behavior in bulkImport.service.ts

interface BulkImportResult {
  success: boolean;
  count: number;
  error?: string;
  partialInserts?: string[];  // IDs of records that were inserted before failure
}

async function bulkImportWithRollback<T extends Record<string, unknown>>(
  tableName: string,
  rows: T[],
  idField: string
): Promise<BulkImportResult> {
  const BATCH_SIZE = 50;
  const insertedIds: string[] = [];

  try {
    // Process in batches to avoid rate limiting
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from(tableName)
        .insert(batch)
        .select(idField);

      if (error) throw error;
      insertedIds.push(...data.map(d => d[idField]));
    }
    return { success: true, count: insertedIds.length };
  } catch (error) {
    // Rollback: delete all inserted records
    if (insertedIds.length > 0) {
      try {
        await supabase.from(tableName).delete().in(idField, insertedIds);
      } catch (rollbackError) {
        // Log rollback failure but don't throw - best effort rollback
        console.error('Rollback failed:', rollbackError);
        // Return partial insert info so user knows what to clean up manually
        return {
          success: false,
          count: 0,
          error: `Import failed and rollback also failed. ${insertedIds.length} records may need manual cleanup.`,
          partialInserts: insertedIds
        };
      }
    }
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### Inventory Import Behavior (UPSERT Logic)

For inventory imports, we use an UPSERT approach based on `part_code + factory_id` combination:

```typescript
async function bulkImportInventory(
  rows: InventoryImportRow[],
  userId: string,
  factoryId: string
): Promise<BulkImportResult> {
  // Step 1: Separate rows into UPDATE vs INSERT
  const toUpdate: { inventoryId: string; row: InventoryImportRow }[] = [];
  const toInsert: InventoryImportRow[] = [];

  for (const row of rows) {
    // Check if inventory record exists for this part_code + factory_id
    const { data: existing } = await supabase
      .from('inventory')
      .select('inventory_id, part_id')
      .eq('factory_id', factoryId)
      .eq('parts.part_code', row.part_code)  // Join to parts table
      .single();

    if (existing) {
      toUpdate.push({ inventoryId: existing.inventory_id, row });
    } else {
      toInsert.push(row);
    }
  }

  // Step 2: Process updates (update quantity, location, last_count_date)
  const updatePromises = toUpdate.map(({ inventoryId, row }) =>
    supabase
      .from('inventory')
      .update({
        current_quantity: row.quantity,
        location: row.location,
        last_count_date: new Date().toISOString(),
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('inventory_id', inventoryId)
  );

  // Step 3: Process inserts using bulkImportWithRollback
  // ... (uses the rollback pattern above)

  return {
    success: true,
    count: toUpdate.length + toInsert.length,
    updated: toUpdate.length,
    inserted: toInsert.length
  };
}
```

**UPSERT Behavior Summary:**
| Condition | Action |
|-----------|--------|
| `part_code + factory_id` exists | UPDATE: `current_quantity`, `location`, `last_count_date` |
| `part_code + factory_id` NOT exists | INSERT new inventory record |
| `part_code` doesn't exist in `parts` table | VALIDATION ERROR (reject row) |

### Template Language Detection

When parsing uploaded Excel files, we detect the template language by header text matching:

```typescript
// In excelImport.ts

const HEADER_MAP = {
  inventory: {
    ko: { '부품코드': 'part_code', '수량': 'quantity', '위치': 'location' },
    vi: { 'Ma phu tung': 'part_code', 'So luong': 'quantity', 'Vi tri': 'location' }
  },
  partPrices: {
    ko: { '부품코드': 'part_code', '단가': 'unit_price', '통화': 'currency', '적용일': 'effective_from', '공급업체코드': 'supplier_code' },
    vi: { 'Ma phu tung': 'part_code', 'Don gia': 'unit_price', 'Loai tien': 'currency', 'Ngay ap dung': 'effective_from', 'Ma NCC': 'supplier_code' }
  },
  suppliers: {
    ko: { '공급업체코드': 'supplier_code', '이름': 'supplier_name', '담당자': 'contact_person', '전화번호': 'phone', '이메일': 'email', '국가': 'country', '상태': 'status' },
    vi: { 'Ma NCC': 'supplier_code', 'Ten': 'supplier_name', 'Nguoi lien he': 'contact_person', 'SDT': 'phone', 'Email': 'email', 'Quoc gia': 'country', 'Trang thai': 'status' }
  }
};

function detectTemplateLanguage(
  headers: string[],
  importType: 'inventory' | 'partPrices' | 'suppliers'
): 'ko' | 'vi' {
  const koHeaders = Object.keys(HEADER_MAP[importType].ko);
  const viHeaders = Object.keys(HEADER_MAP[importType].vi);

  const koMatches = headers.filter(h => koHeaders.includes(h)).length;
  const viMatches = headers.filter(h => viHeaders.includes(h)).length;

  // Return language with more header matches
  // Default to Korean if ambiguous (equal matches)
  return viMatches > koMatches ? 'vi' : 'ko';
}

async function parseExcelFile(
  file: File,
  importType: ImportType
): Promise<{ rows: ParsedRow[]; detectedLanguage: 'ko' | 'vi' }> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const headers = rawData[0] as string[];
  const detectedLanguage = detectTemplateLanguage(headers, importType);
  const headerMap = HEADER_MAP[importType][detectedLanguage];

  // Map localized headers to internal field names
  const rows = rawData.slice(1).map(row => {
    const mapped: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      const fieldName = headerMap[header];
      if (fieldName) {
        mapped[fieldName] = row[idx];
      }
    });
    return mapped as ParsedRow;
  });

  return { rows, detectedLanguage };
}
```

### Supplier Status Values

Based on existing database constraints:

```typescript
// Valid supplier status values (NO "NEW" status)
const VALID_SUPPLIER_STATUS = ['ACTIVE', 'INACTIVE'] as const;
type SupplierStatus = typeof VALID_SUPPLIER_STATUS[number];

// Validation in bulkImport.service.ts
function validateSupplierRow(row: SupplierImportRow): ValidationResult {
  const errors: FieldError[] = [];

  // Status validation - only ACTIVE or INACTIVE allowed
  if (!VALID_SUPPLIER_STATUS.includes(row.status)) {
    errors.push({
      field: 'status',
      message: 'bulkImport.errors.invalidStatus'  // Update i18n to reflect correct values
    });
  }

  // ... other validations
}

// For new suppliers being imported, default status = ACTIVE if not provided
function prepareSupplierRow(row: SupplierImportRow): SupplierInsertRow {
  return {
    ...row,
    status: row.status || 'ACTIVE'  // Default to ACTIVE for new suppliers
  };
}
```

### Part Prices Import - Factory Context

Part prices import must use the current factory context:

```typescript
// In BulkImportModal.tsx
import { useFactoryStore } from '@/store/useFactoryStore';

// Get factory context
const { getFactoryId, isObserverMode } = useFactoryStore();
const factoryId = getFactoryId();

// Pass to service
await bulkImportPartPrices(validRows, userId, factoryId);

// In bulkImport.service.ts
export async function bulkImportPartPrices(
  rows: PartPriceImportRow[],
  userId: string,
  factoryId: string
): Promise<BulkImportResult> {
  const preparedRows = rows.map(row => ({
    part_id: row.part_id,  // Resolved from part_code during validation
    factory_id: factoryId,
    unit_price: row.unit_price,
    currency: row.currency,
    supplier_id: row.supplier_id || null,  // Resolved from supplier_code during validation
    effective_from: row.effective_from,
    is_current: true,
    created_by: userId,
    created_at: new Date().toISOString()
  }));

  return bulkImportWithRollback('part_prices', preparedRows, 'price_id');
}
```

---

### Validation Rules Specification

**Inventory Import:**
| Field | Required | Validation | Error Message Key |
|-------|----------|------------|-------------------|
| part_code | Yes | Must exist in parts table | bulkImport.errors.partNotFound |
| quantity | Yes | Integer >= 0 | bulkImport.errors.invalidQuantity |
| location | Yes | Non-empty string | bulkImport.errors.locationRequired |

**Part Prices Import:**
| Field | Required | Validation | Error Message Key |
|-------|----------|------------|-------------------|
| part_code | Yes | Must exist in parts table | bulkImport.errors.partNotFound |
| unit_price | Yes | Number > 0 | bulkImport.errors.invalidPrice |
| currency | Yes | One of: VND, USD, KRW | bulkImport.errors.invalidCurrency |
| effective_from | Yes | Valid date (YYYY-MM-DD) | bulkImport.errors.invalidDate |
| supplier_code | No | If provided, must exist | bulkImport.errors.supplierNotFound |

**Suppliers Import:**
| Field | Required | Validation | Error Message Key |
|-------|----------|------------|-------------------|
| supplier_code | Yes | Unique in DB + batch | bulkImport.errors.duplicateSupplierCode |
| supplier_name | Yes | Non-empty string | bulkImport.errors.nameRequired |
| contact_person | Yes | Non-empty string | bulkImport.errors.contactRequired |
| phone | Yes | Non-empty string | bulkImport.errors.phoneRequired |
| email | No | Valid email format | bulkImport.errors.invalidEmail |
| country | No | Max 50 chars | bulkImport.errors.countryTooLong |
| status | No | One of: ACTIVE, INACTIVE (defaults to ACTIVE) | bulkImport.errors.invalidStatus |

---

## Template Layouts

### Inventory Template

**Korean (재고_템플릿.xlsx):**
- Sheet 1 "데이터입력": 부품코드, 수량, 위치
- Sheet 2 "사용방법": Field descriptions, examples, validation rules

**Vietnamese (mau_kho.xlsx):**
- Sheet 1 "Nhap du lieu": Ma phu tung, So luong, Vi tri
- Sheet 2 "Huong dan": Field descriptions, examples, validation rules

### Part Prices Template

**Korean (단가_템플릿.xlsx):**
- Sheet 1 "데이터입력": 부품코드, 단가, 통화, 적용일, 공급업체코드
- Sheet 2 "사용방법": Field descriptions, examples

**Vietnamese (mau_don_gia.xlsx):**
- Sheet 1 "Nhap du lieu": Ma phu tung, Don gia, Loai tien, Ngay ap dung, Ma NCC
- Sheet 2 "Huong dan": Field descriptions, examples

### Suppliers Template

**Korean (공급업체_템플릿.xlsx):**
- Sheet 1 "데이터입력": 공급업체코드, 이름, 담당자, 전화번호, 이메일, 국가, 상태
- Sheet 2 "사용방법": Field descriptions, examples

**Vietnamese (mau_nha_cung_cap.xlsx):**
- Sheet 1 "Nhap du lieu": Ma NCC, Ten, Nguoi lien he, SDT, Email, Quoc gia, Trang thai
- Sheet 2 "Huong dan": Field descriptions, examples

---

## i18n Keys to Add

### Korean (ko.json)

```json
{
  "bulkImport": {
    "title": "Excel 일괄 등록",
    "downloadTemplate": "템플릿 다운로드",
    "uploadFile": "파일 업로드",
    "dragDropText": "파일을 여기에 끌어다 놓거나 클릭하여 선택하세요",
    "supportedFormats": "지원 형식: .xlsx, .xls (최대 5MB)",
    "preview": "미리보기",
    "import": "등록",
    "cancel": "취소",
    "importing": "등록 중...",
    "complete": "등록 완료",
    "summary": {
      "total": "전체 행",
      "valid": "유효",
      "invalid": "오류",
      "toUpdate": "업데이트",
      "toInsert": "신규 등록"
    },
    "validation": {
      "valid": "유효",
      "invalid": "오류"
    },
    "errors": {
      "partNotFound": "존재하지 않는 부품코드입니다",
      "invalidQuantity": "수량은 0 이상의 정수여야 합니다",
      "locationRequired": "위치는 필수 항목입니다",
      "invalidPrice": "단가는 0보다 커야 합니다",
      "invalidCurrency": "통화는 VND, USD, KRW 중 하나여야 합니다",
      "invalidDate": "날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)",
      "supplierNotFound": "존재하지 않는 공급업체코드입니다",
      "duplicateSupplierCode": "중복된 공급업체코드입니다",
      "nameRequired": "이름은 필수 항목입니다",
      "contactRequired": "담당자는 필수 항목입니다",
      "phoneRequired": "전화번호는 필수 항목입니다",
      "invalidEmail": "이메일 형식이 올바르지 않습니다",
      "invalidStatus": "상태는 ACTIVE, INACTIVE 중 하나여야 합니다",
      "duplicateInFile": "파일 내 중복된 데이터입니다",
      "emptyFile": "파일에 데이터가 없습니다",
      "invalidFormat": "파일 형식이 올바르지 않습니다",
      "importFailed": "등록에 실패했습니다",
      "fileTooLarge": "파일 크기가 5MB를 초과합니다",
      "rollbackFailed": "등록 실패 후 롤백도 실패했습니다. 수동 정리가 필요할 수 있습니다."
    },
    "success": {
      "imported": "{{count}}건이 성공적으로 등록되었습니다",
      "updated": "{{updateCount}}건 업데이트, {{insertCount}}건 신규 등록"
    },
    "template": {
      "inventory": "재고 템플릿",
      "partPrices": "단가 템플릿",
      "suppliers": "공급업체 템플릿"
    },
    "guide": {
      "sheetName": "사용방법",
      "fieldName": "필드명",
      "required": "필수",
      "format": "형식",
      "example": "예시",
      "description": "설명",
      "yes": "예",
      "no": "아니오"
    }
  }
}
```

### Vietnamese (vi.json)

```json
{
  "bulkImport": {
    "title": "Nhap hang loat tu Excel",
    "downloadTemplate": "Tai mau",
    "uploadFile": "Tai file len",
    "dragDropText": "Keo tha file vao day hoac nhan de chon",
    "supportedFormats": "Dinh dang ho tro: .xlsx, .xls (toi da 5MB)",
    "preview": "Xem truoc",
    "import": "Nhap",
    "cancel": "Huy",
    "importing": "Dang nhap...",
    "complete": "Hoan thanh",
    "summary": {
      "total": "Tong so dong",
      "valid": "Hop le",
      "invalid": "Loi",
      "toUpdate": "Cap nhat",
      "toInsert": "Them moi"
    },
    "validation": {
      "valid": "Hop le",
      "invalid": "Loi"
    },
    "errors": {
      "partNotFound": "Ma phu tung khong ton tai",
      "invalidQuantity": "So luong phai la so nguyen >= 0",
      "locationRequired": "Vi tri la bat buoc",
      "invalidPrice": "Don gia phai lon hon 0",
      "invalidCurrency": "Loai tien phai la VND, USD hoac KRW",
      "invalidDate": "Dinh dang ngay khong hop le (YYYY-MM-DD)",
      "supplierNotFound": "Ma nha cung cap khong ton tai",
      "duplicateSupplierCode": "Ma nha cung cap bi trung",
      "nameRequired": "Ten la bat buoc",
      "contactRequired": "Nguoi lien he la bat buoc",
      "phoneRequired": "So dien thoai la bat buoc",
      "invalidEmail": "Dinh dang email khong hop le",
      "invalidStatus": "Trang thai phai la ACTIVE hoac INACTIVE",
      "duplicateInFile": "Du lieu bi trung trong file",
      "emptyFile": "File khong co du lieu",
      "invalidFormat": "Dinh dang file khong hop le",
      "importFailed": "Nhap that bai",
      "fileTooLarge": "Kich thuoc file vuot qua 5MB",
      "rollbackFailed": "Nhap that bai va rollback cung that bai. Can don dep thu cong."
    },
    "success": {
      "imported": "Da nhap thanh cong {{count}} dong",
      "updated": "{{updateCount}} cap nhat, {{insertCount}} them moi"
    },
    "template": {
      "inventory": "Mau kho",
      "partPrices": "Mau don gia",
      "suppliers": "Mau nha cung cap"
    },
    "guide": {
      "sheetName": "Huong dan",
      "fieldName": "Ten truong",
      "required": "Bat buoc",
      "format": "Dinh dang",
      "example": "Vi du",
      "description": "Mo ta",
      "yes": "Co",
      "no": "Khong"
    }
  }
}
```

---

## Implementation Tasks

### Task 1: Type Definitions
**File:** `src/types/bulkImport.types.ts`
**Acceptance Criteria:**
- [ ] Define `InventoryImportRow`, `PartPriceImportRow`, `SupplierImportRow` interfaces
- [ ] Define `ValidationResult` interface with field-level errors
- [ ] Define `BulkImportResult` interface including `partialInserts` for rollback failures
- [ ] Define `ImportType` union type
- [ ] Define `SupplierStatus = 'ACTIVE' | 'INACTIVE'` (NO 'NEW')

### Task 2: Excel Import Utility
**File:** `src/utils/excelImport.ts`
**Acceptance Criteria:**
- [ ] `parseExcelFile(file: File, importType: ImportType): Promise<{ rows: ParsedRow[]; detectedLanguage: 'ko' | 'vi' }>`
- [ ] Handle both .xlsx and .xls formats
- [ ] **Language detection via header text matching** (see HEADER_MAP spec above)
- [ ] Match first row headers against known Korean/Vietnamese header values
- [ ] Default to Korean if language detection is ambiguous (equal matches)
- [ ] Map column headers to field names based on detected language
- [ ] Return typed array based on importType
- [ ] Handle empty cells, trim whitespace

### Task 3: Template Generation Utility
**File:** `src/utils/excelTemplates.ts`
**Acceptance Criteria:**
- [ ] `generateInventoryTemplate(language: 'ko' | 'vi'): void`
- [ ] `generatePartPriceTemplate(language: 'ko' | 'vi'): void`
- [ ] `generateSupplierTemplate(language: 'ko' | 'vi'): void`
- [ ] Each template has 2 sheets: Data Entry + Usage Guide
- [ ] Usage Guide includes: field names, required indicators, format, examples, descriptions
- [ ] Supplier template shows valid status values as: ACTIVE, INACTIVE (not NEW)

### Task 4: Bulk Import Service
**File:** `src/services/bulkImport.service.ts`
**Acceptance Criteria:**
- [ ] Validation functions for each import type
- [ ] `checkPartCodeExists()` - returns part_id or null
- [ ] `checkSupplierCodeExists()` - returns supplier_id or null
- [ ] `checkSupplierCodeUnique()` - for new suppliers
- [ ] Duplicate detection within batch
- [ ] All import functions receive `userId: string` parameter for `created_by` field
- [ ] Get user ID from `useAuthStore.getState().user?.user_id || user?.email || 'system'`
- [ ] **Inventory UPSERT behavior:**
  - If `part_code + factory_id` exists: UPDATE `current_quantity`, `location`, `last_count_date`
  - If not exists: INSERT new record
  - Validation must check part_code exists in parts table
- [ ] **Transaction-like rollback:**
  - Use `bulkImportWithRollback()` helper (see pseudo-code above)
  - Batch insert in chunks of 50 rows
  - Track inserted IDs for potential rollback
  - On failure: delete all inserted records (best effort)
  - If rollback deletion fails: log error, return `partialInserts` array for manual cleanup
- [ ] Returns detailed error info per row on failure
- [ ] Supplier status validation: only ACTIVE, INACTIVE (default to ACTIVE for new)
- [ ] Part prices import uses current factory context via `getFactoryId()`

### Task 5: BulkImportModal Component
**File:** `src/components/BulkImportModal.tsx`
**Acceptance Criteria:**
- [ ] Props: `open`, `onClose`, `importType`, `onSuccess`
- [ ] Step 1: Template download + file upload (drag-drop + click)
- [ ] **File size validation: reject files > 5MB** with `bulkImport.errors.fileTooLarge` message
- [ ] Step 2: Preview table with validation status column
- [ ] **For inventory: show "Update" vs "Insert" indicator per row**
- [ ] Validation status: green checkmark or red X with hover tooltip
- [ ] Summary: total rows, valid, invalid (and update/insert counts for inventory)
- [ ] Import button disabled if any invalid rows
- [ ] Progress indicator during import
- [ ] Success/error message after import (show update/insert breakdown for inventory)
- [ ] Respects observer mode (disable all actions)
- [ ] Get current user from `useAuthStore` and pass to service functions
- [ ] Get factory context from `useFactoryStore.getFactoryId()`

### Task 6: i18n Updates
**Files:** `src/i18n/locales/ko.json`, `src/i18n/locales/vi.json`
**Acceptance Criteria:**
- [ ] Add `bulkImport` namespace with all keys as specified above
- [ ] Update status validation error message: "ACTIVE, INACTIVE" (not "NEW, ACTIVE, INACTIVE")
- [ ] Add `fileTooLarge` and `rollbackFailed` error messages
- [ ] Add `toUpdate`, `toInsert` summary keys for inventory UPSERT feedback
- [ ] Verify no missing keys between ko and vi

### Task 7: Inventory Page Integration
**File:** `src/pages/Inventory.tsx`
**Acceptance Criteria:**
- [ ] Add "Excel Import" button next to "Excel Export" button
- [ ] Button disabled in observer mode
- [ ] Opens BulkImportModal with `importType="inventory"`
- [ ] Refreshes inventory data on successful import

### Task 8: Parts Page Integration (Price Import)
**File:** `src/pages/Parts.tsx`
**Acceptance Criteria:**
- [ ] Add "Price Import" button in header area
- [ ] Button disabled in observer mode
- [ ] Opens BulkImportModal with `importType="partPrices"`
- [ ] Part prices import uses current factory context
- [ ] Refreshes latest prices on successful import

### Task 9: Suppliers Page Integration
**File:** `src/pages/Suppliers.tsx`
**Acceptance Criteria:**
- [ ] Add "Excel Import" button next to "Excel Export" button
- [ ] Button disabled in observer mode
- [ ] Opens BulkImportModal with `importType="suppliers"`
- [ ] Refreshes suppliers data on successful import

---

## Test Scenarios for Validation Edge Cases

### Inventory Import Tests
| Scenario | Expected Result |
|----------|-----------------|
| Valid part_code, new to factory | INSERT new inventory record |
| Valid part_code, already exists | UPDATE quantity, location, last_count_date |
| Invalid part_code | Validation error: partNotFound |
| Negative quantity | Validation error: invalidQuantity |
| Duplicate part_code in same file | Allow (both will be processed - later overwrites earlier) |
| Empty location | Validation error: locationRequired |

### Part Prices Import Tests
| Scenario | Expected Result |
|----------|-----------------|
| Valid part_code, valid supplier_code | INSERT new price record |
| Valid part_code, no supplier_code | INSERT with null supplier_id |
| Invalid part_code | Validation error: partNotFound |
| Invalid supplier_code | Validation error: supplierNotFound |
| Invalid currency (e.g., "EUR") | Validation error: invalidCurrency |
| Invalid date format | Validation error: invalidDate |
| Zero or negative price | Validation error: invalidPrice |

### Suppliers Import Tests
| Scenario | Expected Result |
|----------|-----------------|
| New valid supplier | INSERT with status=ACTIVE (if not specified) |
| Duplicate supplier_code in DB | Validation error: duplicateSupplierCode |
| Duplicate supplier_code in same file | Validation error: duplicateInFile |
| Invalid status "NEW" | Validation error: invalidStatus |
| Valid status "ACTIVE" | Pass validation |
| Invalid email format | Validation error: invalidEmail |
| Missing required fields | Respective validation errors |

### Rollback Tests
| Scenario | Expected Result |
|----------|-----------------|
| 100 rows, row 50 fails | Rows 1-49 rolled back, no data persisted |
| Insert succeeds, rollback fails | Return `partialInserts` array, show rollbackFailed message |
| Network error mid-import | Rollback attempted, appropriate error shown |

---

## Commit Strategy

1. **feat(types): add bulk import type definitions**
   - `src/types/bulkImport.types.ts`

2. **feat(utils): add Excel import and template utilities**
   - `src/utils/excelImport.ts`
   - `src/utils/excelTemplates.ts`

3. **feat(services): add bulk import service with validation**
   - `src/services/bulkImport.service.ts`

4. **feat(i18n): add bulk import translations (ko/vi)**
   - `src/i18n/locales/ko.json`
   - `src/i18n/locales/vi.json`

5. **feat(components): add BulkImportModal component**
   - `src/components/BulkImportModal.tsx`

6. **feat(pages): integrate bulk import into Inventory, Parts, Suppliers**
   - `src/pages/Inventory.tsx`
   - `src/pages/Parts.tsx`
   - `src/pages/Suppliers.tsx`

---

## Success Criteria

### Functional
- [ ] User can download bilingual templates for all 3 data types
- [ ] Templates include clear usage instructions with examples
- [ ] User can upload Excel files via drag-drop or file picker
- [ ] File size limited to 5MB with clear error message
- [ ] Uploaded data is previewed with per-row validation status
- [ ] Invalid rows show clear error messages
- [ ] Valid data imports successfully into database
- [ ] Inventory import uses UPSERT (update existing, insert new)
- [ ] Failed imports roll back completely (no partial data)
- [ ] Rollback failures are clearly communicated with cleanup guidance
- [ ] UI is fully translated in Korean and Vietnamese

### Non-Functional
- [ ] Import of 100 rows completes within 10 seconds
- [ ] No console errors during normal operation
- [ ] Works in Chrome, Firefox, Edge (latest versions)

---

## Risk Assessment & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Large file causes browser freeze | Medium | High | Implement chunked processing, add file size limit (5MB) |
| Supabase rate limiting on bulk insert | Low | Medium | Batch inserts in chunks of 50 rows |
| Unicode issues in Korean/Vietnamese text | Medium | Medium | Ensure XLSX library handles UTF-8, test with special characters |
| Transaction rollback not supported by Supabase | High | High | Implement client-side rollback: track inserted IDs and delete on error |
| Rollback deletion fails | Low | High | Return partialInserts array, show user message for manual cleanup |
| Part codes case sensitivity mismatch | Medium | Medium | Normalize to uppercase before validation |
| Ambiguous template language | Low | Low | Default to Korean, document behavior |

---

## Dependencies

**Existing (no new packages needed):**
- `xlsx` - Already used for export, will reuse for import/template generation
- `@ant-design/icons` - UploadOutlined, FileExcelOutlined icons
- `antd` - Upload.Dragger, Table, Modal, Progress, Alert components

---

## Notes

- Factory context (`getFactoryId()`) must be applied to all bulk operations
- Observer mode check should disable import buttons entirely
- Consider adding batch size configuration for very large imports in future
- Template generation can be done client-side (no server needed)
- User context for `created_by` field comes from `useAuthStore`
