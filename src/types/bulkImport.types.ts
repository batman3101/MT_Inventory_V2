// Import types for each data category
export interface InventoryImportRow {
  part_code: string;
  quantity: number;
  location: string;
  // Resolved during validation
  part_id?: string;
  isUpdate?: boolean;  // True if updating existing inventory
  existing_inventory_id?: string;
}

export interface PartPriceImportRow {
  part_code: string;
  unit_price: number;
  currency: string;  // VND, USD, KRW
  effective_from: string;  // YYYY-MM-DD
  supplier_code?: string;
  // Resolved during validation
  part_id?: string;
  supplier_id?: string;
}

export interface SupplierImportRow {
  supplier_code: string;
  supplier_name: string;
  contact_person: string;
  phone: string;
  email?: string;
  country?: string;
  address?: string;
  website?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export type ImportType = 'inventory' | 'partPrices' | 'suppliers';
export type ParsedRow = InventoryImportRow | PartPriceImportRow | SupplierImportRow;
export type TemplateLanguage = 'ko' | 'vi';

export interface FieldError {
  field: string;
  message: string;  // i18n key
}

export interface ValidationResult {
  rowIndex: number;
  valid: boolean;
  errors: FieldError[];
  data?: ParsedRow;
}

export interface BulkImportResult {
  success: boolean;
  insertedCount: number;
  updatedCount: number;
  error?: string;
  partialInserts?: string[];  // IDs of records inserted before failure (for rollback info)
}

export interface ParseExcelResult {
  rows: ParsedRow[];
  detectedLanguage: TemplateLanguage;
}
