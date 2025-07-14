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
from utils.auth import get_current_user

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
            # Supabase에서 공급업체 데이터 조회
            query = supabase().from_("suppliers").select("*")
            
            # 검색 필터 적용
            if search_code:
                query = query.ilike("supplier_code", f"%{search_code}%")
            if search_name:
                query = query.ilike("supplier_name", f"%{search_name}%")
            
            # 결과 조회
            result = query.execute()
            
            # 데이터프레임으로 변환
            if result.data:
                df = pd.DataFrame(result.data)
                
                # 결과 표시
                st.dataframe(
                    df,
                    column_config={
                        'supplier_id': st.column_config.TextColumn("공급업체 ID"),
                        'supplier_code': st.column_config.TextColumn("공급업체 코드"),
                        'supplier_name': st.column_config.TextColumn("공급업체명"),
                        'contact_person': st.column_config.TextColumn("담당자"),
                        'phone': st.column_config.TextColumn("연락처"),
                        'email': st.column_config.TextColumn("이메일"),
                        'address': st.column_config.TextColumn("주소"),
                        'created_at': st.column_config.DateColumn("등록일", format="YYYY-MM-DD")
                    },
                    use_container_width=True,
                    hide_index=True
                )
                
                # 내보내기 버튼
                if st.button(f"📥 Excel {get_text('save')}"):
                    # Excel 저장 로직
                    current_date = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = f"suppliers_export_{current_date}.xlsx"
                    
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
        
        country = st.text_input("국가", value="대한민국")
        website = st.text_input("웹사이트", placeholder="https://example.com")
        
        submitted = st.form_submit_button(f"✅ {get_text('save')}")
        
        if submitted:
            # 필수 입력 확인
            if not supplier_code:
                display_error("공급업체 코드는 필수 입력 항목입니다.")
            elif not supplier_name:
                display_error("공급업체명은 필수 입력 항목입니다.")
            else:
                try:
                    # 코드 중복 확인
                    duplicate_check = supabase().from_("suppliers").select("supplier_id").eq("supplier_code", supplier_code).execute()
                    if duplicate_check.data:
                        display_error(f"공급업체 코드 '{supplier_code}'는 이미 사용 중입니다. 다른 코드를 입력해주세요.")
                        return
                    
                    # 현재 사용자 정보 가져오기
                    current_user = get_current_user()
                    
                    # Supabase에 저장할 데이터 준비
                    supplier_data = {
                        "supplier_code": supplier_code,
                        "supplier_name": supplier_name,
                        "contact_person": contact_person,
                        "phone": phone,
                        "email": email,
                        "address": address,
                        "country": country,
                        "website": website,
                        "status": "active",
                        "created_by": current_user
                    }
                    
                    # Supabase에 저장
                    result = supabase().from_("suppliers").insert(supplier_data).execute()
                    
                    if result.data:
                        display_success(f"새 공급업체 '{supplier_name}'이(가) 등록되었습니다.")
                        # 폼 초기화
                        st.rerun()
                    else:
                        display_error("공급업체 등록 중 오류가 발생했습니다.")
                except Exception as e:
                    display_error(f"공급업체 등록 중 오류가 발생했습니다: {e}")

def show_suppliers_details():
    """
    공급업체 상세 정보 화면 표시
    """
    try:
        # Supabase에서 공급업체 목록 조회
        supplier_result = supabase().from_("suppliers").select("supplier_id, supplier_code, supplier_name").order("supplier_code").execute()
        
        if supplier_result.data:
            supplier_options = ["-- 공급업체 선택 --"] + [f"{item['supplier_code']} - {item['supplier_name']}" for item in supplier_result.data]
            supplier_ids = {f"{item['supplier_code']} - {item['supplier_name']}": item['supplier_id'] for item in supplier_result.data}
        else:
            supplier_options = ["-- 공급업체 선택 --"]
            supplier_ids = {}
    except Exception as e:
        st.error(f"공급업체 목록을 불러오는 중 오류가 발생했습니다: {e}")
        supplier_options = ["-- 공급업체 선택 --"]
        supplier_ids = {}
    
    selected_option = st.selectbox("공급업체 선택", supplier_options)
    
    if selected_option != "-- 공급업체 선택 --":
        selected_code = selected_option.split(" - ")[0]
        selected_id = supplier_ids.get(selected_option)
        
        try:
            # 공급업체 기본 정보 조회
            supplier_data_result = supabase().from_("suppliers").select("*").eq("supplier_id", selected_id).execute()
            
            if not supplier_data_result.data:
                display_error("선택한 공급업체 정보를 찾을 수 없습니다.")
                return
            
            supplier_data = supplier_data_result.data[0]
            
            # 공급업체가 관련된 부품 가격 정보 조회
            parts_price_result = supabase().from_("part_prices").select("""
                price_id,
                unit_price,
                currency,
                effective_from,
                is_current,
                part_id
            """).eq("supplier_id", selected_id).execute()
            
            # 입고 이력 조회
            inbound_result = supabase().from_("inbound").select("""
                inbound_id,
                inbound_date,
                quantity,
                unit_price,
                total_price,
                currency,
                parts!inner(part_id, part_code, part_name)
            """).eq("supplier_id", selected_id).order("inbound_date", desc=True).limit(10).execute()
            
            # 상세 정보 표시
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown("#### 기본 정보")
                st.markdown(f"**공급업체 코드:** {supplier_data.get('supplier_code', '')}")
                st.markdown(f"**공급업체명:** {supplier_data.get('supplier_name', '')}")
                st.markdown(f"**담당자:** {supplier_data.get('contact_person', '')}")
                st.markdown(f"**연락처:** {supplier_data.get('phone', '')}")
            
            with col2:
                st.markdown("#### 연락처 정보")
                st.markdown(f"**이메일:** {supplier_data.get('email', '')}")
                st.markdown(f"**주소:** {supplier_data.get('address', '')}")
                st.markdown(f"**등록일:** {supplier_data.get('created_at', '')}")
                st.markdown(f"**수정일:** {supplier_data.get('updated_at', '')}")
                st.markdown(f"**웹사이트:** {supplier_data.get('website', '')}")
            
            # 공급 부품 정보
            st.markdown("#### 공급 부품 정보")
            
            if parts_price_result.data:
                # 부품 정보 가져오기
                part_ids = [item.get('part_id') for item in parts_price_result.data if item.get('part_id')]
                parts_map = {}
                
                if part_ids:
                    parts_result = supabase().from_("parts").select("part_id, part_code, part_name").in_("part_id", part_ids).execute()
                    if parts_result.data:
                        parts_map = {p.get('part_id'): {'part_code': p.get('part_code'), 'part_name': p.get('part_name')} for p in parts_result.data}
                
                # 데이터 변환
                parts_data = []
                for item in parts_price_result.data:
                    part_id = item.get('part_id')
                    part_info = parts_map.get(part_id, {})
                    parts_data.append({
                        'part_id': part_id,
                        'part_code': part_info.get('part_code', 'Unknown'),
                        'part_name': part_info.get('part_name', 'Unknown'),
                        'unit_price': item.get('unit_price'),
                        'currency': item.get('currency'),
                        'effective_date': item.get('effective_from'),
                        'is_current': item.get('is_current')
                    })
                
                parts_df = pd.DataFrame(parts_data)
                
                st.dataframe(
                    parts_df,
                    column_config={
                        'part_code': st.column_config.TextColumn(get_text('part_code')),
                        'part_name': st.column_config.TextColumn(get_text('part_name')),
                        'unit_price': st.column_config.NumberColumn(get_text('price'), format="%d"),
                        'currency': st.column_config.TextColumn("통화"),
                        'effective_date': st.column_config.DateColumn("적용일", format="YYYY-MM-DD"),
                        'is_current': st.column_config.CheckboxColumn("현재 적용")
                    },
                    use_container_width=True,
                    hide_index=True
                )
            else:
                st.info("등록된 부품 가격 정보가 없습니다.")
            
            # 가격 정보 업데이트 버튼
            if st.button("가격 정보 업데이트"):
                # 가격 정보 업데이트 폼으로 이동 (실제로는 새 폼 열기)
                display_info("가격 정보 업데이트 모드로 전환됩니다.")
            
            # 입고 이력
            st.markdown("#### 최근 입고 이력")
            
            inbound_data = []
            for item in inbound_result.data:
                part_data = item.get('parts', {})
                inbound_data.append({
                    'inbound_id': item.get('inbound_id'),
                    'part_code': part_data.get('part_code'),
                    'part_name': part_data.get('part_name'),
                    'quantity': item.get('quantity'),
                    'unit_price': item.get('unit_price'),
                    'total_price': item.get('total_price'),
                    'currency': item.get('currency'),
                    'inbound_date': item.get('inbound_date')
                })
            
            inbound_df = pd.DataFrame(inbound_data)
            
            st.dataframe(
                inbound_df,
                column_config={
                    'inbound_id': st.column_config.TextColumn("입고 ID"),
                    'part_code': st.column_config.TextColumn(get_text('part_code')),
                    'part_name': st.column_config.TextColumn(get_text('part_name')),
                    'quantity': st.column_config.NumberColumn(get_text('quantity'), format="%d"),
                    'unit_price': st.column_config.NumberColumn(get_text('price'), format="%d"),
                    'total_price': st.column_config.NumberColumn(get_text('total'), format="%d"),
                    'currency': st.column_config.TextColumn("통화"),
                    'inbound_date': st.column_config.DateColumn(get_text('inbound_date'), format="YYYY-MM-DD")
                },
                use_container_width=True,
                hide_index=True
            )
            
            # 수정/삭제 버튼
            col1, col2 = st.columns(2)
            with col1:
                if st.button(f"✏️ {get_text('edit')}", key="edit_supplier"):
                    # 나중에 수정 기능 구현 예정
                    st.session_state.edit_supplier_id = supplier_data.get('supplier_id')
                    display_info("수정 모드로 전환됩니다.")
            
            with col2:
                if st.button(f"🗑️ {get_text('delete')}", key="delete_supplier"):
                    # 삭제 확인
                    delete_confirm = st.checkbox(f"정말로 '{supplier_data.get('supplier_name')}' 공급업체를 삭제하시겠습니까?", key="confirm_delete")
                    
                    if delete_confirm:
                        try:
                            # Supabase에서 삭제
                            result = supabase().from_("suppliers").delete().eq("supplier_id", selected_id).execute()
                            
                            if result.data:
                                display_success(f"공급업체 '{supplier_data.get('supplier_name')}'이(가) 삭제되었습니다.")
                                st.rerun()
                            else:
                                display_error("공급업체 삭제 중 오류가 발생했습니다.")
                        except Exception as e:
                            display_error(f"공급업체 삭제 중 오류가 발생했습니다: {e}")
        except Exception as e:
            display_error(f"공급업체 상세 정보를 불러오는 중 오류가 발생했습니다: {e}")

if __name__ == "__main__":
    show() 