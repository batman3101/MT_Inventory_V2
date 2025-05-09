"""
공급업체 관리 모듈
"""
import streamlit as st
import pandas as pd
import sys
import os
from datetime import datetime

# 모듈 경로 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.helpers import display_error, display_success, display_info, display_warning, format_date, format_currency
from utils.i18n import get_text
from database.supabase_client import supabase

def show():
    """
    공급업체 관리 페이지 표시
    """
    st.markdown(f"<div class='main-header'>{get_text('suppliers')}</div>", unsafe_allow_html=True)
    
    # 탭 설정
    tabs = st.tabs([
        f"📋 {get_text('search')}",
        f"➕ {get_text('add')}",
        f"📊 {get_text('details')}"
    ])
    
    # 검색 탭
    with tabs[0]:
        show_suppliers_search()
    
    # 추가 탭
    with tabs[1]:
        show_suppliers_add()
    
    # 상세 탭
    with tabs[2]:
        show_suppliers_details()

def show_suppliers_search():
    """
    공급업체 검색 화면 표시
    """
    st.markdown("### 공급업체 검색")
    
    # 검색 필터
    col1, col2 = st.columns(2)
    
    with col1:
        search_code = st.text_input(f"공급업체 코드 {get_text('search')}", placeholder="SAMSOO")
    
    with col2:
        search_name = st.text_input(f"공급업체명 {get_text('search')}", placeholder="삼수")
    
    # 검색 버튼
    if st.button(f"🔍 {get_text('search')}", type="primary"):
        try:
            # 데모 데이터 (실제로는 Supabase에서 가져옴)
            data = {
                'supplier_id': [1, 2, 3, 4, 5, 6, 7, 8],
                'supplier_code': ['YSCM', 'SAMSOO', 'RPS', 'THT', 'FC TECH', 'HTT', 'ATH', 'UIL'],
                'supplier_name': ['와이에스씨엠', '삼수', '알피에스', '티에이치티', '에프씨 테크', '에이치티티', '에이티에이치', '유아이엘'],
                'contact_person': ['홍길동', '김철수', '박영희', '이민수', '정지훈', '최유리', '한상욱', '강민정'],
                'phone': ['02-1234-5678', '02-2345-6789', '02-3456-7890', '02-4567-8901', 
                         '02-5678-9012', '02-6789-0123', '02-7890-1234', '02-8901-2345'],
                'email': ['contact@yscm.com', 'info@samsoo.com', 'sales@rps.co.kr', 'support@tht.kr',
                         'sales@fctech.com', 'info@htt.kr', 'contact@ath.co.kr', 'info@uil.com'],
                'created_at': ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04',
                              '2023-01-05', '2023-01-06', '2023-01-07', '2023-01-08']
            }
            df = pd.DataFrame(data)
            
            # 검색 필터 적용
            if search_code:
                df = df[df['supplier_code'].str.contains(search_code, case=False)]
            
            if search_name:
                df = df[df['supplier_name'].str.contains(search_name, case=False)]
            
            # 결과 표시
            if len(df) > 0:
                st.dataframe(
                    df,
                    column_config={
                        'supplier_id': st.column_config.NumberColumn("공급업체 ID", format="%d"),
                        'supplier_code': st.column_config.TextColumn("공급업체 코드"),
                        'supplier_name': st.column_config.TextColumn("공급업체명"),
                        'contact_person': st.column_config.TextColumn("담당자"),
                        'phone': st.column_config.TextColumn("연락처"),
                        'email': st.column_config.TextColumn("이메일"),
                        'created_at': st.column_config.DateColumn("등록일", format="YYYY-MM-DD")
                    },
                    use_container_width=True,
                    hide_index=True
                )
                
                # 내보내기 버튼
                if st.button(f"📥 Excel {get_text('save')}"):
                    # 실제로는 Excel 저장 로직 구현
                    display_success("Excel 파일로 저장되었습니다.")
            else:
                display_info("검색 결과가 없습니다.")
        except Exception as e:
            display_error(f"데이터 검색 중 오류가 발생했습니다: {e}")

def show_suppliers_add():
    """
    공급업체 추가 화면 표시
    """
    st.markdown("### 신규 공급업체 등록")
    
    # 입력 폼
    with st.form("add_supplier_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            supplier_code = st.text_input("공급업체 코드*", placeholder="SUPPLIER")
            supplier_name = st.text_input("공급업체명*", placeholder="신규 공급업체")
            contact_person = st.text_input("담당자", placeholder="홍길동")
        
        with col2:
            phone = st.text_input("연락처", placeholder="02-1234-5678")
            email = st.text_input("이메일", placeholder="contact@example.com")
            address = st.text_input("주소", placeholder="서울시 강남구")
        
        submitted = st.form_submit_button(f"✅ {get_text('save')}")
        
        if submitted:
            # 필수 입력 확인
            if not supplier_code:
                display_error("공급업체 코드는 필수 입력 항목입니다.")
            elif not supplier_name:
                display_error("공급업체명은 필수 입력 항목입니다.")
            else:
                try:
                    # 공급업체 정보 저장 (실제로는 Supabase에 저장)
                    display_success(f"새 공급업체 '{supplier_name}'이(가) 등록되었습니다.")
                    
                    # 폼 초기화
                    st.rerun()
                except Exception as e:
                    display_error(f"공급업체 등록 중 오류가 발생했습니다: {e}")

def show_suppliers_details():
    """
    공급업체 상세 정보 화면 표시
    """
    # 공급업체 선택
    supplier_options = ["-- 공급업체 선택 --", "YSCM", "SAMSOO", "RPS", "THT", "FC TECH", "HTT", "ATH", "UIL"]
    selected_supplier = st.selectbox("공급업체 선택", supplier_options)
    
    if selected_supplier != "-- 공급업체 선택 --":
        # 데모 데이터 (실제로는 Supabase에서 가져옴)
        if selected_supplier == "SAMSOO":
            supplier_data = {
                'supplier_id': 2,
                'supplier_code': 'SAMSOO',
                'supplier_name': '삼수',
                'contact_person': '김철수',
                'phone': '02-2345-6789',
                'email': 'info@samsoo.com',
                'address': '서울시 강남구 테헤란로 123',
                'created_at': '2023-01-02',
                'updated_at': '2023-01-02'
            }
            
            # 공급하는 부품 목록
            parts_data = {
                'part_id': [1, 2, 5],
                'part_code': ['MT001', 'MT002', 'MT005'],
                'part_name': ['COOLANT FILTER', 'ELECTRIC FILTER', 'MOTOR'],
                'unit_price': [15000, 25000, 450000],
                'is_current': [True, True, True],
                'effective_date': ['2023-01-01', '2023-01-01', '2023-01-01']
            }
            
            # 입고 이력
            inbound_data = {
                'inbound_id': [1, 6, 10],
                'part_code': ['MT001', 'MT002', 'MT005'],
                'part_name': ['COOLANT FILTER', 'ELECTRIC FILTER', 'MOTOR'],
                'quantity': [10, 5, 2],
                'unit_price': [15000, 25000, 450000],
                'total_price': [150000, 125000, 900000],
                'inbound_date': ['2023-04-01', '2023-05-10', '2023-06-15']
            }
            
            # 상세 정보 표시
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown("#### 기본 정보")
                st.markdown(f"**공급업체 코드:** {supplier_data['supplier_code']}")
                st.markdown(f"**공급업체명:** {supplier_data['supplier_name']}")
                st.markdown(f"**담당자:** {supplier_data['contact_person']}")
                st.markdown(f"**연락처:** {supplier_data['phone']}")
            
            with col2:
                st.markdown("#### 연락처 정보")
                st.markdown(f"**이메일:** {supplier_data['email']}")
                st.markdown(f"**주소:** {supplier_data['address']}")
                st.markdown(f"**등록일:** {supplier_data['created_at']}")
                st.markdown(f"**수정일:** {supplier_data['updated_at']}")
            
            # 공급 부품 정보
            st.markdown("#### 공급 부품 정보")
            
            parts_df = pd.DataFrame(parts_data)
            
            st.dataframe(
                parts_df,
                column_config={
                    'part_code': st.column_config.TextColumn(get_text('part_code')),
                    'part_name': st.column_config.TextColumn(get_text('part_name')),
                    'unit_price': st.column_config.NumberColumn(get_text('price'), format="₫%d"),
                    'is_current': st.column_config.CheckboxColumn("현재 적용"),
                    'effective_date': st.column_config.DateColumn("적용일", format="YYYY-MM-DD")
                },
                use_container_width=True,
                hide_index=True
            )
            
            # 가격 정보 업데이트 버튼
            if st.button("가격 정보 업데이트"):
                # 가격 정보 업데이트 폼으로 이동 (실제로는 새 폼 열기)
                display_info("가격 정보 업데이트 모드로 전환됩니다.")
            
            # 입고 이력
            st.markdown("#### 최근 입고 이력")
            
            inbound_df = pd.DataFrame(inbound_data)
            
            st.dataframe(
                inbound_df,
                column_config={
                    'inbound_id': st.column_config.NumberColumn("입고 ID", format="%d"),
                    'part_code': st.column_config.TextColumn(get_text('part_code')),
                    'part_name': st.column_config.TextColumn(get_text('part_name')),
                    'quantity': st.column_config.NumberColumn(get_text('quantity'), format="%d"),
                    'unit_price': st.column_config.NumberColumn(get_text('price'), format="₫%d"),
                    'total_price': st.column_config.NumberColumn(get_text('total'), format="₫%d"),
                    'inbound_date': st.column_config.DateColumn(get_text('inbound_date'), format="YYYY-MM-DD")
                },
                use_container_width=True,
                hide_index=True
            )
            
            # 수정/삭제 버튼
            col1, col2 = st.columns(2)
            with col1:
                if st.button(f"✏️ {get_text('edit')}", key="edit_supplier"):
                    # 수정 로직 (실제로는 수정 폼으로 이동)
                    st.session_state.edit_supplier_id = supplier_data['supplier_id']
                    display_info("수정 모드로 전환됩니다.")
            
            with col2:
                if st.button(f"🗑️ {get_text('delete')}", key="delete_supplier"):
                    # 삭제 확인 (실제로는 확인 다이얼로그 후 삭제)
                    st.warning(f"정말로 '{supplier_data['supplier_name']}' 공급업체를 삭제하시겠습니까?")
                    if st.button("확인", key="confirm_delete"):
                        # 삭제 로직
                        display_success(f"공급업체 '{supplier_data['supplier_name']}'이(가) 삭제되었습니다.")
        else:
            st.info(f"'{selected_supplier}' 공급업체 정보가 준비 중입니다.")

if __name__ == "__main__":
    show() 