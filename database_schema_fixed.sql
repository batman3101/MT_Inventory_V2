-- MT Inventory V2 Database Schema - Fixed Version
-- 모든 오류를 해결한 통합 스키마

-- 확장 모듈 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 부서 ENUM 타입 생성
CREATE TYPE department_type AS ENUM ('통합 관리', '설비 관리', '자재 입출고 관리', 'MT');

-- 1. Departments 테이블 (부서 정보) - 먼저 생성
CREATE TABLE IF NOT EXISTS departments (
    department_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_code VARCHAR(50) NOT NULL UNIQUE, -- 부서 코드
    department_name VARCHAR(255) NOT NULL, -- 부서명
    manager_name VARCHAR(100), -- 부서장
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 상태 컬럼 추가
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100)
);

-- 2. Users 테이블 (사용자 정보)
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE, -- 사용자명
    email VARCHAR(255) NOT NULL UNIQUE, -- 이메일
    full_name VARCHAR(255), -- 전체 이름
    password_hash VARCHAR(255), -- 패스워드 해시 추가
    role VARCHAR(50) DEFAULT 'user', -- 역할 (system_admin, admin, user)
    department_id UUID REFERENCES departments(department_id), -- 소속 부서
    is_active BOOLEAN DEFAULT TRUE, -- 활성 상태
    last_login TIMESTAMP WITH TIME ZONE, -- 마지막 로그인
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100)
);

-- 3. Categories 테이블 (카테고리 정보) - parts 테이블보다 먼저 생성
CREATE TABLE IF NOT EXISTS categories (
    category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_code VARCHAR(50) NOT NULL UNIQUE, -- 카테고리 코드
    category_name VARCHAR(255) NOT NULL, -- 카테고리명
    parent_category_id UUID REFERENCES categories(category_id), -- 상위 카테고리
    description TEXT, -- 설명
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 상태
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100)
);

-- 4. Parts 테이블 (부품 정보)
CREATE TABLE IF NOT EXISTS parts (
    part_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_code VARCHAR(50) NOT NULL UNIQUE, -- 부품 코드 (part_number 대신)
    part_name VARCHAR(255) NOT NULL, -- 부품명 (베트남어)
    part_number VARCHAR(50), -- 기존 part_number 컬럼 추가 (호환성)
    vietnamese_name VARCHAR(255), -- 베트남어 이름
    korean_name VARCHAR(255), -- 한국어 이름
    spec TEXT, -- 사양
    unit VARCHAR(20) NOT NULL, -- 단위 (예: EA, KG, M)
    category VARCHAR(100), -- 카테고리 (문자열)
    category_id UUID REFERENCES categories(category_id), -- 카테고리 ID 추가
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 상태
    min_stock INTEGER DEFAULT 0, -- 최소 재고량
    description TEXT, -- 설명
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100)
);

-- 5. Suppliers 테이블 (공급업체 정보)
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_code VARCHAR(50) NOT NULL UNIQUE, -- 공급업체 코드
    supplier_name VARCHAR(255) NOT NULL, -- 공급업체명
    contact_person VARCHAR(100), -- 담당자
    email VARCHAR(255), -- 이메일
    phone VARCHAR(50), -- 전화번호
    address TEXT, -- 주소
    country VARCHAR(100), -- 국가
    website VARCHAR(255), -- 웹사이트
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 상태
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100)
);

-- 6. Inventory 테이블 (재고 정보)
CREATE TABLE IF NOT EXISTS inventory (
    inventory_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id UUID NOT NULL REFERENCES parts(part_id),
    current_quantity INTEGER NOT NULL DEFAULT 0, -- 현재 재고량
    last_count_date DATE, -- 마지막 재고 조사일
    location VARCHAR(100), -- 보관 위치
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100)
);

-- 7. Inbound 테이블 (입고 정보)
CREATE TABLE IF NOT EXISTS inbound (
    inbound_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id UUID NOT NULL REFERENCES parts(part_id),
    supplier_id UUID NOT NULL REFERENCES suppliers(supplier_id),
    reference_number VARCHAR(100), -- 참조 번호
    inbound_date DATE NOT NULL, -- 입고일
    quantity INTEGER NOT NULL, -- 입고 수량
    unit_price DECIMAL(15,2), -- 단가
    total_amount DECIMAL(15,2), -- 총액
    total_price DECIMAL(15,2), -- total_price 별칭 추가
    currency VARCHAR(10) DEFAULT 'VND', -- 통화
    invoice_number VARCHAR(50), -- 송장 번호
    lot_number VARCHAR(50), -- 로트 번호
    status VARCHAR(20) DEFAULT 'COMPLETED', -- 상태
    notes TEXT, -- 비고
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100)
);

-- 8. Outbound 테이블 (출고 정보)
CREATE TABLE IF NOT EXISTS outbound (
    outbound_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id UUID NOT NULL REFERENCES parts(part_id),
    department_id UUID REFERENCES departments(department_id), -- 부서 ID
    department VARCHAR(100), -- 부서명 (문자열, 호환성)
    outbound_date DATE NOT NULL, -- 출고일
    quantity INTEGER NOT NULL, -- 출고 수량
    unit_price DECIMAL(15,2), -- 단가 추가
    total_amount DECIMAL(15,2), -- 총액
    requester VARCHAR(100), -- 요청자
    equipment_id VARCHAR(100), -- 설비 ID
    purpose VARCHAR(255), -- 사용 목적
    reason VARCHAR(50), -- 사유
    reference_number VARCHAR(100), -- 참조 번호
    status VARCHAR(20) DEFAULT 'COMPLETED', -- 상태
    notes TEXT, -- 비고
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100)
);

-- 9. 권한 테이블
CREATE TABLE IF NOT EXISTS permissions (
    permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permission_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. 역할-권한 매핑 테이블
CREATE TABLE IF NOT EXISTS role_permissions (
    role_permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(20) NOT NULL,
    permission_id UUID NOT NULL REFERENCES permissions(permission_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission_id)
);

-- 11. 부품 가격 테이블
CREATE TABLE IF NOT EXISTS part_prices (
    price_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id UUID NOT NULL REFERENCES parts(part_id),
    supplier_id UUID REFERENCES suppliers(supplier_id),
    unit_price NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'VND',
    effective_from DATE NOT NULL,
    effective_to DATE,
    effective_date DATE, -- effective_date 별칭 추가
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    UNIQUE(part_id, supplier_id, effective_from)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_parts_code ON parts(part_code);
CREATE INDEX IF NOT EXISTS idx_parts_number ON parts(part_number);
CREATE INDEX IF NOT EXISTS idx_parts_name ON parts(part_name);
CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(supplier_name);
CREATE INDEX IF NOT EXISTS idx_inventory_part_id ON inventory(part_id);
CREATE INDEX IF NOT EXISTS idx_inbound_part_id ON inbound(part_id);
CREATE INDEX IF NOT EXISTS idx_inbound_date ON inbound(inbound_date);
CREATE INDEX IF NOT EXISTS idx_outbound_part_id ON outbound(part_id);
CREATE INDEX IF NOT EXISTS idx_outbound_date ON outbound(outbound_date);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(department_code);
CREATE INDEX IF NOT EXISTS idx_categories_code ON categories(category_code);

-- 기본 데이터 삽입

-- 기본 부서 데이터
INSERT INTO departments (department_code, department_name, status) VALUES
('ADMIN', '통합 관리', 'ACTIVE'),
('FACILITY', '설비 관리', 'ACTIVE'),
('WAREHOUSE', '자재 입출고 관리', 'ACTIVE'),
('MT', 'MT', 'ACTIVE')
ON CONFLICT (department_code) DO NOTHING;

-- 기본 카테고리 데이터
INSERT INTO categories (category_code, category_name, status) VALUES
('MECH', '기계 부품', 'ACTIVE'),
('ELEC', '전기 부품', 'ACTIVE'),
('HYDR', '유압 부품', 'ACTIVE'),
('PNEU', '공압 부품', 'ACTIVE'),
('BEAR', '베어링', 'ACTIVE'),
('SEAL', '씰/가스켓', 'ACTIVE'),
('BOLT', '볼트/너트', 'ACTIVE'),
('MISC', '기타', 'ACTIVE')
ON CONFLICT (category_code) DO NOTHING;

-- 기본 권한 데이터
INSERT INTO permissions (permission_name, description) VALUES
('view_dashboard', '대시보드 조회 권한'),
('manage_users', '사용자 관리 권한'),
('manage_parts', '부품 관리 권한'),
('manage_inventory', '재고 관리 권한'),
('manage_suppliers', '공급업체 관리 권한'),
('view_reports', '보고서 조회 권한'),
('manage_inbound', '입고 관리 권한'),
('manage_outbound', '출고 관리 권한')
ON CONFLICT (permission_name) DO NOTHING;

-- 뷰 생성 (조인 쿼리 최적화)

-- 부품 재고 현황 뷰
CREATE OR REPLACE VIEW parts_inventory_view AS
SELECT 
    p.part_id,
    p.part_code,
    p.part_number,
    p.part_name,
    p.vietnamese_name,
    p.korean_name,
    p.unit,
    p.category,
    p.min_stock,
    p.status,
    COALESCE(i.current_quantity, 0) as current_quantity,
    i.location,
    i.last_count_date,
    CASE 
        WHEN COALESCE(i.current_quantity, 0) <= 0 THEN 'OUT_OF_STOCK'
        WHEN COALESCE(i.current_quantity, 0) <= p.min_stock THEN 'LOW_STOCK'
        WHEN COALESCE(i.current_quantity, 0) > p.min_stock * 3 THEN 'OVERSTOCK'
        ELSE 'NORMAL'
    END as stock_status
FROM parts p
LEFT JOIN inventory i ON p.part_id = i.part_id;

-- 입고 상세 뷰
CREATE OR REPLACE VIEW inbound_details_view AS
SELECT 
    ib.inbound_id,
    ib.inbound_date,
    ib.quantity,
    ib.unit_price,
    ib.total_amount,
    ib.reference_number,
    ib.created_by,
    p.part_code,
    p.part_name,
    p.unit as part_unit,
    s.supplier_name,
    s.supplier_code
FROM inbound ib
JOIN parts p ON ib.part_id = p.part_id
LEFT JOIN suppliers s ON ib.supplier_id = s.supplier_id;

-- 출고 상세 뷰
CREATE OR REPLACE VIEW outbound_details_view AS
SELECT 
    ob.outbound_id,
    ob.outbound_date,
    ob.quantity,
    ob.unit_price,
    ob.total_amount,
    ob.requester,
    ob.equipment_id,
    ob.purpose,
    ob.reference_number,
    ob.created_by,
    p.part_code,
    p.part_name,
    p.unit,
    COALESCE(d.department_name, ob.department) as department
FROM outbound ob
JOIN parts p ON ob.part_id = p.part_id
LEFT JOIN departments d ON ob.department_id = d.department_id;

-- 주석: 주요 필드 매핑 정보
-- parts.part_code (기존 part_number 대신 사용)
-- parts.part_number (호환성을 위해 유지)
-- parts.part_name (베트남어 이름)
-- parts.vietnamese_name (베트남어 이름)
-- parts.korean_name (한국어 이름)
-- parts.min_stock (최소 재고량)
-- parts.category_id (categories 테이블과 조인)
-- suppliers.supplier_name (기존 name 대신)
-- inventory.current_quantity (현재 재고량)
-- outbound.department_id (departments 테이블과 조인)
-- outbound.unit_price (단가 추가)
-- inbound.total_price (total_amount의 별칭)
-- part_prices.effective_date (effective_from의 별칭)
-- departments.status (상태 컬럼 추가)
-- categories 테이블 추가 (relation "public.categories" does not exist 해결)