-- 데이터 무결성 문제 해결을 위한 SQL 마이그레이션 스크립트
-- 실행 일자: 2025-05-20

-- 1. parts 테이블의 NULL 필드 업데이트
-- created_by 필드가 NULL인 경우 'system_migration'으로 설정
UPDATE parts
SET created_by = 'system_migration'
WHERE created_by IS NULL;

-- 2. inventory 테이블의 NULL 필드 업데이트
-- last_count_date가 NULL인 경우 현재 날짜로 설정
UPDATE inventory
SET last_count_date = CURRENT_DATE
WHERE last_count_date IS NULL;

-- updated_by 필드가 NULL인 경우 'system_migration'으로 설정
UPDATE inventory
SET updated_by = 'system_migration'
WHERE updated_by IS NULL;

-- 3. outbound 테이블의 NULL 필드 업데이트
-- department 필드가 NULL인 경우 department_id에 해당하는 값으로 설정
UPDATE outbound
SET department = (
    SELECT department_name::department_type
    FROM departments
    WHERE department_id = outbound.department_id
)
WHERE department IS NULL AND department_id IS NOT NULL;

-- 4. suppliers 테이블의 NULL 필드 업데이트
-- website가 NULL인 경우 빈 문자열로 설정
UPDATE suppliers
SET website = ''
WHERE website IS NULL;

-- status가 NULL인 경우 'ACTIVE'로 설정
UPDATE suppliers
SET status = 'ACTIVE'
WHERE status IS NULL;

-- created_by 필드가 NULL인 경우 'system_migration'으로 설정
UPDATE suppliers
SET created_by = 'system_migration'
WHERE created_by IS NULL;

-- 5. 데이터 품질 개선을 위한 인덱스 추가
-- 자주 검색하는 필드에 인덱스 추가하여 성능 향상
CREATE INDEX IF NOT EXISTS idx_parts_part_code ON parts(part_code);
CREATE INDEX IF NOT EXISTS idx_parts_part_name ON parts(part_name);
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_name ON suppliers(supplier_name);

-- 6. 모든 테이블의 업데이트 날짜 갱신 트리거 추가
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- parts 테이블에 트리거 추가
DROP TRIGGER IF EXISTS update_parts_timestamp ON parts;
CREATE TRIGGER update_parts_timestamp
BEFORE UPDATE ON parts
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- suppliers 테이블에 트리거 추가
DROP TRIGGER IF EXISTS update_suppliers_timestamp ON suppliers;
CREATE TRIGGER update_suppliers_timestamp
BEFORE UPDATE ON suppliers
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- 마이그레이션 완료 메시지
DO $$
BEGIN
    RAISE NOTICE 'Database migration completed successfully';
END $$;

-- 추가: parts 테이블에 updated_by 칼럼 추가 (2025-05-20 업데이트)
DO $$
BEGIN
    -- 칼럼이 존재하는지 확인
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'parts' AND column_name = 'updated_by'
    ) THEN
        -- 칼럼 추가
        ALTER TABLE parts ADD COLUMN updated_by text DEFAULT 'system' NOT NULL;
        RAISE NOTICE 'parts 테이블에 updated_by 칼럼이 추가되었습니다.';
    END IF;
END $$; 