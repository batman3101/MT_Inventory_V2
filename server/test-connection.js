require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

// 색상 코드 (콘솔 출력용)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.cyan}================================${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}Supabase 연결 테스트 시작${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}================================${colors.reset}\n`);

// Supabase 클라이언트 생성
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log(`${colors.blue}1. 환경 변수 확인${colors.reset}`);
console.log(`   - SUPABASE_URL: ${supabaseUrl ? colors.green + '✓ 설정됨' + colors.reset : colors.red + '✗ 없음' + colors.reset}`);
console.log(`   - SUPABASE_KEY: ${supabaseKey ? colors.green + '✓ 설정됨' + colors.reset : colors.red + '✗ 없음' + colors.reset}\n`);

if (!supabaseUrl || !supabaseKey) {
  console.log(`${colors.red}에러: 환경 변수가 설정되지 않았습니다.${colors.reset}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log(`${colors.blue}2. 데이터베이스 연결 테스트${colors.reset}`);

    // 간단한 쿼리로 연결 테스트
    const { data: partsData, error: partsError } = await supabase
      .from('parts')
      .select('count')
      .limit(0);

    if (partsError) {
      console.log(`   ${colors.red}✗ 연결 실패: ${partsError.message}${colors.reset}\n`);
      throw partsError;
    }

    console.log(`   ${colors.green}✓ 연결 성공!${colors.reset}\n`);

    // 주요 테이블 확인
    console.log(`${colors.blue}3. 주요 테이블 확인${colors.reset}`);
    const mainTables = ['parts', 'suppliers', 'inventory', 'inbound', 'outbound', 'users'];

    for (const tableName of mainTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`   ${colors.yellow}⚠ ${tableName}: 접근 불가 (${error.message})${colors.reset}`);
        } else {
          console.log(`   ${colors.green}✓ ${tableName}: ${count !== null ? count + '개 레코드' : '접근 가능'}${colors.reset}`);
        }
      } catch (err) {
        console.log(`   ${colors.yellow}⚠ ${tableName}: 에러 발생${colors.reset}`);
      }
    }

    // 간단한 쿼리 테스트
    console.log(`\n${colors.blue}4. 샘플 데이터 조회 테스트${colors.reset}`);
    const { data: sampleData, error: sampleError } = await supabase
      .from('parts')
      .select('*')
      .limit(5);

    if (sampleError) {
      console.log(`   ${colors.yellow}⚠ 샘플 데이터 조회 실패: ${sampleError.message}${colors.reset}`);
    } else {
      console.log(`   ${colors.green}✓ 샘플 데이터 조회 성공: ${sampleData.length}개 레코드${colors.reset}`);
      if (sampleData.length > 0) {
        console.log(`\n${colors.cyan}   첫 번째 레코드:${colors.reset}`);
        console.log('   ', JSON.stringify(sampleData[0], null, 2).split('\n').join('\n    '));
      }
    }

    console.log(`\n${colors.bright}${colors.green}================================${colors.reset}`);
    console.log(`${colors.bright}${colors.green}연결 테스트 완료!${colors.reset}`);
    console.log(`${colors.bright}${colors.green}================================${colors.reset}\n`);

  } catch (error) {
    console.log(`\n${colors.bright}${colors.red}================================${colors.reset}`);
    console.log(`${colors.bright}${colors.red}연결 테스트 실패!${colors.reset}`);
    console.log(`${colors.bright}${colors.red}================================${colors.reset}`);
    console.log(`${colors.red}에러: ${error.message}${colors.reset}\n`);
    process.exit(1);
  }
}

testConnection();
