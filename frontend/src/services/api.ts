import { supabase } from '../utils/supabase';
import { handleSupabaseError } from '../utils/supabase';

// 에러 처리 헬퍼 함수
const handleError = (error: any, defaultMessage: string = '오류가 발생했습니다.'): Error => {
  console.error(error);
  return new Error(handleSupabaseError(error) || defaultMessage);
};
import type { Part, Supplier, PartPrice, Inbound } from '../utils/supabase';

// Parts API
export const partsApi = {
  // 모든 부품 조회
  async getAll(page = 1, limit = 10, search = '') {
    try {
      let query = supabase.from('parts').select('*');
      
      if (search) {
        query = query.or(`part_code.ilike.%${search}%,vietnamese_name.ilike.%${search}%,korean_name.ilike.%${search}%`);
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
      const { data, error } = await supabase.from('parts')
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
      const { data, error } = await supabase.from('parts')
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
      const { data, error } = await supabase.from('parts')
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
      const { error } = await supabase.from('parts').delete().eq('id', id);
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
      let query = supabase.from('suppliers').select('*');
      
      if (search) {
        query = query.or(`supplier_name.ilike.%${search}%,supplier_code.ilike.%${search}%,contact_person.ilike.%${search}%`);
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
      const { data, error } = await supabase.from('suppliers')
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
      const { data, error } = await supabase.from('suppliers')
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
      const { data, error } = await supabase.from('suppliers')
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
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
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
      let query = supabase.from('inventory')
        .select(`
          inventory_id,
          part_id,
          current_quantity,
          last_count_date,
          location,
          updated_at,
          updated_by,
          parts!inner(part_code, vietnamese_name, korean_name, unit, min_stock)
        `);
      
      if (search) {
        query = query.or(`parts.part_code.ilike.%${search}%,parts.vietnamese_name.ilike.%${search}%,parts.korean_name.ilike.%${search}%`);
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
      const { data, error } = await supabase.from('inventory')
        .select(`
          inventory_id,
          part_id,
          current_quantity,
          last_count_date,
          location,
          updated_at,
          updated_by,
          parts!inner(part_code, vietnamese_name, korean_name, unit, min_stock)
        `)
        .eq('inventory_id', id)
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
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (updates.quantity !== undefined) {
        updateData.current_quantity = updates.quantity;
      }
      if (updates.location !== undefined) {
        updateData.location = updates.location;
      }
      
      const { data, error } = await supabase.from('inventory')
        .update(updateData)
        .eq('inventory_id', id)
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
      const { data, error } = await supabase.from('inventory')
        .select(`
          inventory_id,
          part_id,
          current_quantity,
          location,
          parts!inner(part_code, vietnamese_name, korean_name, unit, min_stock)
        `)
        .filter('current_quantity', 'lt', 'parts.min_stock');
      
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
      let query = supabase.from('inbound')
        .select(`
          *,
          parts!inner(part_code, vietnamese_name, korean_name, unit),
          suppliers!inner(supplier_name, supplier_code)
        `);
      
      if (search) {
        query = query.or(`reference_number.ilike.%${search}%,parts.part_code.ilike.%${search}%,suppliers.supplier_name.ilike.%${search}%`);
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
      const { data, error } = await supabase.from('inbound')
        .select(`
          *,
          parts!inner(part_code, vietnamese_name, korean_name, unit),
          suppliers!inner(supplier_name, supplier_code, contact_person, email)
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
      const { data, error } = await supabase.from('inbound')
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
      const { data, error } = await supabase.from('inbound')
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
      const { error } = await supabase.from('inbound').delete().eq('id', id);
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
      let query = supabase.from('partPrices')
        .select(`
          *,
          parts!inner(part_code, vietnamese_name, korean_name),
          suppliers!inner(supplier_name, supplier_code)
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
      const { data, error } = await supabase.from('partPrices')
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
      const { data, error } = await supabase.from('partPrices')
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
      const { error } = await supabase.from('partPrices').delete().eq('id', id);
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
      
      const { data, error } = await supabase.from('partPrices')
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
        supabase.from('parts').select('id', { count: 'exact', head: true }),
        supabase.from('suppliers').select('id', { count: 'exact', head: true }),
        inventoryApi.getLowStock(),
        supabase.from('inbound')
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

// Reports API
export const reportsApi = {
  // 카테고리 목록 조회
  async getCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('category_name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw handleError(error, '카테고리 목록을 불러오는데 실패했습니다.');
    }
  },

  // 월별 입출고 데이터 조회
  async getInOutData(startDate: string, endDate: string, categoryId?: string) {
    try {
      // 입고 데이터 쿼리
      let inboundQuery = supabase.from('inbound')
        .select('inbound_date, quantity, unit_price')
        .gte('inbound_date', startDate)
        .lte('inbound_date', endDate);
      
      // 출고 데이터 쿼리
      let outboundQuery = supabase.from('outbound')
        .select('outbound_date, quantity, unit_price')
        .gte('outbound_date', startDate)
        .lte('outbound_date', endDate);
      
      // 카테고리 필터링이 필요한 경우
      if (categoryId && categoryId !== 'all') {
        // 해당 카테고리의 부품 ID 목록 조회
        const { data: partsInCategory, error: partsError } = await supabase.from('parts')
          .select('id')
          .eq('category_id', categoryId);
        
        if (partsError) throw partsError;
        
        const partIds = partsInCategory.map(part => part.id);
        
        if (partIds.length > 0) {
          inboundQuery = inboundQuery.in('part_id', partIds);
          outboundQuery = outboundQuery.in('part_id', partIds);
        } else {
          // 해당 카테고리에 부품이 없는 경우 빈 결과 반환
          return [];
        }
      }
      
      // 쿼리 실행
      const [inboundResult, outboundResult] = await Promise.all([
        inboundQuery,
        outboundQuery
      ]);
      
      if (inboundResult.error) throw inboundResult.error;
      if (outboundResult.error) throw outboundResult.error;
      
      // 월별 데이터 집계
      const monthlyData: Record<string, { month: string; inbound: number; outbound: number }> = {};
      
      // 입고 데이터 처리
      inboundResult.data.forEach((item: any) => {
        const month = item.inbound_date.substring(0, 7); // YYYY-MM 형식
        if (!monthlyData[month]) {
          monthlyData[month] = { month, inbound: 0, outbound: 0 };
        }
        monthlyData[month]!.inbound += item.quantity;
      });
      
      // 출고 데이터 처리
      outboundResult.data.forEach((item: any) => {
        const month = item.outbound_date.substring(0, 7); // YYYY-MM 형식
        if (!monthlyData[month]) {
          monthlyData[month] = { month, inbound: 0, outbound: 0 };
        }
        monthlyData[month]!.outbound += item.quantity;
      });
      
      // 결과를 배열로 변환하고 월별로 정렬
      return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    } catch (error) {
      throw handleError(error, '월별 입출고 데이터를 불러오는데 실패했습니다.');
    }
  },

  // 입고 상세 내역 조회
  async getInboundDetails(startDate: string, endDate: string, categoryId?: string) {
    try {
      let query = supabase.from('inbound')
        .select(`
          *,
          parts(part_code, vietnamese_name, korean_name, category_id),
          suppliers(supplier_name)
        `)
        .gte('inbound_date', startDate)
        .lte('inbound_date', endDate);
      
      // 카테고리 필터링
      if (categoryId && categoryId !== 'all') {
        query = query.eq('parts.category_id', categoryId);
      }
      
      const { data, error } = await query.order('inbound_date', { ascending: false });
      
      if (error) throw error;
      
      // 카테고리 이름 조회
      const categoryIds = [...new Set(data.map(item => item.parts.category_id))];
      let categories = [];
      
      if (categoryIds.length > 0) {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .in('category_id', categoryIds);
        
        if (categoriesError) throw categoriesError;
        categories = categoriesData;
      }
      
      // 결과 데이터 포맷팅
      return data.map(item => {
        const category = categories.find(cat => cat.category_id === item.parts.category_id);
        return {
          inbound_date: item.inbound_date,
          part_code: item.parts.part_code,
          part_name: item.parts.vietnamese_name,
          supplier_name: item.suppliers.supplier_name,
          category_name: category ? category.category_name : '미분류',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_amount: item.quantity * item.unit_price
        };
      });
    } catch (error) {
      throw handleError(error, '입고 상세 내역을 불러오는데 실패했습니다.');
    }
  },

  // 출고 상세 내역 조회
  async getOutboundDetails(startDate: string, endDate: string, categoryId?: string) {
    try {
      let query = supabase.from('outbound')
        .select(`
          *,
          parts(part_code, vietnamese_name, korean_name, category_id),
          departments(department_name)
        `)
        .gte('outbound_date', startDate)
        .lte('outbound_date', endDate);
      
      // 카테고리 필터링
      if (categoryId && categoryId !== 'all') {
        query = query.eq('parts.category_id', categoryId);
      }
      
      const { data, error } = await query.order('outbound_date', { ascending: false });
      
      if (error) throw error;
      
      // 카테고리 이름 조회
      const categoryIds = [...new Set(data.map(item => item.parts.category_id))];
      let categories = [];
      
      if (categoryIds.length > 0) {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .in('category_id', categoryIds);
        
        if (categoriesError) throw categoriesError;
        categories = categoriesData;
      }
      
      // 결과 데이터 포맷팅
      return data.map(item => {
        const category = categories.find(cat => cat.category_id === item.parts.category_id);
        return {
          outbound_date: item.outbound_date,
          part_code: item.parts.part_code,
          part_name: item.parts.vietnamese_name,
          department_name: item.departments.department_name,
          category_name: category ? category.category_name : '미분류',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_amount: item.quantity * item.unit_price
        };
      });
    } catch (error) {
      throw handleError(error, '출고 상세 내역을 불러오는데 실패했습니다.');
    }
  },

  // 재고 분석 데이터 조회
  async getInventoryAnalysis(categoryId?: string) {
    try {
      // 재고 데이터 조회
      let query = supabase.from('inventory')
        .select(`
          *,
          parts(part_code, vietnamese_name, korean_name, category_id)
        `);
      
      // 카테고리 필터링
      if (categoryId && categoryId !== 'all') {
        query = query.eq('parts.category_id', categoryId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // 카테고리 이름 조회
      const categoryIds = [...new Set(data.map(item => item.parts.category_id))];
      let categories = [];
      
      if (categoryIds.length > 0) {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .in('category_id', categoryIds);
        
        if (categoriesError) throw categoriesError;
        categories = categoriesData;
      }
      
      // 카테고리별 데이터 집계
      const analysisByCategory: Record<string, {
        category_name: string;
        part_count: number;
        total_quantity: number;
        total_value: number;
      }> = {};
      
      data.forEach((item: any) => {
        const categoryId = item.parts.category_id;
        const category = categories.find(cat => cat.category_id === categoryId);
        const categoryName = category ? category.category_name : '미분류';
        
        if (!analysisByCategory[categoryName]) {
          analysisByCategory[categoryName] = {
            category_name: categoryName,
            part_count: 0,
            total_quantity: 0,
            total_value: 0
          };
        }
        
        analysisByCategory[categoryName].part_count++;
        analysisByCategory[categoryName].total_quantity += item.current_quantity;
        analysisByCategory[categoryName].total_value += item.current_quantity * (item.unit_price || 0);
      });
      
      // 결과를 배열로 변환
      return Object.values(analysisByCategory);
    } catch (error) {
      throw handleError(error, '재고 분석 데이터를 불러오는데 실패했습니다.');
    }
  },

  // 비용 분석 데이터 조회
  async getCostAnalysis(startDate: string, endDate: string, categoryId?: string) {
    try {
      // 입고 비용 데이터 쿼리
      let inboundQuery = supabase.from('inbound')
        .select(`
          inbound_date,
          quantity,
          unit_price,
          parts(category_id)
        `)
        .gte('inbound_date', startDate)
        .lte('inbound_date', endDate);
      
      // 출고 비용 데이터 쿼리
      let outboundQuery = supabase.from('outbound')
        .select(`
          outbound_date,
          quantity,
          unit_price,
          parts(category_id)
        `)
        .gte('outbound_date', startDate)
        .lte('outbound_date', endDate);
      
      // 카테고리 필터링
      if (categoryId && categoryId !== 'all') {
        inboundQuery = inboundQuery.eq('parts.category_id', categoryId);
        outboundQuery = outboundQuery.eq('parts.category_id', categoryId);
      }
      
      // 쿼리 실행
      const [inboundResult, outboundResult] = await Promise.all([
        inboundQuery,
        outboundQuery
      ]);
      
      if (inboundResult.error) throw inboundResult.error;
      if (outboundResult.error) throw outboundResult.error;
      
      // 월별 비용 데이터 집계
      const monthlyCosts: Record<string, { month: string; inbound_cost: number; outbound_cost: number; net_cost: number }> = {};
      
      // 입고 비용 처리
      inboundResult.data.forEach((item: any) => {
        const month = item.inbound_date.substring(0, 7); // YYYY-MM 형식
        if (!monthlyCosts[month]) {
          monthlyCosts[month] = { month, inbound_cost: 0, outbound_cost: 0, net_cost: 0 };
        }
        monthlyCosts[month]!.inbound_cost += item.quantity * item.unit_price;
      });
      
      // 출고 비용 처리
      outboundResult.data.forEach((item: any) => {
        const month = item.outbound_date.substring(0, 7); // YYYY-MM 형식
        if (!monthlyCosts[month]) {
          monthlyCosts[month] = { month, inbound_cost: 0, outbound_cost: 0, net_cost: 0 };
        }
        monthlyCosts[month]!.outbound_cost += item.quantity * item.unit_price;
      });
      
      // 순 비용 계산
      Object.values(monthlyCosts).forEach((item) => {
        item.net_cost = item.inbound_cost - item.outbound_cost;
      });
      
      // 결과를 배열로 변환하고 월별로 정렬
      return Object.values(monthlyCosts).sort((a, b) => a.month.localeCompare(b.month));
    } catch (error) {
      console.error('비용 분석 데이터를 불러오는데 실패했습니다:', error);
      throw error;
    }
  }
};