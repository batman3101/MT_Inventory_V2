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
        "updated_at": "수정일",
        "stock_summary": "재고 요약",
        "recent_inbound": "최근 입고 현황",
        "recent_outbound": "최근 출고 현황",
        "low_stock_items": "재고 부족 아이템",
        "total_parts": "총 부품 종류",
        "total_quantity": "총 재고 수량",
        "total_value": "총 재고 가치",
        "low_stock_warning": "⚠️ 재고 부족 품목",
        "all_stock_good": "✓ 모든 품목 재고 양호",
        "no_inbound_history": "최근 입고 내역이 없습니다.",
        "no_outbound_history": "최근 출고 내역이 없습니다.",
        "no_search_results": "검색 결과가 없습니다.",
        "search_results": "검색 결과",
        "items": "건",
        "download": "다운로드",
        "currency": "통화",
        "inbound_id": "입고 ID",
        "year": "년",
        "month": "월",
        "day": "일",
        "error_loading_data": "데이터를 불러오는 중 오류가 발생했습니다",
        "error_search": "데이터 검색 중 오류가 발생했습니다",
        "success_save": "저장되었습니다",
        "success_report": "보고서가 생성되었습니다",
        "success_excel": "Excel 파일로 저장되었습니다",
        "error_save": "저장 중 오류가 발생했습니다",
        "error_info_sync": "정보를 가져올 수 없습니다",
        "select_part": "부품을 선택해주세요",
        "select_supplier": "공급업체를 선택해주세요",
        "quantity_min": "수량은 1 이상이어야 합니다",
        "price_min": "단가는 0보다 커야 합니다",
        "part_info": "부품 정보",
        "supplier_info": "공급업체 정보",
        "inbound_history": "입고 이력 검색",
        "outbound_history": "출고 이력 검색",
        "add_inbound": "신규 입고 등록",
        "add_outbound": "신규 출고 등록",
        "period": "기간 선택",
        "from": "부터",
        "to": "까지",
        "detailed_report": "상세 내역",
        "error": "오류",
        "success": "성공",
        "info": "정보",
        "warning": "경고"
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
        "updated_at": "Updated At",
        "stock_summary": "Stock Summary",
        "recent_inbound": "Recent Inbound",
        "recent_outbound": "Recent Outbound",
        "low_stock_items": "Low Stock Items",
        "total_parts": "Total Parts",
        "total_quantity": "Total Quantity",
        "total_value": "Total Value",
        "low_stock_warning": "⚠️ Low Stock Items",
        "all_stock_good": "✓ All Stock Levels Good",
        "no_inbound_history": "No recent inbound history",
        "no_outbound_history": "No recent outbound history",
        "no_search_results": "No search results",
        "search_results": "Search Results",
        "items": "items",
        "download": "Download",
        "currency": "Currency",
        "inbound_id": "Inbound ID",
        "year": "",
        "month": "",
        "day": "",
        "error_loading_data": "Error loading data",
        "error_search": "Error searching data",
        "success_save": "Saved successfully",
        "success_report": "Report generated successfully",
        "success_excel": "Saved as Excel file",
        "error_save": "Error while saving",
        "error_info_sync": "Cannot retrieve information",
        "select_part": "Please select a part",
        "select_supplier": "Please select a supplier",
        "quantity_min": "Quantity must be at least 1",
        "price_min": "Price must be greater than 0",
        "part_info": "Part Information",
        "supplier_info": "Supplier Information",
        "inbound_history": "Inbound History Search",
        "outbound_history": "Outbound History Search",
        "add_inbound": "Add New Inbound",
        "add_outbound": "Add New Outbound",
        "period": "Select Period",
        "from": "from",
        "to": "to",
        "detailed_report": "Detailed Report"
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
        "updated_at": "Ngày Cập Nhật",
        "stock_summary": "Tổng Quan Tồn Kho",
        "recent_inbound": "Nhập Kho Gần Đây",
        "recent_outbound": "Xuất Kho Gần Đây",
        "low_stock_items": "Các Mặt Hàng Sắp Hết",
        "total_parts": "Tổng Số Linh Kiện",
        "total_quantity": "Tổng Số Lượng",
        "total_value": "Tổng Giá Trị",
        "low_stock_warning": "⚠️ Mặt Hàng Sắp Hết",
        "all_stock_good": "✓ Tất Cả Hàng Tồn Đủ",
        "no_inbound_history": "Không có lịch sử nhập kho gần đây",
        "no_outbound_history": "Không có lịch sử xuất kho gần đây",
        "no_search_results": "Không có kết quả tìm kiếm",
        "search_results": "Kết Quả Tìm Kiếm",
        "items": "mục",
        "download": "Tải Về",
        "currency": "Tiền Tệ",
        "inbound_id": "ID Nhập Kho",
        "year": "năm",
        "month": "tháng",
        "day": "ngày",
        "error_loading_data": "Lỗi khi tải dữ liệu",
        "error_search": "Lỗi khi tìm kiếm dữ liệu",
        "success_save": "Đã lưu thành công",
        "success_report": "Đã tạo báo cáo thành công",
        "success_excel": "Đã lưu dưới dạng tệp Excel",
        "error_save": "Lỗi khi lưu",
        "error_info_sync": "Không thể lấy thông tin",
        "select_part": "Vui lòng chọn một linh kiện",
        "select_supplier": "Vui lòng chọn nhà cung cấp",
        "quantity_min": "Số lượng phải ít nhất là 1",
        "price_min": "Giá phải lớn hơn 0",
        "part_info": "Thông Tin Linh Kiện",
        "supplier_info": "Thông Tin Nhà Cung Cấp",
        "inbound_history": "Tìm Kiếm Lịch Sử Nhập Kho",
        "outbound_history": "Tìm Kiếm Lịch Sử Xuất Kho",
        "add_inbound": "Thêm Nhập Kho Mới",
        "add_outbound": "Thêm Xuất Kho Mới",
        "period": "Chọn Khoảng Thời Gian",
        "from": "từ",
        "to": "đến",
        "detailed_report": "Báo Cáo Chi Tiết"
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