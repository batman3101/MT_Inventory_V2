/**
 * Vercel Serverless Function - 로그인 API
 *
 * 커스텀 users 테이블을 사용한 인증
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    console.log('🔐 로그인 시도:', email);

    if (!email || !password) {
      console.log('❌ 이메일 또는 비밀번호 누락');
      return res.status(400).json({ error: '이메일과 비밀번호가 필요합니다.' });
    }

    // Supabase 클라이언트 생성 (서버 전용 SERVICE_KEY 사용)
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
      return res.status(500).json({ error: '서버 설정 오류' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // users 테이블에서 이메일로 사용자 조회
    console.log('📊 users 테이블 조회 중...');
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      console.error('❌ 사용자 조회 실패:', error?.message);
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

    return res.status(200).json({
      user: userWithoutPassword,
      message: '로그인 성공'
    });
  } catch (err) {
    console.error('❌ 로그인 에러:', err.message);
    console.error('Stack:', err.stack);
    return res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
}
