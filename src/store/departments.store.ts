import { create } from 'zustand';
import type { Department } from '../types/database.types';
import { getAllDepartments, searchDepartments } from '../services/departments.service';

interface DepartmentsState {
  departments: Department[];
  isLoading: boolean;
  error: string | null;
  fetchDepartments: () => Promise<void>;
  searchDepartments: (searchText: string) => Promise<void>;
}

export const useDepartmentsStore = create<DepartmentsState>((set) => ({
  departments: [],
  isLoading: false,
  error: null,

  fetchDepartments: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getAllDepartments();
      set({ departments: data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch departments',
        isLoading: false,
      });
    }
  },

  searchDepartments: async (searchText: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await searchDepartments(searchText);
      set({ departments: data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to search departments',
        isLoading: false,
      });
    }
  },
}));
