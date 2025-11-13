/**
 * 비밀번호 해시 검증 스크립트
 */

const bcrypt = require('bcryptjs');

const password = 'youkillme-1972'; // 입력한 비밀번호
const storedHash = '$2b$12$cPPk6pouCHQBJ3HDV1Qek.niLgm4eNdg8d1HsxTKjejKoeITWeYM6'; // DB에 저장된 해시

console.log('\n=== 비밀번호 검증 ===');
console.log('입력 비밀번호:', password);
console.log('저장된 해시:', storedHash);
console.log('');

bcrypt.compare(password, storedHash, (err, result) => {
  if (err) {
    console.error('❌ 검증 에러:', err);
    return;
  }

  console.log('검증 결과:', result ? '✅ 일치함' : '❌ 일치하지 않음');

  if (!result) {
    console.log('\n⚠️ 저장된 해시가 입력한 비밀번호와 일치하지 않습니다.');
    console.log('새로운 해시를 생성하려면 create-password-hash.js를 실행하세요.');
  } else {
    console.log('\n✅ 해시가 정상입니다. 다른 문제를 확인해야 합니다.');
  }
  console.log('===================\n');
});
