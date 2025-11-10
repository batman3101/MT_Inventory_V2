// @ts-nocheck
/**
 * Inbound (입고) 서비스
 *
 * ⚠️ 실제 Supabase 데이터베이스에서 입고 데이터를 조회/관리합니다.
 */

import { supabase } from '../lib/supabase';
import type { Inbound, InboundDetail, InsertDto, UpdateDto } from '../types/database.types';

/**
 * 모든 입고 내역 조회
 */
export async function getAllInbound(): Promise<Inbound[]> {
  const { data, error } = await supabase
    .from('inbound')
    .select('*')
    .order('inbound_date', { ascending: false });

  if (error) {
    console.error('입고 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
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
    .select('*')
    .gte('inbound_date', startDate)
    .lte('inbound_date', endDate)
    .order('inbound_date', { ascending: false });

  if (error) {
    console.error('입고 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 부품별 입고 내역 조회
 */
export async function getInboundByPartId(partId: string): Promise<Inbound[]> {
  const { data, error } = await supabase
    .from('inbound')
    .select('*')
    .eq('part_id', partId)
    .order('inbound_date', { ascending: false });

  if (error) {
    console.error('입고 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 공급업체별 입고 내역 조회
 */
export async function getInboundBySupplierId(supplierId: string): Promise<Inbound[]> {
  const { data, error } = await supabase
    .from('inbound')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('inbound_date', { ascending: false});

  if (error) {
    console.error('입고 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 입고 추가
 */
export async function createInbound(
  inbound: InsertDto<'inbound'>
): Promise<Inbound> {
  const { data, error } = await supabase
    .from('inbound')
    .insert(inbound as any)
    .select()
    .single();

  if (error) {
    console.error('입고 추가 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 입고 수정
 */
export async function updateInbound(
  inboundId: string,
  updates: UpdateDto<'inbound'>
): Promise<Inbound> {
  const { data, error } = await supabase
    .from('inbound')
    .update(updates as any)
    .eq('inbound_id', inboundId)
    .select()
    .single();

  if (error) {
    console.error('입고 수정 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 입고 삭제
 */
export async function deleteInbound(inboundId: string): Promise<void> {
  const { error } = await supabase
    .from('inbound')
    .delete()
    .eq('inbound_id', inboundId);

  if (error) {
    console.error('입고 삭제 에러:', error);
    throw new Error(error.message);
  }
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
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('최근 입고 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}
