require('dotenv').config({ path: '../.env.local' });
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const port = process.env.PORT || 3001;

// Supabase 설정 (SERVICE_KEY 사용 - 서버 전용)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// 환경 변수 확인
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  console.error('- VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('- SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

console.log('✅ Supabase 연결 설정 완료');
console.log('- URL:', supabaseUrl);
console.log('- KEY 길이:', supabaseServiceKey.length);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS 설정 - 프론트엔드에서 접근 허용
app.use(cors({
  origin: 'http://localhost:5173', // Vite 개발 서버
  credentials: true
}));

app.use(express.json()); // JSON 요청 본문을 파싱하기 위한 미들웨어

app.get('/', (req, res) => {
  res.send('Hello from the server!');
});

// 로그인 API 엔드포인트
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 로그인 시도:', email);

    if (!email || !password) {
      console.log('❌ 이메일 또는 비밀번호 누락');
      return res.status(400).json({ error: '이메일과 비밀번호가 필요합니다.' });
    }

    // users 테이블에서 이메일로 사용자 조회
    console.log('📊 users 테이블 조회 중...');
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('❌ 사용자 조회 실패:', error.message);
      console.error('상세:', error);
      return res.status(401).json({ error: '이메일 또는 비밀번호가 잘못되었습니다.' });
    }

    if (!user) {
      console.log('❌ 사용자 없음 또는 비활성화');
      return res.status(401).json({ error: '이메일 또는 비밀번호가 잘못되었습니다.' });
    }

    console.log('✅ 사용자 찾음:', user.email);

    // 비밀번호 검증
    console.log('🔑 비밀번호 검증 중...');
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      console.log('❌ 비밀번호 불일치');
      return res.status(401).json({ error: '이메일 또는 비밀번호가 잘못되었습니다.' });
    }

    console.log('✅ 비밀번호 일치');

    // 비밀번호 해시 제거 후 반환
    const { password_hash, ...userWithoutPassword } = user;

    console.log('✅ 로그인 성공:', user.email);

    res.status(200).json({
      user: userWithoutPassword,
      message: '로그인 성공'
    });
  } catch (err) {
    console.error('❌ 로그인 에러:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
});

// 예시: parts 테이블의 모든 데이터를 가져오는 API 엔드포인트
app.get('/api/parts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('parts')
      .select('*');

    if (error) {
      console.error('Error fetching parts:', error.message);
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json(data);
  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// 프로덕션: 빌드된 React 앱 제공
// ========================================
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');

  // 정적 파일 제공 (CSS, JS, 이미지 등)
  app.use(express.static(distPath));

  // SPA 라우팅 처리: 모든 나머지 GET 요청을 index.html로 리다이렉트
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  console.log('📦 프로덕션 모드: 정적 파일 제공 활성화');
}

app.listen(port, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 서버 시작 완료!`);
  console.log(`${'='.repeat(50)}`);
  console.log(`포트: ${port}`);
  console.log(`환경: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API: http://localhost:${port}/api`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`프론트엔드: http://localhost:${port}`);
  } else {
    console.log(`개발 모드: 프론트엔드는 Vite(5173)에서 제공됩니다`);
  }
  console.log(`${'='.repeat(50)}\n`);
});
