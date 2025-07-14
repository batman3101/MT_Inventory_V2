"""
유틸리티 헬퍼 함수 모듈
"""
import pandas as pd
import streamlit as st
from datetime import datetime, timedelta

def format_currency(value, currency='₫'):
    """
    통화 형식으로 포맷팅
    
    Args:
        value: 금액
        currency: 통화 기호 (기본값: '₫')
        
    Returns:
        포맷팅된 문자열
    """
    if pd.isna(value) or value is None:
        return f"{currency}0"
    
    # 1000 단위 구분 기호로 포맷팅
    formatted = f"{currency}{value:,.0f}"
    return formatted

def format_date(date_obj, format="%Y-%m-%d"):
    """
    날짜 형식으로 포맷팅
    
    Args:
        date_obj: 날짜 객체
        format: 날짜 포맷 (기본값: "%Y-%m-%d")
        
    Returns:
        포맷팅된 문자열
    """
    if pd.isna(date_obj) or date_obj is None:
        return ""
    
    if isinstance(date_obj, str):
        try:
            date_obj = datetime.strptime(date_obj, "%Y-%m-%dT%H:%M:%S")
        except ValueError:
            try:
                date_obj = datetime.strptime(date_obj, "%Y-%m-%d")
            except ValueError:
                return date_obj
    
    return date_obj.strftime(format)

def get_date_range_options():
    """
    날짜 범위 옵션 반환
    
    Returns:
        날짜 범위 옵션 딕셔너리
    """
    today = datetime.now().date()
    
    return {
        "오늘": (today, today),
        "어제": (today - timedelta(days=1), today - timedelta(days=1)),
        "지난 7일": (today - timedelta(days=7), today),
        "지난 30일": (today - timedelta(days=30), today),
        "이번 달": (today.replace(day=1), today),
        "지난 달": ((today.replace(day=1) - timedelta(days=1)).replace(day=1), 
                  today.replace(day=1) - timedelta(days=1)),
        "올해": (today.replace(month=1, day=1), today),
        "전체": (None, None)
    }

def display_error(message):
    """
    오류 메시지 표시
    
    Args:
        message: 오류 메시지
    """
    from utils.i18n import get_text
    st.error(f"{get_text('error')}: {message}")

def display_success(message):
    """
    성공 메시지 표시
    
    Args:
        message: 성공 메시지
    """
    from utils.i18n import get_text
    st.success(f"{get_text('success')}: {message}")

def display_info(message):
    """
    정보 메시지 표시
    
    Args:
        message: 정보 메시지
    """
    from utils.i18n import get_text
    st.info(f"{get_text('info')}: {message}")

def display_warning(message):
    """
    경고 메시지 표시
    
    Args:
        message: 경고 메시지
    """
    from utils.i18n import get_text
    st.warning(f"{get_text('warning')}: {message}")

def create_empty_df(columns):
    """
    빈 데이터프레임 생성
    
    Args:
        columns: 열 이름 리스트
        
    Returns:
        빈 pandas DataFrame
    """
    return pd.DataFrame(columns=columns) 