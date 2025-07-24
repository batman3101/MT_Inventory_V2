-- 샘플 데이터 삽입

-- 공급업체 샘플 데이터
INSERT INTO suppliers (supplier_code, supplier_name, contact_person, email, phone, country, status) VALUES
('SUP001', '한국기계부품', '김철수', 'kim@korea-parts.com', '02-1234-5678', 'Korea', 'active'),
('SUP002', '베트남모터스', 'Nguyen Van A', 'nguyen@vietnam-motors.com', '+84-123-456789', 'Vietnam', 'active'),
('SUP003', '일본정밀', '田中太郎', 'tanaka@japan-precision.jp', '+81-3-1234-5678', 'Japan', 'active');

-- 부품 샘플 데이터
INSERT INTO parts (part_code, part_name, vietnamese_name, korean_name, spec, unit, category, min_stock, max_stock, status, description) VALUES
('P001', 'Motor Servo', 'Động cơ servo', '서보모터', '100W, 3000RPM', 'ea', 'Motor', 5, 50, 'active', '서보모터 100W'),
('P002', 'Bearing 6204', 'Vòng bi 6204', '베어링 6204', 'SKF 6204-2RS', 'ea', 'Bearing', 10, 100, 'active', '볼베어링 6204'),
('P003', 'Belt V-Type', 'Dây curoa chữ V', 'V벨트', 'A-50', 'm', 'Belt', 20, 200, 'active', 'V타입 벨트'),
('P004', 'Oil Hydraulic', 'Dầu thủy lực', '유압오일', 'ISO VG 46', 'L', 'Oil', 100, 1000, 'active', '유압오일 46번'),
('P005', 'Switch Limit', 'Công tắc hành trình', '리미트스위치', 'OMRON D4A-3000', 'ea', 'Electric', 15, 150, 'active', '리미트 스위치');

-- 재고 샘플 데이터
INSERT INTO inventory (part_id, current_quantity, location) VALUES
((SELECT part_id FROM parts WHERE part_code = 'P001'), 25, 'A-01'),
((SELECT part_id FROM parts WHERE part_code = 'P002'), 75, 'A-02'),
((SELECT part_id FROM parts WHERE part_code = 'P003'), 150, 'B-01'),
((SELECT part_id FROM parts WHERE part_code = 'P004'), 500, 'C-01'),
((SELECT part_id FROM parts WHERE part_code = 'P005'), 80, 'A-03');

-- 입고 샘플 데이터
INSERT INTO inbound (inbound_date, part_id, supplier_id, quantity, unit_price, total_price, reference_number, status) VALUES
('2024-01-15', (SELECT part_id FROM parts WHERE part_code = 'P001'), (SELECT supplier_id FROM suppliers WHERE supplier_code = 'SUP001'), 10, 50000, 500000, 'IN-2024-001', 'completed'),
('2024-01-20', (SELECT part_id FROM parts WHERE part_code = 'P002'), (SELECT supplier_id FROM suppliers WHERE supplier_code = 'SUP002'), 50, 15000, 750000, 'IN-2024-002', 'completed'),
('2024-01-25', (SELECT part_id FROM parts WHERE part_code = 'P003'), (SELECT supplier_id FROM suppliers WHERE supplier_code = 'SUP003'), 100, 5000, 500000, 'IN-2024-003', 'completed');

-- 사용자 샘플 데이터 (비밀번호는 'admin123' 해시값)
INSERT INTO users (username, full_name, email, password_hash, role, department, is_active) VALUES
('admin', 'Administrator', 'admin@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/6CgpjYFqi', 'system_admin', '통합 관리', true),
('manager', 'Manager User', 'manager@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/6CgpjYFqi', 'admin', '설비 관리', true),
('user1', 'Regular User', 'user1@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/6CgpjYFqi', 'user', 'MT', true);