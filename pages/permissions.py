"""
권한 관리 모듈 - 시스템 관리자가 권한 관리 기능 수행
"""
import streamlit as st
import pandas as pd
import sys
import os
import logging
from datetime import datetime

# 상위 디렉토리를 path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.supabase_client import supabase
from utils.auth import check_authentication, get_user_role, get_current_user
from utils.helpers import display_error, display_success, display_info, display_warning

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def show():
    """
    권한 관리 페이지 표시 - 메인 함수
    """
    # 인증 확인
    if not check_authentication():
        st.error("🔒 로그인이 필요합니다.")
        st.stop()

    # 시스템 관리자 또는 관리자 권한 체크
    user_role = get_user_role()
    if user_role not in ['system_admin', 'admin']:
        st.error("🔒 권한 관리 페이지에 접근할 수 있는 권한이 없습니다.")
        st.info(f"현재 역할: {user_role}")
        st.stop()

    # 현재 사용자 정보
    current_user = get_current_user()

    st.markdown("<h1 class='main-header'>🔐 권한 관리</h1>", unsafe_allow_html=True)

    # 현재 사용자 정보 표시
    if current_user:
        st.info(f"👤 현재 사용자: {current_user} ({user_role})")

    # 탭 생성
    tab1, tab2, tab3 = st.tabs(["👥 사용자별 권한 관리", "📋 권한 변경 이력", "⚙️ 시스템 설정"])

    # 탭별 내용 표시
    with tab1:
        display_user_permissions()

    with tab2:
        display_permission_audit()

    with tab3:
        display_system_settings()

def display_user_permissions():
    """
    사용자별 권한 관리 화면 표시
    """
    st.markdown("### 👥 사용자별 권한 관리")
    
    try:
        # 사용자 목록 조회
        response = supabase(use_service_role=True).from_("users").select("""
            user_id, 
            username, 
            full_name, 
            email, 
            role, 
            department_id,
            is_active, 
            created_at
        """).execute()
        
        if response.data:
            users = response.data
            
            # 사용자 선택
            user_options = ["-- 사용자 선택 --"] + [f"{user['username']} ({user['full_name']}) - {user['role']}" for user in users]
            selected_user_display = st.selectbox("사용자 선택", user_options)
            
            if selected_user_display != "-- 사용자 선택 --":
                # 선택된 사용자 찾기
                selected_user = None
                for user in users:
                    if f"{user['username']} ({user['full_name']}) - {user['role']}" == selected_user_display:
                        selected_user = user
                        break
                
                if selected_user:
                    # 사용자 정보 표시
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        st.markdown("#### 🏷️ 기본 정보")
                        st.write(f"**사용자 ID:** {selected_user['user_id']}")
                        st.write(f"**사용자명:** {selected_user['username']}")
                        st.write(f"**전체 이름:** {selected_user['full_name']}")
                        st.write(f"**이메일:** {selected_user['email']}")
                        st.write(f"**역할:** {selected_user['role']}")
                        st.write(f"**상태:** {'활성' if selected_user['is_active'] else '비활성'}")
                    
                    with col2:
                        st.markdown("#### 👤 권한 상태")
                        
                        # 역할별 권한 표시
                        if selected_user['role'] == 'system_admin':
                            st.success("🔓 **시스템 관리자**")
                            st.write("• 모든 시스템 권한 보유")
                            st.write("• 사용자 관리 권한")
                            st.write("• 시스템 설정 권한")
                        elif selected_user['role'] == 'admin':
                            st.info("🔓 **관리자**")
                            st.write("• 관리자 권한 보유")
                            st.write("• 일반적인 시스템 관리")
                        else:
                            st.warning("👤 **일반 사용자**")
                            st.write("• 기본 사용자 권한")
                            st.write("• 제한된 기능 접근")
                    
                    # 권한 수정 섹션
                    st.markdown("---")
                    st.markdown("#### ⚙️ 권한 수정")
                    
                    with st.form(f"update_permissions_{selected_user['user_id']}"):
                        new_role = st.selectbox(
                            "새 역할 선택",
                            options=['user', 'admin', 'system_admin'],
                            index=['user', 'admin', 'system_admin'].index(selected_user['role']),
                            format_func=lambda x: {
                                'user': '일반 사용자',
                                'admin': '관리자', 
                                'system_admin': '시스템 관리자'
                            }[x]
                        )
                        
                        new_active_status = st.checkbox(
                            "활성 상태",
                            value=selected_user['is_active']
                        )
                        
                        if st.form_submit_button("권한 수정"):
                            try:
                                # 권한 업데이트
                                update_response = supabase(use_service_role=True).from_("users").update({
                                    'role': new_role,
                                    'is_active': new_active_status,
                                    'updated_at': datetime.now().isoformat()
                                }).eq('user_id', selected_user['user_id']).execute()
                                
                                if update_response.data:
                                    st.success(f"✅ {selected_user['username']}의 권한이 성공적으로 수정되었습니다!")
                                    st.rerun()
                                else:
                                    st.error("❌ 권한 수정에 실패했습니다.")
                                    
                            except Exception as e:
                                logger.error(f"권한 수정 중 오류: {e}")
                                st.error(f"❌ 권한 수정 중 오류가 발생했습니다: {str(e)}")
        else:
            st.warning("등록된 사용자가 없습니다.")
            
    except Exception as e:
        logger.error(f"사용자 목록 조회 중 오류: {e}")
        display_error(f"사용자 목록 조회 중 오류 발생: {str(e)}")

def display_permission_audit():
    """
    권한 변경 이력 화면 표시
    """
    st.markdown("### 📋 권한 변경 이력")
    
    try:
        # 권한 변경 이력 조회 (예시)
        st.info("🔄 권한 변경 이력 기능은 추후 구현 예정입니다.")
        
        # 간단한 시스템 로그 표시
        st.markdown("#### 📊 최근 시스템 활동")
        
        # 사용자 수 통계
        users_response = supabase(use_service_role=True).from_("users").select("role, is_active").execute()
        if users_response.data:
            df = pd.DataFrame(users_response.data)
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown("**역할별 사용자 수**")
                role_counts = df['role'].value_counts()
                st.bar_chart(role_counts)
            
            with col2:
                st.markdown("**활성 상태별 사용자 수**")
                active_counts = df['is_active'].value_counts()
                active_counts.index = ['활성' if x else '비활성' for x in active_counts.index]
                st.bar_chart(active_counts)
                
    except Exception as e:
        logger.error(f"권한 이력 조회 중 오류: {e}")
        display_error(f"권한 이력 조회 중 오류 발생: {str(e)}")

def display_system_settings():
    """
    시스템 설정 화면 표시
    """
    st.markdown("### ⚙️ 시스템 설정")
    
    try:
        # 시스템 통계
        st.markdown("#### 📊 시스템 통계")
        
        # 사용자 통계
        users_result = supabase(use_service_role=True).from_("users").select("user_id, role").execute()
        if users_result.data:
            users_data = users_result.data
            total_users = len(users_data)
            
            # 역할별 통계
            role_counts = {}
            for user in users_data:
                role = user.get('role', 'unknown')
                role_counts[role] = role_counts.get(role, 0) + 1
            
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric("📊 총 사용자 수", total_users)
            
            with col2:
                st.metric("👑 시스템 관리자", role_counts.get('system_admin', 0))
            
            with col3:
                st.metric("🔧 관리자", role_counts.get('admin', 0))
                
            with col4:
                st.metric("👤 일반 사용자", role_counts.get('user', 0))
            
            # 역할별 사용자 목록
            st.markdown("---")
            st.markdown("#### 👥 역할별 사용자 목록")
            
            role_names = {
                'system_admin': '시스템 관리자',
                'admin': '관리자',
                'user': '일반 사용자'
            }
            
            for role, count in role_counts.items():
                if count > 0:
                    with st.expander(f"{role_names.get(role, role)} ({count}명)"):
                        role_users = [user for user in users_data if user.get('role') == role]
                        
                        # 해당 역할의 사용자 상세 정보 조회
                        user_ids = [user['user_id'] for user in role_users]
                        detailed_response = supabase(use_service_role=True).from_("users").select("username, full_name, email").in_("user_id", user_ids).execute()
                        
                        if detailed_response.data:
                            for user_detail in detailed_response.data:
                                st.write(f"• **{user_detail.get('full_name', 'N/A')}** ({user_detail.get('username', 'N/A')}) - {user_detail.get('email', 'N/A')}")
        
        # 시스템 상태 체크
        st.markdown("---")
        st.markdown("#### 🔍 시스템 상태")
        
        if st.button("📊 시스템 상태 체크"):
            # 데이터베이스 연결 체크
            try:
                test_result = supabase(use_service_role=True).from_("users").select("user_id").limit(1).execute()
                if test_result:
                    st.success("✅ 데이터베이스 연결 정상")
                else:
                    st.error("❌ 데이터베이스 연결 실패")
            except Exception as e:
                st.error(f"❌ 데이터베이스 오류: {str(e)}")
            
            # 권한 시스템 체크
            try:
                roles_result = supabase(use_service_role=True).from_("roles").select("role_id").execute()
                if roles_result.data:
                    st.success("✅ 권한 시스템 정상")
                    st.info(f"등록된 역할 수: {len(roles_result.data)}")
                else:
                    st.warning("⚠️ 권한 테이블 확인 필요")
            except Exception as e:
                st.error(f"❌ 권한 시스템 오류: {str(e)}")
                
    except Exception as e:
        logger.error(f"시스템 설정 조회 중 오류: {e}")
        display_error(f"시스템 설정 조회 중 오류 발생: {str(e)}") 