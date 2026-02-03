/**
 * Inventory (재고) Zustand 스토어
 *
 * ⚠️ 실제 Supabase 데이터만 사용합니다. Mock 데이터 절대 금지!
 */

import { create } from 'zustand';
import type { Inventory, InventoryWithPart } from '../types/database.types';
import * as inventoryService from '../services/inventory.service';
import { useFactoryStore } from './factory.store';

interface InventoryState {
  // 상태
  inventory: InventoryWithPart[];
  isLoading: boolean;
  error: string | null;
  selectedInventory: InventoryWithPart | null;
  stats: {
    totalItems: number;
    totalQuantity: number;
    lowStockCount: number;
    locations: string[];
  } | null;

  // 액션
  fetchInventory: () => Promise<void>;
  fetchInventoryById: (inventoryId: string) => Promise<void>;
  fetchInventoryByPartId: (partId: string) => Promise<void>;
  fetchLowStockItems: () => Promise<void>;
  fetchInventoryStats: () => Promise<void>;
  updateInventory: (inventoryId: string, updates: Partial<Inventory>) => Promise<void>;
  setSelectedInventory: (inventory: InventoryWithPart | null) => void;
  clearError: () => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  // 초기 상태
  inventory: [],
  isLoading: false,
  error: null,
  selectedInventory: null,
  stats: null,

  // 모든 재고 조회
  fetchInventory: async () => {
    set({ isLoading: true, error: null });
    try {
      const inventory = await inventoryService.getAllInventory();
      set({ inventory, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '재고 조회 실패',
        isLoading: false,
      });
    }
  },

  // 재고 ID로 조회
  fetchInventoryById: async (inventoryId: string) => {
    set({ isLoading: true, error: null });
    try {
      const inventory = await inventoryService.getInventoryById(inventoryId);
      set({ selectedInventory: inventory, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '재고 조회 실패',
        isLoading: false,
      });
    }
  },

  // 부품 ID로 재고 조회
  fetchInventoryByPartId: async (partId: string) => {
    set({ isLoading: true, error: null });
    try {
      const inventory = await inventoryService.getInventoryByPartId(partId);
      set({ selectedInventory: inventory ? { ...inventory } as InventoryWithPart : null, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '재고 조회 실패',
        isLoading: false,
      });
    }
  },

  // 낮은 재고 조회
  fetchLowStockItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const inventory = await inventoryService.getLowStockItems();
      set({ inventory, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '낮은 재고 조회 실패',
        isLoading: false,
      });
    }
  },

  // 재고 통계 조회
  fetchInventoryStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await inventoryService.getInventoryStats();
      set({ stats, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '재고 통계 조회 실패',
        isLoading: false,
      });
    }
  },

  // 재고 수정
  updateInventory: async (inventoryId: string, updates) => {
    set({ isLoading: true, error: null });
    try {
      await inventoryService.updateInventory(inventoryId, updates);
      // 재고 목록 새로고침
      await get().fetchInventory();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '재고 수정 실패',
        isLoading: false,
      });
      throw error;
    }
  },

  // 선택된 재고 설정
  setSelectedInventory: (inventory) => {
    set({ selectedInventory: inventory });
  },

  // 에러 초기화
  clearError: () => {
    set({ error: null });
  },
}));

// Subscribe to factory changes (viewingFactory for observer mode, activeFactory as fallback)
useFactoryStore.subscribe(
  (state) => state.viewingFactory?.factory_id ?? state.activeFactory?.factory_id,
  () => {
    const { fetchInventory, fetchInventoryStats } = useInventoryStore.getState();
    fetchInventory();
    fetchInventoryStats();
  }
);
