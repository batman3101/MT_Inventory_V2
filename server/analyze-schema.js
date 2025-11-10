require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

async function analyzeSchema() {
  console.log(`${colors.bright}${colors.cyan}Supabase 데이터베이스 스키마 분석${colors.reset}\n`);

  const tables = ['parts', 'suppliers', 'inventory', 'inbound', 'outbound', 'users'];
  const schemaInfo = {};

  for (const tableName of tables) {
    console.log(`${colors.cyan}${tableName} 테이블 분석 중...${colors.reset}`);

    try {
      // 샘플 데이터 가져오기
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`${colors.yellow}  ⚠ 에러: ${error.message}${colors.reset}\n`);
        continue;
      }

      if (data && data.length > 0) {
        const sampleRecord = data[0];
        const columns = {};

        // 각 컬럼의 타입 추론
        for (const [key, value] of Object.entries(sampleRecord)) {
          let type = typeof value;
          if (value === null) {
            type = 'null';
          } else if (Array.isArray(value)) {
            type = 'array';
          } else if (value instanceof Date) {
            type = 'date';
          } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
            type = 'timestamp';
          } else if (typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            type = 'uuid';
          }

          columns[key] = {
            type,
            sample: value
          };
        }

        schemaInfo[tableName] = {
          columns,
          sampleRecord
        };

        console.log(`${colors.green}  ✓ ${Object.keys(columns).length}개 컬럼 발견${colors.reset}\n`);
      }
    } catch (err) {
      console.log(`${colors.yellow}  ⚠ 에러: ${err.message}${colors.reset}\n`);
    }
  }

  // 스키마 정보를 파일로 저장
  const schemaOutput = JSON.stringify(schemaInfo, null, 2);
  fs.writeFileSync('../database/schema-analysis.json', schemaOutput);

  console.log(`${colors.green}스키마 분석 완료!${colors.reset}`);
  console.log(`결과 저장: database/schema-analysis.json\n`);

  // 콘솔에 출력
  console.log(`${colors.bright}${colors.cyan}=== 스키마 요약 ===${colors.reset}\n`);
  for (const [tableName, info] of Object.entries(schemaInfo)) {
    console.log(`${colors.cyan}${tableName}:${colors.reset}`);
    for (const [colName, colInfo] of Object.entries(info.columns)) {
      console.log(`  - ${colName}: ${colInfo.type}`);
    }
    console.log('');
  }
}

analyzeSchema();
