-- 부품 관리시스템 (EqMS) 데이터베이스 설정

-- 확장 모듈 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 부서 ENUM 타입 생성
CREATE TYPE department_type AS ENUM ('통합 관리', '설비 관리', '자재 입출고 관리', 'MT');

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user', -- 'system_admin', 'admin', 'user'
    department department_type,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 권한 테이블
CREATE TABLE IF NOT EXISTS permissions (
    permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permission_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 역할-권한 매핑 테이블
CREATE TABLE IF NOT EXISTS role_permissions (
    role_permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(20) NOT NULL,
    permission_id UUID NOT NULL REFERENCES permissions(permission_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission_id)
);

-- 공급업체 테이블
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_code VARCHAR(20) UNIQUE NOT NULL,
    supplier_name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    country VARCHAR(50),
    website VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 부품 테이블
CREATE TABLE IF NOT EXISTS parts (
    part_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_code VARCHAR(20) UNIQUE NOT NULL,
    part_name VARCHAR(100) NOT NULL,
    vietnamese_name VARCHAR(100),
    korean_name VARCHAR(100),
    spec VARCHAR(100),
    unit VARCHAR(10) NOT NULL,
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'NEW',
    min_stock INTEGER DEFAULT 5,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 한국어 이름 매핑 테이블
CREATE TABLE IF NOT EXISTS korean_names (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    english_name VARCHAR(100) UNIQUE NOT NULL,
    korean_name VARCHAR(100) NOT NULL,
    vietnamese_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 부품 가격 테이블
CREATE TABLE IF NOT EXISTS part_prices (
    price_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id UUID NOT NULL REFERENCES parts(part_id),
    supplier_id UUID REFERENCES suppliers(supplier_id),
    unit_price NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'VND',
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    UNIQUE(part_id, supplier_id, effective_from)
);

-- 재고 테이블
CREATE TABLE IF NOT EXISTS inventory (
    inventory_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id UUID NOT NULL REFERENCES parts(part_id),
    current_quantity INTEGER DEFAULT 0,
    last_count_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    location VARCHAR(50) DEFAULT 'main',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50)
);

-- 입고 테이블
CREATE TABLE IF NOT EXISTS inbound (
    inbound_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inbound_date DATE NOT NULL,
    part_id UUID NOT NULL REFERENCES parts(part_id),
    supplier_id UUID REFERENCES suppliers(supplier_id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12, 2),
    total_price NUMERIC(12, 2),
    currency VARCHAR(10) DEFAULT 'VND',
    invoice_number VARCHAR(50),
    lot_number VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50)
);

-- 출고 테이블
CREATE TABLE IF NOT EXISTS outbound (
    outbound_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outbound_date DATE NOT NULL,
    part_id UUID NOT NULL REFERENCES parts(part_id),
    quantity INTEGER NOT NULL,
    requester VARCHAR(100) NOT NULL,
    department department_type,
    reason VARCHAR(50),
    equipment VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_parts_part_code ON parts(part_code);
CREATE INDEX IF NOT EXISTS idx_parts_part_name ON parts(part_name);
CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);
CREATE INDEX IF NOT EXISTS idx_inventory_part_id ON inventory(part_id);
CREATE INDEX IF NOT EXISTS idx_inbound_part_id ON inbound(part_id);
CREATE INDEX IF NOT EXISTS idx_outbound_part_id ON outbound(part_id);
CREATE INDEX IF NOT EXISTS idx_inbound_date ON inbound(inbound_date);
CREATE INDEX IF NOT EXISTS idx_outbound_date ON outbound(outbound_date);

-- RLS 정책 설정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound ENABLE ROW LEVEL SECURITY;
ALTER TABLE korean_names ENABLE ROW LEVEL SECURITY;

-- 모든 사용자에게 읽기 권한 부여
CREATE POLICY "읽기 권한" ON users FOR SELECT USING (true);
CREATE POLICY "읽기 권한" ON suppliers FOR SELECT USING (true);
CREATE POLICY "읽기 권한" ON parts FOR SELECT USING (true);
CREATE POLICY "읽기 권한" ON part_prices FOR SELECT USING (true);
CREATE POLICY "읽기 권한" ON inventory FOR SELECT USING (true);
CREATE POLICY "읽기 권한" ON inbound FOR SELECT USING (true);
CREATE POLICY "읽기 권한" ON outbound FOR SELECT USING (true);
CREATE POLICY "읽기 권한" ON korean_names FOR SELECT USING (true);

-- 로그인한 사용자에게 쓰기 권한 부여
CREATE POLICY "쓰기 권한" ON suppliers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "쓰기 권한" ON parts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "쓰기 권한" ON part_prices FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "쓰기 권한" ON inventory FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "쓰기 권한" ON inbound FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "쓰기 권한" ON outbound FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "쓰기 권한" ON korean_names FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 업데이트 권한
CREATE POLICY "업데이트 권한" ON suppliers FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "업데이트 권한" ON parts FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "업데이트 권한" ON part_prices FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "업데이트 권한" ON inventory FOR UPDATE USING (auth.role() = 'authenticated');

-- 사용자 관리 정책 설정 - 시스템 관리자만 모든 사용자 CRUD 가능
CREATE POLICY "시스템 관리자 사용자 관리" 
ON users 
FOR ALL 
USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM users 
    WHERE username = auth.email() 
    AND role = 'system_admin'
));

-- 사용자 관리 정책 설정 - 일반 관리자는 일반 사용자만 CRUD 가능
CREATE POLICY "일반 관리자 사용자 관리" 
ON users 
FOR ALL 
USING (
    auth.role() = 'authenticated' 
    AND EXISTS (
        SELECT 1 FROM users 
        WHERE username = auth.email() 
        AND role = 'admin'
    )
    AND NEW.role = 'user'
);

-- 기본 권한 데이터 삽입
INSERT INTO permissions (permission_name, description) VALUES
('manage_system_admins', '시스템 관리자 관리 권한'),
('manage_admins', '일반 관리자 관리 권한'),
('manage_users', '일반 사용자 관리 권한'),
('manage_parts', '부품 관리 권한'),
('manage_inventory', '재고 관리 권한'),
('manage_suppliers', '공급업체 관리 권한'),
('view_reports', '보고서 조회 권한')
ON CONFLICT (permission_name) DO NOTHING;

-- 역할별 권한 할당
-- 시스템 관리자 권한
INSERT INTO role_permissions (role, permission_id)
SELECT 'system_admin', permission_id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- 일반 관리자 권한
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', permission_id FROM permissions
WHERE permission_name IN ('manage_users', 'manage_parts', 'manage_inventory', 'manage_suppliers', 'view_reports')
ON CONFLICT (role, permission_id) DO NOTHING;

-- 일반 사용자 권한
INSERT INTO role_permissions (role, permission_id)
SELECT 'user', permission_id FROM permissions
WHERE permission_name IN ('view_reports')
ON CONFLICT (role, permission_id) DO NOTHING;