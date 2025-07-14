"""
MT_Inventory - RLS 통합 데모 애플리케이션
기존 인증 시스템과 RLS 정책을 통합한 버전
"""
import streamlit as st
import sys
import os
from datetime import datetime
import pandas as pd

# 모듈 경로 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 설정 및 유틸리티 가져오기
from config.config import PAGE_TITLE, PAGE_ICON, PAGES
from utils.auth_rls_integrated import (
    rls_login, rls_logout, get_current_user_data, has_permission, 
    can_access_record, get_filtered_query, is_rls_enabled
)
from utils.helpers import display_error, display_success, display_info
from database.supabase_client import supabase

# 페이지 설정
st.set_page_config(
    page_title=f"{PAGE_TITLE} - RLS Demo",
    page_icon=PAGE_ICON,
    layout="wide",
    initial_sidebar_state="expanded"
)

# CSS 스타일
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1E3A8A;
        text-align: center;
        margin-bottom: 2rem;
        padding: 1rem;
        background: linear-gradient(90deg, #E6E9EF 0%, #F8F9FC 100%);
        border-radius: 10px;
        border-left: 5px solid #4CAF50;
    }
    
    .rls-status {
        position: fixed;
        top: 10px;
        right: 10px;
        background: #4CAF50;
        color: white;
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 0.8rem;
        z-index: 1000;
    }
    
    .user-info {
        background: #F0F8FF;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        border-left: 4px solid #1E3A8A;
    }
    
    .permission-badge {
        background: #E8F5E8;
        color: #2E7D32;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
        margin-right: 0.5rem;
        display: inline-block;
        margin-bottom: 0.25rem;
    }
</style>
""", unsafe_allow_html=True)

def show_rls_status():
    """RLS 상태 표시"""
    if is_rls_enabled():
        st.markdown('<div class="rls-status">🔐 RLS 활성화</div>', unsafe_allow_html=True)

def show_user_info():
    """현재 사용자 정보 표시"""
    user_data = get_current_user_data()
    if user_data:
        st.markdown(f"""
        <div class="user-info">
            <h4>👤 현재 사용자 정보</h4>
            <p><strong>사용자명:</strong> {user_data.get('username', 'N/A')}</p>
            <p><strong>역할:</strong> {user_data.get('role', 'N/A')}</p>
            <p><strong>이메일:</strong> {user_data.get('email', 'N/A')}</p>
            <p><strong>부서:</strong> {user_data.get('department', 'N/A')}</p>
        </div>
        """, unsafe_allow_html=True)

def show_permissions():
    """사용자 권한 표시"""
    permissions = [
        'manage_system_admins', 'manage_admins', 'manage_users',
        'manage_parts', 'manage_inventory', 'manage_suppliers', 
        'view_reports', 'create_requests'
    ]
    
    st.markdown("### 🔑 권한 정보")
    permission_html = ""
    
    for perm in permissions:
        if has_permission(perm):
            permission_html += f'<span class="permission-badge">✅ {perm}</span>'
        else:
            permission_html += f'<span style="opacity: 0.3;">❌ {perm}</span> '
    
    st.markdown(permission_html, unsafe_allow_html=True)

def demo_data_access():
    """데이터 접근 데모"""
    st.markdown("### 📊 데이터 접근 테스트")
    
    tabs = st.tabs(["사용자 데이터", "출고 데이터", "재고 데이터"])
    
    with tabs[0]:
        st.markdown("#### 👥 사용자 데이터 접근 테스트")
        try:
            client = supabase()
            base_query = client.from_('users').select('username, role, email, is_active')
            
            # RLS 필터링 적용
            filtered_query = get_filtered_query('users', base_query)
            response = filtered_query.execute()
            
            if response.data:
                df = pd.DataFrame(response.data)
                st.dataframe(df, use_container_width=True)
                st.info(f"📈 접근 가능한 사용자 수: {len(df)}개")
            else:
                st.warning("접근 가능한 사용자 데이터가 없습니다.")
                
        except Exception as e:
            st.error(f"사용자 데이터 조회 중 오류: {e}")
    
    with tabs[1]:
        st.markdown("#### 📤 출고 데이터 접근 테스트")
        try:
            client = supabase()
            base_query = client.from_('outbound').select('outbound_date, requester, quantity, created_by').limit(10)
            
            # RLS 필터링 적용
            filtered_query = get_filtered_query('outbound', base_query)
            response = filtered_query.execute()
            
            if response.data:
                df = pd.DataFrame(response.data)
                st.dataframe(df, use_container_width=True)
                st.info(f"📈 접근 가능한 출고 기록: {len(df)}개")
            else:
                st.warning("접근 가능한 출고 데이터가 없습니다.")
                
        except Exception as e:
            st.error(f"출고 데이터 조회 중 오류: {e}")
    
    with tabs[2]:
        st.markdown("#### 📦 재고 데이터 접근 테스트")
        try:
            client = supabase()
            base_query = client.from_('inventory').select('current_quantity, location, updated_by').limit(10)
            
            # RLS 필터링 적용  
            filtered_query = get_filtered_query('inventory', base_query)
            response = filtered_query.execute()
            
            if response.data:
                df = pd.DataFrame(response.data)
                st.dataframe(df, use_container_width=True)
                st.info(f"📈 접근 가능한 재고 항목: {len(df)}개")
            else:
                st.warning("접근 가능한 재고 데이터가 없습니다.")
                
        except Exception as e:
            st.error(f"재고 데이터 조회 중 오류: {e}")

def demo_record_access():
    """레코드별 접근 권한 데모"""
    st.markdown("### 🔒 레코드별 접근 권한 테스트")
    
    # 샘플 레코드들
    sample_records = {
        "출고 기록 1 (자신의 부서)": {
            "table": "outbound",
            "data": {
                "department_id": get_current_user_data().get('department_id') if get_current_user_data() else None,
                "created_by": "다른_사용자",
                "requester": "홍길동"
            }
        },
        "출고 기록 2 (다른 부서)": {
            "table": "outbound", 
            "data": {
                "department_id": "other_dept_id",
                "created_by": "다른_사용자",
                "requester": "김철수"
            }
        },
        "출고 기록 3 (본인 생성)": {
            "table": "outbound",
            "data": {
                "department_id": "other_dept_id", 
                "created_by": get_current_user_data().get('username') if get_current_user_data() else None,
                "requester": "본인"
            }
        }
    }
    
    for record_name, record_info in sample_records.items():
        table_name = record_info["table"]
        record_data = record_info["data"]
        
        access_allowed = can_access_record(table_name, record_data)
        status_icon = "✅" if access_allowed else "❌"
        status_text = "접근 가능" if access_allowed else "접근 제한"
        
        st.markdown(f"**{record_name}**: {status_icon} {status_text}")
        
        with st.expander(f"{record_name} 상세 정보"):
            st.json(record_data)

def login_form():
    """RLS 통합 로그인 폼"""
    st.markdown("<h1 class='main-header'>🔐 RLS 통합 인증 데모</h1>", unsafe_allow_html=True)
    
    st.markdown("### 📝 로그인")
    st.info("💡 이 데모는 기존 인증 시스템과 RLS 정책을 통합한 버전입니다.")
    
    with st.form("rls_login_form"):
        username = st.text_input("사용자명 또는 이메일", placeholder="사용자 아이디를 입력하세요")
        password = st.text_input("비밀번호", type="password", placeholder="비밀번호를 입력하세요")
        submit_button = st.form_submit_button("로그인", use_container_width=True)
        
        if submit_button:
            if username and password:
                with st.spinner("로그인 중..."):
                    result = rls_login(username, password)
                    
                    if result['success']:
                        display_success(result['message'])
                        st.rerun()
                    else:
                        display_error(result['message'])
            else:
                display_error("사용자명과 비밀번호를 모두 입력해주세요.")
    
    # 테스트 계정 정보 표시
    st.markdown("### 🧪 테스트 계정")
    test_accounts = [
        {"username": "admin", "password": "admin", "role": "관리자"},
        {"username": "user", "password": "user", "role": "일반 사용자"},
        {"username": "zetooo1972", "password": "zetooo1972", "role": "시스템 관리자"}
    ]
    
    for account in test_accounts:
        st.markdown(f"- **{account['role']}**: `{account['username']}` / `{account['password']}`")

def main_dashboard():
    """메인 대시보드 (로그인 후)"""
    show_rls_status()
    
    # 헤더
    st.markdown("<h1 class='main-header'>🏭 MT_Inventory RLS 통합 데모</h1>", unsafe_allow_html=True)
    
    # 사이드바에 사용자 정보 및 로그아웃
    with st.sidebar:
        show_user_info()
        
        if st.button("🚪 로그아웃", use_container_width=True):
            rls_logout()
            st.rerun()
        
        st.markdown("---")
        show_permissions()
    
    # 메인 컨텐츠
    tab1, tab2, tab3 = st.tabs(["🏠 대시보드", "📊 데이터 접근 테스트", "🔒 권한 테스트"])
    
    with tab1:
        st.markdown("### 📋 RLS 통합 시스템 개요")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric(
                label="🔐 RLS 상태",
                value="활성화" if is_rls_enabled() else "비활성화",
                delta="보안 강화" if is_rls_enabled() else "보안 약함"
            )
        
        with col2:
            user_data = get_current_user_data()
            role = user_data.get('role', 'unknown') if user_data else 'none'
            st.metric(
                label="👤 사용자 역할", 
                value=role,
                delta=f"권한 수준: {role}"
            )
        
        with col3:
            permission_count = sum(1 for perm in [
                'manage_system_admins', 'manage_admins', 'manage_users',
                'manage_parts', 'manage_inventory', 'manage_suppliers', 
                'view_reports', 'create_requests'
            ] if has_permission(perm))
            
            st.metric(
                label="🔑 보유 권한",
                value=f"{permission_count}개",
                delta="활성 권한"
            )
        
        st.markdown("---")
        
        st.markdown("""
        #### 🎯 RLS 통합 시스템 특징
        
        ✅ **기존 인증 시스템 유지**: Streamlit 세션 기반 인증 그대로 사용  
        ✅ **RLS 정책 연동**: 데이터베이스 레벨에서 자동 권한 제어  
        ✅ **부서별 데이터 분리**: 사용자 부서에 따른 데이터 접근 제한  
        ✅ **역할 기반 권한**: 시스템 관리자, 관리자, 일반 사용자별 차등 권한  
        ✅ **실시간 권한 확인**: 페이지 및 기능별 동적 권한 체크  
        """)
    
    with tab2:
        demo_data_access()
    
    with tab3:
        demo_record_access()

def main():
    """메인 애플리케이션 함수"""
    try:
        # 현재 사용자 데이터 확인
        user_data = get_current_user_data()
        
        if user_data:
            # 로그인된 상태 - 메인 대시보드 표시
            main_dashboard()
        else:
            # 로그인되지 않은 상태 - 로그인 폼 표시
            login_form()
            
    except Exception as e:
        st.error(f"애플리케이션 실행 중 오류가 발생했습니다: {e}")
        st.info("페이지를 새로고침하거나 관리자에게 문의하세요.")

if __name__ == "__main__":
    main() 