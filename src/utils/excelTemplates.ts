import * as XLSX from 'xlsx';

// Template field definitions
const INVENTORY_FIELDS = {
  ko: {
    headers: ['부품코드', '수량', '위치'],
    sheetName: '데이터입력',
    guideSheetName: '사용방법',
    guide: [
      ['필드명', '필수', '형식', '예시', '설명'],
      ['부품코드', '예', '텍스트', 'MT001', '부품 테이블에 등록된 코드'],
      ['수량', '예', '정수 >= 0', '100', '현재 재고 수량'],
      ['위치', '예', '텍스트', 'A-1-01', '보관 위치']
    ]
  },
  vi: {
    headers: ['Mã phụ tùng', 'Số lượng', 'Vị trí'],
    sheetName: 'Nhập dữ liệu',
    guideSheetName: 'Hướng dẫn',
    guide: [
      ['Tên trường', 'Bắt buộc', 'Định dạng', 'Ví dụ', 'Mô tả'],
      ['Mã phụ tùng', 'Có', 'Văn bản', 'MT001', 'Mã đã đăng ký trong bảng phụ tùng'],
      ['Số lượng', 'Có', 'Số nguyên >= 0', '100', 'Số lượng tồn kho hiện tại'],
      ['Vị trí', 'Có', 'Văn bản', 'A-1-01', 'Vị trí lưu trữ']
    ]
  }
};

const PART_PRICES_FIELDS = {
  ko: {
    headers: ['부품코드', '단가', '통화', '적용일', '공급업체코드'],
    sheetName: '데이터입력',
    guideSheetName: '사용방법',
    guide: [
      ['필드명', '필수', '형식', '예시', '설명'],
      ['부품코드', '예', '텍스트', 'MT001', '부품 테이블에 등록된 코드'],
      ['단가', '예', '숫자 > 0', '50000', '부품 단가'],
      ['통화', '예', 'VND/USD/KRW', 'VND', '통화 단위'],
      ['적용일', '예', 'YYYY-MM-DD', '2025-02-03', '단가 적용 시작일'],
      ['공급업체코드', '아니오', '텍스트', 'SUP001', '공급업체 코드 (선택)']
    ]
  },
  vi: {
    headers: ['Mã phụ tùng', 'Đơn giá', 'Loại tiền', 'Ngày áp dụng', 'Mã NCC'],
    sheetName: 'Nhập dữ liệu',
    guideSheetName: 'Hướng dẫn',
    guide: [
      ['Tên trường', 'Bắt buộc', 'Định dạng', 'Ví dụ', 'Mô tả'],
      ['Mã phụ tùng', 'Có', 'Văn bản', 'MT001', 'Mã đã đăng ký trong bảng phụ tùng'],
      ['Đơn giá', 'Có', 'Số > 0', '50000', 'Đơn giá phụ tùng'],
      ['Loại tiền', 'Có', 'VND/USD/KRW', 'VND', 'Đơn vị tiền tệ'],
      ['Ngày áp dụng', 'Có', 'YYYY-MM-DD', '2025-02-03', 'Ngày bắt đầu áp dụng'],
      ['Mã NCC', 'Không', 'Văn bản', 'SUP001', 'Mã nhà cung cấp (tùy chọn)']
    ]
  }
};

const SUPPLIERS_FIELDS = {
  ko: {
    headers: ['공급업체코드', '이름', '담당자', '전화번호', '이메일', '국가', '상태'],
    sheetName: '데이터입력',
    guideSheetName: '사용방법',
    guide: [
      ['필드명', '필수', '형식', '예시', '설명'],
      ['공급업체코드', '예', '텍스트', 'SUP001', '고유한 공급업체 코드'],
      ['이름', '예', '텍스트', 'ABC 공급', '공급업체명'],
      ['담당자', '예', '텍스트', '홍길동', '담당자 이름'],
      ['전화번호', '예', '텍스트', '010-1234-5678', '연락처'],
      ['이메일', '아니오', '이메일', 'abc@example.com', '이메일 주소'],
      ['국가', '아니오', '텍스트', 'Vietnam', '국가'],
      ['상태', '아니오', 'ACTIVE/INACTIVE', 'ACTIVE', '상태 (기본: ACTIVE)']
    ]
  },
  vi: {
    headers: ['Mã NCC', 'Tên', 'Người liên hệ', 'SĐT', 'Email', 'Quốc gia', 'Trạng thái'],
    sheetName: 'Nhập dữ liệu',
    guideSheetName: 'Hướng dẫn',
    guide: [
      ['Tên trường', 'Bắt buộc', 'Định dạng', 'Ví dụ', 'Mô tả'],
      ['Mã NCC', 'Có', 'Văn bản', 'SUP001', 'Mã nhà cung cấp duy nhất'],
      ['Tên', 'Có', 'Văn bản', 'ABC Supply', 'Tên nhà cung cấp'],
      ['Người liên hệ', 'Có', 'Văn bản', 'Nguyễn Văn A', 'Tên người liên hệ'],
      ['SĐT', 'Có', 'Văn bản', '0901234567', 'Số điện thoại'],
      ['Email', 'Không', 'Email', 'abc@example.com', 'Địa chỉ email'],
      ['Quốc gia', 'Không', 'Văn bản', 'Vietnam', 'Quốc gia'],
      ['Trạng thái', 'Không', 'ACTIVE/INACTIVE', 'ACTIVE', 'Trạng thái (mặc định: ACTIVE)']
    ]
  }
};

function createTemplate(
  fieldsDef: typeof INVENTORY_FIELDS,
  language: 'ko' | 'vi',
  filename: string
): void {
  const def = fieldsDef[language];
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Data Entry (with headers only)
  const dataSheet = XLSX.utils.aoa_to_sheet([def.headers]);
  // Set column widths
  dataSheet['!cols'] = def.headers.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(workbook, dataSheet, def.sheetName);

  // Sheet 2: Usage Guide
  const guideSheet = XLSX.utils.aoa_to_sheet(def.guide);
  guideSheet['!cols'] = [
    { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 40 }
  ];
  XLSX.utils.book_append_sheet(workbook, guideSheet, def.guideSheetName);

  // Download
  XLSX.writeFile(workbook, filename);
}

export function generateInventoryTemplate(language: 'ko' | 'vi'): void {
  const filename = language === 'ko' ? '재고_템플릿.xlsx' : 'mau_kho.xlsx';
  createTemplate(INVENTORY_FIELDS, language, filename);
}

export function generatePartPriceTemplate(language: 'ko' | 'vi'): void {
  const filename = language === 'ko' ? '단가_템플릿.xlsx' : 'mau_don_gia.xlsx';
  createTemplate(PART_PRICES_FIELDS, language, filename);
}

export function generateSupplierTemplate(language: 'ko' | 'vi'): void {
  const filename = language === 'ko' ? '공급업체_템플릿.xlsx' : 'mau_nha_cung_cap.xlsx';
  createTemplate(SUPPLIERS_FIELDS, language, filename);
}

export function downloadTemplate(importType: 'inventory' | 'partPrices' | 'suppliers', language: 'ko' | 'vi'): void {
  switch (importType) {
    case 'inventory':
      generateInventoryTemplate(language);
      break;
    case 'partPrices':
      generatePartPriceTemplate(language);
      break;
    case 'suppliers':
      generateSupplierTemplate(language);
      break;
  }
}
