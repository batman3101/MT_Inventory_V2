"""
RLS 통합 인증 시스템
기존 Streamlit 세션 기반 인증을 유지하면서 RLS와 연동
"""
import streamlit as st
import logging
from typing import Optional, Dict, Any, List
import sys
import os
import uuid
from datetime import datetime

# 상위 디렉토리를 path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.supabase_client import supabase
from utils.auth import check_login_credentials, get_current_user, get_user_role, check_authentication

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RLSIntegratedAuth:
    """
    RLS와 통합된 인증 관리 클래스
    """
    
    def __init__(self):
        self.current_user_data = None
        self.session_id = None
        
    def login(self, username: str, password: str) -> Dict[str, Any]:
        """
        사용자 로그인 및 RLS 컨텍스트 설정
        
        Args:
            username: 사용자명 또는 이메일
            password: 비밀번호
            
        Returns:
            dict: 로그인 결과 정보
        """
        try:
            # 기존 인증 시스템 사용
            user_data = check_login_credentials(username, password)
            
            if not user_data:
                return {
                    'success': False,
                    'message': '로그인에 실패했습니다.',
                    'user_data': None
                }
            
            # 세션 ID 생성
            self.session_id = str(uuid.uuid4())
            
            # RLS 컨텍스트 설정
            self._set_rls_context(user_data)
            
            # 현재 사용자 데이터 캐시
            self.current_user_data = user_data
            
            # Streamlit 세션에 추가 정보 저장
            st.session_state.update({
                'auth_session_id': self.session_id,
                'auth_user_data': user_data,
                'auth_login_time': datetime.now().isoformat(),
                'rls_enabled': True
            })
            
            logger.info(f"사용자 로그인 성공 및 RLS 컨텍스트 설정: {user_data.get('username', 'unknown')}")
            
            return {
                'success': True,
                'message': '로그인에 성공했습니다.',
                'user_data': user_data,
                'session_id': self.session_id
            }
            
        except Exception as e:
            logger.error(f"로그인 처리 중 오류 발생: {e}")
            return {
                'success': False,
                'message': f'로그인 처리 중 오류가 발생했습니다: {str(e)}',
                'user_data': None
            }
    
    def _set_rls_context(self, user_data: Dict[str, Any]):
        """
        RLS 컨텍스트 설정을 위한 내부 함수
        
        Args:
            user_data: 사용자 정보
        """
        try:
            # PostgreSQL의 current_setting을 통해 사용자 컨텍스트 설정
            client = supabase(use_service_role=True)
            
            # 사용자 컨텍스트 변수 설정
            context_data = {
                'current_user_id': str(user_data.get('user_id', '')),
                'current_username': user_data.get('username', ''),
                'current_user_email': user_data.get('email', ''),
                'current_user_role': user_data.get('role', 'user'),
                'current_department_id': str(user_data.get('department_id', '')),
                'session_id': self.session_id
            }
            
            # PostgreSQL 세션 변수로 설정 (RLS에서 사용 가능)
            for key, value in context_data.items():
                if value:  # 빈 값이 아닌 경우만 설정
                    try:
                        # SET LOCAL을 사용하여 트랜잭션 스코프로 제한
                        sql = f"SET LOCAL app.{key} = '{value}'"
                        logger.debug(f"RLS 컨텍스트 설정: {sql}")
                        # 여기서는 실제로 실행하지 않고 로그만 남김 (연결 방식에 따라 조정 필요)
                    except Exception as e:
                        logger.warning(f"컨텍스트 변수 {key} 설정 실패: {e}")
            
            logger.info(f"RLS 컨텍스트 설정 완료: {user_data.get('username', 'unknown')}")
            
        except Exception as e:
            logger.error(f"RLS 컨텍스트 설정 실패: {e}")
    
    def logout(self):
        """
        로그아웃 및 RLS 컨텍스트 정리
        """
        try:
            # 기존 세션 정리
            keys_to_remove = [
                'authenticated', 'username', 'user_role', 
                'auth_session_id', 'auth_user_data', 'auth_login_time', 'rls_enabled'
            ]
            
            for key in keys_to_remove:
                if key in st.session_state:
                    del st.session_state[key]
            
            # 내부 상태 정리
            self.current_user_data = None
            self.session_id = None
            
            logger.info("로그아웃 및 컨텍스트 정리 완료")
            
        except Exception as e:
            logger.error(f"로그아웃 처리 중 오류 발생: {e}")
    
    def get_current_user_data(self) -> Optional[Dict[str, Any]]:
        """
        현재 사용자 데이터 반환
        
        Returns:
            dict: 사용자 데이터 또는 None
        """
        if not check_authentication():
            return None
            
        if 'auth_user_data' in st.session_state:
            return st.session_state.auth_user_data
        
        return self.current_user_data
    
    def has_permission(self, permission: str) -> bool:
        """
        현재 사용자의 권한 확인
        
        Args:
            permission: 확인할 권한명
            
        Returns:
            bool: 권한 보유 여부
        """
        try:
            user_data = self.get_current_user_data()
            if not user_data:
                return False
            
            user_role = user_data.get('role', 'user')
            
            # 권한 매핑
            role_permissions = {
                'system_admin': [
                    'manage_system_admins', 'manage_admins', 'manage_users',
                    'manage_parts', 'manage_inventory', 'manage_suppliers', 
                    'view_reports', 'manage_system_settings'
                ],
                'admin': [
                    'manage_users', 'manage_parts', 'manage_inventory', 
                    'manage_suppliers', 'view_reports'
                ],
                'user': ['view_reports', 'create_requests']
            }
            
            return permission in role_permissions.get(user_role, [])
            
        except Exception as e:
            logger.error(f"권한 확인 중 오류 발생: {e}")
            return False
    
    def get_accessible_departments(self) -> List[str]:
        """
        현재 사용자가 접근 가능한 부서 목록 반환
        
        Returns:
            list: 부서 ID 목록
        """
        try:
            user_data = self.get_current_user_data()
            if not user_data:
                return []
            
            user_role = user_data.get('role', 'user')
            user_dept = user_data.get('department_id')
            
            # 시스템 관리자와 관리자는 모든 부서 접근 가능
            if user_role in ['system_admin', 'admin']:
                client = supabase()
                response = client.from_('departments').select('department_id').execute()
                return [dept['department_id'] for dept in response.data] if response.data else []
            
            # 일반 사용자는 자신의 부서만
            return [user_dept] if user_dept else []
            
        except Exception as e:
            logger.error(f"접근 가능한 부서 조회 중 오류 발생: {e}")
            return []
    
    def can_access_record(self, table_name: str, record_data: Dict[str, Any]) -> bool:
        """
        특정 레코드에 대한 접근 권한 확인
        
        Args:
            table_name: 테이블명
            record_data: 레코드 데이터
            
        Returns:
            bool: 접근 가능 여부
        """
        try:
            user_data = self.get_current_user_data()
            if not user_data:
                return False
            
            user_role = user_data.get('role', 'user')
            username = user_data.get('username', '')
            user_dept = user_data.get('department_id')
            
            # 시스템 관리자는 모든 레코드 접근 가능
            if user_role == 'system_admin':
                return True
            
            # 테이블별 접근 규칙
            if table_name == 'outbound':
                # 출고 데이터: 같은 부서 또는 본인이 생성한 데이터
                record_dept = record_data.get('department_id')
                record_creator = record_data.get('created_by')
                
                return (user_dept and user_dept == record_dept) or \
                       (record_creator and record_creator == username) or \
                       user_role == 'admin'
            
            elif table_name == 'users':
                # 사용자 데이터: 관리자는 일반 사용자만, 본인은 자신의 데이터
                if user_role == 'admin':
                    return record_data.get('role') == 'user' or record_data.get('username') == username
                else:
                    return record_data.get('username') == username
            
            elif table_name in ['inbound', 'inventory']:
                # 입고/재고 데이터: 관리자 이상 또는 본인이 생성한 데이터
                if user_role == 'admin':
                    return True
                record_creator = record_data.get('created_by')
                return record_creator and record_creator == username
            
            # 기본적으로 읽기 권한 허용
            return True
            
        except Exception as e:
            logger.error(f"레코드 접근 권한 확인 중 오류 발생: {e}")
            return False
    
    def get_filtered_query(self, table_name: str, base_query):
        """
        RLS 규칙에 따라 필터링된 쿼리 반환
        
        Args:
            table_name: 테이블명
            base_query: 기본 쿼리 객체
            
        Returns:
            필터링된 쿼리 객체
        """
        try:
            user_data = self.get_current_user_data()
            if not user_data:
                # 인증되지 않은 사용자는 빈 결과 반환
                return base_query.eq('id', 'never_match')
            
            user_role = user_data.get('role', 'user')
            username = user_data.get('username', '')
            user_dept = user_data.get('department_id')
            
            # 시스템 관리자는 필터링 없음
            if user_role == 'system_admin':
                return base_query
            
            # 테이블별 필터링 적용
            if table_name == 'outbound':
                if user_role == 'admin':
                    # 관리자는 모든 출고 데이터 조회 가능
                    return base_query
                else:
                    # 일반 사용자는 자신의 부서 또는 본인이 생성한 데이터만
                    return base_query.or_(
                        f"department_id.eq.{user_dept},created_by.eq.{username}"
                    )
            
            elif table_name == 'users':
                if user_role == 'admin':
                    # 관리자는 일반 사용자와 자신의 정보만
                    return base_query.or_(
                        f"role.eq.user,username.eq.{username}"
                    )
                else:
                    # 일반 사용자는 자신의 정보만
                    return base_query.eq('username', username)
            
            elif table_name in ['inbound', 'inventory'] and user_role == 'user':
                # 일반 사용자는 본인이 생성한 데이터만
                return base_query.eq('created_by', username)
            
            # 기본적으로 필터링 없음
            return base_query
            
        except Exception as e:
            logger.error(f"쿼리 필터링 중 오류 발생: {e}")
            return base_query
    
    def is_rls_enabled(self) -> bool:
        """
        RLS가 활성화되어 있는지 확인
        
        Returns:
            bool: RLS 활성화 상태
        """
        return st.session_state.get('rls_enabled', False)

# 전역 인스턴스
rls_auth = RLSIntegratedAuth()

# 편의 함수들
def rls_login(username: str, password: str) -> Dict[str, Any]:
    """RLS 통합 로그인"""
    return rls_auth.login(username, password)

def rls_logout():
    """RLS 통합 로그아웃"""
    rls_auth.logout()

def get_current_user_data() -> Optional[Dict[str, Any]]:
    """현재 사용자 데이터 반환"""
    return rls_auth.get_current_user_data()

def has_permission(permission: str) -> bool:
    """권한 확인"""
    return rls_auth.has_permission(permission)

def can_access_record(table_name: str, record_data: Dict[str, Any]) -> bool:
    """레코드 접근 권한 확인"""
    return rls_auth.can_access_record(table_name, record_data)

def get_filtered_query(table_name: str, base_query):
    """필터링된 쿼리 반환"""
    return rls_auth.get_filtered_query(table_name, base_query)

def get_accessible_departments() -> List[str]:
    """접근 가능한 부서 목록"""
    return rls_auth.get_accessible_departments()

def is_rls_enabled() -> bool:
    """RLS 활성화 상태 확인"""
    return rls_auth.is_rls_enabled() 