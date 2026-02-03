/**
 * Vercel Serverless Function - 사용자 생성 API
 *
 * 커스텀 users 테이블에 새 사용자를 추가하고 bcrypt로 비밀번호 해싱
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
    const {
      username,
      full_name,
      email,
      password,
      role,
      department,
      department_id,
      phone_number,
      position,
      user_settings,
      profile_image_url,
      is_active = true,
      factory_id,
    } = req.body;

    console.log('👤 새 사용자 생성 시도:', email);

    // 필수 필드 검증
    if (!username || !full_name || !email || !password || !role) {
      console.log('❌ 필수 필드 누락');
      return res.status(400).json({
        error: '사용자명, 성명, 이메일, 비밀번호, 역할은 필수입니다.'
      });
    }

    // 비밀번호 길이 검증 (최소 6자)
    if (password.length < 6) {
      console.log('❌ 비밀번호가 너무 짧음');
      return res.status(400).json({
        error: '비밀번호는 최소 6자 이상이어야 합니다.'
      });
    }

    // Supabase 클라이언트 생성 (서버 전용 SERVICE_KEY 사용)
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
      return res.status(500).json({ error: '서버 설정 오류' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 이메일 중복 체크
    console.log('📊 이메일 중복 체크 중...');
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      console.log('❌ 이미 존재하는 이메일:', email);
      return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });
    }

    // 사용자명 중복 체크
    console.log('📊 사용자명 중복 체크 중...');
    const { data: existingUsername } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUsername) {
      console.log('❌ 이미 존재하는 사용자명:', username);
      return res.status(409).json({ error: '이미 사용 중인 사용자명입니다.' });
    }

    // 비밀번호 해싱 (bcrypt, salt rounds = 10)
    console.log('🔐 비밀번호 해싱 중...');
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    console.log('✅ 비밀번호 해싱 완료');

    // users 테이블에 새 사용자 추가
    console.log('💾 사용자 생성 중...');
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        username,
        full_name,
        email,
        password_hash,
        role,
        department,
        department_id,
        phone_number: phone_number || null,
        position: position || null,
        user_settings: user_settings || {},
        profile_image_url: profile_image_url || null,
        is_active,
        last_password_change: new Date().toISOString(),
        login_attempt_count: 0,
        account_expiry_date: null,
        factory_id: factory_id || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ 사용자 생성 실패:', insertError.message);
      return res.status(500).json({ error: '사용자 생성 중 오류가 발생했습니다.' });
    }

    console.log('✅ 사용자 생성 성공:', newUser.email);

    // 비밀번호 해시 제거 후 반환
    const { password_hash: _, ...userWithoutPassword } = newUser;

    return res.status(201).json({
      user: userWithoutPassword,
      message: '사용자가 성공적으로 생성되었습니다.'
    });
  } catch (err) {
    console.error('❌ 사용자 생성 에러:', err.message);
    console.error('Stack:', err.stack);
    return res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
}
