/**
 * Inbound (입고) Zustand 스토어
 *
 * ⚠️ 실제 Supabase 데이터만 사용합니다. Mock 데이터 절대 금지!
 */

import { create } from 'zustand';
import type { Inbound, InboundDetail } from '../types/database.types';
import * as inboundService from '../services/inbound.service';
import { useFactoryStore } from './factory.store';

interface InboundState {
  // 상태
  inbounds: Inbound[];
  recentInbounds: Inbound[];
  isLoading: boolean;
  error: string | null;
  selectedInbound: InboundDetail | null;
  stats: {
    totalCount: number;
    totalQuantity: number;
    totalValue: number;
    averageUnitPrice: number;
  } | null;

  // 액션
  fetchInbounds: () => Promise<void>;
  fetchInboundById: (inboundId: string) => Promise<void>;
  fetchInboundByDateRange: (startDate: string, endDate: string) => Promise<void>;
  fetchInboundByPartId: (partId: string) => Promise<void>;
  fetchRecentInbounds: (limit?: number) => Promise<void>;
  fetchInboundStats: (startDate?: string, endDate?: string) => Promise<void>;
  createInbound: (inbound: Omit<Inbound, 'inbound_id' | 'created_at' | 'reference_number' | 'part_code' | 'part_name' | 'supplier_name' | 'part_unit'>) => Promise<void>;
  updateInbound: (inboundId: string, updates: Partial<Inbound>) => Promise<void>;
  deleteInbound: (inboundId: string) => Promise<void>;
  setSelectedInbound: (inbound: InboundDetail | null) => void;
  clearError: () => void;
}

export const useInboundStore = create<InboundState>((set, get) => ({
  // 초기 상태
  inbounds: [],
  recentInbounds: [],
  isLoading: false,
  error: null,
  selectedInbound: null,
  stats: null,

  // 모든 입고 내역 조회
  fetchInbounds: async () => {
    set({ isLoading: true, error: null });
    try {
      const inbounds = await inboundService.getAllInbound();
      set({ inbounds, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '입고 내역 조회 실패',
        isLoading: false,
      });
    }
  },

  // 입고 ID로 조회
  fetchInboundById: async (inboundId: string) => {
    set({ isLoading: true, error: null });
    try {
      const inbound = await inboundService.getInboundById(inboundId);
      set({ selectedInbound: inbound, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '입고 내역 조회 실패',
        isLoading: false,
      });
    }
  },

  // 날짜 범위별 입고 조회
  fetchInboundByDateRange: async (startDate: string, endDate: string) => {
    set({ isLoading: true, error: null });
    try {
      const inbounds = await inboundService.getInboundByDateRange(startDate, endDate);
      set({ inbounds, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '입고 내역 조회 실패',
        isLoading: false,
      });
    }
  },

  // 부품별 입고 내역 조회
  fetchInboundByPartId: async (partId: string) => {
    set({ isLoading: true, error: null });
    try {
      const inbounds = await inboundService.getInboundByPartId(partId);
      set({ inbounds, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '입고 내역 조회 실패',
        isLoading: false,
      });
    }
  },

  // 최근 입고 내역 조회
  fetchRecentInbounds: async (limit = 10) => {
    set({ isLoading: true, error: null });
    try {
      const recentInbounds = await inboundService.getRecentInbound(limit);
      set({ recentInbounds, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '최근 입고 내역 조회 실패',
        isLoading: false,
      });
    }
  },

  // 입고 통계 조회
  fetchInboundStats: async (startDate?: string, endDate?: string) => {
    set({ isLoading: true, error: null });
    try {
      const stats = await inboundService.getInboundStats(startDate, endDate);
      set({ stats, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '입고 통계 조회 실패',
        isLoading: false,
      });
    }
  },

  // 입고 추가
  createInbound: async (inboundData) => {
    set({ isLoading: true, error: null });
    try {
      await inboundService.createInbound(inboundData);
      // 입고 목록 새로고침
      await get().fetchInbounds();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '입고 추가 실패',
        isLoading: false,
      });
      throw error;
    }
  },

  // 입고 수정
  updateInbound: async (inboundId: string, updates) => {
    set({ isLoading: true, error: null });
    try {
      await inboundService.updateInbound(inboundId, updates);
      // 입고 목록 새로고침
      await get().fetchInbounds();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '입고 수정 실패',
        isLoading: false,
      });
      throw error;
    }
  },

  // 입고 삭제
  deleteInbound: async (inboundId: string) => {
    set({ isLoading: true, error: null });
    try {
      await inboundService.deleteInbound(inboundId);
      // 입고 목록 새로고침
      await get().fetchInbounds();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '입고 삭제 실패',
        isLoading: false,
      });
      throw error;
    }
  },

  // 선택된 입고 설정
  setSelectedInbound: (inbound) => {
    set({ selectedInbound: inbound });
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
    const { fetchInbounds, fetchRecentInbounds } = useInboundStore.getState();
    fetchInbounds();
    fetchRecentInbounds(10);
  }
);
