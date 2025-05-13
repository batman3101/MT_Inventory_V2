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
    
    try:
        # 카테고리별 부품 수와 총 가치 쿼리
        category_query = """
        SELECT 
            p.category, 
            COUNT(p.part_id) as count,
            COALESCE(SUM(i.current_quantity * pp.unit_price), 0) as total_value
        FROM 
            parts p
        JOIN 
            inventory i ON p.part_id = i.part_id
        LEFT JOIN (
            SELECT part_id, unit_price
            FROM part_prices
            WHERE is_current = true
        ) pp ON p.part_id = pp.part_id
        GROUP BY 
            p.category
        ORDER BY 
            p.category
        """
        
        # 상태별 부품 수 쿼리
        status_query = """
        SELECT 
            CASE 
                WHEN p.status = 'new' THEN 'NEW'
                WHEN p.status = 'old' THEN 'OLD'
                ELSE 'OLDER'
            END as status,
            COUNT(p.part_id) as count
        FROM 
            parts p
        JOIN 
            inventory i ON p.part_id = i.part_id
        GROUP BY 
            CASE 
                WHEN p.status = 'new' THEN 'NEW'
                WHEN p.status = 'old' THEN 'OLD'
                ELSE 'OLDER'
            END
        """
        
        # 재고 요약 쿼리
        summary_query = """
        SELECT 
            (SELECT COUNT(*) FROM parts) as total_parts,
            (SELECT SUM(current_quantity) FROM inventory) as total_quantity,
            (SELECT SUM(i.current_quantity * pp.unit_price) 
             FROM inventory i 
             JOIN parts p ON i.part_id = p.part_id
             LEFT JOIN (
                 SELECT part_id, unit_price
                 FROM part_prices
                 WHERE is_current = true
             ) pp ON p.part_id = pp.part_id) as total_value,
            (SELECT COUNT(*) FROM inventory i JOIN parts p ON i.part_id = p.part_id WHERE i.current_quantity < p.min_stock) as low_stock_parts,
            (SELECT COUNT(*) FROM inventory i JOIN parts p ON i.part_id = p.part_id WHERE i.current_quantity > p.max_stock) as excess_stock_parts
        """
        
        # 재고 회전율 쿼리 (최근 12개월)
        turnover_query = """
        WITH monthly_data AS (
            SELECT 
                TO_CHAR(date_trunc('month', o.outbound_date), 'YYYY-MM') as month,
                SUM(o.quantity * pp.unit_price) as monthly_usage,
                AVG(i.current_quantity * pp.unit_price) as avg_inventory_value
            FROM 
                outbound o
            JOIN 
                parts p ON o.part_id = p.part_id
            JOIN 
                inventory i ON p.part_id = i.part_id
            LEFT JOIN (
                SELECT part_id, unit_price
                FROM part_prices
                WHERE is_current = true
            ) pp ON p.part_id = pp.part_id
            WHERE 
                o.outbound_date >= date_trunc('month', NOW()) - INTERVAL '12 months'
            GROUP BY 
                TO_CHAR(date_trunc('month', o.outbound_date), 'YYYY-MM')
            ORDER BY 
                month
        )
        SELECT 
            month,
            CASE WHEN avg_inventory_value = 0 THEN 0 ELSE monthly_usage / avg_inventory_value END as turnover_rate
        FROM 
            monthly_data
        """
        
        # 쿼리 실행
        category_result = supabase().rpc('search_inventory', {'query_sql': category_query}).execute()
        status_result = supabase().rpc('search_inventory', {'query_sql': status_query}).execute()
        summary_result = supabase().rpc('search_inventory', {'query_sql': summary_query}).execute()
        turnover_result = supabase().rpc('search_inventory', {'query_sql': turnover_query}).execute()
        
        # 데이터프레임으로 변환
        category_df = pd.DataFrame(category_result.data)
        status_df = pd.DataFrame(status_result.data)
        summary_data = summary_result.data[0] if summary_result.data else {}
        turnover_df = pd.DataFrame(turnover_result.data) if turnover_result.data else pd.DataFrame({'month': [], 'turnover_rate': []})
        
        # 데이터가 없는 경우 처리
        if category_df.empty:
            st.warning("카테고리별 데이터를 가져올 수 없습니다.")
            return
        
        if status_df.empty:
            st.warning("상태별 데이터를 가져올 수 없습니다.")
            return
        
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
        
        # 요약 데이터 준비
        formatted_summary = {
            '항목': ['총 부품 종류', '총 재고량', '총 재고 가치', '재고 부족 부품 수', '과잉 재고 부품 수'],
            '값': [
                f"{summary_data.get('total_parts', 0)}개",
                f"{summary_data.get('total_quantity', 0):,}개",
                f"{format_currency(summary_data.get('total_value', 0))}",
                f"{summary_data.get('low_stock_parts', 0)}개",
                f"{summary_data.get('excess_stock_parts', 0)}개"
            ]
        }
        summary_df = pd.DataFrame(formatted_summary)
        
        # 요약 표 표시
        st.table(summary_df)
        
        # 추가 분석 옵션
        st.markdown("#### 추가 분석")
        analysis_options = st.multiselect(
            "분석 옵션 선택",
            ["재고 회전율", "밸류에이션 분석", "사용 패턴 분석", "예측 분석"],
            default=["재고 회전율"]
        )
        
        if "재고 회전율" in analysis_options and not turnover_df.empty:
            st.markdown("#### 재고 회전율 분석")
            st.info("최근 12개월 동안의 재고 회전율 추세를 보여줍니다.")
            
            fig4 = px.line(
                turnover_df,
                x='month',
                y='turnover_rate',
                title='월별 재고 회전율',
                markers=True
            )
            st.plotly_chart(fig4, use_container_width=True)
    except Exception as e:
        display_error(f"재고 분석 데이터 조회 중 오류가 발생했습니다: {e}")

if __name__ == "__main__":
    show() 