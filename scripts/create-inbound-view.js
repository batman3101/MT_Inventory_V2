// 입고 관리 뷰 생성 스크립트
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env 파일에서 환경변수 읽기
const envPath = path.join(__dirname, '..', '.env');
let supabaseUrl = '';
let supabaseKey = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1].trim();
    }
  }
} catch (error) {
  console.error('.env 파일을 읽을 수 없습니다:', error.message);
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

// Supabase 클라이언트 초기화
const supabase = createClient(supabaseUrl, supabaseKey);

async function createInboundView() {
  try {
    console.log('입고 관리 뷰 생성 중...');
    
    // 기존 뷰가 있다면 삭제
    const dropViewQuery = `DROP VIEW IF EXISTS inbound_view;`;
    
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: dropViewQuery
    });
    
    if (dropError) {
      console.log('기존 뷰 삭제 시 오류 (무시 가능):', dropError.message);
    }
    
    // 새 뷰 생성
    const createViewQuery = `
      CREATE VIEW inbound_view AS
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
          CONCAT(
              TO_CHAR(i.inbound_date, 'YYYYMMDD'),
              '-',
              LPAD(ROW_NUMBER() OVER (PARTITION BY i.inbound_date ORDER BY i.created_at)::text, 3, '0')
          ) as reference_number
      FROM inbound i
      LEFT JOIN parts p ON i.part_id = p.part_id
      LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
      ORDER BY i.inbound_date DESC, i.created_at DESC;
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: createViewQuery
    });
    
    if (createError) {
      console.error('뷰 생성 실패:', createError);
      return;
    }
    
    console.log('✅ 입고 관리 뷰가 성공적으로 생성되었습니다!');
    
    // 뷰 테스트
    const { data, error: testError } = await supabase
      .from('inbound_view')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('뷰 테스트 실패:', testError);
    } else {
      console.log('✅ 뷰 테스트 성공!');
      console.log('샘플 데이터:', data);
    }
    
  } catch (error) {
    console.error('스크립트 실행 중 오류:', error);
  }
}

// 스크립트 실행
createInboundView();