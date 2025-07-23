import { typedSupabase, db } from '../utils/supabaseClient';
import { formatCurrency, formatDate, handleSupabaseError as handleError } from '../utils/supabase';
import type { Part, Supplier, PartPrice, Inbound, Outbound, InventoryMovement } from '../utils/supabase';

// Parts API
export const partsApi = {
  // 모든 부품 조회
  async getAll(page = 1, limit = 10, search = '') {
    try {
      let query = db.parts.select('*');
      
      if (search) {
        query = query.or(`part_number.ilike.%${search}%,vietnamese_name.ilike.%${search}%,korean_name.ilike.%${search}%`);
      }
      
      const { data, error, count } = await query
        .range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      throw handleError(error, '부품 목록을 불러오는데 실패했습니다.');
    }
  },

  // 부품 상세 조회
  async getById(id: string) {
    try {
      const { data, error } = await db.parts
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleError(error, '부품 정보를 불러오는데 실패했습니다.');
    }
  },

  // 부품 생성
  async create(part: Omit<Part, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const { data, error } = await db.parts
        .insert(part)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleError(error, '부품 생성에 실패했습니다.');
    }
  },

  // 부품 업데이트
  async update(id: string, updates: Partial<Part>) {
    try {
      const { data, error } = await db.parts
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleError(error, '부품 업데이트에 실패했습니다.');
    }
  },

  // 부품 삭제
  async delete(id: string) {
    try {
      const { error } = await db.parts.delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      throw handleError(error, '부품 삭제에 실패했습니다.');
    }
  }
};

// Suppliers API
export const suppliersApi = {
  // 모든 공급업체 조회
  async getAll(page = 1, limit = 10, search = '') {
    try {
      let query = db.suppliers.select('*');
      
      if (search) {
        query = query.or(`name.ilike.%${search}%,supplier_code.ilike.%${search}%,contact_person.ilike.%${search}%`);
      }
      
      const { data, error, count } = await query
        .range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      throw handleError(error, '공급업체 목록을 불러오는데 실패했습니다.');
    }
  },

  // 공급업체 상세 조회
  async getById(id: string) {
    try {
      const { data, error } = await db.suppliers
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleError(error, '공급업체 정보를 불러오는데 실패했습니다.');
    }
  },

  // 공급업체 생성
  async create(supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const { data, error } = await db.suppliers
        .insert(supplier)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleError(error, '공급업체 생성에 실패했습니다.');
    }
  },

  // 공급업체 업데이트
  async update(id: string, updates: Partial<Supplier>) {
    try {
      const { data, error } = await db.suppliers
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleError(error, '공급업체 업데이트에 실패했습니다.');
    }
  },

  // 공급업체 삭제
  async delete(id: string) {
    try {
      const { error } = await db.suppliers.delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      throw handleError(error, '공급업체 삭제에 실패했습니다.');
    }
  }
};

// Inventory API
export const inventoryApi = {
  // 재고 목록 조회
  async getAll(page = 1, limit = 10, search = '') {
    try {
      let query = db.inventory
        .select(`
          *,
          parts!inner(part_number, vietnamese_name, korean_name, unit)
        `);
      
      if (search) {
        query = query.or(`parts.part_number.ilike.%${search}%,parts.vietnamese_name.ilike.%${search}%,parts.korean_name.ilike.%${search}%`);
      }
      
      const { data, error, count } = await query
        .range((page - 1) * limit, page * limit - 1)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      throw handleError(error, '재고 목록을 불러오는데 실패했습니다.');
    }
  },

  // 재고 상세 조회
  async getById(id: string) {
    try {
      const { data, error } = await db.inventory
        .select(`
          *,
          parts!inner(part_number, vietnamese_name, korean_name, unit, min_stock)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleError(error, '재고 정보를 불러오는데 실패했습니다.');
    }
  },

  // 재고 업데이트
  async update(id: string, updates: { quantity?: number; location?: string }) {
    try {
      const { data, error } = await db.inventory
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleError(error, '재고 업데이트에 실패했습니다.');
    }
  },

  // 저재고 알림 조회
  async getLowStock() {
    try {
      const { data, error } = await db.inventory
        .select(`
          *,
          parts!inner(part_number, vietnamese_name, korean_name, unit, min_stock)
        `)
        .filter('quantity', 'lt', 'parts.min_stock');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw handleError(error, '저재고 정보를 불러오는데 실패했습니다.');
    }
  }
};

// Inbound API
export const inboundApi = {
  // 입고 목록 조회
  async getAll(page = 1, limit = 10, search = '') {
    try {
      let query = db.inbound
        .select(`
          *,
          parts!inner(part_number, vietnamese_name, korean_name, unit),
          suppliers!inner(name, supplier_code)
        `);
      
      if (search) {
        query = query.or(`reference_number.ilike.%${search}%,parts.part_number.ilike.%${search}%,suppliers.name.ilike.%${search}%`);
      }
      
      const { data, error, count } = await query
        .range((page - 1) * limit, page * limit - 1)
        .order('inbound_date', { ascending: false });
      
      if (error) throw error;
      
      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      throw handleError(error, '입고 목록을 불러오는데 실패했습니다.');
    }
  },

  // 입고 상세 조회
  async getById(id: string) {
    try {
      const { data, error } = await db.inbound
        .select(`
          *,
          parts!inner(part_number, vietnamese_name, korean_name, unit),
          suppliers!inner(name, supplier_code, contact_person, email)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleError(error, '입고 정보를 불러오는데 실패했습니다.');
    }
  },

  // 입고 생성
  async create(inbound: Omit<Inbound, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const { data, error } = await db.inbound
        .insert(inbound)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleError(error, '입고 생성에 실패했습니다.');
    }
  },

  // 입고 업데이트
  async update(id: string, updates: Partial<Inbound>) {
    try {
      const { data, error } = await db.inbound
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleError(error, '입고 업데이트에 실패했습니다.');
    }
  },

  // 입고 삭제
  async delete(id: string) {
    try {
      const { error } = await db.inbound.delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      throw handleError(error, '입고 삭제에 실패했습니다.');
    }
  }
};

// Part Prices API
export const partPricesApi = {
  // 부품 가격 목록 조회
  async getAll(page = 1, limit = 10, partId?: string) {
    try {
      let query = db.partPrices
        .select(`
          *,
          parts!inner(part_number, vietnamese_name, korean_name),
          suppliers!inner(name, supplier_code)
        `);
      
      if (partId) {
        query = query.eq('part_id', partId);
      }
      
      const { data, error, count } = await query
        .range((page - 1) * limit, page * limit - 1)
        .order('effective_from', { ascending: false });
      
      if (error) throw error;
      
      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      throw handleError(error, '부품 가격 목록을 불러오는데 실패했습니다.');
    }
  },

  // 부품 가격 생성
  async create(partPrice: Omit<PartPrice, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const { data, error } = await db.partPrices
        .insert(partPrice)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleError(error, '부품 가격 생성에 실패했습니다.');
    }
  },

  // 부품 가격 업데이트
  async update(id: string, updates: Partial<PartPrice>) {
    try {
      const { data, error } = await db.partPrices
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw handleError(error, '부품 가격 업데이트에 실패했습니다.');
    }
  },

  // 부품 가격 삭제
  async delete(id: string) {
    try {
      const { error } = await db.partPrices.delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      throw handleError(error, '부품 가격 삭제에 실패했습니다.');
    }
  },

  // 현재 유효한 부품 가격 조회
  async getCurrentPrice(partId: string, supplierId: string) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await db.partPrices
        .select('*')
        .eq('part_id', partId)
        .eq('supplier_id', supplierId)
        .lte('effective_from', today)
        .or(`effective_to.is.null,effective_to.gte.${today}`)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data;
    } catch (error) {
      throw handleError(error, '현재 부품 가격을 불러오는데 실패했습니다.');
    }
  }
};

// Dashboard API
export const dashboardApi = {
  // 대시보드 통계 조회
  async getStats() {
    try {
      const [partsCount, suppliersCount, lowStockCount, recentInbound] = await Promise.all([
        db.parts.select('id', { count: 'exact', head: true }),
        db.suppliers.select('id', { count: 'exact', head: true }),
        inventoryApi.getLowStock(),
        db.inbound
          .select('*')
          .gte('inbound_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('inbound_date', { ascending: false })
          .limit(5)
      ]);
      
      return {
        totalParts: partsCount.count || 0,
        totalSuppliers: suppliersCount.count || 0,
        lowStockItems: lowStockCount.length,
        recentInbound: recentInbound.data || []
      };
    } catch (error) {
      throw handleError(error, '대시보드 통계를 불러오는데 실패했습니다.');
    }
  }
};