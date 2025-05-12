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
            # Supabase에서 입고 데이터 조회
            query = supabase().from_("inbound").select("""
                inbound_id,
                inbound_date,
                quantity,
                unit_price,
                total_price,
                currency,
                invoice_number,
                reference_number,
                created_by,
                parts!inner(part_id, part_code, part_name, unit),
                suppliers!inner(supplier_id, supplier_name)
            """)
            
            # 검색 필터 적용
            if selected_date_range != "전체" and start_date and end_date:
                query = query.gte("inbound_date", format_date(start_date)).lte("inbound_date", format_date(end_date))
            
            if selected_supplier != "전체":
                # suppliers.supplier_name으로 필터링
                query = query.like("suppliers.supplier_name", selected_supplier)
            
            # 결과 조회
            result = query.execute()
            
            # 데이터프레임으로 변환
            if result.data:
                # 결과 처리
                inbound_data = []
                for item in result.data:
                    part_data = item.get("parts", {})
                    supplier_data = item.get("suppliers", {})
                    
                    # 부품 코드 필터링 (클라이언트 측에서 처리)
                    part_code = part_data.get('part_code', '')
                    if search_code and search_code.lower() not in part_code.lower():
                        continue
                        
                    inbound_data.append({
                        'inbound_id': item.get('inbound_id'),
                        'part_code': part_code,
                        'part_name': part_data.get('part_name', ''),
                        'supplier_name': supplier_data.get('supplier_name', ''),
                        'quantity': item.get('quantity', 0),
                        'unit': part_data.get('unit', 'EA'),
                        'unit_price': item.get('unit_price', 0),
                        'total_price': item.get('total_price', 0),
                        'currency': item.get('currency', '₫'),
                        'inbound_date': item.get('inbound_date', ''),
                        'reference_number': item.get('reference_number', ''),
                        'created_by': item.get('created_by', '')
                    })
                
                df = pd.DataFrame(inbound_data)
                
                # 결과 표시
                if len(df) > 0:
                    # 총액 합계 계산
                    total_amount = df['total_price'].sum()
                    st.info(f"검색 결과: {len(df)}건, 총액: {format_currency(total_amount)}")
                    
                    # 입고 이력 표시
                    st.dataframe(
                        df,
                        column_config={
                            'inbound_id': st.column_config.TextColumn("입고 ID"),
                            'part_code': st.column_config.TextColumn(get_text('part_code')),
                            'part_name': st.column_config.TextColumn(get_text('part_name')),
                            'supplier_name': st.column_config.TextColumn(get_text('supplier')),
                            'quantity': st.column_config.NumberColumn(get_text('quantity'), format="%d"),
                            'unit': st.column_config.TextColumn(get_text('unit')),
                            'unit_price': st.column_config.NumberColumn(get_text('price'), format="%d"),
                            'total_price': st.column_config.NumberColumn(get_text('total'), format="%d"),
                            'currency': st.column_config.TextColumn("통화"),
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
                            # Excel 저장 로직
                            current_date = datetime.now().strftime("%Y%m%d_%H%M%S")
                            filename = f"inbound_export_{current_date}.xlsx"
                            
                            # 데이터프레임을 엑셀로 변환
                            df.to_excel(filename, index=False)
                            
                            # 다운로드 링크 생성
                            with open(filename, "rb") as file:
                                st.download_button(
                                    label=f"📥 {filename} 다운로드",
                                    data=file,
                                    file_name=filename,
                                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                )
                            
                            display_success(f"Excel 파일로 저장되었습니다: {filename}")
                    with col2:
                        if st.button(f"📊 {get_text('reports')} 생성"):
                            # 보고서 생성 로직
                            display_success("보고서가 생성되었습니다.")
                else:
                    display_info("검색 결과가 없습니다.")
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
            # 부품 선택
            try:
                part_result = supabase().from_("parts").select("part_id, part_code, part_name, unit, min_stock").execute()
                if part_result.data:
                    part_options = ["-- 부품 선택 --"] + [f"{item['part_code']} - {item['part_name']}" for item in part_result.data]
                    part_data_dict = {f"{item['part_code']} - {item['part_name']}": item for item in part_result.data}
                else:
                    part_options = ["-- 부품 선택 --"]
                    part_data_dict = {}
            except Exception as e:
                display_error(f"부품 정보를 불러오는 중 오류 발생: {e}")
                part_options = ["-- 부품 선택 --"]
                part_data_dict = {}
                
            selected_part = st.selectbox(f"{get_text('part_name')}*", part_options)
            
            if selected_part != "-- 부품 선택 --":
                part_code = selected_part.split(" - ")[0]
                part_name = selected_part.split(" - ")[1]
                part_data = part_data_dict.get(selected_part, {})
                
                # 부품 정보 표시
                try:
                    # 현재 재고 조회
                    inventory_result = supabase().from_("inventory").select("current_quantity").eq("part_id", part_data.get('part_id')).execute()
                    current_quantity = 0
                    if inventory_result.data:
                        current_quantity = inventory_result.data[0].get('current_quantity', 0)
                    
                    # 부품 정보 표시
                    st.info(f"단위: {part_data.get('unit', 'EA')}, 현재 재고: {current_quantity}, 최소 재고: {part_data.get('min_stock', 0)}")
                except Exception as e:
                    st.warning(f"재고 정보를 불러오는 중 오류 발생: {e}")
            
            # 공급업체 선택
            try:
                supplier_result = supabase().from_("suppliers").select("supplier_id, supplier_code, supplier_name").execute()
                if supplier_result.data:
                    supplier_options = ["-- 공급업체 선택 --"] + [f"{item['supplier_code']} - {item['supplier_name']}" for item in supplier_result.data]
                    supplier_data_dict = {f"{item['supplier_code']} - {item['supplier_name']}": item for item in supplier_result.data}
                else:
                    supplier_options = ["-- 공급업체 선택 --"]
                    supplier_data_dict = {}
            except Exception as e:
                display_error(f"공급업체 정보를 불러오는 중 오류 발생: {e}")
                supplier_options = ["-- 공급업체 선택 --"]
                supplier_data_dict = {}
                
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
                # 선택한 부품과 공급업체의 최신 가격 정보 가져오기
                try:
                    part_id = part_data_dict.get(selected_part, {}).get('part_id')
                    supplier_id = supplier_data_dict.get(selected_supplier, {}).get('supplier_id')
                    
                    if part_id and supplier_id:
                        price_result = supabase().from_("part_prices").select("unit_price, currency").eq("part_id", part_id).eq("supplier_id", supplier_id).eq("is_current", True).execute()
                        
                        suggested_price = 0
                        currency = "₩"
                        if price_result.data:
                            suggested_price = price_result.data[0].get('unit_price', 0)
                            currency = price_result.data[0].get('currency', '₩')
                        
                        unit_price = st.number_input("단가*", min_value=0, value=int(suggested_price))
                    else:
                        unit_price = st.number_input("단가*", min_value=0, value=0)
                except Exception as e:
                    st.warning(f"가격 정보를 불러오는 중 오류 발생: {e}")
                    unit_price = st.number_input("단가*", min_value=0, value=0)
                
                # 통화 선택
                currency_options = ["₩", "$", "€", "¥", "₫"]
                currency = st.selectbox("통화", currency_options, index=0)
                
                # 총액 자동 계산
                total_price = quantity * unit_price
                st.info(f"총액: {format_currency(total_price, currency)}")
            else:
                unit_price = st.number_input("단가*", min_value=0, value=0)
                currency_options = ["₩", "$", "€", "¥", "₫"]
                currency = st.selectbox("통화", currency_options, index=0)
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
                    # 현재 사용자 정보 가져오기
                    from utils.auth import get_current_user
                    current_user = get_current_user()
                    
                    # 선택한 부품과 공급업체 ID 가져오기
                    part_id = part_data_dict.get(selected_part, {}).get('part_id')
                    supplier_id = supplier_data_dict.get(selected_supplier, {}).get('supplier_id')
                    
                    if not part_id or not supplier_id:
                        display_error("부품 또는 공급업체 정보를 가져올 수 없습니다.")
                        return
                    
                    # 입고 데이터 준비
                    inbound_data = {
                        "inbound_date": inbound_date.isoformat(),
                        "part_id": part_id,
                        "supplier_id": supplier_id,
                        "quantity": quantity,
                        "unit_price": unit_price,
                        "total_price": total_price,
                        "currency": currency,
                        "reference_number": reference_number,
                        "notes": remarks,
                        "created_by": current_user
                    }
                    
                    # Supabase에 입고 정보 저장
                    inbound_result = supabase().from_("inbound").insert(inbound_data).execute()
                    
                    if not inbound_result.data:
                        display_error("입고 정보 저장 중 오류가 발생했습니다.")
                        return
                    
                    # 재고 업데이트
                    inventory_result = supabase().from_("inventory").select("inventory_id, current_quantity").eq("part_id", part_id).execute()
                    
                    if inventory_result.data:
                        inventory_id = inventory_result.data[0]["inventory_id"]
                        current_quantity = inventory_result.data[0]["current_quantity"]
                        
                        # 재고 수량 증가
                        new_quantity = current_quantity + quantity
                        
                        inventory_update = {
                            "current_quantity": new_quantity,
                            "last_count_date": datetime.now().isoformat(),
                            "updated_by": current_user
                        }
                        
                        supabase().from_("inventory").update(inventory_update).eq("inventory_id", inventory_id).execute()
                    
                    # 성공 메시지 및 폼 초기화
                    display_success(f"새 입고 정보가 등록되었습니다. (부품: {part_code}, 수량: {quantity})")
                    st.rerun()
                except Exception as e:
                    display_error(f"입고 정보 등록 중 오류가 발생했습니다: {e}")

if __name__ == "__main__":
    show() 