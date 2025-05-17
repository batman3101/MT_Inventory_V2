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
                    st.info(f"{get_text('search_results')}: {len(df)}{get_text('items')}, {get_text('total')}: {format_currency(total_amount)}")
                    
                    # 입고 이력 표시
                    st.dataframe(
                        df,
                        column_config={
                            'inbound_id': st.column_config.TextColumn(get_text('inbound_id')),
                            'part_code': st.column_config.TextColumn(get_text('part_code')),
                            'part_name': st.column_config.TextColumn(get_text('part_name')),
                            'supplier_name': st.column_config.TextColumn(get_text('supplier')),
                            'quantity': st.column_config.NumberColumn(get_text('quantity'), format="%d"),
                            'unit': st.column_config.TextColumn(get_text('unit')),
                            'unit_price': st.column_config.NumberColumn(get_text('price'), format="%d"),
                            'total_price': st.column_config.NumberColumn(get_text('total'), format="%d"),
                            'currency': st.column_config.TextColumn(get_text('currency')),
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
                                    label=f"📥 {filename} {get_text('download')}",
                                    data=file,
                                    file_name=filename,
                                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                )
                            
                            display_success(get_text('success_excel'))
                    with col2:
                        if st.button(f"📊 {get_text('reports')} {get_text('create')}"):
                            # 보고서 생성 로직
                            display_success(get_text('success_report'))
                else:
                    display_info(get_text('no_search_results'))
            else:
                display_info(get_text('no_search_results'))
                
        except Exception as e:
            display_error(f"{get_text('error_search')}: {e}")

def show_inbound_add():
    """
    신규 입고 등록 페이지 표시 (예전 2단 레이아웃)
    """
    st.markdown(f"## {get_text('add_inbound')}")
    from utils.auth import get_current_user
    current_user = get_current_user()
    with st.form(key="inbound_form"):
        col1, col2 = st.columns(2)
        # DB 데이터 미리 조회
        part_result = supabase().from_("parts").select("part_id, part_code, part_name, unit").execute()
        supplier_result = supabase().from_("suppliers").select("supplier_id, supplier_name").execute()
        parts_dict = {f"{p['part_code']} - {p['part_name']}": p for p in part_result.data} if part_result.data else {}
        part_options = list(parts_dict.keys())
        suppliers_dict = {s['supplier_name']: s for s in supplier_result.data} if supplier_result.data else {}
        supplier_options = list(suppliers_dict.keys())
        # 상태 변수
        selected_part = None
        selected_supplier = None
        current_stock = None
        auto_unit_price = 0.0
        with col1:
            selected_part = st.selectbox(get_text('part_name'), [""] + part_options, index=0, format_func=lambda x: x if x else f"-- {get_text('select_part')} --")
            # 부품 선택 시 현재 재고 표시
            if selected_part and selected_part in parts_dict:
                part_id = parts_dict[selected_part]['part_id']
                inv_result = supabase().from_("inventory").select("current_quantity").eq("part_id", part_id).execute()
                if inv_result.data and len(inv_result.data) > 0:
                    current_stock = inv_result.data[0]["current_quantity"]
                else:
                    current_stock = 0
                st.info(f"현재 재고: {current_stock}", icon="ℹ️")
            selected_supplier = st.selectbox(get_text('supplier'), [""] + supplier_options, index=0, format_func=lambda x: x if x else f"-- {get_text('select_supplier')} --")
            quantity = st.number_input(get_text('quantity'), min_value=1, value=1, step=1)
        with col2:
            inbound_date = st.date_input(get_text('inbound_date'), value=datetime.now().date(), format="YYYY-MM-DD")
            # 참조번호 자동생성 (IN-YYYYMMDD-001 형식, 오늘 날짜의 최대값+1)
            today_str = inbound_date.strftime('%Y%m%d')
            today_prefix = f"IN-{today_str}"
            latest_ref_result = supabase().from_("inbound").select("reference_number").ilike("reference_number", f"{today_prefix}-%").order("reference_number", desc=True).limit(1).execute()
            if latest_ref_result.data and latest_ref_result.data[0].get('reference_number'):
                latest_ref = latest_ref_result.data[0]['reference_number']
                try:
                    last_num = int(latest_ref.split('-')[-1])
                    suggested_ref = f"{today_prefix}-{last_num+1:03d}"
                except:
                    suggested_ref = f"{today_prefix}-001"
            else:
                suggested_ref = f"{today_prefix}-001"
            reference_number = st.text_input(get_text('reference_number'), value=suggested_ref, disabled=True)
            # 단가 자동입력: 부품+공급업체 선택 시 part_prices에서 조회
            if selected_part and selected_supplier:
                part_id = parts_dict[selected_part]['part_id']
                supplier_id = suppliers_dict[selected_supplier]['supplier_id']
                price_result = supabase().from_("part_prices").select("unit_price").eq("part_id", part_id).eq("supplier_id", supplier_id).eq("is_current", True).execute()
                if price_result.data and len(price_result.data) > 0:
                    auto_unit_price = price_result.data[0]["unit_price"]
                else:
                    auto_unit_price = 0.0
            unit_price = st.number_input(get_text('price'), min_value=0.0, value=auto_unit_price, step=1000.0, format="%f")
            total_price = quantity * unit_price
            st.markdown(f'<div style="background-color:#e3f2fd;padding:12px 0 12px 0;text-align:center;font-size:1.5em;font-weight:bold;">{get_text('total')}: {format_currency(total_price)}</div>', unsafe_allow_html=True)
        remarks = st.text_area(get_text('remarks'), "")
        submitted = st.form_submit_button(get_text('save'))
        if submitted:
            if not selected_part:
                display_error(get_text('select_part'))
                return
            if not selected_supplier:
                display_error(get_text('select_supplier'))
                return
            if quantity < 1:
                display_error(get_text('quantity_min'))
                return
            if unit_price <= 0:
                display_error(get_text('price_min'))
                return
            try:
                part_id = parts_dict[selected_part]['part_id']
                supplier_id = suppliers_dict[selected_supplier]['supplier_id']
                inbound_data = {
                    "inbound_date": inbound_date.isoformat(),
                    "part_id": part_id,
                    "supplier_id": supplier_id,
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "total_price": total_price,
                    "currency": "₫",
                    "reference_number": reference_number,
                    "notes": remarks,
                    "created_by": current_user
                }
                inbound_result = supabase().from_("inbound").insert(inbound_data).execute()
                if not inbound_result.data:
                    display_error(get_text('error_save'))
                    return
                # 재고 업데이트
                inventory_result = supabase().from_("inventory").select("inventory_id, current_quantity").eq("part_id", part_id).execute()
                if inventory_result.data:
                    inventory_id = inventory_result.data[0]['inventory_id']
                    current_quantity = inventory_result.data[0]['current_quantity'] or 0
                    new_quantity = current_quantity + quantity
                    inventory_update = supabase().from_("inventory").update({"current_quantity": new_quantity}).eq("inventory_id", inventory_id).execute()
                    if not inventory_update.data:
                        display_warning(f"{get_text('success_save')}, {get_text('error_info_sync')}")
                        return
                else:
                    inventory_data = {
                        "part_id": part_id,
                        "current_quantity": quantity
                    }
                    inventory_insert = supabase().from_("inventory").insert(inventory_data).execute()
                    if not inventory_insert.data:
                        display_warning(f"{get_text('success_save')}, {get_text('error_info_sync')}")
                        return
                # 부품 가격 정보 업데이트
                # 동일한 가격 정보가 이미 존재하는지 확인
                price_exists = supabase().from_("part_prices").select("price_id").eq("part_id", part_id).eq("supplier_id", supplier_id).eq("unit_price", unit_price).eq("effective_from", inbound_date.isoformat()).execute()
                if not price_exists.data:
                    # 기존 현재 가격 정보 is_current = False 처리
                    price_result = supabase().from_("part_prices").select("price_id").eq("part_id", part_id).eq("is_current", True).execute()
                    if price_result.data:
                        for item in price_result.data:
                            price_id = item['price_id']
                            supabase().from_("part_prices").update({"is_current": False}).eq("price_id", price_id).execute()
                    # 새로운 가격 정보 insert
                    price_data = {
                        "part_id": part_id,
                        "supplier_id": supplier_id,
                        "unit_price": unit_price,
                        "currency": "₫",
                        "effective_from": inbound_date.isoformat(),
                        "is_current": True,
                        "created_by": current_user
                    }
                    supabase().from_("part_prices").insert(price_data).execute()
                display_success(get_text('success_save'))
                st.markdown(f"### {get_text('part_info')}")
                st.write(f"**{get_text('part_code')}:** {parts_dict[selected_part]['part_code']}")
                st.write(f"**{get_text('part_name')}:** {parts_dict[selected_part]['part_name']}")
                st.write(f"**{get_text('unit')}:** {parts_dict[selected_part]['unit']}")
                st.markdown(f"### {get_text('supplier_info')}")
                st.write(f"**{get_text('name')}:** {suppliers_dict[selected_supplier]['supplier_name']}")
                st.markdown(f"### {get_text('inbound_history')}")
                st.write(f"**{get_text('inbound_date')}:** {inbound_date}")
                st.write(f"**{get_text('quantity')}:** {quantity}")
                st.write(f"**{get_text('unit_price')}:** {format_currency(unit_price)}")
                st.write(f"**{get_text('total')}:** {format_currency(total_price)}")
                st.write(f"**{get_text('reference_number')}:** {reference_number}")
                if remarks:
                    st.write(f"**{get_text('remarks')}:** {remarks}")
            except Exception as e:
                display_error(f"{get_text('error_save')}: {str(e)}")

if __name__ == "__main__":
    show() 