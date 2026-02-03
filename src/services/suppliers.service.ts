/**
 * Suppliers (공급업체) 서비스
 *
 * ⚠️ 실제 Supabase 데이터베이스에서 공급업체 데이터를 조회/관리합니다.
 */

import { supabase } from '@/lib/supabase.ts';
import type { Supplier, InsertDto, UpdateDto, Database } from '../types/database.types';
import { getFactoryId } from './factoryContext';

/**
 * 모든 공급업체 조회
 */
export async function getAllSuppliers(): Promise<Supplier[]> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('factory_id', factoryId)
    .order('supplier_code', { ascending: true });

  if (error) {
    console.error('공급업체 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 공급업체 ID로 조회
 */
export async function getSupplierById(supplierId: string): Promise<Supplier | null> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('supplier_id', supplierId)
    .eq('factory_id', factoryId)
    .single();

  if (error) {
    console.error('공급업체 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 공급업체 코드로 조회
 */
export async function getSupplierByCode(supplierCode: string): Promise<Supplier | null> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('supplier_code', supplierCode)
    .eq('factory_id', factoryId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // 데이터 없음
      return null;
    }
    console.error('공급업체 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 상태별 공급업체 조회
 */
export async function getSuppliersByStatus(status: string): Promise<Supplier[]> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('status', status)
    .eq('factory_id', factoryId)
    .order('supplier_code', { ascending: true });

  if (error) {
    console.error('공급업체 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 국가별 공급업체 조회
 */
export async function getSuppliersByCountry(country: string): Promise<Supplier[]> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('country', country)
    .eq('factory_id', factoryId)
    .order('supplier_code', { ascending: true });

  if (error) {
    console.error('공급업체 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 공급업체 검색 (코드, 이름으로)
 */
export async function searchSuppliers(searchTerm: string): Promise<Supplier[]> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('factory_id', factoryId)
    .or(`supplier_code.ilike.%${searchTerm}%,supplier_name.ilike.%${searchTerm}%`)
    .order('supplier_code', { ascending: true });

  if (error) {
    console.error('공급업체 검색 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 공급업체 추가
 */
export async function createSupplier(
  supplier: InsertDto<'suppliers'>
): Promise<Supplier> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('suppliers')
    .insert({ ...supplier, factory_id: factoryId } as Database["public"]["Tables"]["suppliers"]["Insert"])
    .select()
    .single();

  if (error) {
    console.error('공급업체 추가 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 공급업체 수정
 */
export async function updateSupplier(
  supplierId: string,
  updates: UpdateDto<'suppliers'>
): Promise<Supplier> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('suppliers')
    .update(updates as Database["public"]["Tables"]["suppliers"]["Update"])
    .eq('supplier_id', supplierId)
    .eq('factory_id', factoryId)
    .select()
    .single();

  if (error) {
    console.error('공급업체 수정 에러:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`공급업체 수정 실패: ${error.message}`);
  }

  return data;
}

/**
 * 공급업체 삭제
 */
export async function deleteSupplier(supplierId: string): Promise<void> {
  const factoryId = getFactoryId();
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('supplier_id', supplierId)
    .eq('factory_id', factoryId);

  if (error) {
    console.error('공급업체 삭제 에러:', error);
    throw new Error(error.message);
  }
}

/**
 * 활성 공급업체 조회
 */
export async function getActiveSuppliers(): Promise<Supplier[]> {
  return getSuppliersByStatus('ACTIVE');
}

/**
 * 모든 국가 목록 조회
 */
export async function getAllCountries(): Promise<string[]> {
  const factoryId = getFactoryId();
  const { data, error } = await supabase
    .from('suppliers')
    .select('country')
    .eq('factory_id', factoryId)
    .order('country', { ascending: true });

  if (error) {
    console.error('국가 목록 조회 에러:', error);
    throw new Error(error.message);
  }

  // 중복 제거
  const countries = [...new Set(data.map((item) => item.country))];
  return countries.filter((country) => country && country.trim() !== '');
}
