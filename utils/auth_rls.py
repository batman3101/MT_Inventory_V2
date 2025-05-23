"""
RLS와 연동된 인증 시스템
"""
import streamlit as st
import logging
from typing import Optional, Dict, Any
import sys
import os

# 상위 디렉토리를 path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.supabase_client import supabase

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RLSAuthManager:
    """
    RLS와 연동된 인증 관리자 클래스
    """
    
    @staticmethod
    def set_auth_context(user_data: Dict[str, Any]) -> bool:
        """
        Supabase 인증 컨텍스트 설정
        
        Args:
            user_data: 사용자 정보 딕셔너리
            
        Returns:
            bool: 설정 성공 여부
        """
        try:
            # Streamlit 세션에 인증 정보 저장
            st.session_state.auth_user_data = user_data
            st.session_state.auth_user_email = user_data.get('email', '')
            st.session_state.auth_user_role = user_data.get('role', 'user')
            
            logger.info(f"인증 컨텍스트 설정 완료: {user_data.get('username', 'unknown')}")
            return True
            
        except Exception as e:
            logger.error(f"인증 컨텍스트 설정 실패: {e}")
            return False
    
    @staticmethod
    def clear_auth_context():
        """
        인증 컨텍스트 제거
        """
        try:
            # Streamlit 세션에서 인증 정보 제거
            for key in ['auth_user_data', 'auth_user_email', 'auth_user_role']:
                if key in st.session_state:
                    del st.session_state[key]
            
            logger.info("인증 컨텍스트 제거 완료")
            
        except Exception as e:
            logger.error(f"인증 컨텍스트 제거 실패: {e}")
    
    @staticmethod
    def get_authenticated_client():
        """
        인증된 사용자 컨텍스트로 Supabase 클라이언트 반환
        
        Returns:
            Supabase 클라이언트 (RLS 적용)
        """
        try:
            # 현재 인증된 사용자가 있는지 확인
            if 'auth_user_email' not in st.session_state:
                logger.warning("인증되지 않은 사용자입니다.")
                return None
            
            # anon 클라이언트 반환 (RLS 정책 적용됨)
            client = supabase(use_service_role=False)
            
            # TODO: Supabase Auth와 연동하여 실제 JWT 토큰 설정
            # 현재는 세션 기반이므로 클라이언트만 반환
            
            return client
            
        except Exception as e:
            logger.error(f"인증된 클라이언트 반환 실패: {e}")
            return None
    
    @staticmethod
    def check_permission(permission_name: str) -> bool:
        """
        현재 사용자의 권한 확인
        
        Args:
            permission_name: 확인할 권한 이름
            
        Returns:
            bool: 권한 보유 여부
        """
        try:
            if 'auth_user_data' not in st.session_state:
                return False
            
            user_data = st.session_state.auth_user_data
            user_role = user_data.get('role', 'user')
            
            # 권한 매핑 (간단한 형태)
            role_permissions = {
                'system_admin': [
                    'manage_system_admins', 'manage_admins', 'manage_users',
                    'manage_parts', 'manage_inventory', 'manage_suppliers', 'view_reports'
                ],
                'admin': [
                    'manage_users', 'manage_parts', 'manage_inventory', 
                    'manage_suppliers', 'view_reports'
                ],
                'user': ['view_reports']
            }
            
            return permission_name in role_permissions.get(user_role, [])
            
        except Exception as e:
            logger.error(f"권한 확인 실패: {e}")
            return False
    
    @staticmethod
    def get_user_department_id() -> Optional[str]:
        """
        현재 사용자의 부서 ID 반환
        
        Returns:
            str: 부서 ID 또는 None
        """
        try:
            if 'auth_user_data' in st.session_state:
                return st.session_state.auth_user_data.get('department_id')
            return None
            
        except Exception as e:
            logger.error(f"사용자 부서 ID 조회 실패: {e}")
            return None
    
    @staticmethod
    def can_access_data(table_name: str, record_data: Dict[str, Any] = None) -> bool:
        """
        현재 사용자가 특정 테이블의 데이터에 접근할 수 있는지 확인
        
        Args:
            table_name: 테이블 이름
            record_data: 레코드 데이터 (선택사항)
            
        Returns:
            bool: 접근 가능 여부
        """
        try:
            if 'auth_user_data' not in st.session_state:
                return False
            
            user_data = st.session_state.auth_user_data
            user_role = user_data.get('role', 'user')
            
            # 시스템 관리자는 모든 데이터 접근 가능
            if user_role == 'system_admin':
                return True
            
            # 테이블별 접근 규칙
            if table_name == 'outbound' and record_data:
                # 출고 데이터: 자신의 부서 또는 자신이 생성한 데이터만
                user_dept = user_data.get('department_id')
                record_dept = record_data.get('department_id')
                record_creator = record_data.get('created_by')
                
                return (user_dept and user_dept == record_dept) or \
                       (record_creator and record_creator == user_data.get('username'))
            
            # 기본적으로 읽기 권한 허용
            return True
            
        except Exception as e:
            logger.error(f"데이터 접근 권한 확인 실패: {e}")
            return False

# 전역 인스턴스
auth_manager = RLSAuthManager() 