require('dotenv').config({ path: './.env.local' });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const port = 3001;

// Supabase 설정 (실제 값으로 대체해야 합니다.)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json()); // JSON 요청 본문을 파싱하기 위한 미들웨어

app.get('/', (req, res) => {
  res.send('Hello from the server!');
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
