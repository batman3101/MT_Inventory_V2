/**
 * 비밀번호 해시 생성 스크립트
 *
 * 사용법:
 * node create-password-hash.js
 */

const bcrypt = require('bcryptjs');

const password = 'youkillme-1972'; // 환경 변수의 비밀번호
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('해시 생성 에러:', err);
    return;
  }

  console.log('\n=== 생성된 bcrypt 해시 ===');
  console.log(hash);
  console.log('\n이 해시 값을 Supabase users 테이블의 password_hash 컬럼에 넣으세요.');
  console.log('이메일: zetooo1972@gmail.com');
  console.log('=========================\n');
});
