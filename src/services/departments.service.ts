// @ts-nocheck
import { supabase } from '@/lib/supabase.ts';
import type { Department } from '../types/database.types';

/**
 * Departments Service
 *
 * 부서 관련 API 호출을 처리합니다.
 */

// 모든 부서 조회
export const getAllDepartments = async (): Promise<Department[]> => {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('department_code', { ascending: true });

  if (error) {
    console.error('Error fetching departments:', error);
    throw new Error(error.message);
  }

  return data || [];
};

// 특정 부서 조회
export const getDepartmentById = async (departmentId: string): Promise<Department | null> => {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('department_id', departmentId)
    .single();

  if (error) {
    console.error('Error fetching department:', error);
    throw new Error(error.message);
  }

  return data;
};

// 부서 검색
export const searchDepartments = async (searchText: string): Promise<Department[]> => {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .or(`department_code.ilike.%${searchText}%,department_name.ilike.%${searchText}%`)
    .order('department_code', { ascending: true });

  if (error) {
    console.error('Error searching departments:', error);
    throw new Error(error.message);
  }

  return data || [];
};
