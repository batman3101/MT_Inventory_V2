# equipment-maintenance-system-readme

# 설비 유지보수 부품 관리 시스템 (EqMS) 기획서

## 프로젝트 개요

본 프로젝트는 설비 유지보수 부품의 입/출고를 효율적으로 관리하기 위한 웹 애플리케이션 개발을 목표로 합니다. Streamlit 프레임워크를 활용하여 사용자 친화적인 인터페이스를 구현하고, Supabase를 통해 데이터베이스를 관리합니다. 이 시스템은 부품 재고 관리, 입출고 기록, 비용 계산 및 데이터 분석 기능을 제공합니다. 기존 데이터베이스와 재고 현황 데이터를 원활히 마이그레이션하는 것이 주요 고려사항입니다.

## 주요 기능 요구사항

1. **부품 입/출고 관리**: 부품의 입고 및 출고 프로세스 관리
2. **재고 관리**: 현재 재고 수량 및 금액 정보 제공
3. **단가 연동**: 여러 공급업체(SAMSOO, RPS, THT, FC TECH, HTT, ATH, UIL) 별 부품 단가 정보 연동
4. **데이터 분석**: 일일 입/출고 현황 및 전체 재고 현황에 대한 인사이트 제공
5. **CRUD 기능**: 부품, 공급업체, 입출고 내역에 대한 생성, 조회, 수정, 삭제 기능
6. **대시보드**: 주요 지표를 시각화하여 한눈에 파악할 수 있는 대시보드 제공
7. **데이터 마이그레이션**: 기존 부품 정보와 재고 현황을 새 시스템으로 원활히 이전

## 기술 스택

- 입고 프로세스 구현
- 출고 프로세스 구현
- 재고 자동 업데이트 기능 구현

### 4단계: 데이터 분석 및 시각화 구현 (1-2주)

- 대시보드 구현
- 보고서 기능 구현
- 데이터 시각화 차트 구현

### 5단계: 사용자 인터페이스 개선 및 최적화 (1주)

- UI/UX 개선
- 성능 최적화
- 사용성 테스트 및 피드백 반영

### 6단계: 테스트 및 배포 (1주)

- 통합 테스트 진행
- 오류 수정 및 안정화
- 최종 배포 및 문서화
- 사용자 교육

## 데이터 마이그레이션 세부 계획

1. **사전 데이터 분석**
    - 기존 데이터 구조 분석 및 매핑 계획 수립
    - 데이터 품질 평가 (중복, 결측치, 형식 불일치 등)
    - 테스트 마이그레이션 계획 수립
2. **마이그레이션 도구 개발**
    - 자동화된 마이그레이션 스크립트 개발
    - 데이터 검증 및 정제 로직 구현
    - 로그 및 오류 처리 기능 추가
3. **단계적 마이그레이션 실행**
    - 기준 데이터(부품, 공급업체) 먼저 이전
    - 가격 데이터 이전
    - 재고 데이터 이전
    - 입출고 이력 이전
4. **검증 및 정정**
    - 데이터 일관성 검증
    - 수동 데이터 검토 및 정정
    - 사용자 피드백 기반 데이터 조정

## 다국어 지원 강화

- 한국어, 영어, 베트남어 인터페이스 지원
- 각 언어별 데이터 입력 및 표시 최적화
- 다국어 검색 지원 (한글명으로 검색해도 영문 코드의 부품 찾기 가능)
- 언어 전환 시 사용자 설정 저장

## 부품 코드 체계 관리

- 기존 MT 시리즈 코드 체계 유지 및 확장
- 신규 부품 코드 자동 생성 기능
- 코드 체계 관리 및 조회 기능
- 카테고리별 코드 그룹화 옵션

## 결론

본 설비 유지보수 부품 관리 시스템은 Python의 Streamlit 프레임워크와 Supabase 데이터베이스를 활용하여 직관적이고 효율적인 재고 관리 솔루션을 제공합니다. 기존 데이터를 원활히 마이그레이션하여 연속성을 보장하면서도 향상된 기능을 제공합니다. 다양한 공급업체의 가격 정보를 통합 관리하고, 다국어 지원을 통해 국제적 환경에서도 사용 가능한 시스템을 구축합니다. 입/출고 관리, 재고 추적, 데이터 분석 기능을 통해 유지보수 비용을 최적화하고, 부품 가용성을 극대화하며, 의사 결정을 지원합니다. **프론트엔드**: Python + Streamlit
- **백엔드**: Python + Streamlit
- **데이터베이스**: Supabase (PostgreSQL)
- **데이터 시각화**: Plotly, Matplotlib, Altair
- **상태 관리**: Streamlit Session State
- **데이터 마이그레이션**: Pandas, NumPy

## 필요한 라이브러리

```
streamlit==1.32.0
pandas==2.1.3
numpy==1.26.2
plotly==5.18.0
matplotlib==3.8.2
altair==5.2.0
supabase==2.0.3
python-dotenv==1.0.0
streamlit-authenticator==0.2.3
openpyxl==3.1.2
xlsxwriter==3.1.9
psycopg2-binary==2.9.9
```

## 데이터베이스 설계

### 테이블 구조

### 1. 부품 테이블 (parts)

```sql
CREATE TABLE parts (
    part_id SERIAL PRIMARY KEY,
    part_code VARCHAR(50) UNIQUE NOT NULL, -- MT001, MT002 등    part_name VARCHAR(100) NOT NULL, -- COOLANT FILTER, ELECTRIC FILTER 등    vietnamese_name VARCHAR(100), -- VIETNAMESE 열 데이터    spec VARCHAR(100), -- 10in/200μm, 12x20mm 등    unit VARCHAR(20) DEFAULT 'EA', -- EA, SET 등    category VARCHAR(50),
    description TEXT,
    min_stock INT DEFAULT 0,
    status VARCHAR(20), -- NEW, OLD, OLDER 등    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
```

### 2. 공급업체 테이블 (suppliers)

```sql
CREATE TABLE suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_code VARCHAR(10) UNIQUE NOT NULL, -- YSCM, SAMSOO, RPS, THT, FC TECH, HTT, ATH, UIL 등    supplier_name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
```

### 3. 부품-공급업체 가격 테이블 (part_prices)

```sql
CREATE TABLE part_prices (
    price_id SERIAL PRIMARY KEY,
    part_id INT REFERENCES parts(part_id) NOT NULL,
    supplier_id INT REFERENCES suppliers(supplier_id) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL, -- 각 공급업체별 단가 정보    currency VARCHAR(10) DEFAULT '₩', -- 원화 기본 설정    effective_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(part_id, supplier_id, effective_date)
);
```

### 4. 재고 테이블 (inventory)

```sql
CREATE TABLE inventory (
    inventory_id SERIAL PRIMARY KEY,
    part_id INT REFERENCES parts(part_id) NOT NULL,
    current_quantity INT NOT NULL DEFAULT 0,
    total_value DECIMAL(15, 2) DEFAULT 0, -- 총 재고 가치    last_count_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(part_id)
);
```

### 5. 입고 테이블 (inbound)

```sql
CREATE TABLE inbound (
    inbound_id SERIAL PRIMARY KEY,
    part_id INT REFERENCES parts(part_id) NOT NULL,
    supplier_id INT REFERENCES suppliers(supplier_id) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL,
    inbound_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reference_number VARCHAR(100),
    remarks TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
```

### 6. 출고 테이블 (outbound)

```sql
CREATE TABLE outbound (
    outbound_id SERIAL PRIMARY KEY,
    part_id INT REFERENCES parts(part_id) NOT NULL,
    quantity INT NOT NULL,
    outbound_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    requestor VARCHAR(100),
    department VARCHAR(100),
    equipment_id VARCHAR(100),
    purpose TEXT,
    reference_number VARCHAR(100),
    remarks TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
```

### 7. 사용자 테이블 (users)

```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'admin', 'manager', 'user'    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
```

### 8. 한국어 명칭 테이블 (korean_names)

```sql
CREATE TABLE korean_names (
    korean_id SERIAL PRIMARY KEY,
    part_id INT REFERENCES parts(part_id) NOT NULL,
    korean_name TEXT NOT NULL, -- 냉각수 필터, 전기필터 등    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(part_id)
);
```

## 데이터베이스 트리거 설정

재고 자동 업데이트를 위한 트리거:

```sql
-- 입고 시 재고 자동 업데이트 트리거CREATE OR REPLACE FUNCTION update_inventory_on_inbound()
RETURNS TRIGGER AS $$
DECLARE    current_price DECIMAL(15, 2);
BEGIN    -- 현재 부품의 단가 가져오기    SELECT unit_price INTO current_price FROM part_prices
    WHERE part_id = NEW.part_id AND supplier_id = NEW.supplier_id AND is_current = TRUE    LIMIT 1;
    -- 재고 테이블 업데이트    INSERT INTO inventory (part_id, current_quantity, total_value)
    VALUES (NEW.part_id, NEW.quantity, NEW.quantity * current_price)
    ON CONFLICT (part_id)
    DO UPDATE SET        current_quantity = inventory.current_quantity + NEW.quantity,
        total_value = inventory.total_value + (NEW.quantity * current_price),
        updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_update_inventory_on_inbound
AFTER INSERT ON inbound
FOR EACH ROWEXECUTE FUNCTION update_inventory_on_inbound();
-- 출고 시 재고 자동 업데이트 트리거CREATE OR REPLACE FUNCTION update_inventory_on_outbound()
RETURNS TRIGGER AS $$
DECLARE    avg_unit_price DECIMAL(15, 2);
BEGIN    -- 현재 평균 단가 계산 (총 가치 / 현재 수량)    SELECT
        CASE
            WHEN current_quantity > 0 THEN total_value / current_quantity
            ELSE 0        END INTO avg_unit_price
    FROM inventory
    WHERE part_id = NEW.part_id;
    -- 재고 테이블 업데이트    UPDATE inventory
    SET
        current_quantity = current_quantity - NEW.quantity,
        total_value = CASE
                        WHEN current_quantity - NEW.quantity > 0
                        THEN total_value - (NEW.quantity * avg_unit_price)
                        ELSE 0                      END,
        updated_at = CURRENT_TIMESTAMP    WHERE part_id = NEW.part_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_update_inventory_on_outbound
AFTER INSERT ON outbound
FOR EACH ROWEXECUTE FUNCTION update_inventory_on_outbound();
```

## 초기 데이터 마이그레이션 SQL

기존 부품 및 재고 데이터를 Supabase로 마이그레이션하기 위한 SQL 스크립트:

```sql
-- 공급업체 데이터 초기 삽입INSERT INTO suppliers (supplier_code, supplier_name) VALUES('YSCM', 'YSCM Supplier'),
('SAMSOO', 'SAMSOO'),
('RPS', 'RPS'),
('THT', 'THT'),
('FC TECH', 'FC TECH'),
('HTT', 'HTT'),
('ATH', 'ATH'),
('UIL', 'UIL');
-- 부품 데이터 마이그레이션은 Python 스크립트를 통해 수행
```

## 데이터 마이그레이션 계획

기존 Excel 또는 데이터베이스에서 새로운 Supabase로 데이터를 이전하기 위한 계획:

1. **데이터 추출**: 기존 시스템에서 데이터 추출 (CSV, Excel 등)
2. **데이터 정제**: 누락된 값, 중복, 불일치 등 해결
3. **데이터 변환**: Supabase 스키마에 맞게 데이터 형식 변환
4. **데이터 적재**: Supabase에 데이터 삽입
5. **데이터 검증**: 마이그레이션 후 데이터 정확성 검증

### 마이그레이션 스크립트 예시

```python
import pandas as pd
from supabase import create_client
import os
from dotenv import load_dotenv
# 환경 변수 로드load_dotenv()
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
# Supabase 클라이언트 초기화supabase = create_client(supabase_url, supabase_key)
# 기존 데이터 로드parts_df = pd.read_excel("existing_data.xlsx", sheet_name="Parts")
# 데이터 정제 및 변환parts_df.fillna("", inplace=True)
parts_df['status'] = parts_df['STATUS'].replace({'NEW': 'NEW', 'OLD': 'OLD', 'OLDER': 'OLDER'})
parts_df['unit'] = parts_df['UNIT'].replace({'EA': 'EA', 'SET': 'SET'})
# 부품 데이터 Supabase에 삽입for index, row in parts_df.iterrows():
    part_data = {
        "part_code": row['CODE'],
        "part_name": row['NAME'],
        "vietnamese_name": row['VIETNAMESE'],
        "spec": row['Spec'],
        "unit": row['unit'],
        "status": row['status']
    }
    result = supabase.table('parts').insert(part_data).execute()
    print(f"Inserted part {row['CODE']}")
# 가격 데이터 처리# YSCM, SAMSOO, RPS, THT, FC TECH, HTT, ATH, UIL 등의 가격 정보 처리suppliers = ['YSCM', 'SAMSOO', 'RPS', 'THT', 'FC TECH', 'HTT', 'ATH', 'UIL']
for index, row in parts_df.iterrows():
    part_code = row['CODE']
    # 부품 ID 조회    part_result = supabase.table('parts').select('part_id').eq('part_code', part_code).execute()
    if not part_result.data:
        continue    part_id = part_result.data[0]['part_id']
    # 각 공급업체별 가격 정보 처리    for supplier in suppliers:
        price_col = next((col for col in parts_df.columns if supplier in col and 'Price' in col), None)
        if price_col and pd.notna(row[price_col]) and row[price_col] != "":
            # 공급업체 ID 조회            supplier_result = supabase.table('suppliers').select('supplier_id').eq('supplier_code', supplier).execute()
            if not supplier_result.data:
                continue            supplier_id = supplier_result.data[0]['supplier_id']
            # 가격 정보 삽입            price_data = {
                "part_id": part_id,
                "supplier_id": supplier_id,
                "unit_price": float(str(row[price_col]).replace('₩', '').replace(',', '')),
                "effective_date": pd.Timestamp.now().date().isoformat(),
                "is_current": True            }
            supabase.table('part_prices').insert(price_data).execute()
            print(f"Inserted price for part {part_code} from supplier {supplier}")
# 재고 데이터 처리for index, row in parts_df.iterrows():
    part_code = row['CODE']
    # 부품 ID 조회    part_result = supabase.table('parts').select('part_id').eq('part_code', part_code).execute()
    if not part_result.data:
        continue    part_id = part_result.data[0]['part_id']
    # 재고 수량이 있는 경우에만 처리    if 'Total Stock' in parts_df.columns and pd.notna(row['Total Stock']):
        quantity = int(row['Total Stock'])
        # 총 금액 계산        total_value = 0        if 'Amount' in parts_df.columns and pd.notna(row['Amount']):
            total_value = float(str(row['Amount']).replace('₩', '').replace(',', ''))
        # 재고 정보 삽입        inventory_data = {
            "part_id": part_id,
            "current_quantity": quantity,
            "total_value": total_value
        }
        supabase.table('inventory').insert(inventory_data).execute()
        print(f"Inserted inventory for part {part_code}")
# 한국어 이름 처리for index, row in parts_df.iterrows():
    part_code = row['CODE']
    # 부품 ID 조회    part_result = supabase.table('parts').select('part_id').eq('part_code', part_code).execute()
    if not part_result.data:
        continue    part_id = part_result.data[0]['part_id']
    # 한국어 이름이 있는 경우에만 처리    if 'KOR' in parts_df.columns and pd.notna(row['KOR']) and row['KOR'] != "":
        korean_name = row['KOR']
        # 한국어 이름 정보 삽입        korean_data = {
            "part_id": part_id,
            "korean_name": korean_name
        }
        supabase.table('korean_names').insert(korean_data).execute()
        print(f"Inserted Korean name for part {part_code}")
print("Data migration completed")
```

## 애플리케이션 구조

```
equipment_maintenance_system/
│
├── app.py                   # 메인 애플리케이션 진입점
├── .env                     # 환경 변수 설정 파일 (Supabase URL, Key 등)
├── requirements.txt         # 필요 라이브러리 목록
│
├── pages/                   # 각 페이지 모듈
│   ├── __init__.py
│   ├── dashboard.py         # 대시보드 페이지
│   ├── inventory.py         # 재고 관리 페이지
│   ├── inbound.py           # 입고 관리 페이지
│   ├── outbound.py          # 출고 관리 페이지
│   ├── parts.py             # 부품 관리 페이지
│   ├── suppliers.py         # 공급업체 관리 페이지
│   ├── reports.py           # 보고서 페이지
│   └── settings.py          # 설정 페이지
│
├── utils/                   # 유틸리티 함수 모듈
│   ├── __init__.py
│   ├── auth.py              # 인증 관련 유틸리티
│   ├── database.py          # 데이터베이스 연결 및 관리
│   ├── data_processing.py   # 데이터 처리 유틸리티
│   ├── visualization.py     # 데이터 시각화 유틸리티
│   └── migration.py         # 데이터 마이그레이션 유틸리티
│
├── components/              # 재사용 가능한 UI 컴포넌트
│   ├── __init__.py
│   ├── sidebar.py           # 사이드바 컴포넌트
│   ├── data_tables.py       # 데이터 테이블 컴포넌트
│   ├── forms.py             # 입력 폼 컴포넌트
│   └── charts.py            # 차트 컴포넌트
│
├── data/                    # 데이터 파일
│   ├── migration/           # 마이그레이션 관련 파일
│   └── backup/              # 백업 파일
│
└── assets/                  # 정적 자산 (이미지, CSS 등)
    ├── css/
    └── images/
```

## 페이지별 기능 상세

### 1. 대시보드 (Dashboard)

- 주요 KPI 표시
    - 총 부품 종류 수
    - 총 재고 가치
    - 재고 부족 부품 수
    - 일일 입고/출고 건수 및 금액
- 시각화 차트
    - 최근 30일간 일일 입출고 추이
    - 카테고리별 재고 분포
    - 상위 10개 고가 부품 재고 현황
    - 상위 10개 사용 빈도 높은 부품
    - STATUS별 부품 분포 (NEW/OLD/OLDER)

### 2. 재고 관리 (Inventory)

- 전체 재고 목록 조회 (테이블 형태)
    - MT001, MT002와 같은 코드 기반 필터링
    - 부품명 기반 검색
    - STATUS(NEW/OLD/OLDER) 기반 필터링
    - 카테고리별 필터링
- 재고 수량에 따른 총액 계산 표시
- 공급업체별 가격 비교 기능
- 최소 재고 미달 부품 경고 표시
- 재고 수량 수동 조정 기능
- 한국어/베트남어 부품명 표시 전환 기능

### 3. 입고 관리 (Inbound)

- 신규 입고 등록 폼
    - 부품 선택 (자동완성)
    - 공급업체 선택 (해당 부품 가능 업체만 필터링)
    - 수량 입력
    - 자동 단가 불러오기 및 총액 계산
    - 참조 번호 및 비고 입력
- 입고 이력 조회 (테이블 형태)
    - 기간별 필터링
    - 부품/공급업체별 필터링
- 입고 데이터 수정/삭제 기능
- 입고 데이터 엑셀 내보내기/가져오기 기능

### 4. 출고 관리 (Outbound)

- 신규 출고 등록 폼
    - 부품 선택 (자동완성)
    - 수량 입력 (재고 초과 시 경고)
    - 요청자, 부서, 설비 ID 입력
    - 용도 및 비고 입력
- 출고 이력 조회 (테이블 형태)
    - 기간별 필터링
    - 부품/부서/요청자별 필터링
- 출고 데이터 수정/삭제 기능
- 출고 데이터 엑셀 내보내기/가져오기 기능

### 5. 부품 관리 (Parts)

- 부품 목록 조회 (테이블 형태)
    - 부품 코드(MT001, MT002 등) 기반 검색
    - STATUS(NEW/OLD/OLDER) 기반 필터링
    - SPEC 기반 필터링
- 신규 부품 등록 폼
    - 부품 코드 자동 생성 기능 (MT마지막번호+1)
    - 영문명, 베트남어명, 한국어명 입력
    - SPEC 정보 입력
    - STATUS 선택
- 부품 정보 수정/삭제 기능
- 부품별 입출고 이력 조회
- 부품별 공급업체 및 가격 정보 관리
- 부품 데이터 대량 업로드 기능 (Excel)

### 6. 공급업체 관리 (Suppliers)

- 공급업체 목록 조회 (테이블 형태)
    - YSCM, SAMSOO, RPS, THT, FC TECH, HTT, ATH, UIL 등
- 신규 공급업체 등록 폼
- 공급업체 정보 수정/삭제 기능
- 공급업체별 부품 및 가격 정보 관리
- 공급업체별 입고 이력 조회
- 가격 정보 업데이트 기능 (대량)

### 7. 보고서 (Reports)

- 기간별 입출고 보고서 생성
- 부품별/카테고리별 사용 분석
- 부서별/설비별 부품 사용 분석
- 재고 회전율 분석
- 공급업체별 가격 비교 분석
- 보고서 엑셀/CSV 내보내기 기능
- 각 부품별 가격 변동 추이 분석

### 8. 설정 (Settings)

- 사용자 계정 관리
- 시스템 설정 관리
- 데이터베이스 백업 및 복원
- 활동 로그 조회
- 데이터 마이그레이션 도구
- 다국어 설정 (한국어/영어/베트남어)

## 사용자 인터페이스 (UI/UX) 설계

### 1. 레이아웃

- 좌측에 네비게이션 사이드바 배치
- 헤더에 현재 페이지 제목, 사용자 정보, 알림 표시
- 메인 콘텐츠 영역은 반응형으로 화면 크기에 맞게 조정
- 푸터에 시스템 버전 및 저작권 정보 표시

### 2. 색상 및 스타일

- 주 색상: 파란색 계열 (#1E88E5)
- 보조 색상: 회색 계열 (#607D8B)
- 강조 색상: 녹색 (#4CAF50), 빨간색 (#F44336)
- 현대적이고 깔끔한 디자인 스타일
- 가독성 높은 글꼴 사용

### 3. 다국어 지원

- 인터페이스 언어 전환 기능 (한국어/영어/베트남어)
- 부품명 다국어 표시 (영문/한국어/베트남어)
- 보고서 다국어 출력 지원

### 4. 모바일 대응

- 모바일 기기에서도 사용 가능한 반응형 디자인
- 터치 인터페이스 최적화
- 중요 기능 우선 배치

## 데이터 분석 및 인사이트 제공

### 1. 일일 입/출고 분석

- 일별 입고/출고 추이 차트
- 부품별/카테고리별 입출고 분포
- 특이사항 자동 감지 및 알림
    - 평균 대비 급증/급감
    - 비정상적인 패턴 감지

### 2. 전체 현황 분석

- 재고 가치 추이 차트
- 부품 카테고리별 재고 분포
- STATUS별 부품 분포 분석
- 주요 부품 사용 패턴 분석
- 재고 회전율 및 정체 재고 분석
- 공급업체별 가격 비교 분석

### 3. 예측 분석

- 과거 데이터 기반 부품 사용량 예측
- 최적 재고 수준 제안
- 예상 소진 시점 계산
- 발주 시점 추천

## 구현 계획

### 1단계: 데이터베이스 설계 및 마이그레이션 (1주)

- 데이터베이스 스키마 설계 및 구축
- 기존 데이터 분석 및 정제
- 데이터 마이그레이션 스크립트 개발
- 마이그레이션 실행 및 검증

### 2단계: 기본 기능 구현 (1-2주)

- 기본 UI 프레임워크 설정
- 핵심 CRUD 기능 구현 (부품, 공급업체, 재고)
- 다국어 지원 구현

### 3단계: 입/출고 관리 기능 구현 (1-2주)

- 입고 프로세스 구현
- 출고 프로세스 구현
- 재고 자동 업데이트 기능 구현

### 4단계: 데이터 분석 및 시각화 구현 (1-2주)

- 대시보드 구현
- 보고서 기능 구현
- 데이터 시각화 차트 구현

### 5단계: 사용자 인터페이스 개선 및 최적화 (1주)

- UI/UX 개선
- 성능 최적화
- 사용성 테스트 및 피드백 반영

### 6단계: 테스트 및 배포 (1주)

- 통합 테스트 진행
- 오류 수정 및 안정화
- 최종 배포 및 문서화
- 사용자 교육
- 

## 결론

본 설비 유지보수 부품 관리 시스템은 Python의 Streamlit 프레임워크와 Supabase 데이터베이스를 활용하여 직관적이고 효율적인 재고 관리 솔루션을 제공합니다. 기존 데이터를 원활히 마이그레이션하여 연속성을 보장하면서도 향상된 기능을 제공합니다. 다양한 공급업체의 가격 정보를 통합 관리하고, 다국어 지원을 통해 국제적 환경에서도 사용 가능한 시스템을 구축합니다.

## 추가 고려사항

### 1. 데이터 마이그레이션 세부 계획

1. **사전 데이터 분석**
    - 기존 데이터 구조 분석 및 매핑 계획 수립
    - 데이터 품질 평가 (중복, 결측치, 형식 불일치 등)
    - 테스트 마이그레이션 계획 수립
2. **마이그레이션 도구 개발**
    - 자동화된 마이그레이션 스크립트 개발
    - 데이터 검증 및 정제 로직 구현
    - 로그 및 오류 처리 기능 추가
3. **단계적 마이그레이션 실행**
    - 기준 데이터(부품, 공급업체) 먼저 이전
    - 가격 데이터 이전
    - 재고 데이터 이전
    - 입출고 이력 이전
4. **검증 및 정정**
    - 데이터 일관성 검증
    - 수동 데이터 검토 및 정정
    - 사용자 피드백 기반 데이터 조정

### 2. 다국어 지원 강화

- 한국어, 영어, 베트남어 인터페이스 지원
- 각 언어별 데이터 입력 및 표시 최적화
- 다국어 검색 지원 (한글명으로 검색해도 영문 코드의 부품 찾기 가능)
- 언어 전환 시 사용자 설정 저장

### 3. 부품 코드 체계 관리

- 기존 MT 시리즈 코드 체계 유지 및 확장
- 신규 부품 코드 자동 생성 기능
- 코드 체계 관리 및 조회 기능
- 카테고리별 코드 그룹화 옵션

### 4. 보안 강화

- 역할 기반 접근 제어 (Role-Based Access Control)
- 민감한 정보(가격, 총액 등)에 대한 접근 제한
- 사용자 활동 감사 로그 강화
- 데이터 백업 및 복구 자동화

### 5. 성능 최적화

- 대규모 데이터셋 처리를 위한 페이지네이션 및 최적화
- 자주 사용하는 쿼리 캐싱
- 대시보드 데이터 계산 최적화
- 대량 데이터 업로드/다운로드 시 비동기 처리

## 프로젝트 성공 기준

1. **데이터 마이그레이션 정확도**
    - 기존 데이터의 99% 이상 정확히 이전
    - 데이터 불일치 비율 1% 미만
2. **시스템 사용성**
    - 사용자 작업 완료 시간 25% 이상 단축
    - 사용자 만족도 80% 이상 달성
3. **데이터 정확성**
    - 재고 불일치율 0.5% 미만
    - 재고 가치 계산 오차 0.1% 미만
4. **성능 지표**
    - 페이지 로딩 시간 2초 미만
    - 검색 응답 시간 1초 미만
    - 대량 데이터 처리 시간 30% 단축
5. **업무 효율성**
    - 보고서 생성 시간 50% 단축
    - 의사결정 지원 데이터 제공 시간 40% 단축
    - 재고 관리 업무 시간 30% 감소

## 확장 가능성

1. **모바일 앱 개발**
    - 창고 내 재고 파악을 위한 모바일 앱 추가 개발
    - QR/바코드 스캐닝 기능 통합
2. **IoT 통합**
    - 센서 기반 자동 재고 관리 시스템 연동
    - 스마트 선반/창고 시스템 연동
3. **ERP 시스템 연동**
    - 기업 ERP 시스템과의 데이터 연동
    - 자동 구매 발주 시스템 연계
4. **예측 분석 고도화**
    - 머신러닝 기반 수요 예측 모델 개발
    - 최적 재고 수준 자동 조정 시스템
5. **공급망 관리 확장**
    - 공급업체 평가 및 관리 시스템 통합
    - 납기 추적 및 관리 기능 추가

## 사용자 교육 계획

1. **관리자 교육**
    - 시스템 설정 및 관리 교육
    - 데이터 백업 및 복구 교육
    - 사용자 권한 관리 교육
2. **일반 사용자 교육**
    - 기본 기능 사용법 교육
    - 데이터 입력 및 조회 교육
    - 보고서 생성 및 활용 교육
3. **교육 자료 개발**
    - 사용자 매뉴얼 제작 (다국어 지원)
    - 교육 동영상 제작
    - 온라인 FAQ 및 도움말 시스템 구축
4. **지속적 지원**
    - 기술 지원 창구 운영
    - 정기적인 사용자 피드백 수집 및 반영
    - 업데이트 및 신규 기능 교육

## 부록

### A. 주요 기술 참조 자료

1. **Streamlit 문서**
    - 공식 문서: [https://docs.streamlit.io/](https://docs.streamlit.io/)
    - 컴포넌트 갤러리: [https://streamlit.io/components](https://streamlit.io/components)
2. **Supabase 문서**
    - 공식 문서: [https://supabase.io/docs](https://supabase.io/docs)
    - Python 클라이언트: [https://supabase.io/docs/reference/python/introduction](https://supabase.io/docs/reference/python/introduction)
3. **데이터 시각화 라이브러리**
    - Plotly: [https://plotly.com/python/](https://plotly.com/python/)
    - Altair: [https://altair-viz.github.io/](https://altair-viz.github.io/)
    - Matplotlib: [https://matplotlib.org/](https://matplotlib.org/)

### B. 프로젝트 일정 계획 (Gantt Chart)

```

주차 |    1    |    2    |    3    |    4    |    5    |    6    |    7    |    8    |
-----|---------|---------|---------|---------|---------|---------|---------|---------|
요구사항 분석      |XXXXXXXXX|         |         |         |         |         |         |         |
데이터베이스 설계  |XXXXXXXXX|XXXXXXXXX|         |         |         |         |         |         |
데이터 마이그레이션|         |XXXXXXXXX|XXXXXXXXX|         |         |         |         |         |
핵심 기능 개발    |         |         |XXXXXXXXX|XXXXXXXXX|XXXXXXXXX|         |         |         |
UI/UX 개발       |         |         |         |XXXXXXXXX|XXXXXXXXX|XXXXXXXXX|         |         |
데이터 분석 기능  |         |         |         |         |XXXXXXXXX|XXXXXXXXX|         |         |
테스트 및 품질관리|         |         |         |         |         |XXXXXXXXX|XXXXXXXXX|         |
사용자 교육 및 배포|         |         |         |         |         |         |XXXXXXXXX|XXXXXXXXX|

```

### C. 예상 리소스 및 비용

1. **인력 리소스**
    - 프로젝트 관리자: 1명 (풀타임)
    - 백엔드 개발자: 1-2명 (풀타임)
    - 프론트엔드 개발자: 1명 (풀타임)
    - 데이터 분석가: 1명 (파트타임)
    - 품질 관리: 1명 (파트타임)
2. **하드웨어 요구사항**
    - 개발 서버: 중급 사양 (4 Core, 8GB RAM, 100GB SSD)
    - 배포 서버: 중급 사양 (4 Core, 16GB RAM, 250GB SSD)
    - 개발자 워크스테이션: 표준 사양 랩톱/데스크톱
3. **소프트웨어 라이선스 및 서비스**
    - Supabase 서비스 요금 (Pro 플랜)
    - 클라우드 호스팅 비용
    - 도메인 및 SSL 인증서 비용
    - 개발 도구 라이선스 (필요시)

### D. 위험 관리 계획

1. **식별된 위험 요소**
    - 데이터 마이그레이션 오류
    - 일정 지연
    - 성능 이슈
    - 사용자 저항
2. **위험 완화 전략**
    - 철저한 테스트 및 검증 절차
    - 단계적 배포 및 피드백 수집
    - 정기적인 백업 및 복구 테스트
    - 사용자 참여 및 교육 강화
3. **비상 계획**
    - 롤백 절차 수립
    - 대체 접근법 준비
    - 추가 리소스 동원 계획
    - 범위 조정 옵션

이 강화된 기획서는 기존 데이터베이스와 재고 현황 데이터를 효율적으로 Supabase로 마이그레이션하고, 현재 운영 중인 시스템의 모든 기능을 개선된 형태로 구현하는 것을 목표로 합니다. 특히 다국어 지원과 다양한 공급업체의 가격 정보 통합 관리에 중점을 두어 더욱 사용자 친화적인 시스템을 구축할 것입니다.