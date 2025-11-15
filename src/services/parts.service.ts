// @ts-nocheck
/**
 * Parts (부품) 서비스
 *
 * ⚠️ 실제 Supabase 데이터베이스에서 부품 데이터를 조회/관리합니다.
 * Mock 데이터나 테스트 데이터를 사용하지 않습니다.
 */

import { supabase } from '@/lib/supabase.ts';
import type { Part, InsertDto, UpdateDto } from '../types/database.types';

/**
 * 모든 부품 조회
 */
export async function getAllParts(): Promise<Part[]> {
  const { data, error } = await supabase
    .from('parts')
    .select('*')
    .order('part_code', { ascending: true });

  if (error) {
    console.error('부품 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 부품 ID로 조회
 */
export async function getPartById(partId: string): Promise<Part | null> {
  const { data, error } = await supabase
    .from('parts')
    .select('*')
    .eq('part_id', partId)
    .single();

  if (error) {
    console.error('부품 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 부품 코드로 조회
 */
export async function getPartByCode(partCode: string): Promise<Part | null> {
  const { data, error } = await supabase
    .from('parts')
    .select('*')
    .eq('part_code', partCode)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // 데이터 없음
      return null;
    }
    console.error('부품 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 카테고리별 부품 조회
 */
export async function getPartsByCategory(category: string): Promise<Part[]> {
  const { data, error } = await supabase
    .from('parts')
    .select('*')
    .eq('category', category)
    .order('part_code', { ascending: true });

  if (error) {
    console.error('부품 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 상태별 부품 조회
 */
export async function getPartsByStatus(status: string): Promise<Part[]> {
  const { data, error } = await supabase
    .from('parts')
    .select('*')
    .eq('status', status)
    .order('part_code', { ascending: true });

  if (error) {
    console.error('부품 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 부품 검색 (코드, 이름으로)
 */
export async function searchParts(searchTerm: string): Promise<Part[]> {
  const { data, error} = await supabase
    .from('parts')
    .select('*')
    .or(`part_code.ilike.%${searchTerm}%,part_name.ilike.%${searchTerm}%,vietnamese_name.ilike.%${searchTerm}%,korean_name.ilike.%${searchTerm}%`)
    .order('part_code', { ascending: true });

  if (error) {
    console.error('부품 검색 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 부품 추가
 */
export async function createPart(
  part: InsertDto<'parts'>
): Promise<Part> {
  const { data, error } = await supabase
    .from('parts')
    .insert(part as any as any)
    .select()
    .single();

  if (error) {
    console.error('부품 추가 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 부품 수정
 */
export async function updatePart(
  partId: string,
  updates: UpdateDto<'parts'>
): Promise<Part> {
  const { data, error } = await supabase
    .from('parts')
    .update(updates as any)
    .eq('part_id', partId)
    .select()
    .single();

  if (error) {
    console.error('부품 수정 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 부품 삭제
 */
export async function deletePart(partId: string): Promise<void> {
  const { error } = await supabase
    .from('parts')
    .delete()
    .eq('part_id', partId);

  if (error) {
    console.error('부품 삭제 에러:', error);
    throw new Error(error.message);
  }
}

/**
 * 모든 카테고리 조회
 */
export async function getAllCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('parts')
    .select('category')
    .order('category', { ascending: true });

  if (error) {
    console.error('카테고리 조회 에러:', error);
    throw new Error(error.message);
  }

  // 중복 제거
  const categories = [...new Set(data.map((item) => item.category))];
  return categories.filter((cat) => cat && cat.trim() !== '');
}

/**
 * 부품 통계
 */
export async function getPartsStats() {
  const { data, error } = await supabase
    .from('parts')
    .select('*');

  if (error) {
    console.error('부품 통계 조회 에러:', error);
    throw new Error(error.message);
  }

  const parts = data as Part[];

  return {
    totalParts: parts.length,
    activeParts: parts.filter((p) => p.status === 'ACTIVE').length,
    categories: [...new Set(parts.map((p) => p.category))].length,
    inactiveParts: parts.filter((p) => p.status === 'INACTIVE' || p.status === 'DISCONTINUED').length,
  };
}
