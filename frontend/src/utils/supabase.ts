/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Supabase 설정
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// 디버깅을 위한 로그
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Key loaded' : 'Key not found');

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 연결 테스트 함수
export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    const { error } = await supabase.from('parts').select('count').limit(1);
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    console.log('Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
};

// 페이지 로드 시 연결 테스트 실행
testSupabaseConnection();

// 데이터베이스 타입 정의
export interface User {
  id: string;
  user_id: string;
  name: string;
  email: string;
  department_id?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  department_name: string;
  description?: string;
  created_at: string;
}

export interface Part {
  id: string;
  part_number: string;
  part_name: string;
  description?: string;
  category?: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  max_stock?: number;
  location?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface Supplier {
  id: string;
  supplier_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartPrice {
  id: string;
  part_id: string;
  supplier_id: string;
  price: number;
  currency: string;
  effective_date: string;
  created_at: string;
}

export interface Inbound {
  id: string;
  part_id: string;
  supplier_id?: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  inbound_date: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

export interface Outbound {
  id: string;
  part_id: string;
  department_id?: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  outbound_date: string;
  purpose?: string;
  requested_by?: string;
  approved_by?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

export interface InventoryMovement {
  id: string;
  part_id: string;
  movement_type: 'inbound' | 'outbound' | 'adjustment';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_id?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

// 유틸리티 함수들
export const formatCurrency = (amount: number, currency: string = 'VND'): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('ko-KR');
};

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('ko-KR');
};

// 에러 처리 유틸리티
export const handleSupabaseError = (error: any): string => {
  if (error?.message) {
    return error.message;
  }
  return '알 수 없는 오류가 발생했습니다.';
};

// 페이지네이션 유틸리티
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export const getPaginationRange = (page: number, pageSize: number) => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
};

// 검색 및 필터링 유틸리티
export const buildSearchQuery = (searchTerm: string, columns: string[]) => {
  if (!searchTerm.trim()) return null;
  
  return columns.map(column => `${column}.ilike.%${searchTerm}%`).join(',');
};

// 재고 상태 확인
export const getStockStatus = (currentStock: number, minStock: number, maxStock?: number) => {
  if (currentStock <= minStock) {
    return { status: 'low', color: 'error', label: '부족' };
  }
  if (maxStock && currentStock >= maxStock) {
    return { status: 'high', color: 'warning', label: '과다' };
  }
  return { status: 'normal', color: 'success', label: '정상' };
};

// 권한 확인 유틸리티
export const checkPermission = async (userId: string, permission: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('check_user_permission', {
        user_id: userId,
        permission_name: permission
      });
    
    if (error) {
      console.error('권한 확인 오류:', error);
      return false;
    }
    
    return data || false;
  } catch (error) {
    console.error('권한 확인 중 오류:', error);
    return false;
  }
};

// 현재 사용자 정보 가져오기
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    // 사용자 상세 정보 가져오기
    const { data: userDetails, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        departments(
          id,
          department_name
        )
      `)
      .eq('user_id', user.id)
      .single();
    
    if (userError) {
      console.error('사용자 정보 조회 오류:', userError);
      return null;
    }
    
    return {
      ...user,
      profile: userDetails
    };
  } catch (error) {
    console.error('현재 사용자 정보 가져오기 오류:', error);
    return null;
  }
};

export default supabase;