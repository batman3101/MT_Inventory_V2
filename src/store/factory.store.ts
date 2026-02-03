import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Factory } from '../types/database.types';
import { supabase } from '@/lib/supabase';

interface FactoryState {
  factories: Factory[];
  activeFactory: Factory | null;
  viewingFactory: Factory | null;  // for observer mode
  isObserverMode: boolean;
  isLoading: boolean;
  isInitialized: boolean;  // CRITICAL: Prevent race condition on login

  fetchFactories: () => Promise<void>;
  setActiveFactory: (factory: Factory) => void;
  setViewingFactory: (factory: Factory | null) => void;
  getEffectiveFactoryId: () => string | null;  // returns viewingFactory or activeFactory id
  initializeForUser: (userFactoryId: string | null, isSystemAdmin: boolean) => Promise<void>;
  reset: () => void;
}

export const useFactoryStore = create<FactoryState>()(
  persist(
    (set, get) => ({
      factories: [],
      activeFactory: null,
      viewingFactory: null,
      isObserverMode: false,
      isLoading: false,
      isInitialized: false,

      fetchFactories: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase
            .from('factories')
            .select('*')
            .eq('is_active', true)
            .order('factory_code');

          if (error) throw error;
          set({ factories: data || [], isLoading: false });
        } catch (error) {
          console.error('Failed to fetch factories:', error);
          set({ isLoading: false });
        }
      },

      setActiveFactory: (factory: Factory) => {
        set({
          activeFactory: factory,
          viewingFactory: null,
          isObserverMode: false,
        });
      },

      setViewingFactory: (factory: Factory | null) => {
        const { activeFactory } = get();
        const isObserver = factory !== null &&
          factory.factory_id !== activeFactory?.factory_id;
        set({
          viewingFactory: factory,
          isObserverMode: isObserver,
        });
      },

      getEffectiveFactoryId: () => {
        const { viewingFactory, activeFactory, isInitialized } = get();
        // CRITICAL: Return null if not initialized (prevents race condition)
        if (!isInitialized) {
          console.warn('Factory store not initialized yet');
          return null;
        }
        return viewingFactory?.factory_id ?? activeFactory?.factory_id ?? null;
      },

      // Called on login - MUST complete before any factory-aware queries
      initializeForUser: async (userFactoryId: string | null, isSystemAdmin: boolean) => {
        set({ isLoading: true, isInitialized: false });

        // Fetch factories first
        const { data: factories, error } = await supabase
          .from('factories')
          .select('*')
          .eq('is_active', true)
          .order('factory_code');

        if (error) {
          console.error('Failed to fetch factories:', error);
          set({ isLoading: false });
          return;
        }

        const factoryList = factories || [];
        set({ factories: factoryList });

        // Set active factory
        if (isSystemAdmin) {
          // system_admin defaults to first factory but can switch freely
          const defaultFactory = factoryList[0] || null;
          set({
            activeFactory: defaultFactory,
            viewingFactory: null,
            isObserverMode: false,
            isLoading: false,
            isInitialized: true,
          });
        } else if (userFactoryId) {
          // Regular user - set their assigned factory
          const userFactory = factoryList.find(f => f.factory_id === userFactoryId) || null;
          if (!userFactory) {
            console.error('User factory not found:', userFactoryId);
          }
          set({
            activeFactory: userFactory,
            viewingFactory: null,
            isObserverMode: false,
            isLoading: false,
            isInitialized: true,
          });
        } else {
          // No factory assigned - default to first
          console.warn('User has no factory assigned, defaulting to first');
          set({
            activeFactory: factoryList[0] || null,
            viewingFactory: null,
            isObserverMode: false,
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      reset: () => {
        set({
          factories: [],
          activeFactory: null,
          viewingFactory: null,
          isObserverMode: false,
          isLoading: false,
          isInitialized: false,
        });
      },
    }),
    {
      name: 'factory-storage',
      partialize: (state) => ({
        activeFactory: state.activeFactory,
        viewingFactory: state.viewingFactory,
        isInitialized: state.isInitialized,
      }),
    }
  )
);
