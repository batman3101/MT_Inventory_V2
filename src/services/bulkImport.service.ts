import { supabase } from '@/lib/supabase';
import { getFactoryId } from './factoryContext';
import type {
  InventoryImportRow,
  PartPriceImportRow,
  SupplierImportRow,
  ValidationResult,
  BulkImportResult,
  FieldError
} from '@/types/bulkImport.types';

const BATCH_SIZE = 50;
const VALID_CURRENCIES = ['VND', 'USD', 'KRW'];
const VALID_SUPPLIER_STATUS = ['ACTIVE', 'INACTIVE'];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if part_code exists and return part_id
 */
async function getPartIdByCode(partCode: string): Promise<string | null> {
  const normalizedCode = partCode.trim().toUpperCase();
  const { data, error } = await supabase
    .from('parts')
    .select('part_id')
    .ilike('part_code', normalizedCode)
    .single();

  if (error || !data) return null;
  return data.part_id;
}

/**
 * Check if supplier_code exists for current factory and return supplier_id
 */
async function getSupplierIdByCode(supplierCode: string): Promise<string | null> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('suppliers')
    .select('supplier_id')
    .ilike('supplier_code', supplierCode.trim())
    .eq('factory_id', factoryId)
    .single();

  if (error || !data) return null;
  return data.supplier_id;
}

/**
 * Check if supplier_code is unique in DB for current factory
 */
async function isSupplierCodeUnique(supplierCode: string): Promise<boolean> {
  const factoryId = getFactoryId();
  const { data } = await supabase
    .from('suppliers')
    .select('supplier_id')
    .ilike('supplier_code', supplierCode.trim())
    .eq('factory_id', factoryId)
    .single();

  return !data;
}

/**
 * Check if inventory record exists for part + factory
 */
async function getExistingInventory(partId: string): Promise<{ inventory_id: string } | null> {
  const factoryId = getFactoryId();
  const { data } = await supabase
    .from('inventory')
    .select('inventory_id')
    .eq('part_id', partId)
    .eq('factory_id', factoryId)
    .single();

  return data;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

// ============================================================================
// Validation Functions
// ============================================================================

export async function validateInventoryRows(
  rows: InventoryImportRow[]
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const seenPartCodes = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: FieldError[] = [];

    // Check part_code
    if (!row.part_code || row.part_code.trim() === '') {
      errors.push({ field: 'part_code', message: 'bulkImport.errors.partNotFound' });
    } else {
      const normalizedCode = row.part_code.trim().toUpperCase();

      // Check duplicate in file
      if (seenPartCodes.has(normalizedCode)) {
        errors.push({ field: 'part_code', message: 'bulkImport.errors.duplicateInFile' });
      } else {
        seenPartCodes.add(normalizedCode);

        // Check exists in DB
        const partId = await getPartIdByCode(row.part_code);
        if (!partId) {
          errors.push({ field: 'part_code', message: 'bulkImport.errors.partNotFound' });
        } else {
          row.part_id = partId;

          // Check if inventory exists (for UPSERT)
          const existing = await getExistingInventory(partId);
          if (existing) {
            row.isUpdate = true;
            row.existing_inventory_id = existing.inventory_id;
          }
        }
      }
    }

    // Check quantity
    if (row.quantity === undefined || row.quantity === null) {
      errors.push({ field: 'quantity', message: 'bulkImport.errors.invalidQuantity' });
    } else if (!Number.isInteger(row.quantity) || row.quantity < 0) {
      errors.push({ field: 'quantity', message: 'bulkImport.errors.invalidQuantity' });
    }

    // Check location
    if (!row.location || row.location.trim() === '') {
      errors.push({ field: 'location', message: 'bulkImport.errors.locationRequired' });
    }

    results.push({
      rowIndex: i,
      valid: errors.length === 0,
      errors,
      data: row
    });
  }

  return results;
}

export async function validatePartPriceRows(
  rows: PartPriceImportRow[]
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: FieldError[] = [];

    // Check part_code
    if (!row.part_code || row.part_code.trim() === '') {
      errors.push({ field: 'part_code', message: 'bulkImport.errors.partNotFound' });
    } else {
      const partId = await getPartIdByCode(row.part_code);
      if (!partId) {
        errors.push({ field: 'part_code', message: 'bulkImport.errors.partNotFound' });
      } else {
        row.part_id = partId;
      }
    }

    // Check unit_price
    if (row.unit_price === undefined || row.unit_price === null || row.unit_price <= 0) {
      errors.push({ field: 'unit_price', message: 'bulkImport.errors.invalidPrice' });
    }

    // Check currency
    if (!row.currency || !VALID_CURRENCIES.includes(row.currency.toUpperCase())) {
      errors.push({ field: 'currency', message: 'bulkImport.errors.invalidCurrency' });
    }

    // Check effective_from
    if (!row.effective_from || !isValidDate(row.effective_from)) {
      errors.push({ field: 'effective_from', message: 'bulkImport.errors.invalidDate' });
    }

    // Check supplier_code (optional)
    if (row.supplier_code && row.supplier_code.trim() !== '') {
      const supplierId = await getSupplierIdByCode(row.supplier_code);
      if (!supplierId) {
        errors.push({ field: 'supplier_code', message: 'bulkImport.errors.supplierNotFound' });
      } else {
        row.supplier_id = supplierId;
      }
    }

    results.push({
      rowIndex: i,
      valid: errors.length === 0,
      errors,
      data: row
    });
  }

  return results;
}

export async function validateSupplierRows(
  rows: SupplierImportRow[]
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const seenCodes = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: FieldError[] = [];

    // Check supplier_code
    if (!row.supplier_code || row.supplier_code.trim() === '') {
      errors.push({ field: 'supplier_code', message: 'bulkImport.errors.duplicateSupplierCode' });
    } else {
      const normalizedCode = row.supplier_code.trim().toUpperCase();

      // Check duplicate in file
      if (seenCodes.has(normalizedCode)) {
        errors.push({ field: 'supplier_code', message: 'bulkImport.errors.duplicateInFile' });
      } else {
        seenCodes.add(normalizedCode);

        // Check unique in DB
        const isUnique = await isSupplierCodeUnique(row.supplier_code);
        if (!isUnique) {
          errors.push({ field: 'supplier_code', message: 'bulkImport.errors.duplicateSupplierCode' });
        }
      }
    }

    // Check required fields
    if (!row.supplier_name || row.supplier_name.trim() === '') {
      errors.push({ field: 'supplier_name', message: 'bulkImport.errors.nameRequired' });
    }

    if (!row.contact_person || row.contact_person.trim() === '') {
      errors.push({ field: 'contact_person', message: 'bulkImport.errors.contactRequired' });
    }

    if (!row.phone || row.phone.trim() === '') {
      errors.push({ field: 'phone', message: 'bulkImport.errors.phoneRequired' });
    }

    // Check optional fields
    if (row.email && row.email.trim() !== '' && !isValidEmail(row.email)) {
      errors.push({ field: 'email', message: 'bulkImport.errors.invalidEmail' });
    }

    if (row.country && row.country.trim().length > 50) {
      errors.push({ field: 'country', message: 'bulkImport.errors.countryTooLong' });
    }

    if (row.status && !VALID_SUPPLIER_STATUS.includes(row.status.toUpperCase())) {
      errors.push({ field: 'status', message: 'bulkImport.errors.invalidStatus' });
    }

    results.push({
      rowIndex: i,
      valid: errors.length === 0,
      errors,
      data: row
    });
  }

  return results;
}

// ============================================================================
// Bulk Import Functions
// ============================================================================

export async function bulkImportInventory(
  rows: InventoryImportRow[],
  userId: string
): Promise<BulkImportResult> {
  const factoryId = getFactoryId();
  const insertedIds: string[] = [];
  let insertedCount = 0;
  let updatedCount = 0;

  try {
    // Separate updates and inserts
    const toUpdate = rows.filter(r => r.isUpdate && r.existing_inventory_id);
    const toInsert = rows.filter(r => !r.isUpdate);

    // Process updates
    for (const row of toUpdate) {
      const { error } = await supabase
        .from('inventory')
        .update({
          current_quantity: row.quantity,
          location: row.location,
          last_count_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('inventory_id', row.existing_inventory_id!);

      if (error) throw error;
      updatedCount++;
    }

    // Process inserts in batches
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE).map(row => ({
        part_id: row.part_id!,
        factory_id: factoryId,
        current_quantity: row.quantity,
        location: row.location,
        last_count_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
        updated_by: userId
      }));

      const { data, error } = await supabase
        .from('inventory')
        .insert(batch)
        .select('inventory_id');

      if (error) throw error;
      if (data) {
        insertedIds.push(...data.map(d => d.inventory_id));
        insertedCount += data.length;
      }
    }

    return { success: true, insertedCount, updatedCount };
  } catch (error) {
    // Rollback inserted records
    let rollbackFailed = false;
    if (insertedIds.length > 0) {
      try {
        await supabase.from('inventory').delete().in('inventory_id', insertedIds);
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
        rollbackFailed = true;
      }
    }

    return {
      success: false,
      insertedCount: 0,
      updatedCount: 0,
      error: rollbackFailed
        ? 'bulkImport.errors.rollbackFailed'
        : (error instanceof Error ? error.message : 'bulkImport.errors.importFailed'),
      partialInserts: rollbackFailed ? insertedIds : undefined
    };
  }
}

export async function bulkImportPartPrices(
  rows: PartPriceImportRow[],
  userId: string
): Promise<BulkImportResult> {
  const factoryId = getFactoryId();
  const insertedIds: string[] = [];

  try {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map(row => ({
        part_id: row.part_id!,
        factory_id: factoryId,
        unit_price: row.unit_price,
        currency: row.currency.toUpperCase(),
        supplier_id: row.supplier_id || null,
        effective_from: row.effective_from,
        is_current: true,
        created_at: new Date().toISOString(),
        created_by: userId
      }));

      const { data, error } = await supabase
        .from('part_prices')
        .insert(batch)
        .select('price_id');

      if (error) throw error;
      if (data) {
        insertedIds.push(...data.map(d => d.price_id));
      }
    }

    return { success: true, insertedCount: insertedIds.length, updatedCount: 0 };
  } catch (error) {
    // Rollback
    let rollbackFailed = false;
    if (insertedIds.length > 0) {
      try {
        await supabase.from('part_prices').delete().in('price_id', insertedIds);
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
        rollbackFailed = true;
      }
    }

    return {
      success: false,
      insertedCount: 0,
      updatedCount: 0,
      error: rollbackFailed
        ? 'bulkImport.errors.rollbackFailed'
        : (error instanceof Error ? error.message : 'bulkImport.errors.importFailed'),
      partialInserts: rollbackFailed ? insertedIds : undefined
    };
  }
}

export async function bulkImportSuppliers(
  rows: SupplierImportRow[],
  userId: string
): Promise<BulkImportResult> {
  const factoryId = getFactoryId();
  const insertedIds: string[] = [];

  try {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map(row => ({
        supplier_code: row.supplier_code.trim().toUpperCase(),
        supplier_name: row.supplier_name.trim(),
        contact_person: row.contact_person.trim(),
        phone: row.phone.trim(),
        email: row.email?.trim() || '',
        country: row.country?.trim() || '',
        address: row.address?.trim() || '',
        website: row.website?.trim() || '',
        status: row.status?.toUpperCase() || 'ACTIVE',
        factory_id: factoryId,
        created_at: new Date().toISOString(),
        created_by: userId
      }));

      const { data, error } = await supabase
        .from('suppliers')
        .insert(batch)
        .select('supplier_id');

      if (error) throw error;
      if (data) {
        insertedIds.push(...data.map(d => d.supplier_id));
      }
    }

    return { success: true, insertedCount: insertedIds.length, updatedCount: 0 };
  } catch (error) {
    // Rollback
    let rollbackFailed = false;
    if (insertedIds.length > 0) {
      try {
        await supabase.from('suppliers').delete().in('supplier_id', insertedIds);
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
        rollbackFailed = true;
      }
    }

    return {
      success: false,
      insertedCount: 0,
      updatedCount: 0,
      error: rollbackFailed
        ? 'bulkImport.errors.rollbackFailed'
        : (error instanceof Error ? error.message : 'bulkImport.errors.importFailed'),
      partialInserts: rollbackFailed ? insertedIds : undefined
    };
  }
}
