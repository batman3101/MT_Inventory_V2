/**
 * Parts (부품) 서비스
 *
 * ⚠️ 실제 Supabase 데이터베이스에서 부품 데이터를 조회/관리합니다.
 * ⚠️ 부품 생성 시 재고(inventory) 레코드도 자동으로 생성됩니다.
 * ⚠️ 부품 삭제 시 관련 재고 레코드도 함께 삭제됩니다.
 * Mock 데이터나 테스트 데이터를 사용하지 않습니다.
 */

import { supabase } from '@/lib/supabase.ts';
import type { Part, InsertDto, UpdateDto, Database } from '../types/database.types';

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
 * ⚠️ 부품 생성 시 재고(inventory) 레코드도 자동으로 생성됩니다
 * @param part 부품 정보
 * @param initialQuantity 초기 재고 수량 (기본값: 0)
 */
export async function createPart(
  part: InsertDto<'parts'>,
  initialQuantity: number = 0
): Promise<Part> {
  // 1. 부품 레코드 생성
  const { data, error } = await supabase
    .from('parts')
    .insert(part as Database["public"]["Tables"]["parts"]["Insert"])
    .select()
    .single();

  if (error || !data) {
    console.error('부품 추가 에러:', error);
    throw new Error(error?.message || '부품 추가 실패');
  }

  const partData = data as Part;

  // 2. 재고 레코드 자동 생성 (초기 수량 적용)
  const { error: inventoryError } = await supabase
    .from('inventory')
    .insert({
      part_id: partData.part_id,
      current_quantity: initialQuantity,
      location: 'main',
      updated_by: part.created_by || 'system',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

  if (inventoryError) {
    // 재고 생성 실패 시 부품도 삭제 (롤백)
    console.error('재고 레코드 생성 에러:', inventoryError);
    await supabase.from('parts').delete().eq('part_id', partData.part_id);
    throw new Error(`재고 레코드 생성 실패: ${inventoryError.message}`);
  }

  return partData;
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
    .update(updates as Database["public"]["Tables"]["parts"]["Update"])
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
 * ⚠️ 부품 삭제 시 관련 재고(inventory) 레코드도 함께 삭제됩니다.
 * ⚠️ 입고/출고 내역이 있는 부품은 삭제할 수 없습니다.
 */
export async function deletePart(partId: string): Promise<void> {
  // 1. 입고 내역 확인 - 입고 내역이 있으면 삭제 불가
  const { data: inboundData } = await supabase
    .from('inbound')
    .select('inbound_id')
    .eq('part_id', partId)
    .limit(1);

  if (inboundData && inboundData.length > 0) {
    throw new Error('입고 내역이 있는 부품은 삭제할 수 없습니다. 부품을 비활성화하세요.');
  }

  // 2. 출고 내역 확인 - 출고 내역이 있으면 삭제 불가
  const { data: outboundData } = await supabase
    .from('outbound')
    .select('outbound_id')
    .eq('part_id', partId)
    .limit(1);

  if (outboundData && outboundData.length > 0) {
    throw new Error('출고 내역이 있는 부품은 삭제할 수 없습니다. 부품을 비활성화하세요.');
  }

  // 3. 재고 레코드 먼저 삭제
  const { error: inventoryError } = await supabase
    .from('inventory')
    .delete()
    .eq('part_id', partId);

  if (inventoryError) {
    console.error('재고 삭제 에러:', inventoryError);
    throw new Error(`재고 삭제 실패: ${inventoryError.message}`);
  }

  // 4. 부품 삭제
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
 * 부품 상태 변경 (활성화/비활성화)
 */
export async function updatePartStatus(
  partId: string,
  status: string
): Promise<Part> {
  return updatePart(partId, { status });
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
    // 활성 부품: NEW와 ACTIVE 상태
    activeParts: parts.filter((p) => p.status === 'NEW' || p.status === 'ACTIVE').length,
    categories: [...new Set(parts.map((p) => p.category))].length,
    // 비활성 부품: INACTIVE와 DISCONTINUED 상태
    inactiveParts: parts.filter((p) => p.status === 'INACTIVE' || p.status === 'DISCONTINUED').length,
  };
}
