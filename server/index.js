require('dotenv').config({ path: '../.env.local' });
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const port = 3001;

// Supabase 설정 (SERVICE_KEY 사용 - 서버 전용)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
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

    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호가 필요합니다.' });
    }

    // users 테이블에서 이메일로 사용자 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      console.error('사용자 조회 실패:', error?.message);
      return res.status(401).json({ error: '이메일 또는 비밀번호가 잘못되었습니다.' });
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 잘못되었습니다.' });
    }

    // 비밀번호 해시 제거 후 반환
    const { password_hash, ...userWithoutPassword } = user;

    res.status(200).json({
      user: userWithoutPassword,
      message: '로그인 성공'
    });
  } catch (err) {
    console.error('로그인 에러:', err.message);
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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
