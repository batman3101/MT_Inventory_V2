"""
인증 관련 유틸리티 모듈
"""
import os
import pickle
import streamlit as st
import streamlit_authenticator as stauth
import yaml
from yaml.loader import SafeLoader
import sys
import logging
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# 상위 디렉토리를 path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.supabase_client import supabase

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 세션 상태 초기화
if 'authenticated' not in st.session_state:
    st.session_state.authenticated = False
if 'username' not in st.session_state:
    st.session_state.username = None
if 'user_role' not in st.session_state:
    st.session_state.user_role = None

def create_auth_config():
    """
    인증 설정 파일 생성
    """
    try:
        # 샘플 사용자 정보
        sample_config = {
            'credentials': {
                'usernames': {
                    'admin': {
                        'email': 'admin@example.com',
                        'name': '관리자',
                        'password': stauth.Hasher(['admin']).generate()[0],
                        'role': 'admin'
                    },
                    'user': {
                        'email': 'user@example.com',
                        'name': '일반 사용자',
                        'password': stauth.Hasher(['user']).generate()[0],
                        'role': 'user'
                    }
                }
            },
            'cookie': {
                'expiry_days': 30,
                'key': 'mtinventory_auth',
                'name': 'mtinventory_auth'
            }
        }
        
        # config 폴더 생성
        os.makedirs('config', exist_ok=True)
        
        # YAML 파일로 저장
        with open('config/auth.yaml', 'w') as f:
            yaml.dump(sample_config, f, default_flow_style=False)
        
        return sample_config
    except Exception as e:
        logger.error(f"인증 설정 파일 생성 실패: {e}")
        return None

def load_auth_config():
    """
    인증 설정 파일 로드
    
    Returns:
        dict: 인증 설정 정보
    """
    try:
        # 설정 파일이 없는 경우 생성
        if not os.path.exists('config/auth.yaml'):
            return create_auth_config()
        
        # 설정 파일 로드
        with open('config/auth.yaml', 'r') as f:
            config = yaml.load(f, Loader=SafeLoader)
        
        return config
    except Exception as e:
        logger.error(f"인증 설정 파일 로드 실패: {e}")
        return None

def authenticate_user():
    """
    사용자 인증
    
    Returns:
        bool: 인증 성공 여부
    """
    try:
        # 인증 설정 로드
        config = load_auth_config()
        if not config:
            st.error("인증 설정을 불러올 수 없습니다.")
            return False
        
        # 직접 로그인 폼 구현 (간결하게 구성)
        with st.container():
            username = st.text_input("사용자명", key="username_input", placeholder="사용자 아이디를 입력하세요")
            password = st.text_input("비밀번호", type="password", key="password_input", placeholder="비밀번호를 입력하세요")
            login_button = st.button("로그인", use_container_width=True)
        
        if login_button:
            if username in config['credentials']['usernames']:
                user_data = config['credentials']['usernames'][username]
                # 비밀번호 검증
                import bcrypt
                
                # 해시된 비밀번호 (auth.yaml에서)
                stored_password = user_data['password']
                
                # stauth.Hasher를 사용하여 암호 검증
                if bcrypt.checkpw(password.encode(), stored_password.encode()):
                    st.session_state.authenticated = True
                    st.session_state.username = username
                    st.session_state.user_role = user_data['role']
                    st.rerun()
                    return True
                else:
                    st.error("아이디 또는 비밀번호가 올바르지 않습니다.")
            else:
                st.error("아이디 또는 비밀번호가 올바르지 않습니다.")
        
        return False
    
    except Exception as e:
        logger.error(f"사용자 인증 중 오류 발생: {e}")
        st.error("인증 처리 중 오류가 발생했습니다.")
        return False

def check_authentication():
    """
    인증 상태 확인
    
    Returns:
        bool: 인증 상태
    """
    return st.session_state.authenticated

def get_current_user():
    """
    현재 사용자 정보 반환
    
    Returns:
        str: 현재 사용자명
    """
    return st.session_state.username

def get_user_role():
    """
    현재 사용자 역할 반환
    
    Returns:
        str: 현재 사용자 역할
    """
    return st.session_state.user_role

def logout():
    """
    로그아웃
    """
    st.session_state.authenticated = False
    st.session_state.username = None
    st.session_state.user_role = None

def check_login_credentials(username, password):
    """
    사용자 로그인 인증
    
    Args:
        username (str): 사용자 아이디
        password (str): 비밀번호
    
    Returns:
        dict or None: 인증 성공 시 사용자 정보, 실패 시 None
    """
    try:
        # 환경 변수에서 시스템 관리자 계정 정보 확인
        system_admin_email = os.getenv("SYSTEM_ADMIN_EMAIL")
        system_admin_password = os.getenv("SYSTEM_ADMIN_PASSWORD")
        
        # 환경 변수에 설정된 시스템 관리자 계정인 경우 확인
        if system_admin_email and system_admin_password:
            if username.lower() == system_admin_email.lower() and password == system_admin_password:
                logger.info(f"환경 변수 시스템 관리자 로그인 성공: {username}")
                # 세션 상태 업데이트
                st.session_state.authenticated = True
                st.session_state.username = username
                st.session_state.user_role = 'system_admin'
                
                # 기본 정보 반환
                return {
                    'user_id': 'admin',
                    'username': username,
                    'role': 'system_admin',
                    'full_name': '시스템 관리자'
                }
        
        # [변경사항] Supabase에서 직접 사용자 확인 - auth.yaml 이전에 먼저 시도
        try:
            import bcrypt
            from database.supabase_client import supabase
            
            # 이메일 또는 사용자명으로 사용자 찾기 시도
            logger.info(f"Supabase에서 사용자 조회 시도 - 입력된 사용자명: {username}")
            # 사용자명으로 찾기
            username_query = supabase().from_('users').select('*').eq('username', username)
            # 이메일로도 찾기
            response = username_query.execute()
            
            # 사용자명으로 찾지 못한 경우 이메일로 찾기 시도
            if not response.data:
                email_query = supabase().from_('users').select('*').eq('email', username)
                response = email_query.execute()
                if response.data:
                    logger.info(f"이메일로 사용자 찾음: {username}")
            else:
                logger.info(f"사용자명으로 사용자 찾음: {username}")
                
            # 사용자가 있으면 비밀번호 검증    
            if response.data:
                user_data = response.data[0]
                # 비밀번호 확인
                stored_password = user_data.get('password_hash')
                if stored_password and bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8')):
                    logger.info(f"Supabase 사용자 로그인 성공: {user_data['username']}")
                    
                    # 계정 활성화 상태 확인
                    if not user_data.get('is_active', True):
                        logger.warning(f"비활성화된 계정 로그인 시도: {username}")
                        return None
                    
                    # 세션 상태 업데이트
                    st.session_state.authenticated = True
                    st.session_state.username = user_data['username']
                    st.session_state.user_role = user_data.get('role', 'user')
                    
                    return user_data
                else:
                    logger.warning(f"Supabase 사용자 비밀번호 불일치: {username}")
            else:
                logger.info(f"Supabase에서 사용자를 찾을 수 없음: {username}")
        except Exception as e:
            logger.error(f"Supabase 사용자 인증 중 오류 발생: {e}")
                
        # 인증 설정 로드 (auth.yaml 기반 인증 - 기존 로직)
        config = load_auth_config()
        if not config or 'credentials' not in config:
            st.error("인증 설정을 불러올 수 없습니다.")
            return None
        
        credentials = config['credentials']
        
        # 사용자 존재 여부 확인
        if 'usernames' in credentials and username in credentials['usernames']:
            user_info = credentials['usernames'][username]
            
            # 비밀번호 확인 - bcrypt 직접 사용
            import bcrypt
            stored_password = user_info['password']
            
            # bcrypt 검증
            if bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8')):
                # 세션 상태 업데이트
                st.session_state.authenticated = True
                st.session_state.username = username
                st.session_state.user_role = user_info.get('role', 'user')
                
                logger.info(f"auth.yaml 사용자 로그인 성공: {username}, 역할: {user_info.get('role', 'user')}")
                
                # Supabase에서 사용자 정보 가져오기 (기존 로직)
                try:
                    from database.supabase_client import supabase
                    response = supabase().from_('users').select('*').eq('username', username).execute()
                    if response.data:
                        user_data = response.data[0]
                        return user_data
                    else:
                        # Supabase에서 사용자를 찾지 못한 경우, 기본 정보만 반환
                        return {
                            'user_id': username,  # 임시 ID
                            'username': username,
                            'role': user_info.get('role', 'user'),
                            'full_name': user_info.get('name', '')
                        }
                except Exception as e:
                    logger.error(f"Supabase에서 사용자 정보를 가져오는 중 오류 발생: {e}")
                    # 기본 정보만 반환
                    return {
                        'user_id': username,  # 임시 ID
                        'username': username,
                        'role': user_info.get('role', 'user'),
                        'full_name': user_info.get('name', '')
                    }
            else:
                logger.warning(f"auth.yaml 비밀번호 불일치: {username}")
        else:
            logger.warning(f"auth.yaml에서 사용자를 찾을 수 없음: {username}")
        
        # 인증 실패
        return None
    
    except Exception as e:
        logger.error(f"로그인 인증 중 오류 발생: {e}")
        return None

def update_last_login(user_id):
    """
    사용자 마지막 로그인 시간 업데이트
    
    Args:
        user_id (str): 사용자 ID
    """
    try:
        if not user_id:
            logger.warning("사용자 ID가 없어 마지막 로그인 시간을 업데이트할 수 없습니다.")
            return
            
        # Supabase에서 사용자 정보 업데이트
        from database.supabase_client import supabase
        from datetime import datetime
        
        # 현재 시간
        now = datetime.now().isoformat()
        
        # 사용자 정보 업데이트
        supabase().from_('users').update({'last_login': now}).eq('user_id', user_id).execute()
        logger.info(f"사용자 ID {user_id}의 마지막 로그인 시간이 업데이트되었습니다.")
    except Exception as e:
        logger.error(f"마지막 로그인 시간 업데이트 중 오류 발생: {e}") 