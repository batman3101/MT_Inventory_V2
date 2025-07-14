# Supabase 데이터 입력용 CSV 템플릿

이 폴더에는 Supabase 데이터베이스 테이블에 데이터를 일괄 입력하기 위한 CSV 템플릿 파일이 있습니다.

## 사용 방법

1. CSV 파일을 엑셀에서 열기
   - 필요한 파일을 선택하여 엑셀에서 열거나
   - 엑셀 내에서 '데이터' -> '텍스트/CSV에서' 메뉴를 통해 열 수 있습니다.
   - 파일 인코딩은 UTF-8을 선택해야 합니다.

2. 데이터 입력
   - 필요한 데이터를 행 단위로 입력합니다.
   - 샘플 데이터를 참고하여 형식에 맞게 입력하세요.
   - 필수 입력 항목을 모두 입력해야 합니다.

3. CSV로 저장
   - '다른 이름으로 저장' -> 'CSV UTF-8 (쉼표로 분리)' 형식으로 저장합니다.

4. Supabase에 업로드
   - Supabase 대시보드에서 해당 테이블로 이동합니다.
   - '테이블 편집' -> '가져오기' 버튼을 클릭하여 CSV 파일을 업로드합니다.

## 주의사항

1. 기본키(Primary Key)
   - 대부분의 테이블은 UUID 기본키가 자동 생성되므로 CSV 파일에 포함하지 않았습니다.

2. 외래키(Foreign Key) 참조
   - part_code나 supplier_code와 같은 형태로 참조하지만, 실제 데이터베이스에서는 UUID로 변환해야 합니다.
   - 스크립트를 사용하여 코드를 ID로 변환하는 것을 권장합니다.

3. 날짜 형식
   - 날짜는 YYYY-MM-DD 형식으로 입력합니다.

4. 불리언 값
   - TRUE/FALSE 대문자로 입력합니다.

## 파일 설명

- `users_template.csv` - 사용자 계정 정보
- `suppliers_template.csv` - 공급업체 정보
- `parts_template.csv` - 부품 정보
- `korean_names_template.csv` - 다국어 부품명 매핑
- `part_prices_template.csv` - 부품 가격 정보
- `inventory_template.csv` - 재고 정보
- `inbound_template.csv` - 입고 정보
- `outbound_template.csv` - 출고 정보
