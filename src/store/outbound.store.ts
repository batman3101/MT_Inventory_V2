/**
 * Outbound (출고) Zustand 스토어
 *
 * ⚠️ 실제 Supabase 데이터만 사용합니다. Mock 데이터 절대 금지!
 */

import { create } from 'zustand';
import type { Outbound, OutboundDetail } from '../types/database.types';
import * as outboundService from '../services/outbound.service';

interface OutboundState {
  // 상태
  outbounds: Outbound[];
  recentOutbounds: Outbound[];
  isLoading: boolean;
  error: string | null;
  selectedOutbound: OutboundDetail | null;
  stats: {
    totalCount: number;
    totalQuantity: number;
    byDepartment: Record<string, number>;
    byReason: Record<string, number>;
  } | null;

  // 액션
  fetchOutbounds: () => Promise<void>;
  fetchOutboundById: (outboundId: string) => Promise<void>;
  fetchOutboundByDateRange: (startDate: string, endDate: string) => Promise<void>;
  fetchOutboundByPartId: (partId: string) => Promise<void>;
  fetchRecentOutbounds: (limit?: number) => Promise<void>;
  fetchOutboundStats: (startDate?: string, endDate?: string) => Promise<void>;
  createOutbound: (outbound: Omit<Outbound, 'outbound_id' | 'created_at' | 'reference_number' | 'part_code' | 'part_name' | 'department_name' | 'part_unit'>) => Promise<void>;
  updateOutbound: (outboundId: string, updates: Partial<Outbound>) => Promise<void>;
  deleteOutbound: (outboundId: string) => Promise<void>;
  setSelectedOutbound: (outbound: OutboundDetail | null) => void;
  clearError: () => void;
}

export const useOutboundStore = create<OutboundState>((set, get) => ({
  // 초기 상태
  outbounds: [],
  recentOutbounds: [],
  isLoading: false,
  error: null,
  selectedOutbound: null,
  stats: null,

  // 모든 출고 내역 조회
  fetchOutbounds: async () => {
    set({ isLoading: true, error: null });
    try {
      const outbounds = await outboundService.getAllOutbound();
      set({ outbounds, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '출고 내역 조회 실패',
        isLoading: false,
      });
    }
  },

  // 출고 ID로 조회
  fetchOutboundById: async (outboundId: string) => {
    set({ isLoading: true, error: null });
    try {
      const outbound = await outboundService.getOutboundById(outboundId);
      set({ selectedOutbound: outbound, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '출고 내역 조회 실패',
        isLoading: false,
      });
    }
  },

  // 날짜 범위별 출고 조회
  fetchOutboundByDateRange: async (startDate: string, endDate: string) => {
    set({ isLoading: true, error: null });
    try {
      const outbounds = await outboundService.getOutboundByDateRange(startDate, endDate);
      set({ outbounds, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '출고 내역 조회 실패',
        isLoading: false,
      });
    }
  },

  // 부품별 출고 내역 조회
  fetchOutboundByPartId: async (partId: string) => {
    set({ isLoading: true, error: null });
    try {
      const outbounds = await outboundService.getOutboundByPartId(partId);
      set({ outbounds, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '출고 내역 조회 실패',
        isLoading: false,
      });
    }
  },

  // 최근 출고 내역 조회
  fetchRecentOutbounds: async (limit = 10) => {
    set({ isLoading: true, error: null });
    try {
      const recentOutbounds = await outboundService.getRecentOutbound(limit);
      set({ recentOutbounds, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '최근 출고 내역 조회 실패',
        isLoading: false,
      });
    }
  },

  // 출고 통계 조회
  fetchOutboundStats: async (startDate?: string, endDate?: string) => {
    set({ isLoading: true, error: null });
    try {
      const stats = await outboundService.getOutboundStats(startDate, endDate);
      set({ stats, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '출고 통계 조회 실패',
        isLoading: false,
      });
    }
  },

  // 출고 추가
  createOutbound: async (outboundData) => {
    set({ isLoading: true, error: null });
    try {
      await outboundService.createOutbound(outboundData);
      // 출고 목록 새로고침
      await get().fetchOutbounds();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '출고 추가 실패',
        isLoading: false,
      });
      throw error;
    }
  },

  // 출고 수정
  updateOutbound: async (outboundId: string, updates) => {
    set({ isLoading: true, error: null });
    try {
      await outboundService.updateOutbound(outboundId, updates);
      // 출고 목록 새로고침
      await get().fetchOutbounds();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '출고 수정 실패',
        isLoading: false,
      });
      throw error;
    }
  },

  // 출고 삭제
  deleteOutbound: async (outboundId: string) => {
    set({ isLoading: true, error: null });
    try {
      await outboundService.deleteOutbound(outboundId);
      // 출고 목록 새로고침
      await get().fetchOutbounds();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '출고 삭제 실패',
        isLoading: false,
      });
      throw error;
    }
  },

  // 선택된 출고 설정
  setSelectedOutbound: (outbound) => {
    set({ selectedOutbound: outbound });
  },

  // 에러 초기화
  clearError: () => {
    set({ error: null });
  },
}));
