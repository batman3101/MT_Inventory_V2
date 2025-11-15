/**
 * Supabase 클라이언트 설정
 *
 * ⚠️ 주의: 이 클라이언트는 실제 운영 중인 Supabase 데이터베이스에 연결됩니다.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '환경 변수가 설정되지 않았습니다. .env 파일에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정하세요.'
  );
}

// Supabase 클라이언트 생성 (타입 안전성 보장)
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

/**
 * Supabase 연결 테스트
 * 애플리케이션 시작 시 데이터베이스 연결을 확인합니다.
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('parts').select('count').limit(0);

    if (error) {
      console.error('❌ Supabase 연결 실패:', error.message);
      return false;
    }

    console.log('✅ Supabase 연결 성공');
    return true;
  } catch (error) {
    console.error('❌ Supabase 연결 에러:', error);
    return false;
  }
}
