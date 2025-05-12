"""
출고 관리 모듈
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
from utils.auth import get_current_user

def show():
    """
    출고 관리 페이지 표시
    """
    st.markdown(f"<div class='main-header'>{get_text('outbound')}</div>", unsafe_allow_html=True)
    
    # 탭 설정
    tabs = st.tabs([
        f"📋 {get_text('search')}",
        f"➕ {get_text('add')}"
    ])
    
    # 검색 탭
    with tabs[0]:
        show_outbound_search()
    
    # 추가 탭
    with tabs[1]:
        show_outbound_add()

def show_outbound_search():
    """
    출고 이력 검색 화면 표시
    """
    st.markdown("### 출고 이력 검색")
    
    # 검색 필터
    col1, col2 = st.columns(2)
    
    with col1:
        # 출고일 범위 선택
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
    
    col1, col2 = st.columns(2)
    
    with col1:
        # 부서 선택
        # 부서 목록 가져오기
        try:
            department_result = supabase().from_("departments").select("department_id, department_name").execute()
            if department_result.data:
                department_options = ["전체"] + [dept["department_name"] for dept in department_result.data]
                department_ids = {dept["department_name"]: dept["department_id"] for dept in department_result.data}
            else:
                department_options = ["전체", "생산부", "유지보수팀", "품질관리부", "연구개발부"]
                department_ids = {}
        except Exception as e:
            display_error(f"부서 정보를 불러오는 중 오류 발생: {e}")
            department_options = ["전체", "생산부", "유지보수팀", "품질관리부", "연구개발부"]
            department_ids = {}
            
        selected_department = st.selectbox("부서 선택", department_options)
    
    with col2:
        # 요청자 검색
        requestor = st.text_input("요청자 검색", placeholder="홍길동")
    
    # 검색 버튼
    if st.button(f"🔍 {get_text('search')}", type="primary"):
        try:
            # Supabase에서 출고 데이터 조회
            query = supabase().from_("outbound").select("""
                outbound_id,
                outbound_date,
                parts!inner(part_id, part_code, part_name),
                quantity,
                requester,
                department_id,
                departments:department_id(department_name),
                equipment,
                reason,
                reference_number,
                created_by,
                created_at
            """)
            
            # 검색 필터 적용
            if selected_date_range != "전체" and start_date and end_date:
                query = query.gte("outbound_date", format_date(start_date)).lte("outbound_date", format_date(end_date))
            
            if search_code:
                # parts.part_code로 검색하는 경우 (복잡한 쿼리가 필요)
                # 현재 Supabase에서 JOIN 테이블의 필드로 필터링 기능이 제한적
                # 클라이언트에서 추가 필터링 로직 구현
                pass
                
            if selected_department != "전체" and department_ids:
                # 부서 ID로 검색
                query = query.eq("department_id", department_ids.get(selected_department))
                
            if requestor:
                query = query.ilike("requester", f"%{requestor}%")
            
            # 결과 조회
            result = query.execute()
            
            # 데이터프레임으로 변환
            if result.data:
                # 결과 처리
                outbound_data = []
                for item in result.data:
                    part_data = item.get("parts", {})
                    dept_data = item.get("departments", {})
                    
                    outbound_data.append({
                        'outbound_id': item.get('outbound_id'),
                        'part_code': part_data.get('part_code'),
                        'part_name': part_data.get('part_name'),
                        'quantity': item.get('quantity'),
                        'unit': part_data.get('unit', 'EA'),  # 부품에서 단위 가져오기
                        'outbound_date': item.get('outbound_date'),
                        'requestor': item.get('requester'),
                        'department': dept_data.get('department_name', ''),
                        'equipment_id': item.get('equipment'),
                        'purpose': item.get('reason'),
                        'reference_number': item.get('reference_number'),
                        'created_by': item.get('created_by')
                    })
                
                df = pd.DataFrame(outbound_data)
                
                # 코드 검색 필터 추가 적용 (클라이언트 측)
                if search_code:
                    df = df[df['part_code'].str.contains(search_code, case=False)]
            
                # 결과 표시
                if len(df) > 0:
                    # 출고 이력 표시
                    st.info(f"검색 결과: {len(df)}건")
                    
                    st.dataframe(
                        df,
                        column_config={
                            'outbound_id': st.column_config.NumberColumn("출고 ID", format="%d"),
                            'part_code': st.column_config.TextColumn(get_text('part_code')),
                            'part_name': st.column_config.TextColumn(get_text('part_name')),
                            'quantity': st.column_config.NumberColumn(get_text('quantity'), format="%d"),
                            'unit': st.column_config.TextColumn(get_text('unit')),
                            'outbound_date': st.column_config.DateColumn(get_text('outbound_date'), format="YYYY-MM-DD"),
                            'requestor': st.column_config.TextColumn(get_text('requester')),
                            'department': st.column_config.TextColumn(get_text('department')),
                            'equipment_id': st.column_config.TextColumn(get_text('equipment_id')),
                            'purpose': st.column_config.TextColumn(get_text('purpose')),
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
                            filename = f"outbound_export_{current_date}.xlsx"
                            
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

def show_outbound_add():
    """
    출고 등록 화면 표시
    """
    st.markdown("### 신규 출고 등록")
    
    # 입력 폼
    with st.form("add_outbound_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            # 부품 선택 (실제로는 DB에서 조회)
            try:
                part_result = supabase().from_("parts").select("part_id, part_code, part_name, unit").execute()
                if part_result.data:
                    part_options = ["-- 부품 선택 --"] + [f"{item['part_code']} - {item['part_name']}" for item in part_result.data]
                    part_ids = {f"{item['part_code']} - {item['part_name']}": item['part_id'] for item in part_result.data}
                    part_units = {f"{item['part_code']} - {item['part_name']}": item['unit'] for item in part_result.data}
                else:
                    part_options = ["-- 부품 선택 --"]
                    part_ids = {}
                    part_units = {}
            except Exception as e:
                display_error(f"부품 정보를 불러오는 중 오류 발생: {e}")
                part_options = ["-- 부품 선택 --"]
                part_ids = {}
                part_units = {}
                
            selected_part = st.selectbox(f"{get_text('part_name')}*", part_options)
            
            if selected_part != "-- 부품 선택 --":
                part_id = part_ids.get(selected_part)
                part_unit = part_units.get(selected_part, "EA")
                part_code = selected_part.split(" - ")[0]
                
                # 재고 정보 조회
                try:
                    inventory_result = supabase().from_("inventory").select("current_quantity").eq("part_id", part_id).execute()
                    if inventory_result.data:
                        current_quantity = inventory_result.data[0]["current_quantity"]
                    else:
                        current_quantity = 0
                        
                    min_stock_result = supabase().from_("parts").select("min_stock").eq("part_id", part_id).execute()
                    if min_stock_result.data:
                        min_stock = min_stock_result.data[0]["min_stock"]
                    else:
                        min_stock = 0
                        
                    # 부품 정보 표시
                    st.info(f"단위: {part_unit}, 현재 재고: {current_quantity}, 최소 재고: {min_stock}")
                except Exception as e:
                    st.warning(f"재고 정보를 불러오는 중 오류 발생: {e}")
            
            # 수량 입력
            quantity = st.number_input(f"{get_text('quantity')}*", min_value=1, value=1)
            
            # 부서 선택
            try:
                department_result = supabase().from_("departments").select("department_id, department_name").execute()
                if department_result.data:
                    department_options = ["-- 부서 선택 --"] + [dept["department_name"] for dept in department_result.data]
                    department_ids = {dept["department_name"]: dept["department_id"] for dept in department_result.data}
                else:
                    department_options = ["-- 부서 선택 --", "생산부", "유지보수팀", "품질관리부", "연구개발부"]
                    department_ids = {}
            except Exception as e:
                display_error(f"부서 정보를 불러오는 중 오류 발생: {e}")
                department_options = ["-- 부서 선택 --", "생산부", "유지보수팀", "품질관리부", "연구개발부"]
                department_ids = {}
                
            department = st.selectbox(f"{get_text('department')}*", department_options)
            
            # 요청자 입력
            requestor = st.text_input(f"{get_text('requester')}*", placeholder="홍길동")
        
        with col2:
            # 출고일 선택
            outbound_date = st.date_input(f"{get_text('outbound_date')}*", datetime.now())
            
            # 설비 ID 입력
            equipment_id = st.text_input(f"{get_text('equipment_id')}", placeholder="EQ-001")
            
            # 참조 번호 입력
            reference_number = st.text_input(f"{get_text('reference_number')}", placeholder="OUT-2023-001")
            
            # 용도 선택
            purpose_options = ["-- 용도 선택 --", "정기 교체", "고장 수리", "예방 정비", "비상 수리", "테스트", "기타"]
            purpose = st.selectbox(f"{get_text('purpose')}*", purpose_options)
            
            # 기타 용도인 경우 직접 입력
            if purpose == "기타":
                custom_purpose = st.text_input("기타 용도 입력*")
                if custom_purpose:
                    purpose = custom_purpose
        
        # 비고 입력
        remarks = st.text_area(f"{get_text('remarks')}", placeholder="특이사항 입력")
        
        submitted = st.form_submit_button(f"✅ {get_text('save')}")
        
        if submitted:
            # 필수 입력 확인
            if selected_part == "-- 부품 선택 --":
                display_error("부품을 선택해주세요.")
            elif quantity <= 0:
                display_error("수량은 1 이상이어야 합니다.")
            elif department == "-- 부서 선택 --":
                display_error("부서를 선택해주세요.")
            elif not requestor:
                display_error("요청자를 입력해주세요.")
            elif purpose == "-- 용도 선택 --":
                display_error("용도를 선택해주세요.")
            elif purpose == "기타" and not custom_purpose:
                display_error("기타 용도를 입력해주세요.")
            else:
                try:
                    # 재고 확인
                    inventory_result = supabase().from_("inventory").select("inventory_id, current_quantity").eq("part_id", part_id).execute()
                    
                    if not inventory_result.data:
                        display_error(f"부품 ID {part_id}에 대한 재고 정보를 찾을 수 없습니다.")
                        return
                        
                    inventory_id = inventory_result.data[0]["inventory_id"]
                    current_stock = inventory_result.data[0]["current_quantity"]
                    
                    # 현재 사용자 정보 가져오기
                    current_user = get_current_user()
                    
                    # 부서 ID 가져오기
                    department_id = department_ids.get(department)
                    if not department_id and department != "-- 부서 선택 --":
                        # 존재하지 않는 부서인 경우, 부서 생성
                        dept_data = {
                            "department_code": department[:5].upper().replace(" ", ""),
                            "department_name": department
                        }
                        dept_result = supabase().from_("departments").insert(dept_data).execute()
                        if dept_result.data:
                            department_id = dept_result.data[0]["department_id"]
                        else:
                            display_error("새 부서를 생성할 수 없습니다.")
                            return
                    
                    if quantity > current_stock:
                        display_warning(f"재고 부족 경고: 현재 재고({current_stock})보다 많은 수량({quantity})을 출고하려 합니다.")
                        
                        # 출고 확인
                        if st.button("출고 진행", key="confirm_outbound"):
                            # 출고 정보 Supabase에 저장
                            save_outbound_data(part_id, quantity, outbound_date, requestor, department_id, 
                                            equipment_id, purpose, reference_number, remarks, current_user)
                            
                    else:
                        # 출고 정보 Supabase에 저장
                        save_outbound_data(part_id, quantity, outbound_date, requestor, department_id, 
                                        equipment_id, purpose, reference_number, remarks, current_user)
                except Exception as e:
                    display_error(f"출고 정보 등록 중 오류가 발생했습니다: {e}")

# 출고 정보 저장 함수 추가
def save_outbound_data(part_id, quantity, outbound_date, requester, department_id, equipment, reason, reference_number, notes, created_by):
    """
    출고 정보를 Supabase에 저장
    """
    try:
        # 출고 데이터 준비
        outbound_data = {
            "part_id": part_id,
            "quantity": quantity,
            "outbound_date": outbound_date.isoformat(),
            "requester": requester,
            "department_id": department_id,
            "equipment": equipment,
            "reason": reason,
            "reference_number": reference_number,
            "notes": notes,
            "created_by": created_by
        }
        
        # 출고 정보 저장
        outbound_result = supabase().from_("outbound").insert(outbound_data).execute()
        
        if not outbound_result.data:
            display_error("출고 정보 저장에 실패했습니다.")
            return False
            
        # 재고 수량 업데이트
        # 먼저 현재 재고 조회
        inventory_result = supabase().from_("inventory").select("inventory_id, current_quantity").eq("part_id", part_id).execute()
        
        if not inventory_result.data:
            display_error(f"부품 ID {part_id}에 대한 재고 정보를 찾을 수 없습니다.")
            return False
            
        inventory_id = inventory_result.data[0]["inventory_id"]
        current_quantity = inventory_result.data[0]["current_quantity"]
        
        # 재고 업데이트
        new_quantity = max(0, current_quantity - quantity)  # 음수 방지
        
        inventory_update = {
            "current_quantity": new_quantity,
            "updated_at": datetime.now().isoformat(),
            "updated_by": created_by
        }
        
        inventory_update_result = supabase().from_("inventory").update(inventory_update).eq("inventory_id", inventory_id).execute()
        
        if not inventory_update_result.data:
            display_error("재고 업데이트에 실패했습니다.")
            return False
        
        # 부품 코드 조회
        part_result = supabase().from_("parts").select("part_code").eq("part_id", part_id).execute()
        part_code = part_result.data[0]["part_code"] if part_result.data else "알 수 없음"
        
        # 성공 메시지 표시
        display_success(f"새 출고 정보가 등록되었습니다. (부품: {part_code}, 수량: {quantity}, 현재 재고: {new_quantity})")
        
        # 폼 초기화
        st.rerun()
        return True
        
    except Exception as e:
        display_error(f"출고 저장 중 오류가 발생했습니다: {e}")
        return False

if __name__ == "__main__":
    show() 