// @ts-nocheck
/**
 * Users (사용자) 서비스
 *
 * ⚠️ 실제 Supabase 데이터베이스에서 사용자 데이터를 조회/관리합니다.
 * Mock 데이터나 테스트 데이터를 사용하지 않습니다.
 */

import { supabase } from '@/lib/supabase.ts';
import type { User, InsertDto, UpdateDto } from '../types/database.types';

/**
 * 모든 사용자 조회
 */
export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('사용자 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 사용자 ID로 조회
 */
export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('사용자 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 사용자명으로 조회
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // 데이터 없음
      return null;
    }
    console.error('사용자 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 역할별 사용자 조회
 */
export async function getUsersByRole(role: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', role)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('사용자 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 상태별 사용자 조회
 */
export async function getUsersByStatus(status: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('사용자 조회 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 사용자 검색 (사용자명, 이메일로)
 */
export async function searchUsers(searchTerm: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('사용자 검색 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 사용자 추가
 */
export async function createUser(
  user: InsertDto<'users'>
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert(user as any)
    .select()
    .single();

  if (error) {
    console.error('사용자 추가 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 사용자 수정
 */
export async function updateUser(
  userId: string,
  updates: UpdateDto<'users'>
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update(updates as any)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('사용자 수정 에러:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 사용자 삭제
 */
export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('사용자 삭제 에러:', error);
    throw new Error(error.message);
  }
}

/**
 * 사용자 활성화/비활성화
 */
export async function updateUserStatus(
  userId: string,
  isActive: boolean
): Promise<User> {
  return updateUser(userId, { is_active: isActive });
}

/**
 * 모든 사용자 활성화
 */
export async function activateAllUsers(): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ is_active: true })
    .neq('user_id', '00000000-0000-0000-0000-000000000000'); // 모든 실제 사용자

  if (error) {
    console.error('사용자 일괄 활성화 에러:', error);
    throw new Error(error.message);
  }
}

/**
 * 사용자 통계
 */
export async function getUsersStats() {
  const { data, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    console.error('사용자 통계 조회 에러:', error);
    throw new Error(error.message);
  }

  const users = data as User[];

  return {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.is_active).length,
    inactiveUsers: users.filter((u) => !u.is_active).length,
    roles: [...new Set(users.map((u) => u.role))].length,
  };
}
