"""
사용자 입력 폼 컴포넌트
"""
import streamlit as st
import logging
import bcrypt
from datetime import datetime
import sys
import os

# 상위 디렉토리를 path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from database.supabase_client import supabase
from utils.helpers import display_error, display_success, display_info

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
        client = supabase()
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

def render_user_form(user_data=None, role=None):
    """
    사용자 정보 입력/수정 폼 렌더링
    
    Args:
        user_data (dict, optional): 수정 시 사용자 데이터
        role (str, optional): 생성 시 사용자 역할
        
    Returns:
        tuple: (submitted, user_data) - 제출 여부와 사용자 데이터
    """
    # 수정 모드 여부
    is_edit_mode = user_data is not None
    
    # 폼 키 생성
    form_key = f"{'edit' if is_edit_mode else 'add'}_{role or user_data.get('role', 'user') if is_edit_mode else 'user'}_form"
    
    with st.form(form_key):
        # 폼 제목
        if is_edit_mode:
            st.subheader(f"{'관리자' if user_data.get('role') == 'admin' else '사용자'} 정보 수정")
            user_id = user_data.get('user_id')
        else:
            role_text = "관리자" if role == "admin" else "사용자"
            st.subheader(f"새 {role_text} 등록")
        
        # 사용자명
        username = st.text_input(
            "아이디 *", 
            value=user_data.get('username', '') if is_edit_mode else '',
            disabled=is_edit_mode,
            help="로그인 아이디"
        )
        
        # 실명
        full_name = st.text_input(
            "이름 *", 
            value=user_data.get('full_name', '') if is_edit_mode else '',
            help="사용자 실명"
        )
        
        # 이메일
        email = st.text_input(
            "이메일 *", 
            value=user_data.get('email', '') if is_edit_mode else '',
            help="사용자 이메일"
        )
        
        # 비밀번호 (수정 시 선택, 추가 시 필수)
        password_label = "새 비밀번호" if is_edit_mode else "비밀번호 *"
        password_help = "변경 시에만 입력" if is_edit_mode else "로그인 비밀번호"
        
        password = st.text_input(
            password_label, 
            type="password",
            help=password_help
        )
        
        confirm_password = st.text_input(
            "비밀번호 확인" + (" *" if not is_edit_mode else ""), 
            type="password",
            help="비밀번호 재입력"
        )
        
        # 부서 목록 조회 및 드롭다운 표시
        departments = get_departments()
        
        # 부서 목록이 비어있는지 확인
        if not departments:
            st.error("부서 정보를 불러올 수 없습니다. 기본 부서를 사용합니다.")
            # 기본 부서 리스트 사용
            departments = [
                ('00000000-0000-0000-0000-000000000001', '통합 관리'),
                ('00000000-0000-0000-0000-000000000002', '설비 관리'),
                ('00000000-0000-0000-0000-000000000003', '자재 입출고 관리'),
                ('00000000-0000-0000-0000-000000000004', 'MT')
            ]
            
        department_options = [dept[1] for dept in departments]
        department_ids = [dept[0] for dept in departments]
        
        # 현재 선택된 부서 찾기
        current_dept_id = user_data.get('department_id') if is_edit_mode else None
        
        try:
            # 현재 부서 ID가 유효하면 해당 인덱스 사용, 아니면 기본 인덱스(0) 사용
            if current_dept_id and current_dept_id in department_ids:
                current_index = department_ids.index(current_dept_id)
            else:
                current_index = 0
        except (ValueError, TypeError):
            logger.warning(f"부서 ID '{current_dept_id}'를 목록에서 찾을 수 없습니다. 기본 인덱스(0)를 사용합니다.")
            current_index = 0
        
        # 부서 선택 드롭다운
        department_index = st.selectbox(
            "부서 *", 
            options=range(len(department_options)),
            index=current_index,
            format_func=lambda i: department_options[i], 
            help="소속 부서 선택"
        )
        
        # 선택된 부서 ID 설정
        department_id = department_ids[department_index] if department_index < len(department_ids) else None
        
        # 부서 ID가 없는 경우 경고 표시 (이 부분은 실행될 가능성이 거의 없음 - 안전장치)
        if department_id is None:
            st.warning("선택한 부서 정보가 유효하지 않습니다. 다른 부서를 선택하세요.")
            department_id = department_ids[0] if department_ids else None
        
        # 계정 활성화
        is_active = st.checkbox(
            "계정 활성화", 
            value=user_data.get('is_active', True) if is_edit_mode else True,
            help="체크 해제 시 로그인 불가"
        )
        
        # 버튼
        if is_edit_mode:
            col1, col2 = st.columns(2)
            with col1:
                update_button = st.form_submit_button("정보 수정")
            with col2:
                delete_button = st.form_submit_button("계정 삭제", type="primary")
                
            submitted = update_button or delete_button
            is_delete = delete_button
        else:
            submitted = st.form_submit_button(f"{'관리자' if role == 'admin' else '사용자'} 등록")
            is_delete = False
        
        # 필드 유효성 검증
        if submitted and not is_delete:
            # 필수 필드 검증
            required_fields = [username, full_name, email]
            if not is_edit_mode:
                required_fields.append(password)
                
            if department_id is None:
                display_error("부서를 선택할 수 없습니다. 부서 정보가 없거나 불러오는 중 오류가 발생했습니다.")
                return False, None
                
            if not all(required_fields):
                display_error("필수 항목을 모두 입력해주세요.")
                return False, None
            
            # 비밀번호 일치 검증
            if password and password != confirm_password:
                display_error("비밀번호가 일치하지 않습니다.")
                return False, None
        
        # 반환 데이터 준비
        result_data = {
            'username': username,
            'full_name': full_name,
            'email': email,
            'department_id': department_id,
            'is_active': is_active,
            'role': role or user_data.get('role', 'user') if is_edit_mode else role or 'user'
        }
        
        # 비밀번호 처리
        if password:
            try:
                hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                result_data['password_hash'] = hashed_password
            except Exception as e:
                logger.error(f"비밀번호 해싱 중 오류 발생: {e}")
                display_error("비밀번호 처리 중 오류가 발생했습니다.")
                return False, None
        
        # 수정 모드인 경우 사용자 ID 추가
        if is_edit_mode:
            result_data['user_id'] = user_id
            result_data['updated_at'] = datetime.now().isoformat()
            result_data['is_delete'] = is_delete
        else:
            # 추가 모드인 경우 생성 시간 추가
            result_data['created_at'] = datetime.now().isoformat()
            result_data['updated_at'] = datetime.now().isoformat()
        
        return submitted, result_data

def create_user(user_data):
    """
    새 사용자 생성
    
    Args:
        user_data (dict): 사용자 데이터
        
    Returns:
        bool: 성공 여부
    """
    try:
        # API 키 사용 로깅
        logger.info("사용자 생성을 위해 Supabase API 호출 시작")
        
        # Supabase에 데이터 삽입
        response = supabase().table('users').insert(user_data).execute()
        
        if response.data:
            logger.info(f"사용자 생성 성공: {response.data}")
            return True
        else:
            logger.error(f"사용자 생성 실패: 응답 데이터 없음")
            logger.error(f"응답 전체: {response}")
            return False
    
    except Exception as e:
        logger.error(f"사용자 생성 중 오류 발생: {e}")
        # 자세한 예외 정보 로깅
        if hasattr(e, 'response'):
            try:
                error_json = e.response.json()
                logger.error(f"API 오류 세부정보: {error_json}")
            except Exception:
                logger.error(f"API 응답: {e.response.text if hasattr(e.response, 'text') else '응답 내용 없음'}")
        
        import traceback
        logger.error(f"스택 트레이스: {traceback.format_exc()}")
        return False

def update_user(user_data):
    """
    사용자 정보 업데이트
    
    Args:
        user_data (dict): 사용자 데이터
        
    Returns:
        bool: 성공 여부
    """
    try:
        # 삭제 플래그 제거
        user_id = user_data.pop('user_id')
        is_delete = user_data.pop('is_delete', False)
        
        if is_delete:
            # 사용자 삭제
            response = supabase().table('users').delete().eq('user_id', user_id).execute()
        else:
            # 사용자 정보 업데이트
            response = supabase().table('users').update(user_data).eq('user_id', user_id).execute()
        
        if response.data:
            return True
        else:
            return False
    
    except Exception as e:
        logger.error(f"사용자 정보 업데이트 중 오류 발생: {e}")
        return False 