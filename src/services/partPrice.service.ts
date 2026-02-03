/**
 * Part Prices (부품 단가) 서비스
 */
import { supabase } from '@/lib/supabase.ts';
import type { PartPrice, InsertDto, UpdateDto } from '../types/database.types';
import { getFactoryId } from './factoryContext';

/**
 * 특정 부품의 전체 단가 이력 조회
 */
export async function getPartPrices(partId: string): Promise<PartPrice[]> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('part_prices')
    .select(`
      *,
      suppliers(supplier_name)
    `)
    .eq('part_id', partId)
    .eq('factory_id', factoryId)
    .order('effective_from', { ascending: false });

  if (error) {
    console.error('단가 이력 조회 에러:', error);
    throw new Error(error.message);
  }

  return (data || []).map((item: any) => ({
    ...item,
    supplier_name: item.suppliers?.supplier_name || '',
    suppliers: undefined,
    source: 'part_prices' as const,
  })) as PartPrice[];
}

/**
 * 특정 부품의 최신 단가 조회
 */
export async function getLatestPartPrice(partId: string): Promise<PartPrice | null> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('part_prices')
    .select(`
      *,
      suppliers(supplier_name)
    `)
    .eq('part_id', partId)
    .eq('factory_id', factoryId)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // no rows
    console.error('최신 단가 조회 에러:', error);
    throw new Error(error.message);
  }

  return {
    ...data,
    supplier_name: (data as any).suppliers?.supplier_name || '',
    suppliers: undefined,
    source: 'part_prices' as const,
  } as PartPrice;
}

/**
 * 전체 부품의 최신 단가 맵 조회 (Parts 테이블 컬럼용)
 * RPC 함수로 part_prices + inbound fallback 한 번에 조회
 */
export async function getLatestPartPrices(): Promise<Record<string, PartPrice>> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase.rpc('get_latest_part_prices', {
    p_factory_id: factoryId
  });

  if (error) {
    console.error('최신 단가 RPC 조회 에러:', error);
    throw new Error(error.message);
  }

  const latestMap: Record<string, PartPrice> = {};
  (data || []).forEach((item: any) => {
    if (!latestMap[item.part_id]) {
      latestMap[item.part_id] = {
        price_id: item.price_id,
        part_id: item.part_id,
        factory_id: item.factory_id,
        unit_price: Number(item.unit_price),
        currency: item.currency || '₫',
        supplier_id: item.supplier_id || null,
        effective_from: item.effective_from,
        effective_to: item.effective_to || null,
        is_current: item.is_current ?? false,
        created_at: item.created_at,
        created_by: item.created_by || '',
        supplier_name: item.supplier_name || '',
        source: item.source as 'part_prices' | 'inbound',
      };
    }
  });

  return latestMap;
}

/**
 * 단가 추가
 */
export async function createPartPrice(data: InsertDto<'part_prices'>): Promise<PartPrice> {
  const factoryId = getFactoryId();
  const { data: created, error } = await supabase
    .from('part_prices')
    .insert({ ...data, factory_id: factoryId })
    .select(`
      *,
      suppliers(supplier_name)
    `)
    .single();

  if (error) {
    console.error('단가 추가 에러:', error);
    throw new Error(error.message);
  }

  return {
    ...created,
    supplier_name: (created as any).suppliers?.supplier_name || '',
    suppliers: undefined,
    source: 'part_prices' as const,
  } as PartPrice;
}

/**
 * 단가 수정
 */
export async function updatePartPrice(priceId: string, updates: UpdateDto<'part_prices'>): Promise<PartPrice> {
  const factoryId = getFactoryId();
  const { data: updated, error } = await supabase
    .from('part_prices')
    .update(updates)
    .eq('price_id', priceId)
    .eq('factory_id', factoryId)
    .select(`
      *,
      suppliers(supplier_name)
    `)
    .single();

  if (error) {
    console.error('단가 수정 에러:', error);
    throw new Error(error.message);
  }

  return {
    ...updated,
    supplier_name: (updated as any).suppliers?.supplier_name || '',
    suppliers: undefined,
    source: 'part_prices' as const,
  } as PartPrice;
}

/**
 * 단가 삭제
 */
export async function deletePartPrice(priceId: string): Promise<void> {
  const factoryId = getFactoryId();
  const { error } = await supabase
    .from('part_prices')
    .delete()
    .eq('price_id', priceId)
    .eq('factory_id', factoryId);

  if (error) {
    console.error('단가 삭제 에러:', error);
    throw new Error(error.message);
  }
}
