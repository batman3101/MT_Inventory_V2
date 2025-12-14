/**
 * Inbound (입고) 서비스
 *
 * ⚠️ 실제 Supabase 데이터베이스에서 입고 데이터를 조회/관리합니다.
 * ⚠️ 입고 추가/수정/삭제 시 재고(inventory)도 자동으로 조정됩니다.
 */

import { supabase } from '@/lib/supabase.ts';
import type { Inbound, InboundDetail, InsertDto, UpdateDto, Database } from '../types/database.types';
import { getInventoryByPartId, updateInventory, createInventory } from './inventory.service';
import { createErrorCode } from '../utils/errorTranslation';
import dayjs from 'dayjs';

/**
 * 재고 수량 조정 (내부 헬퍼 함수)
 * @param partId 부품 ID
 * @param quantityChange 수량 변화량 (양수: 증가, 음수: 감소)
 * @param createdBy 생성자 (재고 레코드 생성 시 필요)
 */
async function adjustInventoryQuantity(partId: string, quantityChange: number, createdBy: string = 'system'): Promise<void> {
  // 현재 재고 조회
  const inventory = await getInventoryByPartId(partId);

  if (!inventory) {
    // 재고 레코드가 없으면 새로 생성
    if (quantityChange < 0) {
      throw new Error(createErrorCode('INVENTORY_NOT_FOUND_FOR_INBOUND'));
    }

    // 새 재고 레코드 생성
    await createInventory({
      part_id: partId,
      current_quantity: quantityChange,
      location: 'main',
      updated_by: createdBy,
    });
    return;
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
interface InboundWithRelations {
  parts?: { part_code: string; part_name: string; unit: string };
  suppliers?: { supplier_name: string };
  [key: string]: unknown;
}

interface InboundAmountRow {
  inbound_date: string;
  total_price: number;
}

/**
 * 참조번호 자동 생성 (형식: IN-YYYYMMDD-XXX)
 */
export async function generateInboundReferenceNumber(date?: string): Promise<string> {
  const targetDate = date || dayjs().format('YYYY-MM-DD');
  const dateStr = dayjs(targetDate).format('YYYYMMDD');

  // 해당 날짜의 모든 입고 내역 조회
  const { data, error } = await supabase
    .from('inbound')
    .select('reference_number')
    .like('reference_number', `IN-${dateStr}%`)
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
  return `IN-${dateStr}-${counterStr}`;
}

/**
 * 모든 입고 내역 조회
 */
export async function getAllInbound(): Promise<Inbound[]> {
  const { data, error } = await supabase
    .from('inbound')
    .select(`
      *,
      parts!inner(part_code, part_name, unit),
      suppliers!inner(supplier_name)
    `)
    .order('inbound_date', { ascending: false });

  if (error) {
    console.error('입고 조회 에러:', error);
    throw new Error(error.message);
  }

  // JOIN된 데이터를 평탄화
  return (data as InboundWithRelations[]).map((item) => ({
    ...item,
    part_code: item.parts?.part_code || '',
    part_name: item.parts?.part_name || '',
    part_unit: item.parts?.unit || '',
    supplier_name: item.suppliers?.supplier_name || '',
    parts: undefined,
    suppliers: undefined,
  })) as Inbound[];
}

/**
 * 입고 ID로 조회
 */
export async function getInboundById(inboundId: string): Promise<InboundDetail | null> {
  const { data, error } = await supabase
    .from('inbound')
    .select(`
      *,
      part:parts(*),
      supplier:suppliers(*)
    `)
    .eq('inbound_id', inboundId)
    .single();

  if (error) {
    console.error('입고 조회 에러:', error);
    throw new Error(error.message);
  }

  return data as InboundDetail;
}

/**
 * 날짜 범위별 입고 조회
 */
export async function getInboundByDateRange(
  startDate: string,
  endDate: string
): Promise<Inbound[]> {
  const { data, error } = await supabase
    .from('inbound')
    .select(`
      *,
      parts!inner(part_code, part_name, unit),
      suppliers!inner(supplier_name)
    `)
    .gte('inbound_date', startDate)
    .lte('inbound_date', endDate)
    .order('inbound_date', { ascending: false });

  if (error) {
    console.error('입고 조회 에러:', error);
    throw new Error(error.message);
  }

  // JOIN된 데이터를 평탄화
  return (data as InboundWithRelations[]).map((item) => ({
    ...item,
    part_code: item.parts?.part_code || '',
    part_name: item.parts?.part_name || '',
    part_unit: item.parts?.unit || '',
    supplier_name: item.suppliers?.supplier_name || '',
    parts: undefined,
    suppliers: undefined,
  })) as Inbound[];
}

/**
 * 부품별 입고 내역 조회
 */
export async function getInboundByPartId(partId: string): Promise<Inbound[]> {
  const { data, error } = await supabase
    .from('inbound')
    .select(`
      *,
      parts!inner(part_code, part_name, unit),
      suppliers!inner(supplier_name)
    `)
    .eq('part_id', partId)
    .order('inbound_date', { ascending: false });

  if (error) {
    console.error('입고 조회 에러:', error);
    throw new Error(error.message);
  }

  // JOIN된 데이터를 평탄화
  return (data as InboundWithRelations[]).map((item) => ({
    ...item,
    part_code: item.parts?.part_code || '',
    part_name: item.parts?.part_name || '',
    part_unit: item.parts?.unit || '',
    supplier_name: item.suppliers?.supplier_name || '',
    parts: undefined,
    suppliers: undefined,
  })) as Inbound[];
}

/**
 * 공급업체별 입고 내역 조회
 */
export async function getInboundBySupplierId(supplierId: string): Promise<Inbound[]> {
  const { data, error } = await supabase
    .from('inbound')
    .select(`
      *,
      parts!inner(part_code, part_name, unit),
      suppliers!inner(supplier_name)
    `)
    .eq('supplier_id', supplierId)
    .order('inbound_date', { ascending: false});

  if (error) {
    console.error('입고 조회 에러:', error);
    throw new Error(error.message);
  }

  // JOIN된 데이터를 평탄화
  return (data as InboundWithRelations[]).map((item) => ({
    ...item,
    part_code: item.parts?.part_code || '',
    part_name: item.parts?.part_name || '',
    part_unit: item.parts?.unit || '',
    supplier_name: item.suppliers?.supplier_name || '',
    parts: undefined,
    suppliers: undefined,
  })) as Inbound[];
}

/**
 * 입고 추가
 * ⚠️ 입고 시 재고에 해당 수량을 추가합니다.
 */
export async function createInbound(
  inbound: InsertDto<'inbound'>
): Promise<Inbound> {
  // 1. 입고 레코드 생성
  const { data, error } = await supabase
    .from('inbound')
    .insert(inbound as Database["public"]["Tables"]["inbound"]["Insert"])
    .select()
    .single();

  if (error || !data) {
    console.error('입고 추가 에러:', error);
    throw new Error(error?.message || '입고 추가 실패');
  }

  const inboundData = data as Inbound;

  // 2. 재고에 입고 수량 추가 (재고 레코드가 없으면 자동 생성)
  try {
    await adjustInventoryQuantity(inbound.part_id, inbound.quantity, inbound.created_by || 'system');
  } catch (inventoryError) {
    // 재고 추가 실패 시 입고 레코드 삭제 (롤백)
    await supabase.from('inbound').delete().eq('inbound_id', inboundData.inbound_id);
    throw inventoryError;
  }

  return inboundData;
}

/**
 * 입고 수정
 * ⚠️ 수량 변경 시 재고도 함께 조정됩니다.
 */
export async function updateInbound(
  inboundId: string,
  updates: UpdateDto<'inbound'>
): Promise<Inbound> {
  // 1. 기존 입고 정보 조회 (수량 비교를 위해)
  const { data: existingData, error: fetchError } = await supabase
    .from('inbound')
    .select('part_id, quantity')
    .eq('inbound_id', inboundId)
    .single();

  if (fetchError || !existingData) {
    console.error('기존 입고 조회 에러:', fetchError);
    throw new Error(fetchError?.message || '기존 입고 정보를 찾을 수 없습니다.');
  }

  const existingInbound = existingData as { part_id: string; quantity: number };

  // 2. 입고 레코드 수정
  const { data, error } = await supabase
    .from('inbound')
    .update(updates as Database["public"]["Tables"]["inbound"]["Update"])
    .eq('inbound_id', inboundId)
    .select()
    .single();

  if (error || !data) {
    console.error('입고 수정 에러:', error);
    throw new Error(error?.message || '입고 수정 실패');
  }

  // 3. 수량이 변경된 경우 재고 조정
  if (updates.quantity !== undefined && updates.quantity !== existingInbound.quantity) {
    const quantityDiff = updates.quantity - existingInbound.quantity;
    // 입고 수량이 늘었으면 재고 증가, 줄었으면 재고 감소
    const partId = updates.part_id || existingInbound.part_id;
    await adjustInventoryQuantity(partId, quantityDiff);
  }

  return data as Inbound;
}

/**
 * 입고 삭제
 * ⚠️ 삭제 시 입고했던 수량만큼 재고가 감소됩니다.
 */
export async function deleteInbound(inboundId: string): Promise<void> {
  // 1. 삭제할 입고 정보 조회 (재고 차감을 위해)
  const { data: inboundData, error: fetchError } = await supabase
    .from('inbound')
    .select('part_id, quantity')
    .eq('inbound_id', inboundId)
    .single();

  if (fetchError || !inboundData) {
    console.error('입고 조회 에러:', fetchError);
    throw new Error(fetchError?.message || '삭제할 입고 정보를 찾을 수 없습니다.');
  }

  const inbound = inboundData as { part_id: string; quantity: number };

  // 2. 입고 레코드 삭제
  const { error } = await supabase
    .from('inbound')
    .delete()
    .eq('inbound_id', inboundId);

  if (error) {
    console.error('입고 삭제 에러:', error);
    throw new Error(error.message);
  }

  // 3. 재고 차감 (입고했던 수량만큼 재고 감소)
  await adjustInventoryQuantity(inbound.part_id, -inbound.quantity);
}

/**
 * 입고 통계
 */
export async function getInboundStats(startDate?: string, endDate?: string) {
  let query = supabase.from('inbound').select('*');

  if (startDate) {
    query = query.gte('inbound_date', startDate);
  }

  if (endDate) {
    query = query.lte('inbound_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('입고 통계 조회 에러:', error);
    throw new Error(error.message);
  }

  return {
    totalCount: data.length,
    totalQuantity: data.reduce((sum, item) => sum + item.quantity, 0),
    totalValue: data.reduce((sum, item) => sum + item.total_price, 0),
    averageUnitPrice: data.length > 0
      ? data.reduce((sum, item) => sum + item.unit_price, 0) / data.length
      : 0,
  };
}

/**
 * 최근 입고 내역 조회
 */
export async function getRecentInbound(limit: number = 10): Promise<Inbound[]> {
  const { data, error } = await supabase
    .from('inbound')
    .select(`
      *,
      parts!inner(part_code, part_name, unit),
      suppliers!inner(supplier_name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('최근 입고 조회 에러:', error);
    throw new Error(error.message);
  }

  // JOIN된 데이터를 평탄화
  return (data as InboundWithRelations[]).map((item) => ({
    ...item,
    part_code: item.parts?.part_code || '',
    part_name: item.parts?.part_name || '',
    part_unit: item.parts?.unit || '',
    supplier_name: item.suppliers?.supplier_name || '',
    parts: undefined,
    suppliers: undefined,
  })) as Inbound[];
}

/**
 * 최근 7일의 입고 금액을 날짜별로 집계
 */
export async function getLast7DaysInboundAmount(): Promise<{ date: string; amount: number }[]> {
  const endDate = dayjs();
  const startDate = endDate.subtract(6, 'day');

  const { data, error } = await supabase
    .from('inbound')
    .select('inbound_date, total_price')
    .gte('inbound_date', startDate.format('YYYY-MM-DD'))
    .lte('inbound_date', endDate.format('YYYY-MM-DD'))
    .order('inbound_date', { ascending: true });

  if (error) {
    console.error('입고 금액 집계 에러:', error);
    throw new Error(error.message);
  }

  // 날짜별로 금액 집계
  const amountByDate = new Map<string, number>();

  // 7일 전부터 오늘까지 모든 날짜를 0으로 초기화
  for (let i = 0; i < 7; i++) {
    const date = startDate.add(i, 'day').format('YYYY-MM-DD');
    amountByDate.set(date, 0);
  }

  // 실제 데이터로 금액 업데이트
  (data as InboundAmountRow[]).forEach((item) => {
    const date = item.inbound_date;
    const currentAmount = amountByDate.get(date) || 0;
    amountByDate.set(date, currentAmount + (item.total_price || 0));
  });

  // Map을 배열로 변환
  return Array.from(amountByDate.entries()).map(([date, amount]) => ({
    date,
    amount
  }));
}

/**
 * 기간별 입고 금액 집계
 */
export async function getInboundAmountByPeriod(
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; amount: number }>> {
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  const { data, error } = await supabase
    .from('inbound')
    .select('inbound_date, total_price')
    .gte('inbound_date', start.format('YYYY-MM-DD'))
    .lte('inbound_date', end.format('YYYY-MM-DD'))
    .order('inbound_date', { ascending: true });

  if (error) {
    console.error('입고 금액 집계 에러:', error);
    throw new Error(error.message);
  }

  // 날짜별로 금액 집계
  const amountByDate = new Map<string, number>();

  // 선택한 기간의 모든 날짜를 0으로 초기화
  const days = end.diff(start, 'day') + 1;
  for (let i = 0; i < days; i++) {
    const date = start.add(i, 'day').format('YYYY-MM-DD');
    amountByDate.set(date, 0);
  }

  // 실제 데이터로 금액 업데이트
  (data as InboundAmountRow[]).forEach((item) => {
    const date = item.inbound_date;
    const currentAmount = amountByDate.get(date) || 0;
    amountByDate.set(date, currentAmount + (item.total_price || 0));
  });

  // Map을 배열로 변환
  return Array.from(amountByDate.entries()).map(([date, amount]) => ({
    date,
    amount
  }));
}
