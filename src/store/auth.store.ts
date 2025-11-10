/**
 * Auth (인증) Zustand 스토어
 *
 * ⚠️ Supabase Auth를 사용합니다.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  // 상태
  user: User | null;
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
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          set({
            user: data.user,
            session: data.session,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Login failed',
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      // 로그아웃
      signOut: async () => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;

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

      // 세션 확인
      checkSession: async () => {
        set({ isLoading: true });
        try {
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) throw error;

          if (session) {
            set({
              user: session.user,
              session: session,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
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
