/**
 * Inventory (재고) 서비스
 *
 * ⚠️ 실제 Supabase 데이터베이스에서 재고 데이터를 조회/관리합니다.
 */

import { supabase } from '@/lib/supabase.ts';
import type { Inventory, InventoryWithPart, InsertDto, UpdateDto, Database } from '../types/database.types';

/**
 * 모든 재고 조회 (부품 정보 포함)
 */
export async function getAllInventory(): Promise<InventoryWithPart[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      part:parts(*)
    `)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('재고 조회 에러:', error);
    throw new Error(error.message);
  }

  return data as InventoryWithPart[];
}

/**
 * 재고 ID로 조회
 */
export async function getInventoryById(inventoryId: string): Promise<InventoryWithPart | null> {
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      part:parts(*)
    `)
    .eq('inventory_id', inventoryId)
    .single();

  if (error) {
    console.error('재고 조회 에러:', error);
    throw new Error(error.message);
  }

  return data as InventoryWithPart;
}

/**
 * 부품 ID로 재고 조회
 */
export async function getInventoryByPartId(partId: string): Promise<Inventory | null> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('part_id', partId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // 데이터 없음
      return null;
    }
    console.error('재고 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 낮은 재고 조회 (현재 수량 < 최소 재고)
 */
export async function getLowStockItems(): Promise<InventoryWithPart[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      part:parts(*)
    `);

  if (error) {
    console.error('재고 조회 에러:', error);
    throw new Error(error.message);
  }

  // 클라이언트 사이드에서 필터링 (current_quantity < part.min_stock)
  const lowStockItems = (data as InventoryWithPart[]).filter(
    (item) => item.part && item.current_quantity < item.part.min_stock
  );

  return lowStockItems;
}

/**
 * 위치별 재고 조회
 */
export async function getInventoryByLocation(location: string): Promise<InventoryWithPart[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      part:parts(*)
    `)
    .eq('location', location)
    .order('part_id', { ascending: true });

  if (error) {
    console.error('재고 조회 에러:', error);
    throw new Error(error.message);
  }

  return data as InventoryWithPart[];
}

/**
 * 재고 추가
 */
export async function createInventory(
  inventory: InsertDto<'inventory'>
): Promise<Inventory> {
  const { data, error } = await supabase
    .from('inventory')
    .insert(inventory as Database["public"]["Tables"]["inventory"]["Insert"])
    .select()
    .single();

  if (error) {
    console.error('재고 추가 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 재고 수정
 */
export async function updateInventory(
  inventoryId: string,
  updates: UpdateDto<'inventory'>
): Promise<Inventory> {
  const { data, error } = await supabase
    .from('inventory')
    .update(updates as Database["public"]["Tables"]["inventory"]["Update"])
    .eq('inventory_id', inventoryId)
    .select()
    .single();

  if (error) {
    console.error('재고 수정 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 재고 삭제
 */
export async function deleteInventory(inventoryId: string): Promise<void> {
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('inventory_id', inventoryId);

  if (error) {
    console.error('재고 삭제 에러:', error);
    throw new Error(error.message);
  }
}

/**
 * 재고 총계
 */
export async function getInventoryStats() {
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      part:parts(*)
    `);

  if (error) {
    console.error('재고 통계 조회 에러:', error);
    throw new Error(error.message);
  }

  const inventory = data as InventoryWithPart[];

  return {
    totalItems: inventory.length,
    totalQuantity: inventory.reduce((sum, item) => sum + item.current_quantity, 0),
    lowStockCount: inventory.filter(
      (item) => item.part && item.current_quantity < item.part.min_stock
    ).length,
    locations: [...new Set(inventory.map((item) => item.location))],
  };
}
