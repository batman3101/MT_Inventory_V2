import * as XLSX from 'xlsx';
import type {
  ImportType,
  ParsedRow,
  ParseExcelResult,
  TemplateLanguage
} from '@/types/bulkImport.types';

// Header mappings: localized header -> internal field name
const HEADER_MAP: Record<ImportType, Record<TemplateLanguage, Record<string, string>>> = {
  inventory: {
    ko: {
      '부품코드': 'part_code',
      '수량': 'quantity',
      '위치': 'location'
    },
    vi: {
      'Mã phụ tùng': 'part_code',
      'Số lượng': 'quantity',
      'Vị trí': 'location'
    }
  },
  partPrices: {
    ko: {
      '부품코드': 'part_code',
      '단가': 'unit_price',
      '통화': 'currency',
      '적용일': 'effective_from',
      '공급업체코드': 'supplier_code'
    },
    vi: {
      'Mã phụ tùng': 'part_code',
      'Đơn giá': 'unit_price',
      'Loại tiền': 'currency',
      'Ngày áp dụng': 'effective_from',
      'Mã NCC': 'supplier_code'
    }
  },
  suppliers: {
    ko: {
      '공급업체코드': 'supplier_code',
      '이름': 'supplier_name',
      '담당자': 'contact_person',
      '전화번호': 'phone',
      '이메일': 'email',
      '국가': 'country',
      '상태': 'status'
    },
    vi: {
      'Mã NCC': 'supplier_code',
      'Tên': 'supplier_name',
      'Người liên hệ': 'contact_person',
      'SĐT': 'phone',
      'Email': 'email',
      'Quốc gia': 'country',
      'Trạng thái': 'status'
    }
  }
};

/**
 * Detect template language from headers
 */
function detectTemplateLanguage(headers: string[], importType: ImportType): TemplateLanguage {
  const koHeaders = Object.keys(HEADER_MAP[importType].ko);
  const viHeaders = Object.keys(HEADER_MAP[importType].vi);

  let koMatches = 0;
  let viMatches = 0;

  headers.forEach(header => {
    const trimmedHeader = header?.trim();
    if (koHeaders.includes(trimmedHeader)) koMatches++;
    if (viHeaders.includes(trimmedHeader)) viMatches++;
  });

  // Default to Korean if equal or ambiguous
  return viMatches > koMatches ? 'vi' : 'ko';
}

/**
 * Parse Excel file and return typed rows
 */
export async function parseExcelFile(
  file: File,
  importType: ImportType
): Promise<ParseExcelResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Get first sheet (data entry sheet)
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Parse to array of arrays
  const rawData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

  if (rawData.length === 0) {
    return { rows: [], detectedLanguage: 'ko' };
  }

  const headers = rawData[0] as string[];
  const detectedLanguage = detectTemplateLanguage(headers, importType);
  const headerMap = HEADER_MAP[importType][detectedLanguage];

  // Map rows to typed objects
  const rows: ParsedRow[] = [];

  for (let i = 1; i < rawData.length; i++) {
    const rowData = rawData[i];
    if (!rowData || rowData.every(cell => cell === undefined || cell === null || cell === '')) {
      continue; // Skip empty rows
    }

    const mapped: Record<string, unknown> = {};

    headers.forEach((header, idx) => {
      const trimmedHeader = header?.trim();
      const fieldName = headerMap[trimmedHeader];
      if (fieldName && rowData[idx] !== undefined && rowData[idx] !== null) {
        let value = rowData[idx];

        // Type conversion based on field
        if (fieldName === 'quantity' || fieldName === 'unit_price') {
          value = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
        }

        // Trim string values
        if (typeof value === 'string') {
          value = value.trim();
        }

        mapped[fieldName] = value;
      }
    });

    // Only add rows that have at least one required field
    if (Object.keys(mapped).length > 0) {
      rows.push(mapped as ParsedRow);
    }
  }

  return { rows, detectedLanguage };
}

/**
 * Validate file size (max 5MB)
 */
export function validateFileSize(file: File): boolean {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  return file.size <= MAX_SIZE;
}

/**
 * Validate file type
 */
export function validateFileType(file: File): boolean {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel' // .xls
  ];
  const validExtensions = ['.xlsx', '.xls'];

  const hasValidType = validTypes.includes(file.type);
  const hasValidExtension = validExtensions.some(ext =>
    file.name.toLowerCase().endsWith(ext)
  );

  return hasValidType || hasValidExtension;
}
