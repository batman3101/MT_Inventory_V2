/**
 * Users (사용자) Zustand 스토어
 *
 * ⚠️ 실제 Supabase 데이터만 사용합니다. Mock 데이터 절대 금지!
 */

import { create } from 'zustand';
import type { User } from '../types/database.types';
import * as usersService from '../services/users.service';

interface UsersState {
  // 상태
  users: User[];
  isLoading: boolean;
  error: string | null;
  selectedUser: User | null;
  stats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    roles: number;
  } | null;
  // 현재 조회 중인 공장 ID (CRUD 후 refresh용)
  currentFactoryId: string | null;

  // 액션
  fetchUsers: () => Promise<void>;
  fetchUserById: (userId: string) => Promise<void>;
  searchUsers: (searchTerm: string) => Promise<void>;
  getUsersByRole: (role: string) => Promise<void>;
  getUsersByStatus: (status: string) => Promise<void>;
  fetchUsersStats: () => Promise<void>;
  createUser: (user: Omit<User, 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  updateUserStatus: (userId: string, isActive: boolean) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  activateAllUsers: () => Promise<void>;
  setSelectedUser: (user: User | null) => void;
  clearError: () => void;
  // 공장별 필터링 액션
  fetchUsersByFactory: (factoryId: string | null) => Promise<void>;
  searchUsersByFactory: (searchTerm: string, factoryId: string | null) => Promise<void>;
  fetchUsersStatsByFactory: (factoryId: string | null) => Promise<void>;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  // 초기 상태
  users: [],
  isLoading: false,
  error: null,
  selectedUser: null,
  stats: null,
  currentFactoryId: null,

  // 모든 사용자 조회
  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const users = await usersService.getAllUsers();
      set({ users, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '사용자 조회 실패',
        isLoading: false,
      });
    }
  },

  // 사용자 ID로 조회
  fetchUserById: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await usersService.getUserById(userId);
      set({ selectedUser: user, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '사용자 조회 실패',
        isLoading: false,
      });
    }
  },

  // 사용자 검색
  searchUsers: async (searchTerm: string) => {
    set({ isLoading: true, error: null });
    try {
      const users = await usersService.searchUsers(searchTerm);
      set({ users, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '사용자 검색 실패',
        isLoading: false,
      });
    }
  },

  // 역할별 사용자 조회
  getUsersByRole: async (role: string) => {
    set({ isLoading: true, error: null });
    try {
      const users = await usersService.getUsersByRole(role);
      set({ users, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '사용자 조회 실패',
        isLoading: false,
      });
    }
  },

  // 상태별 사용자 조회
  getUsersByStatus: async (status: string) => {
    set({ isLoading: true, error: null });
    try {
      const users = await usersService.getUsersByStatus(status);
      set({ users, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '사용자 조회 실패',
        isLoading: false,
      });
    }
  },

  // 사용자 통계 조회
  fetchUsersStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await usersService.getUsersStats();
      set({ stats, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '사용자 통계 조회 실패',
        isLoading: false,
      });
    }
  },

  // 사용자 추가
  createUser: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      // password 필드를 포함한 CreateUserData 타입으로 전달
      await usersService.createUser({
        ...userData,
        password: (userData as { password?: string }).password || '',
      });
      // 현재 공장 컨텍스트로 refresh
      const currentFactoryId = get().currentFactoryId;
      const users = await usersService.getUsersByFactory(currentFactoryId);
      const stats = await usersService.getUsersStatsByFactory(currentFactoryId);
      set({ users, stats, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '사용자 추가 실패',
        isLoading: false,
      });
      throw error;
    }
  },

  // 사용자 수정
  updateUser: async (userId: string, updates) => {
    set({ isLoading: true, error: null });
    try {
      // Partial<User>를 UpdateDto<'users'>로 변환
      const updateData: Record<string, unknown> = {};
      for (const key in updates) {
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
          updateData[key] = updates[key as keyof User];
        }
      }
      await usersService.updateUser(userId, updateData);
      // 현재 공장 컨텍스트로 refresh
      const currentFactoryId = get().currentFactoryId;
      const users = await usersService.getUsersByFactory(currentFactoryId);
      const stats = await usersService.getUsersStatsByFactory(currentFactoryId);
      set({ users, stats, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '사용자 수정 실패',
        isLoading: false,
      });
      throw error;
    }
  },

  // 사용자 상태 변경 (활성화/비활성화)
  updateUserStatus: async (userId: string, isActive: boolean) => {
    set({ isLoading: true, error: null });
    try {
      await usersService.updateUserStatus(userId, isActive);
      // 사용자 목록 및 통계 새로고침
      await get().fetchUsers();
      await get().fetchUsersStats();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '사용자 상태 변경 실패',
        isLoading: false,
      });
      throw error;
    }
  },

  // 사용자 삭제
  deleteUser: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      await usersService.deleteUser(userId);
      // 현재 공장 컨텍스트로 refresh
      const currentFactoryId = get().currentFactoryId;
      const users = await usersService.getUsersByFactory(currentFactoryId);
      const stats = await usersService.getUsersStatsByFactory(currentFactoryId);
      set({ users, stats, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '사용자 삭제 실패',
        isLoading: false,
      });
      throw error;
    }
  },

  // 모든 사용자 활성화
  activateAllUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      await usersService.activateAllUsers();
      // 사용자 목록 및 통계 새로고침
      await get().fetchUsers();
      await get().fetchUsersStats();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '사용자 일괄 활성화 실패',
        isLoading: false,
      });
      throw error;
    }
  },

  // 선택된 사용자 설정
  setSelectedUser: (user) => {
    set({ selectedUser: user });
  },

  // 에러 초기화
  clearError: () => {
    set({ error: null });
  },

  // 공장별 사용자 조회
  fetchUsersByFactory: async (factoryId: string | null) => {
    set({ isLoading: true, error: null, currentFactoryId: factoryId });
    try {
      const users = await usersService.getUsersByFactory(factoryId);
      set({ users, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '사용자 조회 실패',
        isLoading: false,
      });
    }
  },

  // 공장별 사용자 검색
  searchUsersByFactory: async (searchTerm: string, factoryId: string | null) => {
    set({ isLoading: true, error: null, currentFactoryId: factoryId });
    try {
      const users = await usersService.searchUsersByFactory(searchTerm, factoryId);
      set({ users, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '사용자 검색 실패',
        isLoading: false,
      });
    }
  },

  // 공장별 사용자 통계 조회
  fetchUsersStatsByFactory: async (factoryId: string | null) => {
    try {
      const stats = await usersService.getUsersStatsByFactory(factoryId);
      set({ stats });
    } catch (error) {
      console.error('사용자 통계 조회 실패:', error);
    }
  },
}));
