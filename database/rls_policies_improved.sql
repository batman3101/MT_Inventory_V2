-- ===================================================================
-- 개선된 RLS(Row Level Security) 정책 구현
-- MT_Inventory 시스템용 보안 정책
-- ===================================================================

-- 기존 정책 제거
DROP POLICY IF EXISTS "읽기 권한" ON users;
DROP POLICY IF EXISTS "쓰기 권한" ON users;
DROP POLICY IF EXISTS "업데이트 권한" ON users;
DROP POLICY IF EXISTS "시스템 관리자 사용자 관리" ON users;
DROP POLICY IF EXISTS "일반 관리자 사용자 관리" ON users;

DROP POLICY IF EXISTS "읽기 권한" ON suppliers;
DROP POLICY IF EXISTS "쓰기 권한" ON suppliers;
DROP POLICY IF EXISTS "업데이트 권한" ON suppliers;

DROP POLICY IF EXISTS "읽기 권한" ON parts;
DROP POLICY IF EXISTS "쓰기 권한" ON parts;
DROP POLICY IF EXISTS "업데이트 권한" ON parts;

DROP POLICY IF EXISTS "읽기 권한" ON inventory;
DROP POLICY IF EXISTS "쓰기 권한" ON inventory;
DROP POLICY IF EXISTS "업데이트 권한" ON inventory;

DROP POLICY IF EXISTS "읽기 권한" ON inbound;
DROP POLICY IF EXISTS "쓰기 권한" ON inbound;

DROP POLICY IF EXISTS "읽기 권한" ON outbound;
DROP POLICY IF EXISTS "쓰기 권한" ON outbound;

DROP POLICY IF EXISTS "읽기 권한" ON part_prices;
DROP POLICY IF EXISTS "쓰기 권한" ON part_prices;
DROP POLICY IF EXISTS "업데이트 권한" ON part_prices;

DROP POLICY IF EXISTS "읽기 권한" ON korean_names;
DROP POLICY IF EXISTS "쓰기 권한" ON korean_names;

-- ===================================================================
-- 보조 함수 생성 (Custom Functions for RLS)
-- ===================================================================

-- 현재 로그인한 사용자의 정보를 가져오는 함수
CREATE OR REPLACE FUNCTION auth.current_user_info()
RETURNS TABLE (
    user_id UUID,
    username VARCHAR(50),
    role VARCHAR(20),
    department_id UUID,
    is_active BOOLEAN
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        u.user_id,
        u.username,
        u.role,
        u.department_id,
        u.is_active
    FROM users u
    WHERE u.email = auth.email()
       OR u.username = auth.email()
    LIMIT 1;
$$;

-- 사용자가 특정 권한을 가지고 있는지 확인하는 함수
CREATE OR REPLACE FUNCTION auth.has_permission(permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM users u
        JOIN role_permissions rp ON u.role = rp.role
        JOIN permissions p ON rp.permission_id = p.permission_id
        WHERE (u.email = auth.email() OR u.username = auth.email())
          AND u.is_active = true
          AND p.permission_name = $1
    );
$$;

-- 사용자의 역할을 확인하는 함수
CREATE OR REPLACE FUNCTION auth.get_user_role()
RETURNS VARCHAR(20)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT u.role
    FROM users u
    WHERE (u.email = auth.email() OR u.username = auth.email())
      AND u.is_active = true
    LIMIT 1;
$$;

-- ===================================================================
-- 사용자 테이블 RLS 정책
-- ===================================================================

-- 모든 활성 사용자는 다른 활성 사용자 정보 조회 가능
CREATE POLICY "사용자_조회_정책" ON users
    FOR SELECT 
    USING (
        is_active = true 
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE (email = auth.email() OR username = auth.email()) 
              AND is_active = true
        )
    );

-- 시스템 관리자는 모든 사용자 관리 가능
CREATE POLICY "시스템관리자_사용자관리_정책" ON users
    FOR ALL 
    USING (auth.get_user_role() = 'system_admin');

-- 일반 관리자는 일반 사용자만 관리 가능 (자신 포함)
CREATE POLICY "관리자_사용자관리_정책" ON users
    FOR ALL 
    USING (
        auth.get_user_role() = 'admin' 
        AND (role = 'user' OR (email = auth.email() OR username = auth.email()))
    );

-- 일반 사용자는 자신의 정보만 수정 가능
CREATE POLICY "사용자_자신정보수정_정책" ON users
    FOR UPDATE
    USING (
        auth.get_user_role() = 'user' 
        AND (email = auth.email() OR username = auth.email())
    );

-- ===================================================================
-- 공급업체 테이블 RLS 정책
-- ===================================================================

-- 모든 인증된 사용자는 공급업체 정보 조회 가능
CREATE POLICY "공급업체_조회_정책" ON suppliers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE (email = auth.email() OR username = auth.email()) 
              AND is_active = true
        )
    );

-- 공급업체 관리 권한이 있는 사용자만 생성/수정 가능
CREATE POLICY "공급업체_관리_정책" ON suppliers
    FOR ALL
    USING (auth.has_permission('manage_suppliers'));

-- ===================================================================
-- 부품 테이블 RLS 정책
-- ===================================================================

-- 모든 인증된 사용자는 부품 정보 조회 가능
CREATE POLICY "부품_조회_정책" ON parts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE (email = auth.email() OR username = auth.email()) 
              AND is_active = true
        )
    );

-- 부품 관리 권한이 있는 사용자만 생성/수정 가능
CREATE POLICY "부품_관리_정책" ON parts
    FOR ALL
    USING (auth.has_permission('manage_parts'));

-- ===================================================================
-- 재고 테이블 RLS 정책
-- ===================================================================

-- 모든 인증된 사용자는 재고 정보 조회 가능
CREATE POLICY "재고_조회_정책" ON inventory
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE (email = auth.email() OR username = auth.email()) 
              AND is_active = true
        )
    );

-- 재고 관리 권한이 있는 사용자만 재고 수정 가능
CREATE POLICY "재고_관리_정책" ON inventory
    FOR ALL
    USING (auth.has_permission('manage_inventory'));

-- ===================================================================
-- 입고 테이블 RLS 정책
-- ===================================================================

-- 모든 인증된 사용자는 입고 기록 조회 가능
CREATE POLICY "입고_조회_정책" ON inbound
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE (email = auth.email() OR username = auth.email()) 
              AND is_active = true
        )
    );

-- 재고 관리 권한이 있는 사용자만 입고 등록 가능
CREATE POLICY "입고_등록_정책" ON inbound
    FOR INSERT
    WITH CHECK (auth.has_permission('manage_inventory'));

-- 입고 작성자나 관리 권한자만 수정 가능
CREATE POLICY "입고_수정_정책" ON inbound
    FOR UPDATE
    USING (
        created_by = (
            SELECT username FROM users 
            WHERE (email = auth.email() OR username = auth.email())
        )
        OR auth.has_permission('manage_inventory')
    );

-- ===================================================================
-- 출고 테이블 RLS 정책 (부서별 접근 제어)
-- ===================================================================

-- 모든 인증된 사용자는 출고 기록 조회 가능 (부서별 필터링)
CREATE POLICY "출고_조회_정책" ON outbound
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE (email = auth.email() OR username = auth.email()) 
              AND is_active = true
        ) AND (
            -- 시스템 관리자나 관리자는 모든 출고 기록 조회 가능
            auth.get_user_role() IN ('system_admin', 'admin')
            OR 
            -- 일반 사용자는 자신 부서의 출고 기록만 조회 가능
            department_id = (
                SELECT department_id FROM users 
                WHERE (email = auth.email() OR username = auth.email())
            )
            OR 
            -- 본인이 요청한 출고 기록은 조회 가능
            created_by = (
                SELECT username FROM users 
                WHERE (email = auth.email() OR username = auth.email())
            )
        )
    );

-- 모든 인증된 사용자는 출고 요청 가능
CREATE POLICY "출고_요청_정책" ON outbound
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE (email = auth.email() OR username = auth.email()) 
              AND is_active = true
        )
    );

-- 출고 요청자나 관리 권한자만 수정 가능
CREATE POLICY "출고_수정_정책" ON outbound
    FOR UPDATE
    USING (
        created_by = (
            SELECT username FROM users 
            WHERE (email = auth.email() OR username = auth.email())
        )
        OR auth.has_permission('manage_inventory')
    );

-- ===================================================================
-- 부품 가격 테이블 RLS 정책
-- ===================================================================

-- 모든 인증된 사용자는 가격 정보 조회 가능
CREATE POLICY "가격_조회_정책" ON part_prices
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE (email = auth.email() OR username = auth.email()) 
              AND is_active = true
        )
    );

-- 부품 관리 권한이 있는 사용자만 가격 관리 가능
CREATE POLICY "가격_관리_정책" ON part_prices
    FOR ALL
    USING (auth.has_permission('manage_parts'));

-- ===================================================================
-- 한국어 이름 매핑 테이블 RLS 정책
-- ===================================================================

-- 모든 인증된 사용자는 번역 정보 조회 가능
CREATE POLICY "번역_조회_정책" ON korean_names
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE (email = auth.email() OR username = auth.email()) 
              AND is_active = true
        )
    );

-- 시스템 관리자만 번역 정보 관리 가능
CREATE POLICY "번역_관리_정책" ON korean_names
    FOR ALL
    USING (auth.get_user_role() = 'system_admin');

-- ===================================================================
-- 권한 관련 테이블 RLS 정책
-- ===================================================================

-- 모든 인증된 사용자는 권한 정보 조회 가능
CREATE POLICY "권한_조회_정책" ON permissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE (email = auth.email() OR username = auth.email()) 
              AND is_active = true
        )
    );

-- 시스템 관리자만 권한 정보 관리 가능
CREATE POLICY "권한_관리_정책" ON permissions
    FOR ALL
    USING (auth.get_user_role() = 'system_admin');

-- 모든 인증된 사용자는 역할-권한 매핑 조회 가능
CREATE POLICY "역할권한_조회_정책" ON role_permissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE (email = auth.email() OR username = auth.email()) 
              AND is_active = true
        )
    );

-- 시스템 관리자만 역할-권한 매핑 관리 가능
CREATE POLICY "역할권한_관리_정책" ON role_permissions
    FOR ALL
    USING (auth.get_user_role() = 'system_admin');

-- ===================================================================
-- 인덱스 최적화 (성능 향상)
-- ===================================================================

-- RLS 정책에서 자주 사용되는 필드에 대한 인덱스
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_outbound_department_id ON outbound(department_id);
CREATE INDEX IF NOT EXISTS idx_outbound_created_by ON outbound(created_by);
CREATE INDEX IF NOT EXISTS idx_inbound_created_by ON inbound(created_by);

-- ===================================================================
-- 정책 적용 상태 확인 쿼리
-- ===================================================================

-- 다음 쿼리로 정책 적용 상태를 확인할 수 있습니다:
/*
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
*/

COMMENT ON FUNCTION auth.current_user_info() IS '현재 로그인한 사용자 정보를 반환하는 함수';
COMMENT ON FUNCTION auth.has_permission(TEXT) IS '사용자가 특정 권한을 가지고 있는지 확인하는 함수';
COMMENT ON FUNCTION auth.get_user_role() IS '현재 로그인한 사용자의 역할을 반환하는 함수'; 