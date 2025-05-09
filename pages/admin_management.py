"""
관리자 관리 모듈 - 시스템 관리자가 관리자 CRUD 기능 수행
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
        # 기본 부서 목록 - 데이터베이스에서 불러오지 못할 경우를 대비
        default_departments = [
            ('00000000-0000-0000-0000-000000000001', '통합 관리'),
            ('00000000-0000-0000-0000-000000000002', '설비 관리'),
            ('00000000-0000-0000-0000-000000000003', '자재 입출고 관리'),
            ('00000000-0000-0000-0000-000000000004', 'MT')
        ]
        
        # Supabase 클라이언트 가져오기
        client = supabase(use_service_role=True)
        if not client:
            logger.error("Supabase 클라이언트를 가져올 수 없습니다.")
            return default_departments
            
        # 부서 테이블 쿼리
        response = client.table('departments').select('department_id, department_name').execute()
        logger.info(f"부서 데이터 조회 결과: {response}")
        
        if response and hasattr(response, 'data') and response.data:
            # (department_id, department_name) 형태의 튜플 리스트로 변환
            return [(dept['department_id'], dept['department_name']) for dept in response.data]
        
        logger.warning("부서 데이터가 없습니다. 기본 부서 목록을 사용합니다.")
        
        # 부서 테이블이 비어있는 경우, 기본 부서 데이터 삽입 시도
        try:
            departments_data = [
                {"department_code": "INTEG", "department_name": "통합 관리", "description": "시스템 전체 관리 부서"},
                {"department_code": "EQUIP", "department_name": "설비 관리", "description": "생산 설비 관리 부서"},
                {"department_code": "MATIN", "department_name": "자재 입출고 관리", "description": "자재 입출고 관리 부서"},
                {"department_code": "MT", "department_name": "MT", "description": "유지보수 부서"}
            ]
            
            for dept in departments_data:
                client.table('departments').insert(dept).execute()
                
            logger.info("기본 부서 데이터를 삽입했습니다.")
            
            # 다시 부서 목록 조회
            retry_response = client.table('departments').select('department_id, department_name').execute()
            if retry_response and hasattr(retry_response, 'data') and retry_response.data:
                return [(dept['department_id'], dept['department_name']) for dept in retry_response.data]
        except Exception as e:
            logger.error(f"기본 부서 데이터 삽입 중 오류 발생: {e}")
            
        # 기본 부서 목록 반환
        return default_departments
    except Exception as e:
        logger.error(f"부서 목록 조회 중 오류 발생: {e}")
        # 오류 세부정보 로깅
        if hasattr(e, '__dict__'):
            logger.error(f"오류 세부정보: {vars(e)}")
        # 기본 부서 목록 반환
        return [
            ('00000000-0000-0000-0000-000000000001', '통합 관리'),
            ('00000000-0000-0000-0000-000000000002', '설비 관리'),
            ('00000000-0000-0000-0000-000000000003', '자재 입출고 관리'),
            ('00000000-0000-0000-0000-000000000004', 'MT')
        ]

def admin_management():
    """
    관리자 관리 페이지 렌더링
    """
    if not check_authentication():
        st.error("로그인이 필요합니다.")
        return
    
    # 시스템 관리자 권한 체크
    user_role = get_user_role()
    if user_role != 'system_admin':
        st.error("관리자 관리 페이지에 접근할 수 있는 권한이 없습니다.")
        return
    
    st.markdown("<h1 class='main-header'>관리자 관리</h1>", unsafe_allow_html=True)
    
    # 탭 생성
    tab1, tab2 = st.tabs(["관리자 목록", "관리자 추가"])
    
    with tab1:
        display_admin_list()
    
    with tab2:
        add_admin_form()

def display_admin_list():
    """
    관리자 목록 표시
    """
    try:
        # Supabase에서 관리자 목록 조회 - 부서 정보 조인 (service_role 권한 사용)
        response = supabase(use_service_role=True).from_('users').select("""
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
        """).eq('role', 'admin').execute()
        
        if not response.data:
            st.info("등록된 관리자가 없습니다.")
            return
        
        # 부서 이름 처리
        for admin in response.data:
            if admin.get('departments') and admin['departments'].get('department_name'):
                admin['department'] = admin['departments']['department_name']
            else:
                admin['department'] = 'None'
        
        # 데이터프레임으로 변환
        admins_df = pd.DataFrame([{
            'user_id': admin['user_id'],
            'username': admin['username'],
            'full_name': admin['full_name'],
            'email': admin['email'],
            'role': admin['role'],
            'department': admin['department'],
            'is_active': admin['is_active'],
            'created_at': admin['created_at'],
            'updated_at': admin['updated_at']
        } for admin in response.data])
        
        # 시간 형식 변환
        for time_col in ['created_at', 'updated_at']:
            if time_col in admins_df.columns:
                admins_df[time_col] = pd.to_datetime(admins_df[time_col]).dt.strftime('%Y-%m-%d %H:%M')
        
        # 활성화 상태 변환
        if 'is_active' in admins_df.columns:
            admins_df['is_active'] = admins_df['is_active'].apply(lambda x: '활성' if x else '비활성')
        
        # 컬럼명 변경
        admins_df.columns = ['사용자 ID', '아이디', '이름', '이메일', '역할', '부서', '상태', '생성일', '업데이트일']
        
        # 데이터 표시
        st.dataframe(admins_df, use_container_width=True)
        
        # 관리자 선택 및 수정/삭제
        selected_admin_id = st.selectbox(
            "수정 또는 삭제할 관리자 선택",
            options=response.data,
            format_func=lambda x: f"{x['full_name']} ({x['username']})"
        )
        
        if selected_admin_id:
            st.write("---")
            st.subheader("관리자 정보 수정")
            
            # 선택된 관리자 정보 가져오기
            selected_admin = next((admin for admin in response.data if admin['user_id'] == selected_admin_id['user_id']), None)
            
            if selected_admin:
                update_admin_form(selected_admin)
    
    except Exception as e:
        logger.error(f"관리자 목록 조회 중 오류 발생: {e}")
        display_error("관리자 목록을 불러오는 중 오류가 발생했습니다.")

def add_admin_form():
    """
    관리자 추가 폼
    """
    with st.form("add_admin_form"):
        st.subheader("새 관리자 등록")
        
        username = st.text_input("아이디 *", help="관리자 로그인 아이디")
        full_name = st.text_input("이름 *", help="관리자 실명")
        email = st.text_input("이메일 *", help="관리자 이메일")
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
        
        submitted = st.form_submit_button("관리자 등록")
        
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
                admin_data = {
                    'username': username,
                    'full_name': full_name,
                    'email': email,
                    'password_hash': hashed_password,
                    'role': 'admin',
                    'department_id': department_id,
                    'is_active': is_active,
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }
                
                # 디버깅을 위해 로그 출력
                logger.info(f"등록할 관리자 데이터: {admin_data}")
                
                # Supabase에 데이터 삽입 (service_role 권한 사용)
                response = supabase(use_service_role=True).table('users').insert(admin_data).execute()
                
                if response.data:
                    display_success("관리자가 성공적으로 등록되었습니다.")
                    logger.info(f"관리자 등록 성공: {response.data}")
                    # 폼 초기화
                    st.rerun()
                else:
                    display_error("관리자 등록에 실패했습니다.")
                    logger.error("관리자 등록 결과 데이터가 없습니다.")
            
            except Exception as e:
                logger.error(f"관리자 등록 중 오류 발생: {e}")
                display_error(f"관리자 등록 중 오류가 발생했습니다: {str(e)}")

def update_admin_form(admin_data):
    """
    관리자 정보 수정 폼
    
    Args:
        admin_data (dict): 수정할 관리자 정보
    """
    with st.form("update_admin_form"):
        user_id = admin_data['user_id']
        
        username = st.text_input("아이디 *", value=admin_data['username'], disabled=True)
        full_name = st.text_input("이름 *", value=admin_data['full_name'])
        email = st.text_input("이메일 *", value=admin_data['email'])
        password = st.text_input("새 비밀번호", type="password", help="변경 시에만 입력")
        confirm_password = st.text_input("비밀번호 확인", type="password", help="변경 시에만 입력")
        
        # 부서 목록 조회 및 드롭다운 표시
        departments = get_departments()
        department_options = [dept[1] for dept in departments]
        department_ids = [dept[0] for dept in departments]
        
        if departments:
            # 현재 선택된 부서 찾기
            current_dept_id = admin_data.get('department_id')
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
        
        is_active = st.checkbox("계정 활성화", value=admin_data.get('is_active', True))
        
        col1, col2 = st.columns(2)
        
        with col1:
            update_button = st.form_submit_button("정보 수정")
        
        with col2:
            delete_button = st.form_submit_button("관리자 삭제", type="primary", help="관리자 계정을 삭제합니다")
        
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
                response = supabase(use_service_role=True).table('users').update(update_data).eq('user_id', user_id).execute()
                
                if response.data:
                    display_success("관리자 정보가 업데이트되었습니다.")
                    st.rerun()
                else:
                    display_error("관리자 정보 업데이트에 실패했습니다.")
            
            except Exception as e:
                logger.error(f"관리자 정보 업데이트 중 오류 발생: {e}")
                display_error(f"관리자 정보 업데이트 중 오류가 발생했습니다: {str(e)}")
        
        elif delete_button:
            try:
                # 관리자 삭제 확인 대화상자
                st.warning(f"정말로 '{full_name}' 관리자를 삭제하시겠습니까?")
                
                confirm = st.checkbox("삭제를 확인합니다")
                
                if confirm:
                    # Supabase에서 관리자 삭제
                    response = supabase(use_service_role=True).table('users').delete().eq('user_id', user_id).execute()
                    
                    if response.data:
                        display_success("관리자가 삭제되었습니다.")
                        st.rerun()
                    else:
                        display_error("관리자 삭제에 실패했습니다.")
            
            except Exception as e:
                logger.error(f"관리자 삭제 중 오류 발생: {e}")
                display_error(f"관리자 삭제 중 오류가 발생했습니다: {str(e)}") 