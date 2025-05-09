"""
다국어 지원 유틸리티 모듈
"""
import json
import os
import streamlit as st
import sys

# 상위 디렉토리를 path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.config import SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE

# 세션 상태 초기화
if 'language' not in st.session_state:
    st.session_state.language = DEFAULT_LANGUAGE

# 각 언어별 번역 데이터
translations = {
    "ko": {
        "app_name": "설비 유지보수 부품 관리 시스템",
        "dashboard": "대시보드",
        "parts": "부품 관리",
        "inventory": "재고 관리",
        "inbound": "입고 관리",
        "outbound": "출고 관리",
        "suppliers": "공급업체 관리",
        "reports": "보고서",
        "settings": "설정",
        "login": "로그인",
        "logout": "로그아웃",
        "username": "사용자명",
        "password": "비밀번호",
        "email": "이메일",
        "name": "이름",
        "role": "역할",
        "admin": "관리자",
        "user": "일반 사용자",
        "search": "검색",
        "filter": "필터",
        "add": "추가",
        "edit": "수정",
        "delete": "삭제",
        "save": "저장",
        "cancel": "취소",
        "confirm": "확인",
        "back": "뒤로",
        "next": "다음",
        "create": "생성",
        "update": "업데이트",
        "details": "상세 정보",
        "date": "날짜",
        "time": "시간",
        "quantity": "수량",
        "price": "가격",
        "total": "합계",
        "status": "상태",
        "action": "작업",
        "description": "설명",
        "category": "카테고리",
        "part_code": "부품 코드",
        "part_name": "부품명",
        "supplier": "공급업체",
        "unit": "단위",
        "min_stock": "최소 재고량",
        "current_stock": "현재 재고량",
        "spec": "사양",
        "vietnamese_name": "베트남어 이름",
        "korean_name": "한국어 이름",
        "english_name": "영어 이름",
        "inbound_date": "입고일",
        "outbound_date": "출고일",
        "requester": "요청자",
        "department": "부서",
        "equipment_id": "설비 ID",
        "purpose": "용도",
        "reference_number": "참조 번호",
        "remarks": "비고",
        "created_by": "생성자",
        "created_at": "생성일",
        "updated_at": "수정일"
    },
    "en": {
        "app_name": "Equipment Maintenance Parts Management System",
        "dashboard": "Dashboard",
        "parts": "Parts Management",
        "inventory": "Inventory Management",
        "inbound": "Inbound Management",
        "outbound": "Outbound Management",
        "suppliers": "Supplier Management",
        "reports": "Reports",
        "settings": "Settings",
        "login": "Login",
        "logout": "Logout",
        "username": "Username",
        "password": "Password",
        "email": "Email",
        "name": "Name",
        "role": "Role",
        "admin": "Administrator",
        "user": "User",
        "search": "Search",
        "filter": "Filter",
        "add": "Add",
        "edit": "Edit",
        "delete": "Delete",
        "save": "Save",
        "cancel": "Cancel",
        "confirm": "Confirm",
        "back": "Back",
        "next": "Next",
        "create": "Create",
        "update": "Update",
        "details": "Details",
        "date": "Date",
        "time": "Time",
        "quantity": "Quantity",
        "price": "Price",
        "total": "Total",
        "status": "Status",
        "action": "Action",
        "description": "Description",
        "category": "Category",
        "part_code": "Part Code",
        "part_name": "Part Name",
        "supplier": "Supplier",
        "unit": "Unit",
        "min_stock": "Minimum Stock",
        "current_stock": "Current Stock",
        "spec": "Specification",
        "vietnamese_name": "Vietnamese Name",
        "korean_name": "Korean Name",
        "english_name": "English Name",
        "inbound_date": "Inbound Date",
        "outbound_date": "Outbound Date",
        "requester": "Requester",
        "department": "Department",
        "equipment_id": "Equipment ID",
        "purpose": "Purpose",
        "reference_number": "Reference Number",
        "remarks": "Remarks",
        "created_by": "Created By",
        "created_at": "Created At",
        "updated_at": "Updated At"
    },
    "vi": {
        "app_name": "Hệ Thống Quản Lý Linh Kiện Bảo Trì Thiết Bị",
        "dashboard": "Bảng Điều Khiển",
        "parts": "Quản Lý Linh Kiện",
        "inventory": "Quản Lý Tồn Kho",
        "inbound": "Quản Lý Nhập Kho",
        "outbound": "Quản Lý Xuất Kho",
        "suppliers": "Quản Lý Nhà Cung Cấp",
        "reports": "Báo Cáo",
        "settings": "Cài Đặt",
        "login": "Đăng Nhập",
        "logout": "Đăng Xuất",
        "username": "Tên Đăng Nhập",
        "password": "Mật Khẩu",
        "email": "Email",
        "name": "Tên",
        "role": "Vai Trò",
        "admin": "Quản Trị Viên",
        "user": "Người Dùng",
        "search": "Tìm Kiếm",
        "filter": "Bộ Lọc",
        "add": "Thêm",
        "edit": "Sửa",
        "delete": "Xóa",
        "save": "Lưu",
        "cancel": "Hủy",
        "confirm": "Xác Nhận",
        "back": "Quay Lại",
        "next": "Tiếp Theo",
        "create": "Tạo Mới",
        "update": "Cập Nhật",
        "details": "Chi Tiết",
        "date": "Ngày",
        "time": "Thời Gian",
        "quantity": "Số Lượng",
        "price": "Giá",
        "total": "Tổng",
        "status": "Trạng Thái",
        "action": "Thao Tác",
        "description": "Mô Tả",
        "category": "Danh Mục",
        "part_code": "Mã Linh Kiện",
        "part_name": "Tên Linh Kiện",
        "supplier": "Nhà Cung Cấp",
        "unit": "Đơn Vị",
        "min_stock": "Tồn Kho Tối Thiểu",
        "current_stock": "Tồn Kho Hiện Tại",
        "spec": "Thông Số Kỹ Thuật",
        "vietnamese_name": "Tên Tiếng Việt",
        "korean_name": "Tên Tiếng Hàn",
        "english_name": "Tên Tiếng Anh",
        "inbound_date": "Ngày Nhập Kho",
        "outbound_date": "Ngày Xuất Kho",
        "requester": "Người Yêu Cầu",
        "department": "Bộ Phận",
        "equipment_id": "Mã Thiết Bị",
        "purpose": "Mục Đích",
        "reference_number": "Số Tham Chiếu",
        "remarks": "Ghi Chú",
        "created_by": "Người Tạo",
        "created_at": "Ngày Tạo",
        "updated_at": "Ngày Cập Nhật"
    }
}

def set_language(lang):
    """
    언어 설정 변경
    
    Args:
        lang: 언어 코드 ('ko', 'en', 'vi')
    """
    if lang in SUPPORTED_LANGUAGES:
        st.session_state.language = lang

def get_current_language():
    """
    현재 언어 코드 반환
    
    Returns:
        str: 현재 언어 코드
    """
    if 'language' not in st.session_state:
        st.session_state.language = DEFAULT_LANGUAGE
    return st.session_state.language

def get_text(key):
    """
    현재 언어로 번역된 텍스트 반환
    
    Args:
        key: 번역 키
        
    Returns:
        str: 번역된 텍스트
    """
    lang = get_current_language()
    
    # 해당 언어로 번역이 없는 경우 기본 언어(한국어)로 대체
    if key not in translations.get(lang, {}):
        return translations.get(DEFAULT_LANGUAGE, {}).get(key, key)
    
    return translations.get(lang, {}).get(key, key)

def language_selector():
    """
    언어 선택 드롭다운 표시
    """
    selected_lang = st.selectbox(
        "언어 / Language / Ngôn ngữ",
        options=list(SUPPORTED_LANGUAGES.keys()),
        format_func=lambda x: SUPPORTED_LANGUAGES[x],
        index=list(SUPPORTED_LANGUAGES.keys()).index(get_current_language())
    )
    
    if selected_lang != get_current_language():
        set_language(selected_lang)
        st.rerun() 