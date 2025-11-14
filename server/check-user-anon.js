/**
 * 사용자 정보 확인 스크립트 (ANON KEY 사용)
 */

require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('디버그 정보:');
console.log('- URL:', supabaseUrl);
console.log('- ANON KEY 길이:', supabaseAnonKey?.length);
console.log('');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUser() {
  const email = 'zetooo1972@gmail.com';
  const password = 'youkillme-1972';

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
      console.error('상세 에러:', error);
      return;
    }

    if (!user) {
      console.log('❌ 해당 이메일의 사용자가 존재하지 않습니다.');
      return;
    }

    console.log('✅ 사용자를 찾았습니다:');
    console.log('- User ID:', user.user_id);
    console.log('- 이름:', user.name);
    console.log('- 이메일:', user.email);
    console.log('- 활성화 상태:', user.is_active ? '✅ 활성화' : '❌ 비활성화');
    console.log('- 역할:', user.role);
    console.log('');

    if (!user.is_active) {
      console.log('⚠️ 사용자가 비활성화 상태입니다.');
    }

    if (!user.password_hash) {
      console.log('❌ 비밀번호 해시가 설정되지 않았습니다.');
    } else {
      console.log('비밀번호 해시 확인 중...');
      const isValid = await bcrypt.compare(password, user.password_hash);
      console.log('비밀번호 일치:', isValid ? '✅ 일치' : '❌ 불일치');

      if (!isValid) {
        console.log('\n💡 비밀번호가 일치하지 않습니다.');
        console.log('create-password-hash.js로 새로운 해시를 생성하세요.');
      }
    }

  } catch (err) {
    console.error('❌ 에러 발생:', err.message);
  }

  console.log('\n===================\n');
}

checkUser();
