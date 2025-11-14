/**
 * 사용자 정보 확인 스크립트
 */

require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('디버그 정보:');
console.log('- URL:', supabaseUrl);
console.log('- KEY 길이:', supabaseServiceKey?.length);
console.log('- KEY 시작:', supabaseServiceKey?.substring(0, 20));
console.log('');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '있음' : '없음');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '있음' : '없음');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser() {
  const email = 'zetooo1972@gmail.com';

  console.log('\n=== 사용자 정보 확인 ===');
  console.log('이메일:', email);
  console.log('');

  try {
    // users 테이블에서 사용자 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('❌ 사용자 조회 실패:', error.message);
      return;
    }

    if (!user) {
      console.log('❌ 해당 이메일의 사용자가 존재하지 않습니다.');
      console.log('\n💡 해결 방법:');
      console.log('1. Supabase Dashboard에서 users 테이블 확인');
      console.log('2. create-password-hash.js로 새 사용자 추가');
      return;
    }

    console.log('✅ 사용자를 찾았습니다:');
    console.log('- User ID:', user.user_id);
    console.log('- 이름:', user.name);
    console.log('- 이메일:', user.email);
    console.log('- 활성화 상태:', user.is_active ? '✅ 활성화' : '❌ 비활성화');
    console.log('- 역할:', user.role);
    console.log('- 생성일:', user.created_at);
    console.log('');
    console.log('비밀번호 해시:', user.password_hash);

    if (!user.is_active) {
      console.log('\n⚠️ 사용자가 비활성화 상태입니다.');
      console.log('is_active를 true로 변경해야 합니다.');
    }

    if (!user.password_hash) {
      console.log('\n❌ 비밀번호 해시가 설정되지 않았습니다.');
      console.log('create-password-hash.js로 비밀번호 해시를 생성하세요.');
    }

  } catch (err) {
    console.error('❌ 에러 발생:', err.message);
  }

  console.log('===================\n');
}

checkUser();
