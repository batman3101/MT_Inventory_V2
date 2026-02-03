-- Drop old function
DROP FUNCTION IF EXISTS get_latest_part_prices();

-- Create new function with factory_id parameter
CREATE OR REPLACE FUNCTION get_latest_part_prices(p_factory_id UUID)
RETURNS TABLE (
    price_id UUID,
    part_id UUID,
    unit_price NUMERIC,
    currency VARCHAR(10),
    supplier_id UUID,
    effective_from DATE,
    effective_to DATE,
    is_current BOOLEAN,
    created_at TIMESTAMPTZ,
    created_by VARCHAR(100),
    supplier_name VARCHAR(100),
    source TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Get latest prices from part_prices table for the specific factory
    WITH ranked_prices AS (
        SELECT
            pp.price_id,
            pp.part_id,
            pp.unit_price,
            pp.currency,
            pp.supplier_id,
            pp.effective_from,
            pp.effective_to,
            pp.is_current,
            pp.created_at,
            pp.created_by,
            s.supplier_name,
            'part_prices'::TEXT as source,
            ROW_NUMBER() OVER (PARTITION BY pp.part_id ORDER BY pp.effective_from DESC) as rn
        FROM part_prices pp
        LEFT JOIN suppliers s ON pp.supplier_id = s.supplier_id
        WHERE pp.factory_id = p_factory_id
    ),
    -- Fallback to inbound prices for parts without part_prices
    inbound_prices AS (
        SELECT
            i.inbound_id as price_id,
            i.part_id,
            i.unit_price,
            i.currency,
            i.supplier_id,
            i.inbound_date as effective_from,
            NULL::DATE as effective_to,
            false as is_current,
            i.created_at,
            i.created_by,
            s.supplier_name,
            'inbound'::TEXT as source,
            ROW_NUMBER() OVER (PARTITION BY i.part_id ORDER BY i.inbound_date DESC) as rn
        FROM inbound i
        LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
        WHERE i.factory_id = p_factory_id
          AND i.part_id NOT IN (
              SELECT DISTINCT part_id FROM part_prices WHERE factory_id = p_factory_id
          )
    )
    SELECT
        rp.price_id, rp.part_id, rp.unit_price, rp.currency, rp.supplier_id,
        rp.effective_from, rp.effective_to, rp.is_current, rp.created_at,
        rp.created_by, rp.supplier_name, rp.source
    FROM ranked_prices rp
    WHERE rp.rn = 1
    UNION ALL
    SELECT
        ip.price_id, ip.part_id, ip.unit_price, ip.currency, ip.supplier_id,
        ip.effective_from, ip.effective_to, ip.is_current, ip.created_at,
        ip.created_by, ip.supplier_name, ip.source
    FROM inbound_prices ip
    WHERE ip.rn = 1;
END;
$$;
