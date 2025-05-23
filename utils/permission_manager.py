"""
사용자별 개별 권한 관리 유틸리티
MT_Inventory 시스템 확장
"""
import streamlit as st
import logging
from typing import Optional, Dict, Any, List, Tuple
import sys
import os
from datetime import datetime, timedelta
import uuid

# 상위 디렉토리를 path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.supabase_client import supabase
from utils.auth import get_current_user

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PermissionManager:
    """사용자별 개별 권한 관리 클래스"""
    
    def __init__(self):
        self.client = supabase()
        
    def is_system_admin(self, user_data: Dict = None) -> bool:
        """시스템 관리자 권한 확인"""
        try:
            if not user_data:
                user_data = get_current_user()
            
            if not user_data:
                return False
                
            return user_data.get('role') == 'system_admin'
            
        except Exception as e:
            logger.error(f"시스템 관리자 권한 확인 오류: {e}")
            return False
    
    def get_all_users(self) -> List[Dict]:
        """모든 사용자 목록 조회 (시스템 관리자만)"""
        try:
            if not self.is_system_admin():
                return []
            
            result = self.client.from_('users').select(
                'user_id, username, email, role, is_active, created_at'
            ).order('username').execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"사용자 목록 조회 오류: {e}")
            return []
    
    def get_all_permissions(self) -> List[Dict]:
        """모든 권한 목록 조회"""
        try:
            result = self.client.from_('permissions').select(
                'permission_id, permission_name, description'
            ).order('permission_name').execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"권한 목록 조회 오류: {e}")
            return []
    
    def get_user_permissions(self, user_id: str) -> Dict[str, Any]:
        """사용자의 모든 권한 조회 (역할 기반 + 개별 권한)"""
        try:
            # 사용자 정보 조회
            user_result = self.client.from_('users').select(
                'user_id, username, email, role'
            ).eq('user_id', user_id).execute()
            
            if not user_result.data:
                return {'user': None, 'role_permissions': [], 'individual_permissions': []}
            
            user = user_result.data[0]
            
            # 역할 기반 권한 조회
            role_perms_result = self.client.from_('role_permissions').select(
                'permissions(permission_id, permission_name, description)'
            ).eq('role', user['role']).execute()
            
            role_permissions = []
            if role_perms_result.data:
                for rp in role_perms_result.data:
                    if rp.get('permissions'):
                        role_permissions.append({
                            **rp['permissions'],
                            'source': 'ROLE',
                            'granted': True
                        })
            
            # 개별 권한 조회
            individual_perms_result = self.client.from_('user_permissions').select(
                'user_permission_id, granted, expires_at, reason, granted_at, '
                'permissions(permission_id, permission_name, description)'
            ).eq('user_id', user_id).execute()
            
            individual_permissions = []
            if individual_perms_result.data:
                for up in individual_perms_result.data:
                    if up.get('permissions'):
                        individual_permissions.append({
                            **up['permissions'],
                            'user_permission_id': up['user_permission_id'],
                            'source': 'INDIVIDUAL',
                            'granted': up['granted'],
                            'expires_at': up['expires_at'],
                            'reason': up['reason'],
                            'granted_at': up['granted_at']
                        })
            
            return {
                'user': user,
                'role_permissions': role_permissions,
                'individual_permissions': individual_permissions
            }
            
        except Exception as e:
            logger.error(f"사용자 권한 조회 오류: {e}")
            return {'user': None, 'role_permissions': [], 'individual_permissions': []}
    
    def grant_permission(self, user_id: str, permission_id: str, 
                        expires_at: Optional[datetime] = None, 
                        reason: str = "") -> bool:
        """사용자에게 개별 권한 부여"""
        try:
            if not self.is_system_admin():
                return False
            
            current_user = get_current_user()
            if not current_user:
                return False
            
            # 기존 권한 확인
            existing = self.client.from_('user_permissions').select(
                'user_permission_id'
            ).eq('user_id', user_id).eq('permission_id', permission_id).execute()
            
            data = {
                'user_id': user_id,
                'permission_id': permission_id,
                'granted': True,
                'granted_by': current_user['user_id'],
                'expires_at': expires_at.isoformat() if expires_at else None,
                'reason': reason,
                'updated_at': datetime.now().isoformat()
            }
            
            if existing.data:
                # 업데이트
                result = self.client.from_('user_permissions').update(data).eq(
                    'user_permission_id', existing.data[0]['user_permission_id']
                ).execute()
            else:
                # 새로 생성
                result = self.client.from_('user_permissions').insert(data).execute()
            
            return True
            
        except Exception as e:
            logger.error(f"권한 부여 오류: {e}")
            return False
    
    def revoke_permission(self, user_id: str, permission_id: str, 
                         reason: str = "") -> bool:
        """사용자의 개별 권한 취소"""
        try:
            if not self.is_system_admin():
                return False
            
            current_user = get_current_user()
            if not current_user:
                return False
            
            # 권한 취소 (삭제하지 않고 granted=False로 설정)
            result = self.client.from_('user_permissions').update({
                'granted': False,
                'granted_by': current_user['user_id'],
                'reason': reason,
                'updated_at': datetime.now().isoformat()
            }).eq('user_id', user_id).eq('permission_id', permission_id).execute()
            
            return True
            
        except Exception as e:
            logger.error(f"권한 취소 오류: {e}")
            return False
    
    def get_permission_audit_log(self, user_id: str = None, 
                               limit: int = 100) -> List[Dict]:
        """권한 변경 이력 조회"""
        try:
            if not self.is_system_admin():
                return []
            
            query = self.client.from_('permission_audit_log').select(
                'audit_id, action, old_value, new_value, reason, changed_at, '
                'users!permission_audit_log_user_id_fkey(username, email), '
                'permissions(permission_name, description), '
                'users!permission_audit_log_changed_by_fkey(username)'
            )
            
            if user_id:
                query = query.eq('user_id', user_id)
            
            result = query.order('changed_at', desc=True).limit(limit).execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"권한 변경 이력 조회 오류: {e}")
            return []
    
    def has_effective_permission(self, user_id: str, permission_name: str) -> bool:
        """사용자의 유효한 권한 확인 (역할 기반 + 개별 권한)"""
        try:
            permissions_data = self.get_user_permissions(user_id)
            
            # 개별 권한 먼저 확인 (우선순위 높음)
            for perm in permissions_data['individual_permissions']:
                if perm['permission_name'] == permission_name:
                    # 만료 확인
                    if perm['expires_at']:
                        expires_at = datetime.fromisoformat(perm['expires_at'].replace('Z', '+00:00'))
                        if expires_at <= datetime.now():
                            continue
                    return perm['granted']
            
            # 역할 기반 권한 확인
            for perm in permissions_data['role_permissions']:
                if perm['permission_name'] == permission_name:
                    return perm['granted']
            
            return False
            
        except Exception as e:
            logger.error(f"권한 확인 오류: {e}")
            return False
    
    def get_user_effective_permissions_list(self, user_id: str) -> List[str]:
        """사용자의 유효한 권한 목록 반환"""
        try:
            permissions_data = self.get_user_permissions(user_id)
            effective_permissions = set()
            
            # 역할 기반 권한 추가
            for perm in permissions_data['role_permissions']:
                if perm['granted']:
                    effective_permissions.add(perm['permission_name'])
            
            # 개별 권한으로 덮어쓰기
            for perm in permissions_data['individual_permissions']:
                # 만료 확인
                if perm['expires_at']:
                    expires_at = datetime.fromisoformat(perm['expires_at'].replace('Z', '+00:00'))
                    if expires_at <= datetime.now():
                        continue
                
                if perm['granted']:
                    effective_permissions.add(perm['permission_name'])
                else:
                    effective_permissions.discard(perm['permission_name'])
            
            return list(effective_permissions)
            
        except Exception as e:
            logger.error(f"유효 권한 목록 조회 오류: {e}")
            return []

# 전역 인스턴스
permission_manager = PermissionManager()

# 편의 함수들
def is_system_admin(user_data: Dict = None) -> bool:
    """시스템 관리자 권한 확인"""
    return permission_manager.is_system_admin(user_data)

def has_permission(permission_name: str, user_data: Dict = None) -> bool:
    """사용자 권한 확인"""
    try:
        if not user_data:
            user_data = get_current_user()
        
        if not user_data:
            return False
        
        return permission_manager.has_effective_permission(
            user_data['user_id'], permission_name
        )
        
    except Exception as e:
        logger.error(f"권한 확인 오류: {e}")
        return False

def require_system_admin():
    """시스템 관리자 권한 필수 데코레이터"""
    if not is_system_admin():
        st.error("🚫 시스템 관리자만 접근할 수 있습니다.")
        st.stop()

def require_permission(permission_name: str):
    """특정 권한 필수 데코레이터"""
    if not has_permission(permission_name):
        st.error(f"🚫 '{permission_name}' 권한이 필요합니다.")
        st.stop() 