/**
 * Auth (인증) Zustand 스토어
 *
 * ⚠️ 커스텀 인증 API를 사용합니다 (users 테이블 기반).
 * Streamlit 앱과 동일한 인증 방식을 사용합니다.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import type { User as CustomUser } from '../types/database.types';

// 개발 환경에서는 Vite 프록시 사용, 프로덕션에서는 동일 도메인 사용
const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

// Supabase Auth의 User 타입 대신 커스텀 User 타입 사용
interface Session {
  access_token: string;
  user: CustomUser;
}

interface AuthState {
  // 상태
  user: CustomUser | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // 액션
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // 초기 상태
      user: null,
      session: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      // 로그인
      signIn: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post(`${API_URL}/api/auth/login`, {
            email,
            password,
          });

          const { user } = response.data;

          // 세션 생성 (간단한 토큰 기반)
          const session: Session = {
            access_token: `token_${user.user_id}`,
            user,
          };

          set({
            user,
            session,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 'Login failed';
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
          });
          throw new Error(errorMessage);
        }
      },

      // 로그아웃
      signOut: async () => {
        set({ isLoading: true, error: null });
        try {
          // 로컬 상태만 클리어 (서버에 로그아웃 API가 필요하면 나중에 추가)
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Logout failed',
            isLoading: false,
          });
          throw error;
        }
      },

      // 세션 확인 (persist 미들웨어가 자동으로 처리)
      checkSession: async () => {
        set({ isLoading: true });
        try {
          // persist 미들웨어가 localStorage에서 자동으로 복원
          // 추가 검증이 필요한 경우 여기에 구현
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error.message || 'Session check failed',
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      // 에러 초기화
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
