"""
Supabase 설정 페이지
"""
import streamlit as st
import sys
import os
import logging
import yaml
import json
from datetime import datetime

# 상위 디렉토리를 path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.supabase_client import supabase, SupabaseClient
from utils.auth import check_authentication, get_user_role
from utils.i18n import get_text
from utils.helpers import display_error, display_success, display_info

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def supabase_settings():
    """
    Supabase 설정 페이지 렌더링
    """
    if not check_authentication():
        st.error("로그인이 필요합니다.")
        return
    
    # 시스템 관리자 권한 체크
    user_role = get_user_role()
    if user_role != 'system_admin':
        st.error("Supabase 설정 페이지에 접근할 수 있는 권한이 없습니다.")
        return
    
    st.markdown("<h1 class='main-header'>Supabase 연결 설정</h1>", unsafe_allow_html=True)
    
    # 현재 설정 표시
    display_current_settings()
    
    # 설정 변경 폼
    update_settings_form()
    
    # 테이블 설정 섹션
    st.markdown("<h2>Supabase 테이블 설정 안내</h2>", unsafe_allow_html=True)
    display_db_setup_instructions()

def display_current_settings():
    """
    현재 Supabase 설정 표시
    """
    from config.config import SUPABASE_URL, SUPABASE_KEY
    
    # 연결 상태 확인
    connection_status = SupabaseClient().test_connection()
    
    # 상태에 따른 메시지 표시
    st.info(f"Supabase 연결이 {'설정되어 있습니다.' if connection_status else '설정되지 않았습니다.'}")
    
    # 현재 URL 표시
    if SUPABASE_URL:
        st.write("현재 URL:", SUPABASE_URL)
    
    # API Key는 보안을 위해 첫부분만 표시
    if SUPABASE_KEY:
        masked_key = SUPABASE_KEY[:5] + "*" * (len(SUPABASE_KEY) - 10) + SUPABASE_KEY[-5:]
        st.write("현재 API Key:", masked_key)
    
    # 연결 테스트 버튼
    if st.button("연결 테스트"):
        if connection_status:
            display_success("Supabase에 정상적으로 연결되었습니다.")
        else:
            display_error("Supabase 연결에 실패했습니다. 설정을 확인해주세요.")

def update_settings_form():
    """
    Supabase 설정 업데이트 폼
    """
    from config.config import SUPABASE_URL, SUPABASE_KEY
    
    with st.form("supabase_settings_form"):
        st.subheader("Supabase 연결 정보 변경")
        
        supabase_url = st.text_input("Supabase URL", value=SUPABASE_URL or "", help="Supabase 프로젝트 URL")
        supabase_key = st.text_input("Supabase API Key", value=SUPABASE_KEY or "", help="Supabase API Key", type="password")
        
        submitted = st.form_submit_button("설정 저장")
        
        if submitted:
            if update_config_file(supabase_url, supabase_key):
                display_success("Supabase 설정이 업데이트되었습니다. 변경 사항을 적용하려면 애플리케이션을 재시작하세요.")
                # 설정 적용을 위해 클라이언트 재초기화
                SupabaseClient()._initialize()
            else:
                display_error("Supabase 설정 업데이트에 실패했습니다.")

def update_config_file(url, key):
    """
    환경 변수 파일(.env) 업데이트
    
    Args:
        url (str): Supabase URL
        key (str): Supabase API Key
        
    Returns:
        bool: 성공 여부
    """
    try:
        env_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
        
        # 기존 .env 파일 읽기
        env_content = {}
        if os.path.exists(env_file_path):
            with open(env_file_path, 'r') as f:
                for line in f:
                    if '=' in line:
                        key_val = line.strip().split('=', 1)
                        if len(key_val) == 2:
                            env_content[key_val[0]] = key_val[1]
        
        # 설정 업데이트
        env_content['SUPABASE_URL'] = url
        env_content['SUPABASE_KEY'] = key
        
        # 파일에 저장
        with open(env_file_path, 'w') as f:
            for k, v in env_content.items():
                f.write(f"{k}={v}\n")
        
        # config.py에도 반영
        update_config_module(url, key)
        
        return True
    
    except Exception as e:
        logger.error(f"설정 파일 업데이트 실패: {e}")
        return False

def update_config_module(url, key):
    """
    config.py 모듈 내 변수 업데이트
    
    Args:
        url (str): Supabase URL
        key (str): Supabase API Key
    """
    try:
        from config import config
        
        # 변수 설정
        config.SUPABASE_URL = url
        config.SUPABASE_KEY = key
    
    except Exception as e:
        logger.error(f"Config 모듈 업데이트 실패: {e}")

def display_db_setup_instructions():
    """
    데이터베이스 테이블 설정 안내 표시
    """
    # Supabase SQL 에디터로 연결
    st.write("Supabase SQL 에디터를 사용하여 필요한 테이블을 설정할 수 있습니다.")
    
    # 데이터베이스 스키마 표시
    st.markdown("### 필요한 테이블 스키마")
    
    db_schema_tab1, db_schema_tab2 = st.tabs(["테이블 스키마", "SQL 스크립트"])
    
    with db_schema_tab1:
        st.write("1. 사용자 테이블 (users)")
        st.code("""
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user', -- 'system_admin', 'admin', 'user'
    department VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
        """)
        
        st.write("2. 권한 테이블 (permissions)")
        st.code("""
CREATE TABLE IF NOT EXISTS permissions (
    permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permission_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
        """)
        
        st.write("3. 역할-권한 매핑 테이블 (role_permissions)")
        st.code("""
CREATE TABLE IF NOT EXISTS role_permissions (
    role_permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(20) NOT NULL,
    permission_id UUID NOT NULL REFERENCES permissions(permission_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission_id)
);
        """)
    
    with db_schema_tab2:
        # 전체 SQL 스크립트 표시
        st.markdown("### 전체 SQL 스크립트")
        
        # 파일 내용 가져오기
        sql_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database', 'db_setup.sql')
        
        if os.path.exists(sql_file_path):
            with open(sql_file_path, 'r') as f:
                sql_content = f.read()
                st.code(sql_content, language="sql")
        else:
            st.warning("SQL 스크립트 파일을 찾을 수 없습니다.")
        
        # SQL 다운로드 버튼
        if os.path.exists(sql_file_path):
            with open(sql_file_path, 'r') as f:
                sql_content = f.read()
                st.download_button(
                    label="SQL 파일 다운로드",
                    data=sql_content,
                    file_name="db_setup.sql",
                    mime="text/plain"
                )
    
    # Supabase 테이블 생성 지침
    st.markdown("### Supabase SQL 편집기에서 테이블 생성하기")
    st.markdown("""
    1. Supabase 대시보드에 로그인합니다.
    2. 프로젝트를 선택합니다.
    3. 왼쪽 메뉴에서 'SQL 편집기'를 클릭합니다.
    4. '새 쿼리' 버튼을 클릭합니다.
    5. 위의 SQL 스크립트를 붙여넣고 실행합니다.
    """)
    
    # 파일 업로드 옵션
    st.markdown("### JSON 파일로 데이터 백업/복원")
    uploaded_file = st.file_uploader("JSON 파일 업로드", type=["json"])
    
    if uploaded_file:
        try:
            # JSON 파일 처리
            data = json.load(uploaded_file)
            st.json(data)
            
            # 데이터 적용 옵션
            if st.button("데이터 적용"):
                # TODO: Supabase에 데이터 적용 로직 구현
                st.info("이 기능은 아직 구현되지 않았습니다.")
        
        except Exception as e:
            st.error(f"파일 처리 중 오류가 발생했습니다: {str(e)}")
    
    # JSON 형식으로 데이터베이스 백업
    if st.button("현재 데이터베이스 백업"):
        # TODO: Supabase에서 데이터 백업 로직 구현
        st.info("이 기능은 아직 구현되지 않았습니다.") 