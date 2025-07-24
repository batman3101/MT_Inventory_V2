-- MT Inventory V2 Database Schema
-- 실제 Supabase 테이블 구조

-- 1. Parts 테이블 (부품 정보)
CREATE TABLE parts (
    part_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_code VARCHAR(50) NOT NULL UNIQUE, -- 부품 코드 (예: MT020.1)
    part_name VARCHAR(255) NOT NULL, -- 부품명 (베트남어)
    vietnamese_name VARCHAR(255), -- 베트남어 이름
    korean_name VARCHAR(255), -- 한국어 이름
    spec TEXT, -- 사양
    unit VARCHAR(20) NOT NULL, -- 단위 (예: EA, KG, M)
    category VARCHAR(100), -- 카테고리
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 상태
    min_stock INTEGER DEFAULT 0, -- 최소 재고량
    description TEXT, -- 설명
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100)
);

-- 2. Suppliers 테이블 (공급업체 정보)
CREATE TABLE suppliers (
    supplier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 3. Inventory 테이블 (재고 정보)
CREATE TABLE inventory (
    inventory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id UUID NOT NULL REFERENCES parts(part_id),
    current_quantity INTEGER NOT NULL DEFAULT 0, -- 현재 재고량
    last_count_date DATE, -- 마지막 재고 조사일
    location VARCHAR(100) -- 보관 위치
);

-- 4. Inbound 테이블 (입고 정보)
CREATE TABLE inbound (
    inbound_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id UUID NOT NULL REFERENCES parts(part_id),
    supplier_id UUID NOT NULL REFERENCES suppliers(supplier_id),
    reference_number VARCHAR(100), -- 참조 번호
    inbound_date DATE NOT NULL, -- 입고일
    quantity INTEGER NOT NULL, -- 입고 수량
    unit_price DECIMAL(15,2), -- 단가
    total_amount DECIMAL(15,2), -- 총액
    status VARCHAR(20) DEFAULT 'COMPLETED', -- 상태
    notes TEXT, -- 비고
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100)
);

-- 5. Outbound 테이블 (출고 정보)
CREATE TABLE outbound (
    outbound_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id UUID NOT NULL REFERENCES parts(part_id),
    department_id UUID, -- 부서 ID (departments 테이블 참조)
    outbound_date DATE NOT NULL, -- 출고일
    quantity INTEGER NOT NULL, -- 출고 수량
    unit_price DECIMAL(15,2), -- 단가
    total_amount DECIMAL(15,2), -- 총액
    purpose VARCHAR(255), -- 사용 목적
    status VARCHAR(20) DEFAULT 'COMPLETED', -- 상태
    notes TEXT, -- 비고
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100)
);

-- 6. Departments 테이블 (부서 정보)
CREATE TABLE departments (
    department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_code VARCHAR(50) NOT NULL UNIQUE, -- 부서 코드
    department_name VARCHAR(255) NOT NULL, -- 부서명
    manager_name VARCHAR(100), -- 부서장
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 상태
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100)
);

-- 7. Users 테이블 (사용자 정보)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE, -- 사용자명
    email VARCHAR(255) NOT NULL UNIQUE, -- 이메일
    full_name VARCHAR(255), -- 전체 이름
    role VARCHAR(50) DEFAULT 'USER', -- 역할 (ADMIN, USER, VIEWER)
    department_id UUID REFERENCES departments(department_id), -- 소속 부서
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 상태
    last_login TIMESTAMP WITH TIME ZONE, -- 마지막 로그인
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100)
);

-- 8. Categories 테이블 (카테고리 정보)
CREATE TABLE categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 인덱스 생성
CREATE INDEX idx_parts_code ON parts(part_code);
CREATE INDEX idx_parts_name ON parts(part_name);
CREATE INDEX idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX idx_inventory_part_id ON inventory(part_id);
CREATE INDEX idx_inbound_part_id ON inbound(part_id);
CREATE INDEX idx_inbound_date ON inbound(inbound_date);
CREATE INDEX idx_outbound_part_id ON outbound(part_id);
CREATE INDEX idx_outbound_date ON outbound(outbound_date);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- 주요 필드 매핑 정보:
-- parts.part_code (기존 part_number 대신)
-- parts.part_name (베트남어 이름)
-- parts.vietnamese_name (베트남어 이름)
-- parts.korean_name (한국어 이름)
-- parts.min_stock (최소 재고량)
-- suppliers.supplier_name (기존 name 대신)
-- inventory.current_quantity (현재 재고량)
-- outbound.department_id (departments 테이블과 조인)