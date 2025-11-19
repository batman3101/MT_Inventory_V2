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
  const { data, error} = await supabase
    .from('outbound')
    .select(`
      *,
      parts!inner(part_code, part_name, unit)
    `)
    .order('outbound_date', { ascending: false });

  if (error) {
    console.error('출고 조회 에러:', error);
    throw new Error(error.message);
  }

  // JOIN된 데이터를 평탄화
  return data.map((item: any) => ({
    ...item,
    part_code: item.parts?.part_code || '',
    part_name: item.parts?.part_name || '',
    part_unit: item.parts?.unit || '',
    department_name: item.department || '',
    parts: undefined,
  }));
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
    .select(`
      *,
      parts!inner(part_code, part_name, unit)
    `)
    .gte('outbound_date', startDate)
    .lte('outbound_date', endDate)
    .order('outbound_date', { ascending: false});

  if (error) {
    console.error('출고 조회 에러:', error);
    throw new Error(error.message);
  }

  // JOIN된 데이터를 평탄화
  return data.map((item: any) => ({
    ...item,
    part_code: item.parts?.part_code || '',
    part_name: item.parts?.part_name || '',
    part_unit: item.parts?.unit || '',
    department_name: item.department || '',
    parts: undefined,
  }));
}

/**
 * 부품별 출고 내역 조회
 */
export async function getOutboundByPartId(partId: string): Promise<Outbound[]> {
  const { data, error } = await supabase
    .from('outbound')
    .select(`
      *,
      parts!inner(part_code, part_name, unit)
    `)
    .eq('part_id', partId)
    .order('outbound_date', { ascending: false });

  if (error) {
    console.error('출고 조회 에러:', error);
    throw new Error(error.message);
  }

  // JOIN된 데이터를 평탄화
  return data.map((item: any) => ({
    ...item,
    part_code: item.parts?.part_code || '',
    part_name: item.parts?.part_name || '',
    part_unit: item.parts?.unit || '',
    department_name: item.department || '',
    parts: undefined,
  }));
}

/**
 * 부서별 출고 내역 조회
 */
export async function getOutboundByDepartmentId(departmentId: string): Promise<Outbound[]> {
  const { data, error } = await supabase
    .from('outbound')
    .select(`
      *,
      parts!inner(part_code, part_name, unit)
    `)
    .eq('department_id', departmentId)
    .order('outbound_date', { ascending: false });

  if (error) {
    console.error('출고 조회 에러:', error);
    throw new Error(error.message);
  }

  // JOIN된 데이터를 평탄화
  return data.map((item: any) => ({
    ...item,
    part_code: item.parts?.part_code || '',
    part_name: item.parts?.part_name || '',
    part_unit: item.parts?.unit || '',
    department_name: item.department || '',
    parts: undefined,
  }));
}

/**
 * 요청자별 출고 내역 조회
 */
export async function getOutboundByRequester(requester: string): Promise<Outbound[]> {
  const { data, error } = await supabase
    .from('outbound')
    .select(`
      *,
      parts!inner(part_code, part_name, unit)
    `)
    .eq('requester', requester)
    .order('outbound_date', { ascending: false });

  if (error) {
    console.error('출고 조회 에러:', error);
    throw new Error(error.message);
  }

  // JOIN된 데이터를 평탄화
  return data.map((item: any) => ({
    ...item,
    part_code: item.parts?.part_code || '',
    part_name: item.parts?.part_name || '',
    part_unit: item.parts?.unit || '',
    department_name: item.department || '',
    parts: undefined,
  }));
}

/**
 * 설비별 출고 내역 조회
 */
export async function getOutboundByEquipment(equipment: string): Promise<Outbound[]> {
  const { data, error } = await supabase
    .from('outbound')
    .select(`
      *,
      parts!inner(part_code, part_name, unit)
    `)
    .eq('equipment', equipment)
    .order('outbound_date', { ascending: false });

  if (error) {
    console.error('출고 조회 에러:', error);
    throw new Error(error.message);
  }

  // JOIN된 데이터를 평탄화
  return data.map((item: any) => ({
    ...item,
    part_code: item.parts?.part_code || '',
    part_name: item.parts?.part_name || '',
    part_unit: item.parts?.unit || '',
    department_name: item.department || '',
    parts: undefined,
  }));
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
    .select(`
      *,
      parts!inner(part_code, part_name, unit)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('최근 출고 조회 에러:', error);
    throw new Error(error.message);
  }

  // JOIN된 데이터를 평탄화
  return data.map((item: any) => ({
    ...item,
    part_code: item.parts?.part_code || '',
    part_name: item.parts?.part_name || '',
    part_unit: item.parts?.unit || '',
    department_name: item.department || '',
    parts: undefined,
  }));
}

/**
 * 최근 7일의 출고 금액을 날짜별로 집계
 * (inbound 테이블의 최근 단가를 사용하여 계산)
 */
export async function getLast7DaysOutboundAmount(): Promise<{ date: string; amount: number }[]> {
  const endDate = dayjs();
  const startDate = endDate.subtract(6, 'day');

  // 먼저 출고 데이터를 가져옴
  const { data: outboundData, error: outboundError } = await supabase
    .from('outbound')
    .select('outbound_date, quantity, part_id')
    .gte('outbound_date', startDate.format('YYYY-MM-DD'))
    .lte('outbound_date', endDate.format('YYYY-MM-DD'));

  if (outboundError) {
    console.error('출고 데이터 조회 에러:', outboundError);
    throw new Error(outboundError.message);
  }

  if (!outboundData || outboundData.length === 0) {
    // 데이터가 없으면 빈 배열 반환
    const emptyData = [];
    for (let i = 0; i < 7; i++) {
      const date = startDate.add(i, 'day').format('YYYY-MM-DD');
      emptyData.push({ date, amount: 0 });
    }
    return emptyData;
  }

  // 최근 30일의 입고 데이터를 모두 가져와서 부품별 최근 단가를 계산
  const priceStartDate = endDate.subtract(30, 'day');
  const { data: recentInbounds } = await supabase
    .from('inbound')
    .select('part_id, unit_price, inbound_date')
    .gte('inbound_date', priceStartDate.format('YYYY-MM-DD'))
    .order('inbound_date', { ascending: false });

  // 부품별로 가장 최근 단가를 찾아서 Map에 저장
  const priceMap = new Map<string, number>();

  outboundData.forEach(outbound => {
    if (!priceMap.has(outbound.part_id)) {
      // 이 부품의 최근 입고 단가 찾기
      const partInbound = recentInbounds?.find(ib => ib.part_id === outbound.part_id);
      if (partInbound) {
        priceMap.set(outbound.part_id, partInbound.unit_price || 0);
      } else {
        priceMap.set(outbound.part_id, 0);
      }
    }
  });

  // 날짜별로 금액 집계
  const amountByDate = new Map<string, number>();

  // 7일 전부터 오늘까지 모든 날짜를 0으로 초기화
  for (let i = 0; i < 7; i++) {
    const date = startDate.add(i, 'day').format('YYYY-MM-DD');
    amountByDate.set(date, 0);
  }

  // 실제 데이터로 금액 업데이트
  outboundData.forEach((item: any) => {
    const date = item.outbound_date;
    const unitPrice = priceMap.get(item.part_id) || 0;
    const amount = item.quantity * unitPrice;
    const currentAmount = amountByDate.get(date) || 0;
    amountByDate.set(date, currentAmount + amount);
  });

  // Map을 배열로 변환
  return Array.from(amountByDate.entries()).map(([date, amount]) => ({
    date,
    amount
  }));
}
