"""
입고 관리 모듈
"""
import streamlit as st
import pandas as pd
import sys
import os
from datetime import datetime

# 모듈 경로 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.helpers import display_error, display_success, display_info, display_warning, format_date, format_currency, get_date_range_options
from utils.i18n import get_text
from database.supabase_client import supabase

def show():
    """
    입고 관리 페이지 표시
    """
    st.markdown(f"<div class='main-header'>{get_text('inbound')}</div>", unsafe_allow_html=True)
    
    # 탭 설정
    tabs = st.tabs([
        f"📋 {get_text('search')}",
        f"➕ {get_text('add')}"
    ])
    
    # 검색 탭
    with tabs[0]:
        show_inbound_search()
    
    # 추가 탭
    with tabs[1]:
        show_inbound_add()

def show_inbound_search():
    """
    입고 이력 검색 화면 표시
    """
    st.markdown("### 입고 이력 검색")
    
    # 검색 필터
    col1, col2, col3 = st.columns(3)
    
    with col1:
        # 입고일 범위 선택
        date_range_options = get_date_range_options()
        date_range_labels = list(date_range_options.keys())
        
        selected_date_range = st.selectbox("기간 선택", date_range_labels)
        start_date, end_date = date_range_options[selected_date_range]
        
        if selected_date_range == "전체":
            # 전체 선택 시 날짜 필터 적용 안함
            pass
        else:
            # 날짜 범위 표시
            st.text(f"{format_date(start_date)} ~ {format_date(end_date)}")
    
    with col2:
        search_code = st.text_input(f"{get_text('part_code')} {get_text('search')}", placeholder="MT001")
    
    with col3:
        # 공급업체 선택
        supplier_options = ["전체", "SAMSOO", "RPS", "THT", "FC TECH", "HTT", "ATH", "UIL"]
        selected_supplier = st.selectbox("공급업체 선택", supplier_options)
    
    # 검색 버튼
    if st.button(f"🔍 {get_text('search')}", type="primary"):
        try:
            # 데모 데이터 (실제로는 Supabase에서 가져옴)
            data = {
                'inbound_id': [1, 2, 3, 4, 5],
                'part_code': ['MT001', 'MT002', 'MT003', 'MT002', 'MT005'],
                'part_name': ['COOLANT FILTER', 'ELECTRIC FILTER', 'HYDRAULIC FILTER', 'ELECTRIC FILTER', 'MOTOR'],
                'supplier_name': ['SAMSOO', 'RPS', 'THT', 'FC TECH', 'HTT'],
                'quantity': [10, 5, 20, 8, 2],
                'unit': ['EA', 'EA', 'EA', 'EA', 'SET'],
                'unit_price': [15000, 25000, 12000, 24000, 450000],
                'total_price': [150000, 125000, 240000, 192000, 900000],
                'inbound_date': ['2023-04-01', '2023-04-05', '2023-04-10', '2023-04-15', '2023-04-20'],
                'reference_number': ['IN-2023-001', 'IN-2023-002', 'IN-2023-003', 'IN-2023-004', 'IN-2023-005'],
                'created_by': ['admin', 'user1', 'admin', 'user2', 'admin']
            }
            df = pd.DataFrame(data)
            
            # 검색 필터 적용
            if selected_date_range != "전체" and start_date and end_date:
                df = df[(df['inbound_date'] >= format_date(start_date)) & 
                        (df['inbound_date'] <= format_date(end_date))]
            
            if search_code:
                df = df[df['part_code'].str.contains(search_code, case=False)]
            
            if selected_supplier != "전체":
                df = df[df['supplier_name'] == selected_supplier]
            
            # 결과 표시
            if len(df) > 0:
                # 총액 합계 계산
                total_amount = df['total_price'].sum()
                st.info(f"검색 결과: {len(df)}건, 총액: {format_currency(total_amount)}")
                
                # 입고 이력 표시
                st.dataframe(
                    df,
                    column_config={
                        'inbound_id': st.column_config.NumberColumn("입고 ID", format="%d"),
                        'part_code': st.column_config.TextColumn(get_text('part_code')),
                        'part_name': st.column_config.TextColumn(get_text('part_name')),
                        'supplier_name': st.column_config.TextColumn(get_text('supplier')),
                        'quantity': st.column_config.NumberColumn(get_text('quantity'), format="%d"),
                        'unit': st.column_config.TextColumn(get_text('unit')),
                        'unit_price': st.column_config.NumberColumn(get_text('price'), format="₫%d"),
                        'total_price': st.column_config.NumberColumn(get_text('total'), format="₫%d"),
                        'inbound_date': st.column_config.DateColumn(get_text('inbound_date'), format="YYYY-MM-DD"),
                        'reference_number': st.column_config.TextColumn(get_text('reference_number')),
                        'created_by': st.column_config.TextColumn(get_text('created_by'))
                    },
                    use_container_width=True,
                    hide_index=True
                )
                
                # 내보내기 버튼
                col1, col2 = st.columns(2)
                with col1:
                    if st.button(f"📥 Excel {get_text('save')}"):
                        # 실제로는 Excel 저장 로직 구현
                        display_success("Excel 파일로 저장되었습니다.")
                with col2:
                    if st.button(f"📊 {get_text('reports')} 생성"):
                        # 실제로는 보고서 생성 로직 구현
                        display_success("보고서가 생성되었습니다.")
            else:
                display_info("검색 결과가 없습니다.")
                
        except Exception as e:
            display_error(f"데이터 검색 중 오류가 발생했습니다: {e}")

def show_inbound_add():
    """
    입고 등록 화면 표시
    """
    st.markdown("### 신규 입고 등록")
    
    # 입력 폼
    with st.form("add_inbound_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            # 부품 선택 (실제로는 DB에서 조회)
            part_options = ["-- 부품 선택 --", "MT001 - COOLANT FILTER", "MT002 - ELECTRIC FILTER", 
                           "MT003 - HYDRAULIC FILTER", "MT004 - PUMP", "MT005 - MOTOR"]
            selected_part = st.selectbox(f"{get_text('part_name')}*", part_options)
            
            if selected_part != "-- 부품 선택 --":
                part_code = selected_part.split(" - ")[0]
                part_name = selected_part.split(" - ")[1]
                
                # 부품 정보 표시
                st.info(f"단위: EA, 현재 재고: 15, 최소 재고: 10")
            
            # 공급업체 선택 (실제로는 DB에서 조회)
            supplier_options = ["-- 공급업체 선택 --", "SAMSOO", "RPS", "THT", "FC TECH", "HTT", "ATH", "UIL"]
            selected_supplier = st.selectbox(f"{get_text('supplier')}*", supplier_options)
            
            # 수량 입력
            quantity = st.number_input(f"{get_text('quantity')}*", min_value=1, value=1)
        
        with col2:
            # 입고일 선택
            inbound_date = st.date_input(f"{get_text('inbound_date')}*", datetime.now())
            
            # 참조 번호 입력
            reference_number = st.text_input(f"{get_text('reference_number')}", placeholder="IN-2023-001")
            
            # 단가 입력 - 선택한 공급업체에 따라 자동으로 가져오거나 수동 입력
            if selected_supplier != "-- 공급업체 선택 --" and selected_part != "-- 부품 선택 --":
                # 실제로는 DB에서 선택한 부품과 공급업체에 맞는 단가 가져오기
                unit_price = st.number_input("단가*", min_value=0, value=15000)
                
                # 총액 자동 계산
                total_price = quantity * unit_price
                st.info(f"총액: {format_currency(total_price)}")
            else:
                unit_price = st.number_input("단가*", min_value=0, value=0)
                total_price = 0
        
        # 비고 입력
        remarks = st.text_area(f"{get_text('remarks')}", placeholder="특이사항 입력")
        
        submitted = st.form_submit_button(f"✅ {get_text('save')}")
        
        if submitted:
            # 필수 입력 확인
            if selected_part == "-- 부품 선택 --":
                display_error("부품을 선택해주세요.")
            elif selected_supplier == "-- 공급업체 선택 --":
                display_error("공급업체를 선택해주세요.")
            elif quantity <= 0:
                display_error("수량은 1 이상이어야 합니다.")
            elif unit_price <= 0:
                display_error("단가는 0보다 커야 합니다.")
            else:
                try:
                    # 입고 정보 저장 (실제로는 Supabase에 저장)
                    display_success(f"새 입고 정보가 등록되었습니다. (부품: {part_code}, 수량: {quantity})")
                    
                    # 성공 메시지 및 폼 초기화
                    display_success("입고 처리가 완료되었습니다.")
                    st.rerun()
                except Exception as e:
                    display_error(f"입고 정보 등록 중 오류가 발생했습니다: {e}")

if __name__ == "__main__":
    show() 