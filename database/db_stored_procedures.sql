-- 동적 쿼리 처리를 위한 함수
CREATE OR REPLACE FUNCTION search_inventory(query_sql TEXT)
RETURNS SETOF json AS $$
BEGIN
    RETURN QUERY EXECUTE query_sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 공통 메타데이터 검색 함수
CREATE OR REPLACE FUNCTION search_parts(search_term TEXT)
RETURNS SETOF parts AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM parts
    WHERE 
        part_code ILIKE '%' || search_term || '%' OR
        part_name ILIKE '%' || search_term || '%' OR
        korean_name ILIKE '%' || search_term || '%' OR
        vietnamese_name ILIKE '%' || search_term || '%'
    ORDER BY part_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 공급업체 검색 함수
CREATE OR REPLACE FUNCTION search_suppliers(search_term TEXT)
RETURNS SETOF suppliers AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM suppliers
    WHERE 
        supplier_code ILIKE '%' || search_term || '%' OR
        supplier_name ILIKE '%' || search_term || '%' OR
        contact_person ILIKE '%' || search_term || '%'
    ORDER BY supplier_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 재고 요약 정보 조회 함수
CREATE OR REPLACE FUNCTION inventory_summary()
RETURNS TABLE (
    total_parts BIGINT,
    low_stock_parts BIGINT,
    zero_stock_parts BIGINT,
    total_value NUMERIC,
    categories JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM parts) as total_parts,
        (SELECT COUNT(*) FROM inventory i JOIN parts p ON i.part_id = p.part_id WHERE i.current_quantity < p.min_stock) as low_stock_parts,
        (SELECT COUNT(*) FROM inventory WHERE current_quantity = 0) as zero_stock_parts,
        (SELECT COALESCE(SUM(i.current_quantity * pp.unit_price), 0) 
         FROM inventory i 
         JOIN parts p ON i.part_id = p.part_id
         LEFT JOIN (
             SELECT part_id, unit_price
             FROM part_prices
             WHERE is_current = true
         ) pp ON p.part_id = pp.part_id) as total_value,
        (SELECT json_agg(json_build_object('category', category, 'count', count))
         FROM (
             SELECT p.category, COUNT(*) as count
             FROM parts p
             GROUP BY p.category
             ORDER BY count DESC
         ) as cat) as categories;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 최근 입출고 내역 조회 함수
CREATE OR REPLACE FUNCTION recent_transactions(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    transaction_type TEXT,
    transaction_date DATE,
    part_code TEXT,
    part_name TEXT,
    quantity INTEGER,
    related_person TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM (
        SELECT 
            '입고' as transaction_type,
            i.inbound_date as transaction_date,
            p.part_code,
            p.part_name,
            i.quantity,
            i.created_by as related_person
        FROM inbound i
        JOIN parts p ON i.part_id = p.part_id
        
        UNION ALL
        
        SELECT 
            '출고' as transaction_type,
            o.outbound_date as transaction_date,
            p.part_code,
            p.part_name,
            o.quantity,
            o.requester as related_person
        FROM outbound o
        JOIN parts p ON o.part_id = p.part_id
    ) as transactions
    ORDER BY transaction_date DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 