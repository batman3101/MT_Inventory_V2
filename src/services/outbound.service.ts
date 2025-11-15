// @ts-nocheck
/**
 * Outbound (출고) 서비스
 *
 * ⚠️ 실제 Supabase 데이터베이스에서 출고 데이터를 조회/관리합니다.
 */

import { supabase } from '@/lib/supabase.ts';
import type { Outbound, OutboundDetail, InsertDto, UpdateDto } from '../types/database.types';
import dayjs from 'dayjs';

/**
 * 참조번호 자동 생성 (형식: OUT-YYYYMMDD-XXX)
 */
export async function generateOutboundReferenceNumber(date?: string): Promise<string> {
  const targetDate = date || dayjs().format('YYYY-MM-DD');
  const dateStr = dayjs(targetDate).format('YYYYMMDD');

  // 해당 날짜의 모든 출고 내역 조회
  const { data, error } = await supabase
    .from('outbound')
    .select('reference_number')
    .like('reference_number', `OUT-${dateStr}%`)
    .order('reference_number', { ascending: false })
    .limit(1);

  if (error) {
    console.error('참조번호 생성 에러:', error);
    throw new Error(error.message);
  }

  // 카운터 계산
  let counter = 1;
  if (data && data.length > 0 && data[0].reference_number) {
    const lastRef = data[0].reference_number;
    const lastCounter = parseInt(lastRef.split('-')[2] || '0');
    counter = lastCounter + 1;
  }

  // 3자리 숫자로 포맷
  const counterStr = counter.toString().padStart(3, '0');
  return `OUT-${dateStr}-${counterStr}`;
}

/**
 * 모든 출고 내역 조회
 */
export async function getAllOutbound(): Promise<Outbound[]> {
  const { data, error } = await supabase
    .from('outbound')
    .select('*')
    .order('outbound_date', { ascending: false });

  if (error) {
    console.error('출고 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 출고 ID로 조회
 */
export async function getOutboundById(outboundId: string): Promise<OutboundDetail | null> {
  const { data, error } = await supabase
    .from('outbound')
    .select(`
      *,
      part:parts(*)
    `)
    .eq('outbound_id', outboundId)
    .single();

  if (error) {
    console.error('출고 조회 에러:', error);
    throw new Error(error.message);
  }

  return data as OutboundDetail;
}

/**
 * 날짜 범위별 출고 조회
 */
export async function getOutboundByDateRange(
  startDate: string,
  endDate: string
): Promise<Outbound[]> {
  const { data, error } = await supabase
    .from('outbound')
    .select('*')
    .gte('outbound_date', startDate)
    .lte('outbound_date', endDate)
    .order('outbound_date', { ascending: false });

  if (error) {
    console.error('출고 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 부품별 출고 내역 조회
 */
export async function getOutboundByPartId(partId: string): Promise<Outbound[]> {
  const { data, error } = await supabase
    .from('outbound')
    .select('*')
    .eq('part_id', partId)
    .order('outbound_date', { ascending: false });

  if (error) {
    console.error('출고 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 부서별 출고 내역 조회
 */
export async function getOutboundByDepartmentId(departmentId: string): Promise<Outbound[]> {
  const { data, error } = await supabase
    .from('outbound')
    .select('*')
    .eq('department_id', departmentId)
    .order('outbound_date', { ascending: false });

  if (error) {
    console.error('출고 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 요청자별 출고 내역 조회
 */
export async function getOutboundByRequester(requester: string): Promise<Outbound[]> {
  const { data, error } = await supabase
    .from('outbound')
    .select('*')
    .eq('requester', requester)
    .order('outbound_date', { ascending: false });

  if (error) {
    console.error('출고 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 설비별 출고 내역 조회
 */
export async function getOutboundByEquipment(equipment: string): Promise<Outbound[]> {
  const { data, error } = await supabase
    .from('outbound')
    .select('*')
    .eq('equipment', equipment)
    .order('outbound_date', { ascending: false });

  if (error) {
    console.error('출고 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 출고 추가
 */
export async function createOutbound(
  outbound: InsertDto<'outbound'>
): Promise<Outbound> {
  const { data, error } = await supabase
    .from('outbound')
    .insert(outbound as Database["public"]["Tables"]["outbound"]["Insert"])
    .select()
    .single();

  if (error) {
    console.error('출고 추가 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 출고 수정
 */
export async function updateOutbound(
  outboundId: string,
  updates: UpdateDto<'outbound'>
): Promise<Outbound> {
  const { data, error } = await supabase
    .from('outbound')
    .update(updates as any)
    .eq('outbound_id', outboundId)
    .select()
    .single();

  if (error) {
    console.error('출고 수정 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 출고 삭제
 */
export async function deleteOutbound(outboundId: string): Promise<void> {
  const { error } = await supabase
    .from('outbound')
    .delete()
    .eq('outbound_id', outboundId);

  if (error) {
    console.error('출고 삭제 에러:', error);
    throw new Error(error.message);
  }
}

/**
 * 출고 통계
 */
export async function getOutboundStats(startDate?: string, endDate?: string) {
  let query = supabase.from('outbound').select('*');

  if (startDate) {
    query = query.gte('outbound_date', startDate);
  }

  if (endDate) {
    query = query.lte('outbound_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('출고 통계 조회 에러:', error);
    throw new Error(error.message);
  }

  return {
    totalCount: data.length,
    totalQuantity: data.reduce((sum, item) => sum + item.quantity, 0),
    byDepartment: data.reduce((acc, item) => {
      const dept = item.department_name || '미분류';
      acc[dept] = (acc[dept] || 0) + item.quantity;
      return acc;
    }, {} as Record<string, number>),
    byReason: data.reduce((acc, item) => {
      const reason = item.reason || '미분류';
      acc[reason] = (acc[reason] || 0) + item.quantity;
      return acc;
    }, {} as Record<string, number>),
  };
}

/**
 * 최근 출고 내역 조회
 */
export async function getRecentOutbound(limit: number = 10): Promise<Outbound[]> {
  const { data, error } = await supabase
    .from('outbound')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('최근 출고 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}
