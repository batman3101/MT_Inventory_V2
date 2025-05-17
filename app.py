"""
MT_Inventory - 설비 유지보수 부품 관리 시스템 (EqMS)
메인 애플리케이션 파일
"""
import streamlit as st
import os
import sys
from datetime import datetime
import pandas as pd
import logging

# 모듈 경로 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 설정 및 유틸리티 가져오기
from config.config import PAGE_TITLE, PAGE_ICON, PAGES, DEFAULT_LANGUAGE
from utils.auth import authenticate_user, check_authentication, logout, get_user_role, check_login_credentials, update_last_login
from utils.i18n import get_text, language_selector
from utils.helpers import display_error, display_success, display_info, format_currency

# 페이지 모듈 가져오기
from pages.admin_management import admin_management
from pages.user_management import user_management
from pages.supabase_settings import supabase_settings

# 세션 상태 초기화
if 'language' not in st.session_state:
    st.session_state.language = DEFAULT_LANGUAGE

# 페이지 설정
st.set_page_config(
    page_title=PAGE_TITLE,
    page_icon=PAGE_ICON,
    layout="wide",
    initial_sidebar_state="expanded"
)

# CSS 스타일 적용
st.markdown("""
<style>
    /* 사이드바의 기본 내비게이션 메뉴 숨기기 */
    section[data-testid="stSidebar"] div.stButton {
        display: block !important;
    }
    section[data-testid="stSidebar"] > div:first-child {
        width: 100%;
    }
    section[data-testid="stSidebar"] div.block-container {
        padding-top: 1rem;
    }
    /* Streamlit 기본 페이지 탭 메뉴 숨기기 */
    [data-testid="stSidebarNav"] {
        display: none !important;
    }
    /* 사이드바 내 헤더 섹션 스타일링 */
    .sidebar-header {
        padding: 0.5rem 0 1rem 0;
    }
    /* 새로운 로그인 카드 스타일 */
    .login-container {
        padding: 2rem;
        border: none;
        background-color: transparent;
        max-width: 600px;
        margin: 2rem auto;
    }
    .login-title {
        font-size: 1.6rem;
        font-weight: bold;
        color: #1E3A8A;
        margin-bottom: 2rem;
        text-align: left;
        white-space: nowrap;
    }
    .login-input {
        margin-bottom: 1rem;
    }
    .login-button {
        background-color: #1E3A8A;
        color: white;
        font-weight: 600;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        width: 100%;
        margin-top: 1rem;
    }
    /* 입력 필드 스타일링 */
    .login-form input {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-bottom: 15px;
    }
    /* 공통 스타일 */
    .sidebar-text {
        font-size: 1.1rem;
        font-weight: 600;
        padding: 0.5rem 0;
        margin-bottom: 1rem;
        border-bottom: 1px solid #e1e1e1;
    }
    .sidebar-menu-item {
        display: flex;
        align-items: center;
        padding: 0.6rem 0.8rem;
        border-radius: 0.3rem;
        margin-bottom: 0.5rem;
        transition: background-color 0.2s;
    }
    .sidebar-menu-item:hover {
        background-color: #e6e9ef;
    }
    .sidebar-menu-item.active {
        background-color: #e6e9ef;
    }
    .sidebar-menu-icon {
        margin-right: 0.8rem;
        font-size: 1.2rem;
    }
    .language-selector {
        margin-bottom: 1.5rem;
    }
    /* 대시보드 카드 스타일 */
    .dashboard-card {
        background-color: #ffffff;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
        margin-bottom: 20px;
        border: 1px solid #e6e9ef;
    }
    .dashboard-card h3 {
        margin-top: 0;
        color: #1E3A8A;
        font-size: 1.2rem;
        font-weight: bold;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid #e6e9ef;
    }
    .dashboard-card p {
        margin: 5px 0;
        line-height: 1.5;
    }
    /* 카테고리별 재고 요약 스타일 */
    .category-summary {
        margin-top: 1rem;
        overflow-y: auto;
        max-height: 300px;
    }
    /* 요약 콘텐츠 스타일 */
    .summary-content {
        margin-bottom: 1rem;
    }
    /* 대시보드 내 표 스타일 */
    .dashboard-table {
        margin-top: 1rem;
        border-collapse: collapse;
        width: 100%;
    }
    .dashboard-table th {
        background-color: #f1f5f9;
        padding: 0.6rem;
        text-align: left;
        font-weight: 600;
        border-bottom: 1px solid #e0e0e0;
    }
    .dashboard-table td {
        padding: 0.6rem;
        border-bottom: 1px solid #e0e0e0;
    }
    /* 대시보드 내 탭 스타일 */
    .dashboard-tabs {
        margin-top: 1rem;
        border-bottom: 1px solid #e0e0e0;
    }
    .dashboard-tabs button {
        background: none;
        border: none;
        padding: 0.5rem 1rem;
        cursor: pointer;
        font-weight: 500;
    }
    .dashboard-tabs button.active {
        border-bottom: 3px solid #1E3A8A;
        color: #1E3A8A;
    }
    /* 폼 스타일링 */
    form[data-testid="stForm"] {
        background-color: white !important;
        padding: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
    }
    /* 폼 내부 버튼 */
    form[data-testid="stForm"] button[kind="formSubmit"] {
        background-color: #1E3A8A !important;
        color: white !important;
        font-weight: 600 !important;
        min-height: 40px !important;
        font-size: 1rem !important;
        border-radius: 4px !important;
    }
    /* 페이지 타이틀 스타일 개선 */
    .page-title {
        font-size: 1.8rem !important;
        font-weight: bold !important;
        color: #1E3A8A !important;
        margin-bottom: 1.5rem !important;
        padding-bottom: 0.5rem !important;
        border-bottom: 2px solid #e0e0e0 !important;
    }
    
    /* main-header 클래스 스타일 - 페이지 모듈에서 사용 */
    .main-header {
        font-size: 1.8rem !important;
        font-weight: bold !important;
        color: #1E3A8A !important;
        margin-bottom: 1.5rem !important;
        padding-bottom: 0.5rem !important;
        border-bottom: 2px solid #e0e0e0 !important;
    }
</style>
""", unsafe_allow_html=True)

def main():
    """
    메인 함수
    """
    # 사이드바
    with st.sidebar:
        # 언어 선택 상단에 배치
        st.markdown("<div class='language-selector'>", unsafe_allow_html=True)
        language_selector()
        st.markdown("</div>", unsafe_allow_html=True)
        
        # 로고와 앱 이름 (이미지 사용)
        col1, col2, col3 = st.columns([1, 3, 1])
        with col2:
            st.image("assets/images/worker1.png", width=120)
        
        # 앱 이름
        st.markdown("<div style='text-align: center; margin-top: 0.5rem;'><div style='font-weight: bold; color: #1E3A8A; font-size: 1.2rem;'>ALMUS EqMS SYSTEM</div></div>", unsafe_allow_html=True)
        st.markdown(f"<div class='sidebar-text'>{get_text('app_name')}</div>", unsafe_allow_html=True)
        
        st.divider()
        
        # 인증 성공 시 메뉴 표시
        if check_authentication():
            # 사용자 역할 가져오기
            user_role = get_user_role()
            
            # 메뉴 옵션 및 아이콘
            admin_icons = ["👥", "🔐", "🔧", "📊", "📦", "📥", "📤", "🏢", "📝"]
            admin_pages = {
                "admin_management": "관리자 관리",
                "user_management": "사용자 관리", 
                "supabase_settings": "Supabase 설정",
                **PAGES
            }
            
            user_icons = ["📊", "📦", "📥", "📤", "🏢", "📝"]
            user_pages = PAGES.copy()
            
            # 역할에 따른 메뉴 표시
            if user_role == 'system_admin':
                display_pages = admin_pages
                icons = admin_icons
            elif user_role == 'admin':
                # 관리자는 관리자 관리 및 Supabase 설정 제외
                display_pages = {k: v for k, v in admin_pages.items() if k != 'admin_management' and k != 'supabase_settings'}
                icons = admin_icons[1:] # 관리자 관리 아이콘 제외
            else:
                # 일반 사용자는 기본 페이지만
                display_pages = user_pages
                icons = user_icons
            
            # 인덱스 오류 방지를 위해 아이콘 리스트 길이 확인 및 조정
            if len(icons) < len(display_pages):
                # 부족한 아이콘 수만큼 기본 아이콘(📋) 추가
                icons.extend(['📋'] * (len(display_pages) - len(icons)))
            
            for i, (key, label) in enumerate(display_pages.items()):
                menu_class = "sidebar-menu-item"
                if "selected_menu" in st.session_state and st.session_state.selected_menu == key:
                    menu_class += " active"
                
                # 인덱스 범위 확인
                icon_idx = min(i, len(icons) - 1)
                
                if st.sidebar.button(
                    f"{icons[icon_idx]} {get_text(key) if key in PAGES else label}", 
                    key=f"menu_{key}",
                    help=get_text(key) if key in PAGES else label,
                    use_container_width=True
                ):
                    st.session_state.selected_menu = key
            
            # 로그아웃 버튼
            st.sidebar.button(
                f"🚪 {get_text('logout')}", 
                key="logout", 
                on_click=logout,
                use_container_width=True
            )
    
    # 메인 화면
    if not check_authentication():
        # 첫 번째 이미지 스타일처럼 로그인 화면 구성
        st.markdown(f"""
        <div class='login-container'>
            <h1 class='login-title'>{get_text('app_name')}</h1>
        """, unsafe_allow_html=True)
        
        # 로그인 폼 - 간단한 디자인으로
        with st.form(key="login_form", clear_on_submit=False):
            username = st.text_input(get_text('email'), key="username_input", placeholder=f"{get_text('username')}", value="")
            password = st.text_input(get_text('password'), type="password", key="password_input", placeholder=f"{get_text('password')}", value="")
            
            # 디버깅 정보 표시 체크박스 (선택적)
            debug_info = st.checkbox("디버그 정보 표시", value=True, key="debug_checkbox")
            
            submit_button = st.form_submit_button(get_text('login'), use_container_width=True)
            
            if submit_button:
                if debug_info:
                    st.write(f"로그인 시도: 사용자={username}, 비밀번호 길이={len(password if password else '')}")
                
                # 사용자 인증 및 데이터 가져오기
                user_data = check_login_credentials(username, password)
                if user_data:
                    # 로그인 성공, 세션 상태 업데이트
                    st.session_state['authenticated'] = True
                    st.session_state['username'] = username
                    st.session_state['user_data'] = user_data
                    
                    # 로그인 시간 업데이트
                    update_last_login(user_data['user_id'])
                    
                    # 페이지 리로드
                    st.rerun()
                else:
                    if debug_info:
                        from utils.auth import load_auth_config
                        config = load_auth_config()
                        if config:
                            st.write(f"사용 가능한 계정: {list(config['credentials']['usernames'].keys())}")
                    st.error(f"{get_text('error_info_sync')} ({get_text('email')}: {username})")
        
        # HTML 닫기
        st.markdown("</div>", unsafe_allow_html=True)
    else:
        # 선택된 메뉴가 없으면 대시보드 기본 설정
        if "selected_menu" not in st.session_state:
            st.session_state.selected_menu = "dashboard"
        
        # 메뉴에 따라 페이지 로드
        selected_menu = st.session_state.selected_menu
        
        try:
            if selected_menu == "dashboard":
                display_dashboard()
            elif selected_menu == "parts":
                from pages.parts import show
                show()
            elif selected_menu == "inventory":
                from pages.inventory import show
                show()
            elif selected_menu == "inbound":
                from pages.inbound import show
                show()
            elif selected_menu == "outbound":
                from pages.outbound import show
                show()
            elif selected_menu == "suppliers":
                from pages.suppliers import show
                show()
            elif selected_menu == "reports":
                from pages.reports import show
                show()
            elif selected_menu == "admin_management":
                admin_management()
            elif selected_menu == "user_management":
                user_management()
            elif selected_menu == "supabase_settings":
                supabase_settings()
        except ImportError as e:
            st.error(f"페이지 로드 중 오류가 발생했습니다: {e}")
            st.info("개발 중인 페이지입니다. 곧 서비스될 예정입니다.")
            if st.checkbox("디버그 정보 표시"):
                st.exception(e)

def display_dashboard():
    """
    대시보드 표시
    """
    from database.supabase_client import supabase
    import pandas as pd
    from utils.helpers import format_currency
    import logging
    
    logger = logging.getLogger(__name__)
    
    # 대시보드 페이지 타이틀 추가
    st.markdown(f"<div class='main-header'>{get_text('dashboard')}</div>", unsafe_allow_html=True)
    
    # 현재 날짜 표시
    current_date = datetime.now().strftime(f"%Y{get_text('year')} %m{get_text('month')} %d{get_text('day')}")
    st.markdown(f"<div style='text-align:right; margin-bottom:1rem;'>{current_date}</div>", unsafe_allow_html=True)
    
    # 대시보드 컨텐츠
    col1, col2, col3 = st.columns(3)
    
    # 재고 요약
    with col1:
        st.markdown("""
        <div style='background: #e3f2fd; border-radius: 16px; box-shadow: 0 2px 8px rgba(30,58,138,0.08); padding: 2rem 1.5rem; margin-bottom: 1.5rem; min-height: 420px;'>
        """, unsafe_allow_html=True)
        with st.container():
            st.markdown(f"### {get_text('stock_summary')}")
            try:
                # 총 부품 수 조회
                parts_result = supabase().from_("parts").select("part_id, min_stock, category", count="exact").execute()
                total_parts = parts_result.count if hasattr(parts_result, 'count') else 0
                
                # 부품 ID 목록 및 최소 재고량 정보 준비
                part_ids = []
                min_stock_data = {}
                category_data = {}
                
                if parts_result.data:
                    for part in parts_result.data:
                        part_id = part.get('part_id')
                        part_ids.append(part_id)
                        min_stock_data[part_id] = part.get('min_stock', 0)
                        
                        # 카테고리별 분류
                        category = part.get('category')
                        if not category:
                            category = '기타'
                        
                        if category not in category_data:
                            category_data[category] = []
                        category_data[category].append(part_id)
                
                # 재고 정보 일괄 조회 - 배치 처리로 변경
                inventory_data = {}
                total_quantity = 0
                batch_size = 30  # 한 번에 처리할 ID 수
                
                for i in range(0, len(part_ids), batch_size):
                    batch_ids = part_ids[i:i+batch_size]
                    try:
                        inventory_result = supabase().from_("inventory").select("part_id, current_quantity").in_("part_id", batch_ids).execute()
                        for item in inventory_result.data:
                            part_id = item.get('part_id')
                            quantity = item.get('current_quantity', 0) or 0  # None 값 안전 처리
                            inventory_data[part_id] = quantity
                            total_quantity += quantity
                    except Exception as e:
                        logger.error(f"재고 정보 조회 중 오류: {e}")
                
                # 가격 정보 일괄 조회 - 배치 처리로 변경
                price_data = {}
                batch_size = 30  # 한 번에 처리할 ID 수
                
                for i in range(0, len(part_ids), batch_size):
                    batch_ids = part_ids[i:i+batch_size]
                    try:
                        price_result = supabase().from_("part_prices").select("part_id, unit_price").in_("part_id", batch_ids).eq("is_current", True).execute()
                        for item in price_result.data:
                            price_data[item.get('part_id')] = item.get('unit_price', 0) or 0  # None 값 안전 처리
                    except Exception as e:
                        logger.error(f"가격 정보 조회 중 오류: {e}")
                
                # 총 재고 가치 계산
                total_value = 0
                for part_id, quantity in inventory_data.items():
                    unit_price = price_data.get(part_id, 0)
                    total_value += quantity * unit_price
                
                # 재고 부족 아이템 수 계산
                low_stock_count = 0
                for part_id, min_stock in min_stock_data.items():
                    # None 값을 안전하게 처리
                    min_stock = 0 if min_stock is None else min_stock
                    current_quantity = inventory_data.get(part_id, 0) or 0  # None일 경우 0으로 변환
                    
                    # 이제 안전하게 비교 가능
                    if current_quantity < min_stock:
                        low_stock_count += 1
                
                # 표시할 내용
                st.metric(get_text('total_parts'), f"{total_parts}{get_text('items')}")
                st.metric(get_text('total_quantity'), f"{total_quantity}{get_text('items')}")
                st.metric(get_text('total_value'), format_currency(total_value))
                
                if low_stock_count > 0:
                    st.error(f"{get_text('low_stock_warning')}: {low_stock_count}{get_text('items')}")
                else:
                    st.success(get_text('all_stock_good'))
                
            except Exception as e:
                st.error(f"{get_text('error_loading_data')}: {str(e)}")
        st.markdown("</div>", unsafe_allow_html=True)

    # 최근 입고 현황
    with col2:
        st.markdown("""
        <div style='background: #f5f7fa; border-radius: 16px; box-shadow: 0 2px 8px rgba(30,58,138,0.08); padding: 2rem 1.5rem; margin-bottom: 1.5rem; min-height: 420px;'>
        """, unsafe_allow_html=True)
        with st.container():
            st.markdown(f"### {get_text('recent_inbound')}")
            try:
                # 최근 5건의 입고 내역 조회
                inbound_result = supabase().from_("inbound").select("inbound_id, inbound_date, part_id, supplier_id, quantity").order("inbound_date", desc=True).limit(5).execute()
                
                if inbound_result.data and len(inbound_result.data) > 0:
                    for item in inbound_result.data:
                        part_id = item.get("part_id")
                        supplier_id = item.get("supplier_id")
                        
                        # 부품 정보 조회
                        part_data = {}
                        if part_id:
                            part_result = supabase().from_("parts").select("part_code, part_name").eq("part_id", part_id).execute()
                            if part_result.data:
                                part_data = part_result.data[0]
                        
                        # 공급업체 정보 조회
                        supplier_data = {}
                        if supplier_id:
                            supplier_result = supabase().from_("suppliers").select("supplier_name").eq("supplier_id", supplier_id).execute()
                            if supplier_result.data:
                                supplier_data = supplier_result.data[0]
                        
                        inbound_date = item.get("inbound_date", "")
                        if inbound_date:
                            inbound_date = inbound_date.split("T")[0]  # 날짜만 추출
                        
                        with st.container():
                            st.markdown(f"**{part_data.get('part_code', '')}** - {part_data.get('part_name', '')}")
                            st.markdown(f"{get_text('quantity')}: **{item.get('quantity', 0)}** | {get_text('supplier')}: {supplier_data.get('supplier_name', '')}")
                            st.caption(f"{inbound_date}")
                            st.divider()
                else:
                    st.info(get_text('no_inbound_history'))
                    
            except Exception as e:
                st.error(f"{get_text('error_loading_data')}: {str(e)}")
        st.markdown("</div>", unsafe_allow_html=True)
                
    # 최근 출고 현황
    with col3:
        st.markdown("""
        <div style='background: #e3f2fd; border-radius: 16px; box-shadow: 0 2px 8px rgba(30,58,138,0.08); padding: 2rem 1.5rem; margin-bottom: 1.5rem; min-height: 420px;'>
        """, unsafe_allow_html=True)
        with st.container():
            st.markdown(f"### {get_text('recent_outbound')}")
            try:
                # 최근 5건의 출고 내역 조회
                outbound_result = supabase().from_("outbound").select("outbound_id, outbound_date, part_id, quantity, requester").order("outbound_date", desc=True).limit(5).execute()
                
                if outbound_result.data and len(outbound_result.data) > 0:
                    for item in outbound_result.data:
                        part_id = item.get("part_id")
                        
                        # 부품 정보 조회
                        part_data = {}
                        if part_id:
                            part_result = supabase().from_("parts").select("part_code, part_name").eq("part_id", part_id).execute()
                            if part_result.data:
                                part_data = part_result.data[0]
                        
                        outbound_date = item.get("outbound_date", "")
                        if outbound_date:
                            outbound_date = outbound_date.split("T")[0]  # 날짜만 추출
                        
                        with st.container():
                            st.markdown(f"**{part_data.get('part_code', '')}** - {part_data.get('part_name', '')}")
                            st.markdown(f"{get_text('quantity')}: **{item.get('quantity', 0)}** | {get_text('requester')}: {item.get('requester', '')}")
                            st.caption(f"{outbound_date}")
                            st.divider()
                else:
                    st.info(get_text('no_outbound_history'))
                    
            except Exception as e:
                st.error(f"{get_text('error_loading_data')}: {str(e)}")
        st.markdown("</div>", unsafe_allow_html=True)
    
    # 재고 부족 아이템 목록
    st.markdown(f"### {get_text('low_stock_items')}")
    try:
        # 모든 부품 정보를 한 번에 가져오기 (ID, 코드, 이름, 카테고리, 단위, 최소재고량)
        parts_result = supabase().from_("parts").select("part_id, part_code, part_name, category, unit, min_stock").execute()
        
        if parts_result.data:
            # 모든 부품 ID 목록 생성
            all_part_ids = [part.get('part_id') for part in parts_result.data]
            
            # 모든 부품의 재고 정보 한 번에 가져오기 - 배치 처리로 변경
            inventory_map = {}
            batch_size = 30  # 한 번에 처리할 ID 수
            
            for i in range(0, len(all_part_ids), batch_size):
                batch_ids = all_part_ids[i:i+batch_size]
                try:
                    inventory_result = supabase().from_("inventory").select("part_id, current_quantity").in_("part_id", batch_ids).execute()
                    for item in inventory_result.data:
                        inventory_map[item.get('part_id')] = item.get('current_quantity', 0) or 0  # None 값 안전 처리
                except Exception as e:
                    logger.error(f"재고 정보 조회 중 오류: {e}")
            
            # 재고 부족 아이템 찾기
            low_stock_items = []
            for part in parts_result.data:
                part_id = part.get('part_id')
                # None 값을 안전하게 처리
                min_stock = part.get('min_stock', 0) or 0  # None일 경우 0으로 변환
                current_quantity = inventory_map.get(part_id, 0) or 0  # None일 경우 0으로 변환
                
                # 최소 재고량보다 적으면 목록에 추가
                if current_quantity < min_stock:
                    shortage = min_stock - current_quantity
                    low_stock_items.append({
                        'part_id': part_id,
                        'part_code': part.get('part_code', ''),
                        'part_name': part.get('part_name', ''),
                        'category': part.get('category', ''),
                        'unit': part.get('unit', ''),
                        'current_quantity': current_quantity,
                        'min_stock': min_stock,
                        'shortage': shortage
                    })
            
            # 부족량 기준으로 정렬
            low_stock_items = sorted(low_stock_items, key=lambda x: x.get('shortage', 0), reverse=True)
            
            if low_stock_items:
                # 데이터프레임으로 변환하여 표시
                df = pd.DataFrame(low_stock_items)
                
                # 페이지네이션 기능 추가
                items_per_page = 10
                total_pages = (len(df) + items_per_page - 1) // items_per_page  # 올림 나눗셈
                
                # 페이지 상태 관리
                if 'low_stock_page' not in st.session_state:
                    st.session_state.low_stock_page = 1
                
                # 현재 페이지에 해당하는 데이터만 선택
                current_page = st.session_state.low_stock_page
                start_idx = (current_page - 1) * items_per_page
                end_idx = min(start_idx + items_per_page, len(df))
                
                show_df = df.iloc[start_idx:end_idx].copy()
                
                # 페이지 정보 표시
                st.caption(f"{get_text('search_results')} {len(df)}{get_text('items')} {get_text('from')} {start_idx+1}-{end_idx} ({total_pages} {get_text('total')})")
                
                # 데이터프레임 표시
                st.dataframe(
                    show_df,
                    column_config={
                        'part_code': st.column_config.TextColumn(get_text("part_code")),
                        'part_name': st.column_config.TextColumn(get_text("part_name")),
                        'category': st.column_config.TextColumn(get_text("category")),
                        'current_quantity': st.column_config.NumberColumn(get_text("current_stock"), format="%d"),
                        'min_stock': st.column_config.NumberColumn(get_text("min_stock"), format="%d"),
                        'shortage': st.column_config.NumberColumn(get_text("items"), format="%d")
                    },
                    hide_index=True,
                    use_container_width=True
                )
                
                # 페이지 네비게이션 버튼
                col1, col2, col3 = st.columns([1, 3, 1])
                
                with col1:
                    if current_page > 1:
                        if st.button(f"◀ {get_text('back')}"):
                            st.session_state.low_stock_page -= 1
                            st.rerun()
                
                with col2:
                    # 페이지 번호 버튼들
                    page_cols = st.columns(min(5, total_pages))
                    
                    # 현재 페이지 주변 버튼 표시
                    start_page = max(1, current_page - 2)
                    end_page = min(total_pages, start_page + 4)
                    
                    for i, page in enumerate(range(start_page, end_page + 1)):
                        with page_cols[i % len(page_cols)]:
                            button_label = f"{page}"
                            if page == current_page:
                                st.markdown(f"**{button_label}**")
                            else:
                                if st.button(button_label):
                                    st.session_state.low_stock_page = page
                                    st.rerun()
                
                with col3:
                    if current_page < total_pages:
                        if st.button(f"{get_text('next')} ▶"):
                            st.session_state.low_stock_page += 1
                            st.rerun()
            else:
                st.info(get_text('all_stock_good'))
    except Exception as e:
        st.error(f"{get_text('error_loading_data')}: {str(e)}")

    # 카테고리별 요약
    st.markdown(f"### {get_text('category')} {get_text('stock_summary')}")
    try:
        # 카테고리별 정보 계산
        category_summary = []
        for category, part_ids in category_data.items():
            category_quantity = 0
            category_value = 0
            category_low_stock = 0
            
            for part_id in part_ids:
                current_qty = inventory_data.get(part_id, 0) or 0
                category_quantity += current_qty
                
                # 가치 계산
                unit_price = price_data.get(part_id, 0) or 0
                category_value += current_qty * unit_price
                
                # 재고 부족 계산
                min_stock = min_stock_data.get(part_id, 0) or 0
                if current_qty < min_stock:
                    category_low_stock += 1
            
            category_summary.append({
                'category': category,
                'part_count': len(part_ids),
                'quantity': category_quantity,
                'value': category_value,
                'low_stock': category_low_stock
            })
        
        # 카테고리별 정보 표시 (최대 5개만 표시, 나머지는 '기타'로 합산)
        category_summary = sorted(category_summary, key=lambda x: x['value'], reverse=True)
        
        if len(category_summary) > 5:
            top_categories = category_summary[:4]
            
            # 나머지 카테고리 합산
            others = {
                'category': get_text('category'),
                'part_count': sum(item['part_count'] for item in category_summary[4:]),
                'quantity': sum(item['quantity'] for item in category_summary[4:]),
                'value': sum(item['value'] for item in category_summary[4:]),
                'low_stock': sum(item['low_stock'] for item in category_summary[4:])
            }
            
            top_categories.append(others)
            category_summary = top_categories
        
        # 데이터프레임으로 변환
        df = pd.DataFrame(category_summary)
        
        # 가치 컬럼 포맷 적용
        df['value_formatted'] = df['value'].apply(format_currency)
        
        # 데이터프레임 표시
        st.dataframe(
            df,
            column_config={
                'category': st.column_config.TextColumn(get_text('category')),
                'part_count': st.column_config.NumberColumn(f"{get_text('part_code')} {get_text('quantity')}", format="%d{get_text('items')}"),
                'quantity': st.column_config.NumberColumn(get_text('quantity'), format="%d{get_text('items')}"),
                'value_formatted': st.column_config.TextColumn(get_text('total_value')),
                'low_stock': st.column_config.NumberColumn(get_text('low_stock_items'), format="%d{get_text('items')}")
            },
            hide_index=True,
            use_container_width=True
        )
    except Exception as e:
        st.error(f"{get_text('error_loading_data')}: {str(e)}")

if __name__ == "__main__":
    main() 