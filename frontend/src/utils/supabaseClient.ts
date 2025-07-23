import { createClient } from '@supabase/supabase-js';

// Supabase 프로젝트 설정
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// 환경 변수 검증
if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-anon-key') {
  console.warn('⚠️ Supabase 환경 변수가 설정되지 않았습니다. .env 파일을 확인해주세요.');
}

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// 데이터베이스 타입 정의
export interface Database {
  public: {
    Tables: {
      parts: {
        Row: {
          part_id: string;
          part_code: string;
          part_name: string;
          unit: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          part_id?: string;
          part_code: string;
          part_name: string;
          unit: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          part_id?: string;
          part_code?: string;
          part_name?: string;
          unit?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      suppliers: {
        Row: {
          supplier_id: string;
          supplier_name: string;
          contact_person?: string;
          phone?: string;
          email?: string;
          address?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          supplier_id?: string;
          supplier_name: string;
          contact_person?: string;
          phone?: string;
          email?: string;
          address?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          supplier_id?: string;
          supplier_name?: string;
          contact_person?: string;
          phone?: string;
          email?: string;
          address?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      inventory: {
        Row: {
          inventory_id: string;
          part_id: string;
          current_quantity: number;
          last_count_date?: string;
          location?: string;
          updated_at: string;
          updated_by?: string;
        };
        Insert: {
          inventory_id?: string;
          part_id: string;
          current_quantity: number;
          last_count_date?: string;
          location?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Update: {
          inventory_id?: string;
          part_id?: string;
          current_quantity?: number;
          last_count_date?: string;
          location?: string;
          updated_at?: string;
          updated_by?: string;
        };
      };
      inbound: {
        Row: {
          inbound_id: string;
          inbound_date: string;
          part_id: string;
          supplier_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          currency: string;
          reference_number: string;
          invoice_number?: string;
          lot_number?: string;
          notes?: string;
          created_at: string;
          created_by: string;
        };
        Insert: {
          inbound_id?: string;
          inbound_date: string;
          part_id: string;
          supplier_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          currency: string;
          reference_number: string;
          invoice_number?: string;
          lot_number?: string;
          notes?: string;
          created_at?: string;
          created_by: string;
        };
        Update: {
          inbound_id?: string;
          inbound_date?: string;
          part_id?: string;
          supplier_id?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          currency?: string;
          reference_number?: string;
          invoice_number?: string;
          lot_number?: string;
          notes?: string;
          created_at?: string;
          created_by?: string;
        };
      };
      part_prices: {
        Row: {
          price_id: string;
          part_id: string;
          supplier_id: string;
          unit_price: number;
          currency: string;
          effective_date: string;
          is_current: boolean;
          created_at: string;
          created_by: string;
        };
        Insert: {
          price_id?: string;
          part_id: string;
          supplier_id: string;
          unit_price: number;
          currency: string;
          effective_date: string;
          is_current?: boolean;
          created_at?: string;
          created_by: string;
        };
        Update: {
          price_id?: string;
          part_id?: string;
          supplier_id?: string;
          unit_price?: number;
          currency?: string;
          effective_date?: string;
          is_current?: boolean;
          created_at?: string;
          created_by?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// 타입이 적용된 Supabase 클라이언트
export const typedSupabase = supabase as ReturnType<typeof createClient<Database>>;

// 인증 관련 헬퍼 함수들
export const auth = {
  // 현재 사용자 정보 가져오기
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // 로그인
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  // 로그아웃
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // 세션 상태 변경 리스너
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// 데이터베이스 헬퍼 함수들
export const db = {
  // 부품 관련
  parts: {
    getAll: () => supabase.from('parts').select('*'),
    getById: (id: string) => supabase.from('parts').select('*').eq('part_id', id).single(),
    create: (part: Database['public']['Tables']['parts']['Insert']) => 
      supabase.from('parts').insert(part),
    update: (id: string, updates: Database['public']['Tables']['parts']['Update']) => 
      supabase.from('parts').update(updates).eq('part_id', id),
    delete: (id: string) => supabase.from('parts').delete().eq('part_id', id)
  },

  // 공급업체 관련
  suppliers: {
    getAll: () => supabase.from('suppliers').select('*'),
    getById: (id: string) => supabase.from('suppliers').select('*').eq('supplier_id', id).single(),
    create: (supplier: Database['public']['Tables']['suppliers']['Insert']) => 
      supabase.from('suppliers').insert(supplier),
    update: (id: string, updates: Database['public']['Tables']['suppliers']['Update']) => 
      supabase.from('suppliers').update(updates).eq('supplier_id', id),
    delete: (id: string) => supabase.from('suppliers').delete().eq('supplier_id', id)
  },

  // 재고 관련
  inventory: {
    getAll: () => supabase.from('inventory').select('*'),
    getByPartId: (partId: string) => 
      supabase.from('inventory').select('*').eq('part_id', partId).single(),
    updateQuantity: (partId: string, quantity: number) => 
      supabase.from('inventory').update({ current_quantity: quantity }).eq('part_id', partId)
  },

  // 입고 관련
  inbound: {
    getAll: () => supabase.from('inbound').select(`
      *, 
      parts(part_code, part_name, unit),
      suppliers(supplier_name)
    `),
    getById: (id: string) => supabase.from('inbound').select(`
      *, 
      parts(part_code, part_name, unit),
      suppliers(supplier_name)
    `).eq('inbound_id', id).single(),
    create: (inbound: Database['public']['Tables']['inbound']['Insert']) => 
      supabase.from('inbound').insert(inbound),
    update: (id: string, updates: Database['public']['Tables']['inbound']['Update']) => 
      supabase.from('inbound').update(updates).eq('inbound_id', id),
    delete: (id: string) => supabase.from('inbound').delete().eq('inbound_id', id)
  },

  // 가격 관련
  partPrices: {
    getCurrentPrice: (partId: string, supplierId: string) => 
      supabase.from('part_prices')
        .select('*')
        .eq('part_id', partId)
        .eq('supplier_id', supplierId)
        .eq('is_current', true)
        .single()
  }
};

export default supabase;