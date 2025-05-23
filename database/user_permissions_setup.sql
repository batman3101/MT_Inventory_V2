-- 사용자별 개별 권한 관리 테이블 추가
-- MT_Inventory 시스템 확장

-- 사용자별 개별 권한 테이블
CREATE TABLE IF NOT EXISTS user_permissions (
    user_permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT TRUE, -- true: 권한 부여, false: 권한 거부
    granted_by UUID REFERENCES users(user_id), -- 권한을 부여한 관리자
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- 권한 만료일 (NULL이면 무기한)
    reason TEXT, -- 권한 부여/거부 사유
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, permission_id)
);

-- 권한 변경 이력 테이블
CREATE TABLE IF NOT EXISTS permission_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    permission_id UUID NOT NULL REFERENCES permissions(permission_id),
    action VARCHAR(20) NOT NULL, -- 'GRANTED', 'REVOKED', 'EXPIRED'
    old_value BOOLEAN,
    new_value BOOLEAN,
    changed_by UUID REFERENCES users(user_id),
    reason TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 추가 권한 정의
INSERT INTO permissions (permission_name, description) VALUES
('manage_permissions', '권한 관리'),
('view_audit_logs', '감사 로그 조회'),
('export_data', '데이터 내보내기'),
('import_data', '데이터 가져오기'),
('manage_settings', '시스템 설정 관리'),
('view_dashboard', '대시보드 조회'),
('create_reports', '보고서 생성'),
('delete_records', '레코드 삭제'),
('approve_requests', '요청 승인'),
('manage_departments', '부서 관리')
ON CONFLICT (permission_name) DO NOTHING;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_granted ON user_permissions(granted);
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_user_id ON permission_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_changed_at ON permission_audit_log(changed_at);

-- RLS 정책 설정
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;

-- 시스템 관리자만 사용자별 권한 관리 가능
CREATE POLICY "시스템관리자_권한관리" ON user_permissions
    FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM users 
        WHERE (email = auth.email() OR username = auth.email())
          AND role = 'system_admin'
          AND is_active = true
    ));

-- 시스템 관리자만 감사 로그 조회 가능
CREATE POLICY "시스템관리자_감사로그조회" ON permission_audit_log
    FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM users 
        WHERE (email = auth.email() OR username = auth.email())
          AND role = 'system_admin'
          AND is_active = true
    ));

-- 권한 변경 시 자동으로 감사 로그 생성하는 트리거 함수
CREATE OR REPLACE FUNCTION log_permission_change()
RETURNS TRIGGER AS $$
BEGIN
    -- INSERT 시
    IF TG_OP = 'INSERT' THEN
        INSERT INTO permission_audit_log (
            user_id, permission_id, action, old_value, new_value, 
            changed_by, reason, changed_at
        ) VALUES (
            NEW.user_id, NEW.permission_id, 
            CASE WHEN NEW.granted THEN 'GRANTED' ELSE 'REVOKED' END,
            NULL, NEW.granted, NEW.granted_by, NEW.reason, CURRENT_TIMESTAMP
        );
        RETURN NEW;
    END IF;
    
    -- UPDATE 시
    IF TG_OP = 'UPDATE' THEN
        IF OLD.granted != NEW.granted THEN
            INSERT INTO permission_audit_log (
                user_id, permission_id, action, old_value, new_value,
                changed_by, reason, changed_at
            ) VALUES (
                NEW.user_id, NEW.permission_id,
                CASE WHEN NEW.granted THEN 'GRANTED' ELSE 'REVOKED' END,
                OLD.granted, NEW.granted, NEW.granted_by, NEW.reason, CURRENT_TIMESTAMP
            );
        END IF;
        RETURN NEW;
    END IF;
    
    -- DELETE 시
    IF TG_OP = 'DELETE' THEN
        INSERT INTO permission_audit_log (
            user_id, permission_id, action, old_value, new_value,
            changed_by, reason, changed_at
        ) VALUES (
            OLD.user_id, OLD.permission_id, 'REVOKED',
            OLD.granted, FALSE, OLD.granted_by, 'Permission deleted', CURRENT_TIMESTAMP
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_log_permission_change ON user_permissions;
CREATE TRIGGER trigger_log_permission_change
    AFTER INSERT OR UPDATE OR DELETE ON user_permissions
    FOR EACH ROW EXECUTE FUNCTION log_permission_change();

-- 권한 만료 체크 함수
CREATE OR REPLACE FUNCTION check_expired_permissions()
RETURNS void AS $$
BEGIN
    -- 만료된 권한들을 비활성화
    UPDATE user_permissions 
    SET granted = FALSE, 
        reason = COALESCE(reason, '') || ' [EXPIRED]',
        updated_at = CURRENT_TIMESTAMP
    WHERE expires_at IS NOT NULL 
      AND expires_at <= CURRENT_TIMESTAMP 
      AND granted = TRUE;
      
    -- 만료된 권한에 대한 감사 로그 생성
    INSERT INTO permission_audit_log (
        user_id, permission_id, action, old_value, new_value, reason, changed_at
    )
    SELECT 
        user_id, permission_id, 'EXPIRED', TRUE, FALSE, 
        'Permission expired automatically', CURRENT_TIMESTAMP
    FROM user_permissions 
    WHERE expires_at IS NOT NULL 
      AND expires_at <= CURRENT_TIMESTAMP 
      AND granted = FALSE
      AND updated_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute';
END;
$$ LANGUAGE plpgsql;

-- 사용자별 권한 조회 함수 (역할 기반 + 개별 권한)
CREATE OR REPLACE FUNCTION get_user_effective_permissions(target_user_id UUID)
RETURNS TABLE (
    permission_name VARCHAR(50),
    source VARCHAR(20), -- 'ROLE' 또는 'INDIVIDUAL'
    granted BOOLEAN,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- 먼저 만료된 권한 체크
    PERFORM check_expired_permissions();
    
    RETURN QUERY
    WITH user_info AS (
        SELECT u.role, u.user_id
        FROM users u 
        WHERE u.user_id = target_user_id
    ),
    role_permissions AS (
        SELECT p.permission_name, 'ROLE'::VARCHAR(20) as source, 
               TRUE as granted, NULL::TIMESTAMP WITH TIME ZONE as expires_at
        FROM user_info ui
        JOIN role_permissions rp ON ui.role = rp.role
        JOIN permissions p ON rp.permission_id = p.permission_id
    ),
    individual_permissions AS (
        SELECT p.permission_name, 'INDIVIDUAL'::VARCHAR(20) as source,
               up.granted, up.expires_at
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.permission_id
        WHERE up.user_id = target_user_id
          AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
    )
    -- 개별 권한이 역할 기반 권한을 덮어씀
    SELECT COALESCE(ip.permission_name, rp.permission_name) as permission_name,
           COALESCE(ip.source, rp.source) as source,
           COALESCE(ip.granted, rp.granted) as granted,
           ip.expires_at
    FROM role_permissions rp
    FULL OUTER JOIN individual_permissions ip 
        ON rp.permission_name = ip.permission_name
    WHERE COALESCE(ip.granted, rp.granted) = TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE user_permissions IS '사용자별 개별 권한 설정 테이블';
COMMENT ON TABLE permission_audit_log IS '권한 변경 이력 추적 테이블';
COMMENT ON FUNCTION get_user_effective_permissions(UUID) IS '사용자의 유효한 권한 목록 조회 (역할 기반 + 개별 권한)';
COMMENT ON FUNCTION check_expired_permissions() IS '만료된 권한들을 자동으로 비활성화하는 함수'; 