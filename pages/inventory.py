"""
재고 관리 모듈
"""
import streamlit as st
import pandas as pd
import plotly.express as px
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
    재고 관리 페이지 표시
    """
    st.markdown(f"<div class='main-header'>{get_text('inventory')}</div>", unsafe_allow_html=True)
    
    # 탭 설정
    tabs = st.tabs([
        f"📋 {get_text('current_stock')}",
        f"⚠️ 재고 부족 알림",
        f"📊 재고 분석"
    ])
    
    # 현재 재고 탭
    with tabs[0]:
        show_current_inventory()
    
    # 재고 부족 탭
    with tabs[1]:
        show_low_stock_alerts()
    
    # 재고 분석 탭
    with tabs[2]:
        show_inventory_analysis()

def show_current_inventory():
    """
    현재 재고 현황 표시
    """
    # 필터 옵션
    col1, col2, col3 = st.columns(3)
    
    with col1:
        search_code = st.text_input(f"{get_text('part_code')} {get_text('search')}", placeholder="MT001")
    with col2:
        search_name = st.text_input(f"{get_text('part_name')} {get_text('search')}", placeholder="FILTER")
    with col3:
        category_options = ["전체", "필터", "펌프", "모터", "밸브", "센서", "기타"]
        search_category = st.selectbox(f"{get_text('category')} {get_text('filter')}", category_options)
    
    # 이름 표시 옵션
    name_display_options = ["영문명", "한국어명", "베트남어명"]
    name_display = st.radio("이름 표시 옵션", name_display_options, horizontal=True)
    
    # 검색 버튼
    if st.button(f"🔍 {get_text('search')}", type="primary"):
        try:
            # Supabase에서 재고 데이터와 부품 데이터 조인하여 가져오기
            query = """
            SELECT 
                p.part_id::text, 
                p.part_code, 
                p.part_name, 
                p.korean_name, 
                p.vietnamese_name, 
                p.category, 
                p.unit, 
                i.current_quantity, 
                p.min_stock, 
                i.last_count_date,
                pp.unit_price
            FROM 
                inventory i
            JOIN 
                parts p ON i.part_id = p.part_id
            LEFT JOIN (
                SELECT part_id, unit_price
                FROM part_prices
                WHERE is_current = true
            ) pp ON p.part_id = pp.part_id
            """
            
            # 필터 조건 추가
            where_conditions = []
            
            if search_code:
                where_conditions.append(f"p.part_code ILIKE '%{search_code}%'")
            
            if search_name:
                if name_display == "영문명":
                    where_conditions.append(f"p.part_name ILIKE '%{search_name}%'")
                elif name_display == "한국어명":
                    where_conditions.append(f"p.korean_name ILIKE '%{search_name}%'")
                else:  # 베트남어명
                    where_conditions.append(f"p.vietnamese_name ILIKE '%{search_name}%'")
            
            if search_category != "전체":
                where_conditions.append(f"p.category = '{search_category}'")
            
            # WHERE 절 추가
            if where_conditions:
                query += " WHERE " + " AND ".join(where_conditions)
            
            # 쿼리 실행
            result = supabase().rpc('search_inventory', {'query_sql': query}).execute()
            
            if not result.data:
                display_info("검색 결과가 없습니다.")
                return
                
            # 데이터프레임으로 변환
            df = pd.DataFrame(result.data)
            
            # 총 가치 계산 (단가가 있는 경우)
            df['total_value'] = df.apply(
                lambda row: row['current_quantity'] * row.get('unit_price', 0) 
                if pd.notna(row.get('unit_price')) else 0, 
                axis=1
            )
            
            # 수량과 최소 재고량 비교하여 상태 결정
            df['status'] = df.apply(
                lambda row: '부족' if row['current_quantity'] < row['min_stock'] else '정상', 
                axis=1
            )
            
            # 이름 표시 설정에 따라 표시할 이름 컬럼 선택
            display_name_column = 'part_name'
            if name_display == "한국어명":
                display_name_column = 'korean_name'
            elif name_display == "베트남어명":
                display_name_column = 'vietnamese_name'
            
            # 결과 표시용 컬럼 재구성
            display_df = df[[
                'part_code', 
                display_name_column, 
                'category', 
                'unit', 
                'current_quantity', 
                'min_stock', 
                'total_value', 
                'last_count_date', 
                'status'
            ]].copy()
            
            # 컬럼명 변경
            display_df.columns = [
                get_text('part_code'),
                get_text('part_name'),
                get_text('category'),
                get_text('unit'),
                get_text('current_stock'),
                get_text('min_stock'),
                get_text('total'),
                get_text('last_count_date'),
                get_text('status')
            ]
            
            st.dataframe(
                display_df,
                column_config={
                    get_text('part_code'): st.column_config.TextColumn(get_text('part_code')),
                    get_text('part_name'): st.column_config.TextColumn(get_text('part_name')),
                    get_text('category'): st.column_config.TextColumn(get_text('category')),
                    get_text('unit'): st.column_config.TextColumn(get_text('unit')),
                    get_text('current_stock'): st.column_config.NumberColumn(get_text('current_stock'), format="%d"),
                    get_text('min_stock'): st.column_config.NumberColumn(get_text('min_stock'), format="%d"),
                    get_text('total'): st.column_config.NumberColumn(get_text('total'), format="₫%d"),
                    get_text('last_count_date'): st.column_config.DateColumn(get_text('last_count_date'), format="YYYY-MM-DD"),
                    get_text('status'): st.column_config.TextColumn(get_text('status'))
                },
                use_container_width=True,
                hide_index=True
            )
            
            # 재고 총액 계산
            total_inventory_value = df['total_value'].sum()
            st.markdown(f"### 재고 총액: {format_currency(total_inventory_value)}")
            
            # 내보내기 버튼
            if st.button(f"📥 Excel {get_text('save')}"):
                # Excel 저장 로직
                current_date = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"inventory_export_{current_date}.xlsx"
                
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
        except Exception as e:
            display_error(f"데이터 검색 중 오류가 발생했습니다: {e}")

def show_low_stock_alerts():
    """
    재고 부족 알림 표시
    """
    st.markdown("### 재고 부족 부품 목록")
    st.info("최소 재고량보다 현재 재고량이 적은 부품 목록입니다.")
    
    try:
        # Supabase에서 재고 부족 부품 데이터 조회
        query = """
        SELECT 
            p.part_id::text, 
            p.part_code, 
            p.part_name, 
            p.korean_name, 
            p.category, 
            p.unit, 
            i.current_quantity, 
            p.min_stock,
            p.min_stock - i.current_quantity AS shortage,
            (SELECT MAX(inbound_date) FROM inbound WHERE part_id = p.part_id) AS last_inbound_date,
            (SELECT MAX(outbound_date) FROM outbound WHERE part_id = p.part_id) AS last_outbound_date
        FROM 
            inventory i
        JOIN 
            parts p ON i.part_id = p.part_id
        WHERE 
            i.current_quantity < p.min_stock
        ORDER BY 
            shortage DESC, p.part_code
        """
        
        # 쿼리 실행
        result = supabase().rpc('search_inventory', {'query_sql': query}).execute()
        
        if not result.data:
            st.success("모든 부품이 최소 재고량을 충족하고 있습니다.")
            return
            
        # 데이터프레임으로 변환
        df = pd.DataFrame(result.data)
            
        # 알림 표시
        st.dataframe(
            df,
            column_config={
                'part_code': st.column_config.TextColumn(get_text('part_code')),
                'part_name': st.column_config.TextColumn(get_text('part_name')),
                'korean_name': st.column_config.TextColumn(get_text('korean_name')),
                'category': st.column_config.TextColumn(get_text('category')),
                'unit': st.column_config.TextColumn(get_text('unit')),
                'current_quantity': st.column_config.NumberColumn(get_text('current_stock'), format="%d"),
                'min_stock': st.column_config.NumberColumn(get_text('min_stock'), format="%d"),
                'shortage': st.column_config.NumberColumn("부족 수량", format="%d"),
                'last_inbound_date': st.column_config.DateColumn("최근 입고일", format="YYYY-MM-DD"),
                'last_outbound_date': st.column_config.DateColumn("최근 출고일", format="YYYY-MM-DD")
            },
            use_container_width=True,
            hide_index=True
        )
        
        # 발주 요청 버튼
        if st.button("📝 발주 요청서 생성"):
            # 발주 요청서 생성 로직
            current_date = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"purchase_request_{current_date}.xlsx"
            
            # 요청서 데이터 준비
            purchase_df = df[['part_code', 'part_name', 'korean_name', 'category', 'unit', 'current_quantity', 'min_stock', 'shortage']].copy()
            purchase_df['요청수량'] = purchase_df['shortage']
            
            # 데이터프레임을 엑셀로 변환
            purchase_df.to_excel(filename, index=False)
            
            # 다운로드 링크 생성
            with open(filename, "rb") as file:
                st.download_button(
                    label=f"📥 {filename} 다운로드",
                    data=file,
                    file_name=filename,
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
            
            display_success(f"발주 요청서가 생성되었습니다: {filename}")
    except Exception as e:
        display_error(f"데이터 검색 중 오류가 발생했습니다: {e}")

def show_inventory_analysis():
    """
    재고 분석 표시
    """
    st.markdown("### 재고 분석")
    
    # 데모 데이터 (실제로는 Supabase에서 가져옴)
    category_data = {
        'category': ['필터', '펌프', '모터', '밸브', '센서', '기타'],
        'count': [15, 8, 10, 12, 7, 20],
        'total_value': [3500000, 12000000, 8500000, 4200000, 1800000, 3000000]
    }
    category_df = pd.DataFrame(category_data)
    
    status_data = {
        'status': ['NEW', 'OLD', 'OLDER'],
        'count': [42, 20, 10]
    }
    status_df = pd.DataFrame(status_data)
    
    # 차트 표시
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### 카테고리별 부품 수")
        fig1 = px.pie(
            category_df,
            values='count',
            names='category',
            title='카테고리별 부품 수'
        )
        st.plotly_chart(fig1, use_container_width=True)
    
    with col2:
        st.markdown("#### 상태별 부품 수")
        fig2 = px.pie(
            status_df,
            values='count',
            names='status',
            title='상태별 부품 수',
            color_discrete_sequence=px.colors.sequential.Blues
        )
        st.plotly_chart(fig2, use_container_width=True)
    
    # 카테고리별 재고 가치
    st.markdown("#### 카테고리별 재고 가치")
    fig3 = px.bar(
        category_df,
        x='category',
        y='total_value',
        title='카테고리별 재고 가치',
        labels={'category': '카테고리', 'total_value': '재고 가치'},
        color='category'
    )
    st.plotly_chart(fig3, use_container_width=True)
    
    # 재고 현황 요약
    st.markdown("#### 재고 현황 요약")
    
    # 요약 데이터
    summary_data = {
        '항목': ['총 부품 종류', '총 재고량', '총 재고 가치', '재고 부족 부품 수', '과잉 재고 부품 수'],
        '값': ['72개', '1,235개', '33,000,000원', '3개', '15개']
    }
    summary_df = pd.DataFrame(summary_data)
    
    # 요약 표 표시
    st.table(summary_df)
    
    # 추가 분석 옵션
    st.markdown("#### 추가 분석")
    analysis_options = st.multiselect(
        "분석 옵션 선택",
        ["재고 회전율", "밸류에이션 분석", "사용 패턴 분석", "예측 분석"],
        default=["재고 회전율"]
    )
    
    if "재고 회전율" in analysis_options:
        st.markdown("#### 재고 회전율 분석")
        st.info("최근 12개월 동안의 재고 회전율 추세를 보여줍니다.")
        
        # 재고 회전율 데모 데이터
        months = ['2023-05', '2023-06', '2023-07', '2023-08', '2023-09', '2023-10', 
                 '2023-11', '2023-12', '2024-01', '2024-02', '2024-03', '2024-04']
        turnover_rate = [2.1, 2.2, 2.0, 2.3, 2.4, 2.5, 2.3, 2.2, 2.1, 2.0, 2.2, 2.3]
        
        turnover_df = pd.DataFrame({
            '월': months,
            '회전율': turnover_rate
        })
        
        fig4 = px.line(
            turnover_df,
            x='월',
            y='회전율',
            title='월별 재고 회전율',
            markers=True
        )
        st.plotly_chart(fig4, use_container_width=True)

if __name__ == "__main__":
    show() 