/**
 * Parts (부품) Zustand 스토어
 *
 * ⚠️ 실제 Supabase 데이터만 사용합니다. Mock 데이터 절대 금지!
 */

import { create } from 'zustand';
import type { Part } from '../types/database.types';
import * as partsService from '../services/parts.service';

interface PartsState {
  // 상태
  parts: Part[];
  isLoading: boolean;
  error: string | null;
  selectedPart: Part | null;
  stats: {
    totalParts: number;
    activeParts: number;
    categories: number;
    inactiveParts: number;
  } | null;

  // 액션
  fetchParts: () => Promise<void>;
  fetchPartById: (partId: string) => Promise<void>;
  searchParts: (searchTerm: string) => Promise<void>;
  getPartsByCategory: (category: string) => Promise<void>;
  fetchPartsStats: () => Promise<void>;
  createPart: (part: Omit<Part, 'part_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePart: (partId: string, updates: Partial<Part>) => Promise<void>;
  updatePartStatus: (partId: string, status: string) => Promise<void>;
  deletePart: (partId: string) => Promise<void>;
  setSelectedPart: (part: Part | null) => void;
  clearError: () => void;
}

export const usePartsStore = create<PartsState>((set, get) => ({
  // 초기 상태
  parts: [],
  isLoading: false,
  error: null,
  selectedPart: null,
  stats: null,

  // 모든 부품 조회
  fetchParts: async () => {
    set({ isLoading: true, error: null });
    try {
      const parts = await partsService.getAllParts();
      set({ parts, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '부품 조회 실패',
        isLoading: false,
      });
    }
  },

  // 부품 ID로 조회
  fetchPartById: async (partId: string) => {
    set({ isLoading: true, error: null });
    try {
      const part = await partsService.getPartById(partId);
      set({ selectedPart: part, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '부품 조회 실패',
        isLoading: false,
      });
    }
  },

  // 부품 검색
  searchParts: async (searchTerm: string) => {
    set({ isLoading: true, error: null });
    try {
      const parts = await partsService.searchParts(searchTerm);
      set({ parts, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '부품 검색 실패',
        isLoading: false,
      });
    }
  },

  // 카테고리별 부품 조회
  getPartsByCategory: async (category: string) => {
    set({ isLoading: true, error: null });
    try {
      const parts = await partsService.getPartsByCategory(category);
      set({ parts, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '부품 조회 실패',
        isLoading: false,
      });
    }
  },

  // 부품 통계 조회
  fetchPartsStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await partsService.getPartsStats();
      set({ stats, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '부품 통계 조회 실패',
        isLoading: false,
      });
    }
  },

  // 부품 추가
  createPart: async (partData) => {
    set({ isLoading: true, error: null });
    try {
      await partsService.createPart(partData);
      // 부품 목록 새로고침
      await get().fetchParts();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '부품 추가 실패',
        isLoading: false,
      });
      throw error;
    }
  },

  // 부품 수정
  updatePart: async (partId: string, updates) => {
    set({ isLoading: true, error: null });
    try {
      await partsService.updatePart(partId, updates);
      // 부품 목록 새로고침
      await get().fetchParts();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '부품 수정 실패',
        isLoading: false,
      });
      throw error;
    }
  },

  // 부품 삭제
  deletePart: async (partId: string) => {
    set({ isLoading: true, error: null });
    try {
      await partsService.deletePart(partId);
      // 부품 목록 새로고침
      await get().fetchParts();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '부품 삭제 실패',
        isLoading: false,
      });
      throw error;
    }
  },

  // 부품 상태 변경
  updatePartStatus: async (partId: string, status: string) => {
    set({ isLoading: true, error: null });
    try {
      await partsService.updatePartStatus(partId, status);
      // 부품 목록 및 통계 새로고침
      await get().fetchParts();
      await get().fetchPartsStats();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '부품 상태 변경 실패',
        isLoading: false,
      });
      throw error;
    }
  },

  // 선택된 부품 설정
  setSelectedPart: (part) => {
    set({ selectedPart: part });
  },

  // 에러 초기화
  clearError: () => {
    set({ error: null });
  },
}));
