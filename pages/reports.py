"""
보고서 모듈
"""
import streamlit as st
import pandas as pd
import plotly.express as px
import sys
import os
from datetime import datetime, timedelta

# 모듈 경로 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.helpers import display_error, display_success, display_info, display_warning, format_date, format_currency, get_date_range_options
from utils.i18n import get_text
from database.supabase_client import supabase

def show():
    """
    보고서 페이지 표시
    """
    st.markdown(f"<div class='main-header'>{get_text('reports')}</div>", unsafe_allow_html=True)
    
    # 탭 설정
    tabs = st.tabs([
        f"📊 입출고 보고서",
        f"📈 재고 분석 보고서",
        f"💰 비용 분석 보고서"
    ])
    
    # 입출고 보고서 탭
    with tabs[0]:
        show_inout_report()
    
    # 재고 분석 보고서 탭
    with tabs[1]:
        show_inventory_analysis_report()
    
    # 비용 분석 보고서 탭
    with tabs[2]:
        show_cost_analysis_report()

def show_inout_report():
    """
    입출고 보고서 표시
    """
    st.markdown("### 입출고 현황 보고서")
    
    # 기간 선택
    col1, col2 = st.columns(2)
    
    with col1:
        date_range_options = get_date_range_options()
        date_range_labels = list(date_range_options.keys())
        
        selected_date_range = st.selectbox("기간 선택", date_range_labels, key="inout_date_range")
        start_date, end_date = date_range_options[selected_date_range]
        
    with col2:
        # 카테고리 선택
        try:
            # 카테고리 목록 가져오기
            category_result = supabase().from_("parts").select("category").execute()
            if category_result.data:
                # 중복 제거하고 고유 카테고리 추출
                categories = list(set([item.get("category", "") for item in category_result.data if item.get("category")]))
                category_options = ["전체"] + sorted(categories)
            else:
                category_options = ["전체", "필터", "펌프", "모터", "밸브", "센서", "기타"]
        except Exception as e:
            st.warning(f"카테고리 정보를 불러오는 중 오류 발생: {e}")
            category_options = ["전체", "필터", "펌프", "모터", "밸브", "센서", "기타"]
            
        selected_category = st.selectbox("카테고리 선택", category_options, key="inout_category")
    
    # 보고서 생성 버튼
    if st.button(f"🔍 보고서 생성", type="primary", key="generate_inout_report"):
        try:
            # 날짜 범위 설정
            if selected_date_range != "전체" and start_date and end_date:
                start_date_str = format_date(start_date)
                end_date_str = format_date(end_date)
            else:
                # 전체 선택 시 최근 6개월 데이터 조회
                end_date = datetime.now()
                start_date = end_date.replace(month=end_date.month - 6) if end_date.month > 6 else end_date.replace(year=end_date.year - 1, month=end_date.month + 6)
                start_date_str = start_date.strftime('%Y-%m-%d')
                end_date_str = end_date.strftime('%Y-%m-%d')
            
            # 월별 집계 데이터 준비
            months = []
            current_date = start_date
            while current_date <= end_date:
                months.append(current_date.strftime('%Y-%m'))
                current_date = current_date.replace(month=current_date.month + 1) if current_date.month < 12 else current_date.replace(year=current_date.year + 1, month=1)
            
            # 입고 데이터 조회
            inbound_counts = [0] * len(months)
            inbound_query = supabase().from_("inbound").select("inbound_date, quantity").gte("inbound_date", start_date_str).lte("inbound_date", end_date_str).execute()
            
            if inbound_query.data:
                for item in inbound_query.data:
                    inbound_date = item.get("inbound_date", "")
                    if inbound_date:
                        month_str = inbound_date[:7]  # YYYY-MM 형식 추출
                        if month_str in months:
                            idx = months.index(month_str)
                            inbound_counts[idx] += item.get("quantity", 0)
            
            # 출고 데이터 조회
            outbound_counts = [0] * len(months)
            outbound_query = supabase().from_("outbound").select("outbound_date, quantity").gte("outbound_date", start_date_str).lte("outbound_date", end_date_str).execute()
            
            if outbound_query.data:
                for item in outbound_query.data:
                    outbound_date = item.get("outbound_date", "")
                    if outbound_date:
                        month_str = outbound_date[:7]  # YYYY-MM 형식 추출
                        if month_str in months:
                            idx = months.index(month_str)
                            outbound_counts[idx] += item.get("quantity", 0)
            
            # 데이터프레임 생성
            inout_df = pd.DataFrame({
                '월': months,
                '입고량': inbound_counts,
                '출고량': outbound_counts
            })
            
            # 입출고 추이 차트
            st.markdown("#### 월별 입출고 추이")
            fig = px.line(inout_df, x='월', y=['입고량', '출고량'], 
                         title='월별 입출고 추이',
                         labels={'value': '수량', 'variable': '구분'},
                         markers=True)
            st.plotly_chart(fig, use_container_width=True)
            
            # 입고 상세 내역
            st.markdown("#### 입고 상세 내역")
            try:
                # Supabase에서 입고 데이터 조회
                inbound_detail_query = supabase().from_("inbound").select("""
                    inbound_id,
                    inbound_date,
                    quantity,
                    unit_price,
                    total_price,
                    currency,
                    parts!inner(part_id, part_code, part_name, category),
                    suppliers!inner(supplier_id, supplier_name)
                """).gte("inbound_date", start_date_str).lte("inbound_date", end_date_str).order("inbound_date", desc=True).execute()
                
                if inbound_detail_query.data:
                    # 결과 처리
                    inbound_details = []
                    for item in inbound_detail_query.data:
                        part_data = item.get("parts", {})
                        supplier_data = item.get("suppliers", {})
                        
                        category = part_data.get("category", "")
                        
                        # 카테고리 필터링
                        if selected_category != "전체" and category != selected_category:
                            continue
                            
                        inbound_details.append({
                            'part_code': part_data.get('part_code', ''),
                            'part_name': part_data.get('part_name', ''),
                            'category': category,
                            'quantity': item.get('quantity', 0),
                            'total_value': item.get('total_price', 0),
                            'supplier': supplier_data.get('supplier_name', ''),
                            'inbound_date': item.get('inbound_date', '')
                        })
                    
                    if inbound_details:
                        inbound_df = pd.DataFrame(inbound_details)
                        
                        # 입고 내역 표시
                        st.dataframe(
                            inbound_df,
                            column_config={
                                'part_code': st.column_config.TextColumn(get_text('part_code')),
                                'part_name': st.column_config.TextColumn(get_text('part_name')),
                                'category': st.column_config.TextColumn(get_text('category')),
                                'quantity': st.column_config.NumberColumn(get_text('quantity'), format="%d"),
                                'total_value': st.column_config.NumberColumn(get_text('total'), format="₫%d"),
                                'supplier': st.column_config.TextColumn(get_text('supplier')),
                                'inbound_date': st.column_config.DateColumn(get_text('inbound_date'), format="YYYY-MM-DD")
                            },
                            use_container_width=True,
                            hide_index=True
                        )
                    else:
                        st.info("해당 기간에 입고 내역이 없습니다.")
                else:
                    st.info("해당 기간에 입고 내역이 없습니다.")
                    
            except Exception as e:
                st.error(f"입고 내역 조회 중 오류 발생: {e}")
                # 오류 발생 시 더이상 더미 데이터를 사용하지 않음
                st.warning("데이터를 불러올 수 없습니다. 나중에 다시 시도해주세요.")
            
            # 출고 상세 내역
            st.markdown("#### 출고 상세 내역")
            try:
                # Supabase에서 출고 데이터 조회
                outbound_detail_query = supabase().from_("outbound").select("""
                    outbound_id,
                    outbound_date,
                    quantity,
                    requester,
                    department_id,
                    departments:department_id(department_name),
                    parts!inner(part_id, part_code, part_name, category)
                """).gte("outbound_date", start_date_str).lte("outbound_date", end_date_str).order("outbound_date", desc=True).execute()
                
                if outbound_detail_query.data:
                    # 결과 처리
                    outbound_details = []
                    for item in outbound_detail_query.data:
                        part_data = item.get("parts", {})
                        department_data = item.get("departments", {})
                        
                        category = part_data.get("category", "")
                        
                        # 카테고리 필터링
                        if selected_category != "전체" and category != selected_category:
                            continue
                            
                        outbound_details.append({
                            'part_code': part_data.get('part_code', ''),
                            'part_name': part_data.get('part_name', ''),
                            'category': category,
                            'quantity': item.get('quantity', 0),
                            'department': department_data.get('department_name', ''),
                            'outbound_date': item.get('outbound_date', '')
                        })
                    
                    if outbound_details:
                        outbound_df = pd.DataFrame(outbound_details)
                        
                        # 출고 내역 표시
                        st.dataframe(
                            outbound_df,
                            column_config={
                                'part_code': st.column_config.TextColumn(get_text('part_code')),
                                'part_name': st.column_config.TextColumn(get_text('part_name')),
                                'category': st.column_config.TextColumn(get_text('category')),
                                'quantity': st.column_config.NumberColumn(get_text('quantity'), format="%d"),
                                'department': st.column_config.TextColumn(get_text('department')),
                                'outbound_date': st.column_config.DateColumn(get_text('outbound_date'), format="YYYY-MM-DD")
                            },
                            use_container_width=True,
                            hide_index=True
                        )
                    else:
                        st.info("해당 기간에 출고 내역이 없습니다.")
                else:
                    st.info("해당 기간에 출고 내역이 없습니다.")
                    
            except Exception as e:
                st.error(f"출고 내역 조회 중 오류 발생: {e}")
            
            # 내보내기 버튼
            if st.button(f"📥 Excel {get_text('save')}", key="export_inout_report"):
                # 현재 날짜를 파일명에 포함
                current_date = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"inout_report_{current_date}.xlsx"
                
                # Excel 파일로 저장
                with pd.ExcelWriter(filename) as writer:
                    inout_df.to_excel(writer, sheet_name="월별 추이", index=False)
                    if 'inbound_df' in locals():
                        inbound_df.to_excel(writer, sheet_name="입고 내역", index=False)
                    if 'outbound_df' in locals():
                        outbound_df.to_excel(writer, sheet_name="출고 내역", index=False)
                
                # 다운로드 링크 생성
                with open(filename, "rb") as file:
                    st.download_button(
                        label=f"📥 {filename} 다운로드",
                        data=file,
                        file_name=filename,
                        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    )
                
                display_success(f"보고서가 '{filename}' 파일로 저장되었습니다.")
                
        except Exception as e:
            display_error(f"보고서 생성 중 오류가 발생했습니다: {e}")

def show_inventory_analysis_report():
    """
    재고 분석 보고서 표시
    """
    st.markdown("### 재고 분석 보고서")
    
    # 카테고리별 비율 차트
    st.markdown("#### 카테고리별 재고 현황")
    
    try:
        # 직접 카테고리별 데이터 조회
        category_result = supabase().from_("parts").select("category").execute()
        
        if category_result.data:
            categories = {}
            for item in category_result.data:
                cat = item.get('category', '기타')
                if not cat:  # None이나 빈 문자열인 경우
                    cat = '기타'
                    
                if cat in categories:
                    categories[cat] += 1
                else:
                    categories[cat] = 1
            
            # 카테고리별 수량과 가치 계산
            category_data = []
            for cat, count in categories.items():
                # 해당 카테고리 부품 ID 목록 가져오기
                parts_result = supabase().from_("parts").select("part_id").eq("category", cat).execute()
                
                total_quantity = 0
                total_value = 0
                
                if parts_result.data:
                    part_ids = [item['part_id'] for item in parts_result.data]
                    
                    # 해당 부품들의 재고 수량 합계 구하기
                    for part_id in part_ids:
                        # 재고 수량 조회
                        inventory_result = supabase().from_("inventory").select("current_quantity").eq("part_id", part_id).execute()
                        quantity = inventory_result.data[0]['current_quantity'] if inventory_result.data else 0
                        total_quantity += quantity
                        
                        # 가격 조회
                        price_result = supabase().from_("part_prices").select("unit_price").eq("part_id", part_id).eq("is_current", True).execute()
                        price = price_result.data[0]['unit_price'] if price_result.data else 0
                        
                        # 가치 계산
                        total_value += quantity * price
                
                category_data.append({
                    'category': cat,
                    'quantity': total_quantity,
                    'value': total_value
                })
            
            category_df = pd.DataFrame(category_data)
        else:
            # 결과가 없을 경우 빈 데이터프레임 생성
            category_df = pd.DataFrame({
                'category': ['데이터 없음'],
                'quantity': [0],
                'value': [0]
            })
    except Exception as e:
        st.error(f"카테고리별 데이터를 불러오는 중 오류 발생: {e}")
        # 오류 발생 시 데모 데이터 사용
        category_df = pd.DataFrame({
            'category': ['필터', '펌프', '모터', '밸브', '센서', '기타'],
            'quantity': [120, 45, 30, 25, 15, 40],
            'value': [3500000, 12000000, 8500000, 4200000, 1800000, 3000000]
        })
    
    col1, col2 = st.columns(2)
    
    with col1:
        # 수량 기준 파이차트
        fig1 = px.pie(
            category_df,
            values='quantity',
            names='category',
            title='카테고리별 재고량',
            hole=0.4
        )
        st.plotly_chart(fig1, use_container_width=True)
    
    with col2:
        # 가치 기준 파이차트
        fig2 = px.pie(
            category_df,
            values='value',
            names='category',
            title='카테고리별 재고 가치',
            hole=0.4,
            color_discrete_sequence=px.colors.sequential.Blues
        )
        st.plotly_chart(fig2, use_container_width=True)
    
    # 월별 재고 변화 추이
    st.markdown("#### 월별 재고 변화 추이")
    
    try:
        # 현재 날짜에서 6개월 전까지의 데이터 가져오기
        end_date = datetime.now()
        start_date = end_date - timedelta(days=180)  # 약 6개월
        
        # 월별 입고 금액 집계
        inbound_result = supabase().from_("inbound").select("inbound_date, total_price").gte("inbound_date", start_date.strftime('%Y-%m-%d')).lte("inbound_date", end_date.strftime('%Y-%m-%d')).execute()
        
        if inbound_result.data:
            # 월별로 데이터 그룹화
            monthly_data = {}
            
            for item in inbound_result.data:
                inbound_date = item.get('inbound_date', '')
                if inbound_date:
                    # 날짜에서 년-월 추출
                    if isinstance(inbound_date, str):
                        month = inbound_date[:7]  # YYYY-MM 형식
                    else:
                        # datetime 객체인 경우
                        month = inbound_date.strftime('%Y-%m')
                    
                    total_price = item.get('total_price', 0)
                    
                    if month in monthly_data:
                        monthly_data[month] += total_price
                    else:
                        monthly_data[month] = total_price
            
            # 데이터프레임으로 변환
            months = []
            values = []
            
            for month, value in sorted(monthly_data.items()):
                months.append(month)
                values.append(value)
            
            stock_df = pd.DataFrame({
                '월': months,
                '재고 가치': values
            })
        else:
            # 데이터가 없을 경우 빈 데이터프레임 생성
            months = [
                (end_date - timedelta(days=30*i)).strftime('%Y-%m') 
                for i in range(6, 0, -1)
            ]
            stock_df = pd.DataFrame({
                '월': months,
                '재고 가치': [0] * len(months)
            })
    except Exception as e:
        st.error(f"월별 재고 데이터를 불러오는 중 오류 발생: {e}")
        # 오류 발생 시 데모 데이터 사용
        months = ['2023-11', '2023-12', '2024-01', '2024-02', '2024-03', '2024-04']
        stock_values = [25000000, 27000000, 26500000, 28000000, 30000000, 33000000]
        
        stock_df = pd.DataFrame({
            '월': months,
            '재고 가치': stock_values
        })
    
    # 컬럼명 통일
    if 'month' in stock_df.columns and 'value' in stock_df.columns:
        stock_df = stock_df.rename(columns={'month': '월', 'value': '재고 가치'})
    
    fig3 = px.line(
        stock_df,
        x='월',
        y='재고 가치',
        markers=True,
        title='월별 재고 가치 변화'
    )
    st.plotly_chart(fig3, use_container_width=True)
    
    # 재고 회전율 분석
    st.markdown("#### 재고 회전율 분석")
    
    # 데모 데이터 (실제로는 Supabase에서 가져옴)
    turnover_data = {
        'category': ['필터', '펌프', '모터', '밸브', '센서', '기타'],
        'turnover_rate': [3.5, 1.2, 0.8, 2.1, 2.8, 1.5]
    }
    turnover_df = pd.DataFrame(turnover_data)
    
    fig4 = px.bar(
        turnover_df,
        x='category',
        y='turnover_rate',
        title='카테고리별 재고 회전율',
        labels={'category': '카테고리', 'turnover_rate': '회전율'},
        color='turnover_rate',
        color_continuous_scale='Viridis'
    )
    st.plotly_chart(fig4, use_container_width=True)
    
    # 내보내기 버튼
    if st.button(f"📥 Excel {get_text('save')}", key="export_inventory_analysis"):
        # 현재 날짜를 파일명에 포함
        current_date = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"inventory_analysis_{current_date}.xlsx"
        
        # Excel 파일로 저장
        with pd.ExcelWriter(filename) as writer:
            category_df.to_excel(writer, sheet_name="카테고리별 재고", index=False)
            stock_df.to_excel(writer, sheet_name="월별 재고 변화", index=False)
            turnover_df.to_excel(writer, sheet_name="재고 회전율", index=False)
        
        # 다운로드 링크 생성
        with open(filename, "rb") as file:
            st.download_button(
                label=f"📥 {filename} 다운로드",
                data=file,
                file_name=filename,
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            
        display_success(f"재고 분석 보고서가 '{filename}' 파일로 저장되었습니다.")

def show_cost_analysis_report():
    """
    비용 분석 보고서 표시
    """
    st.markdown("### 비용 분석 보고서")
    
    # 기간 선택
    col1, col2 = st.columns(2)
    
    with col1:
        date_range_options = get_date_range_options()
        date_range_labels = list(date_range_options.keys())
        
        selected_date_range = st.selectbox("기간 선택", date_range_labels, key="cost_date_range")
        start_date, end_date = date_range_options[selected_date_range]
    
    with col2:
        # 공급업체 선택
        supplier_options = ["전체", "SAMSOO", "RPS", "THT", "FC TECH", "HTT", "ATH", "UIL"]
        selected_supplier = st.selectbox("공급업체 선택", supplier_options, key="cost_supplier")
    
    # 보고서 생성 버튼
    if st.button(f"🔍 보고서 생성", type="primary", key="generate_cost_report"):
        try:
            # 월별 구매 비용 추이
            st.markdown("#### 월별 구매 비용 추이")
            
            # 데모 데이터 (실제로는 Supabase에서 가져옴)
            months = ['2023-11', '2023-12', '2024-01', '2024-02', '2024-03', '2024-04']
            cost_values = [2500000, 3200000, 1800000, 2900000, 2200000, 3500000]
            
            cost_df = pd.DataFrame({
                '월': months,
                '구매 비용': cost_values
            })
            
            fig1 = px.bar(
                cost_df,
                x='월',
                y='구매 비용',
                title='월별 구매 비용',
                labels={'월': '월', '구매 비용': '구매 비용 (원)'},
                color='구매 비용',
                color_continuous_scale='Reds'
            )
            st.plotly_chart(fig1, use_container_width=True)
            
            # 공급업체별 구매 비용 분석
            st.markdown("#### 공급업체별 구매 비용")
            
            # 데모 데이터 (실제로는 Supabase에서 가져옴)
            supplier_cost_data = {
                'supplier': ['SAMSOO', 'RPS', 'THT', 'FC TECH', 'HTT', 'ATH', 'UIL'],
                'total_cost': [5200000, 3800000, 4100000, 2900000, 1800000, 1200000, 800000]
            }
            supplier_cost_df = pd.DataFrame(supplier_cost_data)
            
            # 공급업체 필터링
            if selected_supplier != "전체":
                supplier_cost_df = supplier_cost_df[supplier_cost_df['supplier'] == selected_supplier]
            
            fig2 = px.pie(
                supplier_cost_df,
                values='total_cost',
                names='supplier',
                title='공급업체별 구매 비용 비율',
                hole=0.4
            )
            st.plotly_chart(fig2, use_container_width=True)
            
            # 카테고리별 구매 비용
            st.markdown("#### 카테고리별 구매 비용")
            
            # 데모 데이터 (실제로는 Supabase에서 가져옴)
            category_cost_data = {
                'category': ['필터', '펌프', '모터', '밸브', '센서', '기타'],
                'cost': [6500000, 5200000, 4800000, 3100000, 2400000, 1800000]
            }
            category_cost_df = pd.DataFrame(category_cost_data)
            
            fig3 = px.bar(
                category_cost_df,
                x='category',
                y='cost',
                title='카테고리별 구매 비용',
                labels={'category': '카테고리', 'cost': '구매 비용 (원)'},
                color='cost',
                color_continuous_scale='Blues'
            )
            st.plotly_chart(fig3, use_container_width=True)
            
            # 상세 구매 내역
            st.markdown("#### 상세 구매 내역")
            
            # 데모 데이터 (실제로는 Supabase에서 가져옴)
            purchase_data = {
                'part_code': ['MT001', 'MT002', 'MT003', 'MT004', 'MT005'],
                'part_name': ['COOLANT FILTER', 'ELECTRIC FILTER', 'HYDRAULIC FILTER', 'PUMP', 'MOTOR'],
                'supplier': ['SAMSOO', 'RPS', 'THT', 'FC TECH', 'HTT'],
                'quantity': [10, 5, 20, 3, 2],
                'unit_price': [15000, 25000, 12000, 450000, 950000],
                'total_price': [150000, 125000, 240000, 1350000, 1900000],
                'purchase_date': ['2024-04-01', '2024-04-05', '2024-04-10', '2024-04-15', '2024-04-20']
            }
            purchase_df = pd.DataFrame(purchase_data)
            
            # 공급업체 필터링
            if selected_supplier != "전체":
                purchase_df = purchase_df[purchase_df['supplier'] == selected_supplier]
            
            st.dataframe(
                purchase_df,
                column_config={
                    'part_code': st.column_config.TextColumn(get_text('part_code')),
                    'part_name': st.column_config.TextColumn(get_text('part_name')),
                    'supplier': st.column_config.TextColumn(get_text('supplier')),
                    'quantity': st.column_config.NumberColumn(get_text('quantity'), format="%d"),
                    'unit_price': st.column_config.NumberColumn(get_text('price'), format="₫%d"),
                    'total_price': st.column_config.NumberColumn(get_text('total'), format="₫%d"),
                    'purchase_date': st.column_config.DateColumn(get_text('inbound_date'), format="YYYY-MM-DD")
                },
                use_container_width=True,
                hide_index=True
            )
            
            # 내보내기 버튼
            if st.button(f"📥 Excel {get_text('save')}", key="export_cost_analysis"):
                # 현재 날짜를 파일명에 포함
                current_date = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"cost_analysis_{current_date}.xlsx"
                
                # Excel 파일로 저장
                with pd.ExcelWriter(filename) as writer:
                    cost_df.to_excel(writer, sheet_name="월별 구매 비용", index=False)
                    supplier_cost_df.to_excel(writer, sheet_name="공급업체별 비용", index=False)
                    category_cost_df.to_excel(writer, sheet_name="카테고리별 비용", index=False)
                    purchase_df.to_excel(writer, sheet_name="상세 구매 내역", index=False)
                
                # 다운로드 링크 생성
                with open(filename, "rb") as file:
                    st.download_button(
                        label=f"📥 {filename} 다운로드",
                        data=file,
                        file_name=filename,
                        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    )
                    
                display_success(f"비용 분석 보고서가 '{filename}' 파일로 저장되었습니다.")
                
        except Exception as e:
            display_error(f"보고서 생성 중 오류가 발생했습니다: {e}")

if __name__ == "__main__":
    show() 