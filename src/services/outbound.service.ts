/**
 * Outbound (출고) 서비스
 *
 * ⚠️ 실제 Supabase 데이터베이스에서 출고 데이터를 조회/관리합니다.
 * ⚠️ 출고 추가/수정/삭제 시 재고(inventory)도 자동으로 조정됩니다.
 */

import { supabase } from '@/lib/supabase.ts';
import type { Outbound, OutboundDetail, InsertDto, UpdateDto, Database } from '../types/database.types';
import { getInventoryByPartId, getInventoryByPartIdAndFactory, updateInventory } from './inventory.service';
import { createErrorCode } from '../utils/errorTranslation';
import dayjs from 'dayjs';
import { getFactoryId, getFactoryCode } from './factoryContext';

/**
 * 재고 수량 조정 (내부 헬퍼 함수)
 * @param partId 부품 ID
 * @param quantityChange 수량 변화량 (양수: 증가, 음수: 감소)
 */
async function adjustInventoryQuantity(partId: string, quantityChange: number): Promise<void> {
  // 현재 재고 조회 (현재 공장의 재고)
  const factoryId = getFactoryId();
  const inventory = await getInventoryByPartIdAndFactory(partId, factoryId);

  if (!inventory) {
    // 출고의 경우 재고가 없으면 에러 - 먼저 입고 처리 필요
    throw new Error(createErrorCode('INVENTORY_NOT_FOUND'));
  }

  // 재고 수량 계산
  const newQuantity = inventory.current_quantity + quantityChange;

  if (newQuantity < 0) {
    throw new Error(createErrorCode('INSUFFICIENT_STOCK', {
      current: inventory.current_quantity,
      required: Math.abs(quantityChange),
    }));
  }

  // 재고 업데이트
  await updateInventory(inventory.inventory_id, {
    current_quantity: newQuantity,
  });
}

// Supabase JOIN 응답 타입
interface OutboundWithRelations {
  parts?: { part_code: string; part_name: string; unit: string };
  departments?: { department_name: string };
  [key: string]: unknown;
}

interface OutboundAmountRow {
  outbound_date: string;
  quantity: number;
  part_id: string;
}

interface InboundPriceRow {
  part_id: string;
  unit_price: number;
}

/**
 * 참조번호 자동 생성 (형식: OUT-{FACTORY_CODE}-YYYYMMDD-XXX)
 */
export async function generateOutboundReferenceNumber(date?: string): Promise<string> {
  const targetDate = date || dayjs().format('YYYY-MM-DD');
  const dateStr = dayjs(targetDate).format('YYYYMMDD');
  const factoryId = getFactoryId();
  const factoryCode = getFactoryCode();

  // 해당 날짜와 공장의 모든 출고 내역 조회
  const { data, error } = await supabase
    .from('outbound')
    .select('reference_number')
    .eq('factory_id', factoryId)
    .like('reference_number', `OUT-${factoryCode}-${dateStr}%`)
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
    const lastCounter = parseInt(lastRef.split('-')[3] || '0');
    counter = lastCounter + 1;
  }

  // 3자리 숫자로 포맷
  const counterStr = counter.toString().padStart(3, '0');
  return `OUT-${factoryCode}-${dateStr}-${counterStr}`;
}

/**
 * 모든 출고 내역 조회 (현재 공장의 출고만)
 */
export async function getAllOutbound(): Promise<Outbound[]> {
  const factoryId = getFactoryId();
  const { data, error} = await supabase
    .from('outbound')
    .select(`
      *,
      parts!inner(part_code, part_name, unit)
    `)
    .eq('factory_id', factoryId)
    .order('outbound_date', { ascending: false });

  if (error) {
    console.error('출고 조회 에러:', error);
    throw new Error(error.message);
  }

  // JOIN된 데이터를 평탄화
  return (data as OutboundWithRelations[]).map((item) => ({
    ...item,
    part_code: item.parts?.part_code || '',
    part_name: item.parts?.part_name || '',
    part_unit: item.parts?.unit || '',
    department_name: (item.department as string) || '',
    parts: undefined,
  })) as Outbound[];
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
 * 날짜 범위별 출고 조회 (현재 공장의 출고만)
 */
export async function getOutboundByDateRange(
  startDate: string,
  endDate: string
): Promise<Outbound[]> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('outbound')
    .select(`
      *,
      parts!inner(part_code, part_name, unit)
    `)
    .eq('factory_id', factoryId)
    .gte('outbound_date', startDate)
    .lte('outbound_date', endDate)
    .order('outbound_date', { ascending: false});

  if (error) {
    console.error('출고 조회 에러:', error);
    throw new Error(error.message);
  }

  // JOIN된 데이터를 평탄화
  return (data as OutboundWithRelations[]).map((item) => ({
    ...item,
    part_code: item.parts?.part_code || '',
    part_name: item.parts?.part_name || '',
    part_unit: item.parts?.unit || '',
    department_name: (item.department as string) || '',
    parts: undefined,
  })) as Outbound[];
}

/**
 * 부품별 출고 내역 조회 (현재 공장의 출고만)
 */
export async function getOutboundByPartId(partId: string): Promise<Outbound[]> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('outbound')
    .select(`
      *,
      parts!inner(part_code, part_name, unit)
    `)
    .eq('factory_id', factoryId)
    .eq('part_id', partId)
    .order('outbound_date', { ascending: false });

  if (error) {
    console.error('출고 조회 에러:', error);
    throw new Error(error.message);
  }

  // JOIN된 데이터를 평탄화
  return (data as OutboundWithRelations[]).map((item) => ({
    ...item,
    part_code: item.parts?.part_code || '',
    part_name: item.parts?.part_name || '',
    part_unit: item.parts?.unit || '',
    department_name: (item.department as string) || '',
    parts: undefined,
  })) as Outbound[];
}

/**
 * 부서별 출고 내역 조회 (현재 공장의 출고만)
 */
export async function getOutboundByDepartmentId(departmentId: string): Promise<Outbound[]> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('outbound')
    .select(`
      *,
      parts!inner(part_code, part_name, unit)
    `)
    .eq('factory_id', factoryId)
    .eq('department_id', departmentId)
    .order('outbound_date', { ascending: false });

  if (error) {
    console.error('출고 조회 에러:', error);
    throw new Error(error.message);
  }

  // JOIN된 데이터를 평탄화
  return (data as OutboundWithRelations[]).map((item) => ({
    ...item,
    part_code: item.parts?.part_code || '',
    part_name: item.parts?.part_name || '',
    part_unit: item.parts?.unit || '',
    department_name: (item.department as string) || '',
    parts: undefined,
  })) as Outbound[];
}

/**
 * 요청자별 출고 내역 조회 (현재 공장의 출고만)
 */
export async function getOutboundByRequester(requester: string): Promise<Outbound[]> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('outbound')
    .select(`
      *,
      parts!inner(part_code, part_name, unit)
    `)
    .eq('factory_id', factoryId)
    .eq('requester', requester)
    .order('outbound_date', { ascending: false });

  if (error) {
    console.error('출고 조회 에러:', error);
    throw new Error(error.message);
  }

  // JOIN된 데이터를 평탄화
  return (data as OutboundWithRelations[]).map((item) => ({
    ...item,
    part_code: item.parts?.part_code || '',
    part_name: item.parts?.part_name || '',
    part_unit: item.parts?.unit || '',
    department_name: (item.department as string) || '',
    parts: undefined,
  })) as Outbound[];
}

/**
 * 설비별 출고 내역 조회 (현재 공장의 출고만)
 */
export async function getOutboundByEquipment(equipment: string): Promise<Outbound[]> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('outbound')
    .select(`
      *,
      parts!inner(part_code, part_name, unit)
    `)
    .eq('factory_id', factoryId)
    .eq('equipment', equipment)
    .order('outbound_date', { ascending: false });

  if (error) {
    console.error('출고 조회 에러:', error);
    throw new Error(error.message);
  }

  // JOIN된 데이터를 평탄화
  return (data as OutboundWithRelations[]).map((item) => ({
    ...item,
    part_code: item.parts?.part_code || '',
    part_name: item.parts?.part_name || '',
    part_unit: item.parts?.unit || '',
    department_name: (item.department as string) || '',
    parts: undefined,
  })) as Outbound[];
}

/**
 * 출고 추가
 * ⚠️ 출고 시 재고에서 해당 수량을 차감합니다.
 */
export async function createOutbound(
  outbound: InsertDto<'outbound'>
): Promise<Outbound> {
  // 1. 출고 레코드 생성 (factory_id 추가)
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('outbound')
    .insert({ ...outbound, factory_id: factoryId } as Database["public"]["Tables"]["outbound"]["Insert"])
    .select()
    .single();

  if (error || !data) {
    console.error('출고 추가 에러:', error);
    throw new Error(error?.message || '출고 추가 실패');
  }

  const outboundData = data as Outbound;

  // 2. 재고에서 출고 수량 차감
  try {
    await adjustInventoryQuantity(outbound.part_id, -outbound.quantity);
  } catch (inventoryError) {
    // 재고 차감 실패 시 출고 레코드 삭제 (롤백)
    await supabase.from('outbound').delete().eq('outbound_id', outboundData.outbound_id);
    throw inventoryError;
  }

  return outboundData;
}

/**
 * 출고 수정
 * ⚠️ 수량 변경 시 재고도 함께 조정됩니다.
 */
export async function updateOutbound(
  outboundId: string,
  updates: UpdateDto<'outbound'>
): Promise<Outbound> {
  // 1. 기존 출고 정보 조회 (수량 비교를 위해)
  const { data: existingData, error: fetchError } = await supabase
    .from('outbound')
    .select('part_id, quantity')
    .eq('outbound_id', outboundId)
    .single();

  if (fetchError || !existingData) {
    console.error('기존 출고 조회 에러:', fetchError);
    throw new Error(fetchError?.message || '기존 출고 정보를 찾을 수 없습니다.');
  }

  const existingOutbound = existingData as { part_id: string; quantity: number };

  // 2. 출고 레코드 수정
  const { data, error } = await supabase
    .from('outbound')
    .update(updates as Database["public"]["Tables"]["outbound"]["Update"])
    .eq('outbound_id', outboundId)
    .select()
    .single();

  if (error || !data) {
    console.error('출고 수정 에러:', error);
    throw new Error(error?.message || '출고 수정 실패');
  }

  // 3. 수량이 변경된 경우 재고 조정
  if (updates.quantity !== undefined && updates.quantity !== existingOutbound.quantity) {
    const quantityDiff = existingOutbound.quantity - updates.quantity;
    // 출고 수량이 줄었으면 재고 증가, 늘었으면 재고 감소
    const partId = updates.part_id || existingOutbound.part_id;
    await adjustInventoryQuantity(partId, quantityDiff);
  }

  return data as Outbound;
}

/**
 * 출고 삭제
 * ⚠️ 삭제 시 출고했던 수량만큼 재고가 복원됩니다.
 */
export async function deleteOutbound(outboundId: string): Promise<void> {
  // 1. 삭제할 출고 정보 조회 (재고 복원을 위해)
  const { data: outboundData, error: fetchError } = await supabase
    .from('outbound')
    .select('part_id, quantity')
    .eq('outbound_id', outboundId)
    .single();

  if (fetchError || !outboundData) {
    console.error('출고 조회 에러:', fetchError);
    throw new Error(fetchError?.message || '삭제할 출고 정보를 찾을 수 없습니다.');
  }

  const outbound = outboundData as { part_id: string; quantity: number };

  // 2. 출고 레코드 삭제
  const { error } = await supabase
    .from('outbound')
    .delete()
    .eq('outbound_id', outboundId);

  if (error) {
    console.error('출고 삭제 에러:', error);
    throw new Error(error.message);
  }

  // 3. 재고 복원 (출고했던 수량만큼 재고 증가)
  await adjustInventoryQuantity(outbound.part_id, outbound.quantity);
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
 * 최근 출고 내역 조회 (현재 공장의 출고만)
 */
export async function getRecentOutbound(limit: number = 10): Promise<Outbound[]> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('outbound')
    .select(`
      *,
      parts!inner(part_code, part_name, unit)
    `)
    .eq('factory_id', factoryId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('최근 출고 조회 에러:', error);
    throw new Error(error.message);
  }

  // JOIN된 데이터를 평탄화
  return (data as OutboundWithRelations[]).map((item) => ({
    ...item,
    part_code: item.parts?.part_code || '',
    part_name: item.parts?.part_name || '',
    part_unit: item.parts?.unit || '',
    department_name: (item.department as string) || '',
    parts: undefined,
  })) as Outbound[];
}

/**
 * 최근 7일의 출고 금액을 날짜별로 집계 (현재 공장의 출고만)
 * (inbound 테이블의 최근 단가를 사용하여 계산)
 */
export async function getLast7DaysOutboundAmount(): Promise<{ date: string; amount: number }[]> {
  const endDate = dayjs();
  const startDate = endDate.subtract(6, 'day');
  const factoryId = getFactoryId();

  // 먼저 출고 데이터를 가져옴
  const { data: outboundData, error: outboundError } = await supabase
    .from('outbound')
    .select('outbound_date, quantity, part_id')
    .eq('factory_id', factoryId)
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

  // 단가 조회: part_prices 우선, inbound fallback
  const { data: partPricesData } = await supabase
    .from('part_prices')
    .select('part_id, unit_price')
    .order('effective_from', { ascending: false });

  const priceMap = new Map<string, number>();
  (partPricesData || []).forEach((pp: { part_id: string; unit_price: number }) => {
    if (!priceMap.has(pp.part_id)) {
      priceMap.set(pp.part_id, pp.unit_price);
    }
  });

  // Fallback: part_prices에 없는 부품은 inbound에서 조회
  const missingPartIds = [...new Set(
    (outboundData as OutboundAmountRow[])
      .map(o => o.part_id)
      .filter(id => !priceMap.has(id))
  )];

  if (missingPartIds.length > 0) {
    const priceStartDate = endDate.subtract(30, 'day');
    const { data: recentInbounds } = await supabase
      .from('inbound')
      .select('part_id, unit_price, inbound_date')
      .in('part_id', missingPartIds)
      .gte('inbound_date', priceStartDate.format('YYYY-MM-DD'))
      .order('inbound_date', { ascending: false });

    const typedRecentInbounds = recentInbounds as InboundPriceRow[] | null;
    missingPartIds.forEach(partId => {
      const partInbound = typedRecentInbounds?.find(ib => ib.part_id === partId);
      if (partInbound) {
        priceMap.set(partId, partInbound.unit_price);
      }
    });
  }

  // 날짜별로 금액 집계
  const amountByDate = new Map<string, number>();

  // 7일 전부터 오늘까지 모든 날짜를 0으로 초기화
  for (let i = 0; i < 7; i++) {
    const date = startDate.add(i, 'day').format('YYYY-MM-DD');
    amountByDate.set(date, 0);
  }

  // 실제 데이터로 금액 업데이트
  (outboundData as OutboundAmountRow[]).forEach((item) => {
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

/**
 * 기간별 출고 금액 집계 (최근 입고 단가 기반) (현재 공장의 출고만)
 */
export async function getOutboundAmountByPeriod(
  startDate: string,
  endDate: string
): Promise<{ date: string; amount: number }[]> {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const factoryId = getFactoryId();

  // 먼저 출고 데이터를 가져옴
  const { data: outboundData, error: outboundError } = await supabase
    .from('outbound')
    .select('outbound_date, quantity, part_id')
    .eq('factory_id', factoryId)
    .gte('outbound_date', start.format('YYYY-MM-DD'))
    .lte('outbound_date', end.format('YYYY-MM-DD'));

  if (outboundError) {
    console.error('출고 데이터 조회 에러:', outboundError);
    throw new Error(outboundError.message);
  }

  const days = end.diff(start, 'day') + 1;

  if (!outboundData || outboundData.length === 0) {
    // 데이터가 없으면 빈 배열 반환
    const emptyData = [];
    for (let i = 0; i < days; i++) {
      const date = start.add(i, 'day').format('YYYY-MM-DD');
      emptyData.push({ date, amount: 0 });
    }
    return emptyData;
  }

  // 단가 조회: part_prices 우선, inbound fallback
  const { data: partPricesData } = await supabase
    .from('part_prices')
    .select('part_id, unit_price')
    .order('effective_from', { ascending: false });

  const priceMap = new Map<string, number>();
  (partPricesData || []).forEach((pp: { part_id: string; unit_price: number }) => {
    if (!priceMap.has(pp.part_id)) {
      priceMap.set(pp.part_id, pp.unit_price);
    }
  });

  // Fallback: part_prices에 없는 부품은 inbound에서 조회
  const missingPartIds = [...new Set(
    (outboundData as OutboundAmountRow[])
      .map(o => o.part_id)
      .filter(id => !priceMap.has(id))
  )];

  if (missingPartIds.length > 0) {
    const priceStartDate = end.subtract(30, 'day');
    const { data: recentInbounds } = await supabase
      .from('inbound')
      .select('part_id, unit_price, inbound_date')
      .in('part_id', missingPartIds)
      .gte('inbound_date', priceStartDate.format('YYYY-MM-DD'))
      .order('inbound_date', { ascending: false });

    const typedRecentInbounds = recentInbounds as InboundPriceRow[] | null;
    missingPartIds.forEach(partId => {
      const partInbound = typedRecentInbounds?.find(ib => ib.part_id === partId);
      if (partInbound) {
        priceMap.set(partId, partInbound.unit_price);
      }
    });
  }

  // 날짜별로 금액 집계
  const amountByDate = new Map<string, number>();

  // 선택한 기간의 모든 날짜를 0으로 초기화
  for (let i = 0; i < days; i++) {
    const date = start.add(i, 'day').format('YYYY-MM-DD');
    amountByDate.set(date, 0);
  }

  // 실제 데이터로 금액 업데이트
  (outboundData as OutboundAmountRow[]).forEach((item) => {
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
