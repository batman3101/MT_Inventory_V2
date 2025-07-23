import * as XLSX from 'xlsx';

/**
 * Excel 파일로 데이터를 내보내는 공통 유틸리티 함수
 */
export interface ExcelExportOptions {
  filename: string;
  sheetName: string;
  data: any[];
  headers?: string[];
  dateFormat?: boolean;
}

/**
 * 데이터를 Excel 파일로 내보내기
 */
export const exportToExcel = (options: ExcelExportOptions): void => {
  const { filename, sheetName, data, headers, dateFormat = true } = options;

  if (!data || data.length === 0) {
    throw new Error('내보낼 데이터가 없습니다.');
  }

  // 워크시트 생성
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 헤더가 제공된 경우 적용
  if (headers && headers.length > 0) {
    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });
  }

  // 워크북 생성
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // 파일명에 날짜 추가
  const timestamp = dateFormat ? `_${new Date().toISOString().split('T')[0]}` : '';
  const fullFilename = `${filename}${timestamp}.xlsx`;

  // 파일 다운로드
  XLSX.writeFile(workbook, fullFilename);
};

/**
 * CSV 형태의 데이터를 다운로드하는 함수 (기존 호환성을 위해)
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * 입고 데이터를 Excel 형식으로 변환
 */
export const formatInboundDataForExcel = (records: any[]) => {
  return records.map(record => ({
    '입고ID': record.inbound_id,
    '부품코드': record.part_code,
    '부품명': record.part_name,
    '수량': record.quantity,
    '단위': record.part_unit,
    '입고일': record.inbound_date,
    '공급업체': record.supplier_name,
    '단가': record.unit_price,
    '총액': record.total_price,
    '통화': record.currency,
    '참조번호': record.reference_number,
    '등록자': record.created_by
  }));
};

/**
 * 출고 데이터를 Excel 형식으로 변환
 */
export const formatOutboundDataForExcel = (records: any[]) => {
  return records.map(record => ({
    '출고ID': record.outbound_id,
    '부품코드': record.part_code,
    '부품명': record.part_name,
    '수량': record.quantity,
    '단위': record.unit,
    '출고일': record.outbound_date,
    '요청자': record.requester,
    '부서': record.department_name,
    '장비ID': record.equipment_id,
    '목적': record.purpose,
    '단가': record.unit_price,
    '총액': record.total_amount,
    '등록자': record.created_by
  }));
};

/**
 * 재고 데이터를 Excel 형식으로 변환
 */
export const formatInventoryDataForExcel = (inventories: any[]) => {
  return inventories.map(inventory => ({
    '부품코드': inventory.part?.part_code || '',
    '부품명': inventory.part?.part_name || '',
    '카테고리': inventory.part?.category || '',
    '현재고': inventory.current_stock,
    '예약재고': inventory.reserved_stock || 0,
    '사용가능재고': inventory.available_stock,
    '재고가치': inventory.stock_value,
    '위치': inventory.location || '',
    '재고상태': inventory.stock_status === 'critical' ? '재고부족' :
                inventory.stock_status === 'low' ? '재주문필요' :
                inventory.stock_status === 'overstock' ? '과재고' : '정상',
    '최종입고일': inventory.last_received_date ? new Date(inventory.last_received_date).toLocaleDateString() : '',
    '최종출고일': inventory.last_issued_date ? new Date(inventory.last_issued_date).toLocaleDateString() : ''
  }));
};

/**
 * 부품 데이터를 Excel 형식으로 변환
 */
export const formatPartsDataForExcel = (parts: any[]) => {
  return parts.map(part => ({
    '부품코드': part.part_code,
    '부품명': part.part_name,
    '카테고리': part.category,
    '단위': part.unit,
    '현재고': part.current_stock,
    '재고가치': part.stock_value,
    '최소재고': part.min_stock_level,
    '최대재고': part.max_stock_level,
    '재주문점': part.reorder_point,
    '표준단가': part.standard_cost,
    '상태': part.status === 'active' ? '활성' : part.status === 'inactive' ? '비활성' : '단종',
    '등록일': new Date(part.created_at).toLocaleDateString()
  }));
};

/**
 * 공급업체 데이터를 Excel 형식으로 변환
 */
export const formatSuppliersDataForExcel = (suppliers: any[]) => {
  return suppliers.map(supplier => ({
    '공급업체코드': supplier.supplier_code,
    '공급업체명': supplier.supplier_name,
    '담당자': supplier.contact_person || '',
    '전화번호': supplier.phone || '',
    '이메일': supplier.email || '',
    '주소': supplier.address || '',
    '국가': supplier.country,
    '웹사이트': supplier.website || '',
    '상태': supplier.status === 'active' ? '활성' : '비활성',
    '등록일': new Date(supplier.created_at).toLocaleDateString()
  }));
};

/**
 * 사용자 데이터를 Excel 형식으로 변환
 */
export const formatUsersDataForExcel = (users: any[]) => {
  return users.map(user => ({
    '사용자ID': user.user_id,
    '이름': user.name,
    '이메일': user.email,
    '부서': user.department_name || '',
    '역할': user.role,
    '상태': user.is_active ? '활성' : '비활성',
    '등록일': new Date(user.created_at).toLocaleDateString(),
    '최종수정일': new Date(user.updated_at).toLocaleDateString()
  }));
};