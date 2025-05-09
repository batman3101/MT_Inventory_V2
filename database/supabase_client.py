"""
Supabase 클라이언트 연결 모듈
"""
import sys
import os
import logging
import streamlit as st
from supabase import create_client, Client

# 상위 디렉토리를 path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.config import SUPABASE_URL, SUPABASE_KEY

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SupabaseClient:
    """Supabase 클라이언트 클래스"""
    _instance = None
    
    def __new__(cls):
        """싱글톤 패턴 구현"""
        if cls._instance is None:
            cls._instance = super(SupabaseClient, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """클라이언트 초기화"""
        try:
            # Streamlit 시크릿에서 먼저 키 가져오기 시도
            supabase_url = self._get_supabase_url()
            supabase_key = self._get_supabase_key()
            
            if not supabase_url or not supabase_key:
                logger.error("Supabase 설정이 유효하지 않습니다. .env 또는 Streamlit 시크릿을 확인하세요.")
                self.client = None
                return
            
            # API 키 로깅 (민감한 정보이므로 일부만 표시)
            logger.info(f"Supabase URL: {supabase_url}")
            logger.info(f"Supabase 키 길이: {len(supabase_key)} / 키 일부: {supabase_key[:10]}...{supabase_key[-5:]}")
            
            # 클라이언트 생성
            self.client = create_client(supabase_url, supabase_key)
            logger.info("Supabase 클라이언트 연결 성공")
        except Exception as e:
            logger.error(f"Supabase 클라이언트 연결 실패: {e}")
            # 자세한 예외 정보 로깅
            import traceback
            logger.error(f"스택 트레이스: {traceback.format_exc()}")
            self.client = None
    
    def _get_supabase_url(self):
        """Supabase URL 가져오기"""
        # Streamlit 시크릿에서 먼저 시도
        try:
            if 'SUPABASE_URL' in st.secrets:
                return st.secrets['SUPABASE_URL']
        except Exception:
            logger.info("Streamlit 시크릿에서 Supabase URL을 찾을 수 없습니다.")
        
        # 환경 변수에서 시도
        return SUPABASE_URL
    
    def _get_supabase_key(self):
        """Supabase API 키 가져오기"""
        # Streamlit 시크릿에서 먼저 시도
        try:
            if 'SUPABASE_KEY' in st.secrets:
                return st.secrets['SUPABASE_KEY']
        except Exception:
            logger.info("Streamlit 시크릿에서 Supabase 키를 찾을 수 없습니다.")
        
        # 환경 변수에서 시도
        return SUPABASE_KEY
    
    def get_client(self) -> Client:
        """Supabase 클라이언트 반환"""
        if not self.client:
            self._initialize()
            if not self.client:
                raise Exception("Supabase 클라이언트가 초기화되지 않았습니다.")
        return self.client
    
    def test_connection(self):
        """
        Supabase 연결 테스트
        
        Returns:
            bool: 연결 성공 여부
        """
        try:
            if not self.client:
                return False
                
            # 간단한 쿼리로 연결 테스트
            response = self.client.table('users').select('count', count='exact').limit(1).execute()
            logger.info("Supabase 연결 테스트 성공")
            return True
        except Exception as e:
            logger.error(f"Supabase 연결 테스트 실패: {e}")
            return False

# 클라이언트 인스턴스 생성
supabase = SupabaseClient().get_client 