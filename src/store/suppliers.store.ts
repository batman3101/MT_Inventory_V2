/**
 * Suppliers (공급업체) Zustand 스토어
 *
 * ⚠️ 실제 Supabase 데이터만 사용합니다. Mock 데이터 절대 금지!
 */

import { create } from 'zustand';
import type { Supplier } from '../types/database.types';
import * as suppliersService from '../services/suppliers.service';

interface SuppliersState {
  // 상태
  suppliers: Supplier[];
  isLoading: boolean;
  error: string | null;
  selectedSupplier: Supplier | null;

  // 액션
  fetchSuppliers: () => Promise<void>;
  fetchSupplierById: (supplierId: string) => Promise<void>;
  fetchActiveSuppliers: () => Promise<void>;
  searchSuppliers: (searchTerm: string) => Promise<void>;
  createSupplier: (supplier: Omit<Supplier, 'supplier_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateSupplier: (supplierId: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (supplierId: string) => Promise<void>;
  setSelectedSupplier: (supplier: Supplier | null) => void;
  clearError: () => void;
}

export const useSuppliersStore = create<SuppliersState>((set, get) => ({
  // 초기 상태
  suppliers: [],
  isLoading: false,
  error: null,
  selectedSupplier: null,

  // 모든 공급업체 조회
  fetchSuppliers: async () => {
    set({ isLoading: true, error: null });
    try {
      const suppliers = await suppliersService.getAllSuppliers();
      set({ suppliers, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '공급업체 조회 실패',
        isLoading: false,
      });
    }
  },

  // 공급업체 ID로 조회
  fetchSupplierById: async (supplierId: string) => {
    set({ isLoading: true, error: null });
    try {
      const supplier = await suppliersService.getSupplierById(supplierId);
      set({ selectedSupplier: supplier, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '공급업체 조회 실패',
        isLoading: false,
      });
    }
  },

  // 활성 공급업체 조회
  fetchActiveSuppliers: async () => {
    set({ isLoading: true, error: null });
    try {
      const suppliers = await suppliersService.getActiveSuppliers();
      set({ suppliers, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '활성 공급업체 조회 실패',
        isLoading: false,
      });
    }
  },

  // 공급업체 검색
  searchSuppliers: async (searchTerm: string) => {
    set({ isLoading: true, error: null });
    try {
      const suppliers = await suppliersService.searchSuppliers(searchTerm);
      set({ suppliers, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '공급업체 검색 실패',
        isLoading: false,
      });
    }
  },

  // 공급업체 추가
  createSupplier: async (supplierData) => {
    set({ isLoading: true, error: null });
    try {
      await suppliersService.createSupplier(supplierData);
      // 공급업체 목록 새로고침
      await get().fetchSuppliers();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '공급업체 추가 실패',
        isLoading: false,
      });
      throw error;
    }
  },

  // 공급업체 수정
  updateSupplier: async (supplierId: string, updates) => {
    set({ isLoading: true, error: null });
    try {
      await suppliersService.updateSupplier(supplierId, updates);
      // 공급업체 목록 새로고침
      await get().fetchSuppliers();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '공급업체 수정 실패',
        isLoading: false,
      });
      throw error;
    }
  },

  // 공급업체 삭제
  deleteSupplier: async (supplierId: string) => {
    set({ isLoading: true, error: null });
    try {
      await suppliersService.deleteSupplier(supplierId);
      // 공급업체 목록 새로고침
      await get().fetchSuppliers();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '공급업체 삭제 실패',
        isLoading: false,
      });
      throw error;
    }
  },

  // 선택된 공급업체 설정
  setSelectedSupplier: (supplier) => {
    set({ selectedSupplier: supplier });
  },

  // 에러 초기화
  clearError: () => {
    set({ error: null });
  },
}));
