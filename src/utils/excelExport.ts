/**
 * Excel Export Utility
 *
 * xlsx 라이브러리를 사용하여 데이터를 Excel 파일로 내보내기
 */

import * as XLSX from 'xlsx';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

/**
 * 데이터를 Excel 파일로 내보내기
 *
 * @param data - 내보낼 데이터 배열
 * @param columns - 컬럼 정의 (header: 표시명, key: 데이터 키)
 * @param filename - 파일명 (확장자 제외)
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExcelColumn[],
  filename: string
): void {
  // 데이터를 컬럼 정의에 맞게 변환
  const transformedData = data.map(row => {
    const newRow: Record<string, any> = {};
    columns.forEach(col => {
      // 중첩된 객체 접근 지원 (예: part.part_name)
      const keys = col.key.split('.');
      let value: any = row;

      for (const key of keys) {
        value = value?.[key];
      }

      newRow[col.header] = value ?? '';
    });
    return newRow;
  });

  // 워크시트 생성
  const worksheet = XLSX.utils.json_to_sheet(transformedData);

  // 컬럼 너비 설정
  const columnWidths = columns.map(col => ({
    wch: col.width || 15 // 기본 너비 15
  }));
  worksheet['!cols'] = columnWidths;

  // 워크북 생성
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  // 파일 다운로드
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);
}
