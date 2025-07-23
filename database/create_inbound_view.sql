-- 입고 관리를 위한 뷰 생성
-- 이 뷰는 inbound 테이블과 parts, suppliers 테이블을 조인하여
-- 입고 관리 페이지에서 필요한 모든 정보를 제공합니다.

CREATE OR REPLACE VIEW inbound_view AS
SELECT 
    i.inbound_id,
    i.inbound_date,
    i.part_id,
    i.supplier_id,
    i.quantity,
    i.unit_price,
    i.total_price,
    i.currency,
    i.invoice_number,
    i.lot_number,
    i.notes,
    i.created_at,
    i.created_by,
    p.part_code,
    p.part_name,
    p.vietnamese_name,
    p.korean_name,
    p.spec,
    p.unit as part_unit,
    p.category,
    s.supplier_code,
    s.supplier_name,
    s.contact_person,
    s.country,
    -- 참조 번호 생성 (입고일자 + 순번)
    CONCAT(
        TO_CHAR(i.inbound_date, 'YYYYMMDD'),
        '-',
        LPAD(ROW_NUMBER() OVER (PARTITION BY i.inbound_date ORDER BY i.created_at)::text, 3, '0')
    ) as reference_number
FROM inbound i
LEFT JOIN parts p ON i.part_id = p.part_id
LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
ORDER BY i.inbound_date DESC, i.created_at DESC;

-- 뷰에 대한 RLS 정책 설정
ALTER VIEW inbound_view OWNER TO postgres;

-- 뷰 사용 권한 부여
GRANT SELECT ON inbound_view TO authenticated;
GRANT SELECT ON inbound_view TO anon;

-- 인덱스 힌트를 위한 코멘트
COMMENT ON VIEW inbound_view IS '입고 관리를 위한 조인 뷰 - parts, suppliers 테이블과 조인하여 완전한 입고 정보 제공';