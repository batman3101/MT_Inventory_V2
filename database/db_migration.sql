-- 부서 ENUM 타입 생성
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'department_type') THEN
        CREATE TYPE department_type AS ENUM ('통합 관리', '설비 관리', '자재 입출고 관리', 'MT');
    END IF;
END $$;

-- 사용자 테이블의 부서 필드 타입 변경
ALTER TABLE users 
ALTER COLUMN department TYPE department_type 
USING 
  CASE 
    WHEN department = '통합 관리' THEN '통합 관리'::department_type
    WHEN department = '설비 관리' THEN '설비 관리'::department_type 
    WHEN department = '자재 입출고 관리' THEN '자재 입출고 관리'::department_type
    WHEN department = 'MT' THEN 'MT'::department_type
    ELSE '통합 관리'::department_type -- 기본값
  END;

-- 출고 테이블의 부서 필드 타입 변경
ALTER TABLE outbound
ALTER COLUMN department TYPE department_type
USING 
  CASE 
    WHEN department = '통합 관리' THEN '통합 관리'::department_type
    WHEN department = '설비 관리' THEN '설비 관리'::department_type 
    WHEN department = '자재 입출고 관리' THEN '자재 입출고 관리'::department_type
    WHEN department = 'MT' THEN 'MT'::department_type
    ELSE '통합 관리'::department_type -- 기본값
  END;

-- 부서 테이블 생성 (departments)
CREATE TABLE IF NOT EXISTS departments (
    department_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_code VARCHAR(20) UNIQUE NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 기본 부서 데이터 추가
INSERT INTO departments (department_code, department_name, description) VALUES
('INTEG', '통합 관리', '시스템 전체 관리 부서'),
('EQUIP', '설비 관리', '생산 설비 관리 부서'),
('MATIN', '자재 입출고 관리', '자재 입출고 관리 부서'),
('MT', 'MT', '유지보수 부서')
ON CONFLICT (department_code) DO NOTHING;

-- 사용자 테이블에 department_id 필드 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(department_id);

-- 출고 테이블에 department_id 필드 추가
ALTER TABLE outbound ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(department_id);

-- 기존 department ENUM 값을 기반으로 department_id 값 설정 (사용자 테이블)
UPDATE users
SET department_id = (
    SELECT department_id 
    FROM departments 
    WHERE department_name = users.department::text
)
WHERE department IS NOT NULL;

-- 기존 department ENUM 값을 기반으로 department_id 값 설정 (출고 테이블)
UPDATE outbound
SET department_id = (
    SELECT department_id 
    FROM departments 
    WHERE department_name = outbound.department::text
)
WHERE department IS NOT NULL; 