/**
 * Part Price (부품 단가) 스토어
 */
import { create } from 'zustand';
import type { PartPrice, InsertDto, UpdateDto } from '../types/database.types';
import * as partPriceService from '../services/partPrice.service';
import { useFactoryStore } from './factory.store';

interface PartPriceState {
  pricesByPart: Record<string, PartPrice[]>;
  latestPrices: Record<string, PartPrice>;
  isLoading: boolean;
  error: string | null;

  fetchPricesByPartId: (partId: string) => Promise<void>;
  fetchLatestPrices: () => Promise<void>;
  createPrice: (data: InsertDto<'part_prices'>) => Promise<void>;
  updatePrice: (priceId: string, updates: UpdateDto<'part_prices'>) => Promise<void>;
  deletePrice: (priceId: string, partId: string) => Promise<void>;
  clearError: () => void;
}

export const usePartPriceStore = create<PartPriceState>((set, get) => ({
  pricesByPart: {},
  latestPrices: {},
  isLoading: false,
  error: null,

  fetchPricesByPartId: async (partId: string) => {
    set({ isLoading: true, error: null });
    try {
      const prices = await partPriceService.getPartPrices(partId);
      set((state) => ({
        pricesByPart: { ...state.pricesByPart, [partId]: prices },
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '알 수 없는 에러';
      console.error('단가 이력 조회 실패:', error);
      set({ error: message, isLoading: false });
    }
  },

  fetchLatestPrices: async () => {
    set({ isLoading: true, error: null });
    try {
      const latestPrices = await partPriceService.getLatestPartPrices();
      set({ latestPrices, isLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '알 수 없는 에러';
      console.error('최신 단가 조회 실패:', error);
      set({ error: message, isLoading: false });
    }
  },

  createPrice: async (data: InsertDto<'part_prices'>) => {
    set({ isLoading: true, error: null });
    try {
      const created = await partPriceService.createPartPrice(data);
      // Update latestPrices
      set((state) => ({
        latestPrices: { ...state.latestPrices, [created.part_id]: created },
        pricesByPart: {
          ...state.pricesByPart,
          [created.part_id]: [created, ...(state.pricesByPart[created.part_id] || [])],
        },
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '알 수 없는 에러';
      console.error('단가 추가 실패:', error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  updatePrice: async (priceId: string, updates: UpdateDto<'part_prices'>) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await partPriceService.updatePartPrice(priceId, updates);
      // Refresh the part's prices
      await get().fetchPricesByPartId(updated.part_id);
      await get().fetchLatestPrices();
      set({ isLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '알 수 없는 에러';
      console.error('단가 수정 실패:', error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  deletePrice: async (priceId: string, partId: string) => {
    set({ isLoading: true, error: null });
    try {
      await partPriceService.deletePartPrice(priceId);
      // Refresh
      await get().fetchPricesByPartId(partId);
      await get().fetchLatestPrices();
      set({ isLoading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '알 수 없는 에러';
      console.error('단가 삭제 실패:', error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

// Subscribe to factory changes (viewingFactory for observer mode, activeFactory as fallback)
useFactoryStore.subscribe(
  (state) => state.viewingFactory?.factory_id ?? state.activeFactory?.factory_id,
  () => {
    const { fetchLatestPrices } = usePartPriceStore.getState();
    fetchLatestPrices();
  }
);
