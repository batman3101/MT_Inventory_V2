"""
사용자 관리 모듈 - 시스템 관리자와 일반 관리자가 일반 사용자 CRUD 기능 수행
"""
import streamlit as st
import pandas as pd
import sys
import os
import logging
import bcrypt
from datetime import datetime

# 상위 디렉토리를 path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.supabase_client import supabase
from utils.auth import check_authentication, get_user_role
from utils.i18n import get_text
from utils.helpers import display_error, display_success, display_info
from components.forms.user_form import render_user_form

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 부서 데이터 캐시
@st.cache_data(ttl=300)
def get_departments():
    """
    부서 목록 조회 및 캐싱
    """
    try:
        response = supabase().table('departments').select('department_id, department_name').execute()
        if response.data:
            # (department_id, department_name) 형태의 튜플 리스트로 변환
            return [(dept['department_id'], dept['department_name']) for dept in response.data]
        return []
    except Exception as e:
        logger.error(f"부서 목록 조회 중 오류 발생: {e}")
        return []

def user_management():
    """
    사용자 관리 페이지 렌더링
    """
    if not check_authentication():
        st.error("로그인이 필요합니다.")
        return
    
    # 권한 체크
    user_role = get_user_role()
    if user_role not in ['system_admin', 'admin']:
        st.error("사용자 관리 페이지에 접근할 수 있는 권한이 없습니다.")
        return
    
    st.markdown("<h1 class='main-header'>사용자 관리</h1>", unsafe_allow_html=True)
    
    # 탭 생성
    tab1, tab2 = st.tabs(["사용자 목록", "사용자 추가"])
    
    with tab1:
        display_user_list()
    
    with tab2:
        add_user_form()

def display_user_list():
    """
    사용자 목록 표시
    """
    try:
        # Supabase에서 사용자 목록 조회 - 부서 정보 조인
        response = supabase().from_('users').select("""
            user_id, 
            username, 
            full_name, 
            email, 
            role, 
            department_id,
            departments:department_id (department_name),
            is_active, 
            created_at, 
            updated_at
        """).eq('role', 'user').execute()
        
        if not response.data:
            st.info("등록된 일반 사용자가 없습니다.")
            return
        
        # 부서 이름 처리
        for user in response.data:
            if user.get('departments') and user['departments'].get('department_name'):
                user['department'] = user['departments']['department_name']
            else:
                user['department'] = 'None'
        
        # 데이터프레임으로 변환
        users_df = pd.DataFrame([{
            'user_id': user['user_id'],
            'username': user['username'],
            'full_name': user['full_name'],
            'email': user['email'],
            'role': user['role'],
            'department': user['department'],
            'is_active': user['is_active'],
            'created_at': user['created_at'],
            'updated_at': user['updated_at']
        } for user in response.data])
        
        # 시간 형식 변환
        for time_col in ['created_at', 'updated_at']:
            if time_col in users_df.columns:
                users_df[time_col] = pd.to_datetime(users_df[time_col]).dt.strftime('%Y-%m-%d %H:%M')
        
        # 활성화 상태 변환
        if 'is_active' in users_df.columns:
            users_df['is_active'] = users_df['is_active'].apply(lambda x: '활성' if x else '비활성')
        
        # 컬럼명 변경
        users_df.columns = ['사용자 ID', '아이디', '이름', '이메일', '역할', '부서', '상태', '생성일', '업데이트일']
        
        # 데이터 표시
        st.dataframe(users_df, use_container_width=True)
        
        # 사용자 선택 및 수정/삭제
        selected_user_id = st.selectbox(
            "수정 또는 삭제할 사용자 선택",
            options=response.data,
            format_func=lambda x: f"{x['full_name']} ({x['username']})"
        )
        
        if selected_user_id:
            st.write("---")
            st.subheader("사용자 정보 수정")
            
            # 선택된 사용자 정보 가져오기
            selected_user = next((user for user in response.data if user['user_id'] == selected_user_id['user_id']), None)
            
            if selected_user:
                update_user_form(selected_user)
    
    except Exception as e:
        logger.error(f"사용자 목록 조회 중 오류 발생: {e}")
        display_error("사용자 목록을 불러오는 중 오류가 발생했습니다.")

def add_user_form():
    """
    사용자 추가 폼
    """
    with st.form("add_user_form"):
        st.subheader("새 일반 사용자 등록")
        
        username = st.text_input("아이디 *", help="사용자 로그인 아이디")
        full_name = st.text_input("이름 *", help="사용자 실명")
        email = st.text_input("이메일 *", help="사용자 이메일")
        password = st.text_input("비밀번호 *", type="password", help="로그인 비밀번호")
        confirm_password = st.text_input("비밀번호 확인 *", type="password", help="비밀번호 재입력")
        
        # 부서 목록 조회 및 드롭다운 표시
        departments = get_departments()
        department_options = [dept[1] for dept in departments]
        department_ids = [dept[0] for dept in departments]
        
        if departments:
            department_index = st.selectbox("부서 *", options=range(len(department_options)), 
                                           format_func=lambda i: department_options[i], 
                                           help="소속 부서 선택")
            department_id = department_ids[department_index]
        else:
            st.error("부서 정보를 불러올 수 없습니다.")
            department_id = None
            
        is_active = st.checkbox("계정 활성화", value=True, help="체크 해제 시 로그인 불가")
        
        submitted = st.form_submit_button("사용자 등록")
        
        if submitted:
            # 필수 필드 검증
            if not (username and full_name and email and password and department_id):
                display_error("필수 항목을 모두 입력해주세요.")
                return
            
            # 비밀번호 일치 검증
            if password != confirm_password:
                display_error("비밀번호가 일치하지 않습니다.")
                return
            
            try:
                # 비밀번호 해싱
                hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                
                # 사용자 데이터 준비
                user_data = {
                    'username': username,
                    'full_name': full_name,
                    'email': email,
                    'password_hash': hashed_password,
                    'role': 'user',  # 일반 사용자 고정
                    'department_id': department_id,
                    'is_active': is_active,
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }
                
                # 디버깅을 위해 로그 출력
                logger.info(f"등록할 사용자 데이터: {user_data}")
                
                # Supabase에 데이터 삽입
                response = supabase().table('users').insert(user_data).execute()
                
                if response.data:
                    display_success("사용자가 성공적으로 등록되었습니다.")
                    logger.info(f"사용자 등록 성공: {response.data}")
                    # 폼 초기화
                    st.rerun()
                else:
                    display_error("사용자 등록에 실패했습니다.")
                    logger.error("사용자 등록 결과 데이터가 없습니다.")
            
            except Exception as e:
                logger.error(f"사용자 등록 중 오류 발생: {e}")
                display_error(f"사용자 등록 중 오류가 발생했습니다: {str(e)}")

def update_user_form(user_data):
    """
    사용자 정보 수정 폼
    
    Args:
        user_data (dict): 수정할 사용자 정보
    """
    with st.form("update_user_form"):
        user_id = user_data['user_id']
        
        username = st.text_input("아이디 *", value=user_data['username'], disabled=True)
        full_name = st.text_input("이름 *", value=user_data['full_name'])
        email = st.text_input("이메일 *", value=user_data['email'])
        password = st.text_input("새 비밀번호", type="password", help="변경 시에만 입력")
        confirm_password = st.text_input("비밀번호 확인", type="password", help="변경 시에만 입력")
        
        # 부서 목록 조회 및 드롭다운 표시
        departments = get_departments()
        department_options = [dept[1] for dept in departments]
        department_ids = [dept[0] for dept in departments]
        
        if departments:
            # 현재 선택된 부서 찾기
            current_dept_id = user_data.get('department_id')
            try:
                current_index = department_ids.index(current_dept_id) if current_dept_id in department_ids else 0
            except ValueError:
                current_index = 0
                
            department_index = st.selectbox("부서 *", options=range(len(department_options)), 
                                           index=current_index,
                                           format_func=lambda i: department_options[i], 
                                           help="소속 부서 선택")
            department_id = department_ids[department_index]
        else:
            st.error("부서 정보를 불러올 수 없습니다.")
            department_id = current_dept_id
        
        is_active = st.checkbox("계정 활성화", value=user_data.get('is_active', True))
        
        col1, col2 = st.columns(2)
        
        with col1:
            update_button = st.form_submit_button("정보 수정")
        
        with col2:
            delete_button = st.form_submit_button("사용자 삭제", type="primary", help="사용자 계정을 삭제합니다")
        
        if update_button:
            # 필수 필드 검증
            if not (full_name and email and department_id):
                display_error("필수 항목을 모두 입력해주세요.")
                return
            
            try:
                # 업데이트할 데이터 준비
                update_data = {
                    'full_name': full_name,
                    'email': email,
                    'department_id': department_id,
                    'is_active': is_active,
                    'updated_at': datetime.now().isoformat()
                }
                
                # 비밀번호 변경 시 해싱하여 추가
                if password:
                    if password != confirm_password:
                        display_error("비밀번호가 일치하지 않습니다.")
                        return
                    
                    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                    update_data['password_hash'] = hashed_password
                
                # Supabase 데이터 업데이트
                response = supabase().table('users').update(update_data).eq('user_id', user_id).execute()
                
                if response.data:
                    display_success("사용자 정보가 업데이트되었습니다.")
                    st.rerun()
                else:
                    display_error("사용자 정보 업데이트에 실패했습니다.")
            
            except Exception as e:
                logger.error(f"사용자 정보 업데이트 중 오류 발생: {e}")
                display_error(f"사용자 정보 업데이트 중 오류가 발생했습니다: {str(e)}")
        
        elif delete_button:
            try:
                # 사용자 삭제 확인 대화상자
                st.warning(f"정말로 '{full_name}' 사용자를 삭제하시겠습니까?")
                
                confirm = st.checkbox("삭제를 확인합니다")
                
                if confirm:
                    # Supabase에서 사용자 삭제
                    response = supabase().table('users').delete().eq('user_id', user_id).execute()
                    
                    if response.data:
                        display_success("사용자가 삭제되었습니다.")
                        st.rerun()
                    else:
                        display_error("사용자 삭제에 실패했습니다.")
            
            except Exception as e:
                logger.error(f"사용자 삭제 중 오류 발생: {e}")
                display_error(f"사용자 삭제 중 오류가 발생했습니다: {str(e)}") 