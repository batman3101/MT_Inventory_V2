"""
Supabase 클라이언트 연결 모듈
"""
import sys
import os
import logging
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
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.error("Supabase 설정이 유효하지 않습니다. .env 파일을 확인하세요.")
                self.client = None
                return
            
            self.client = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("Supabase 클라이언트 연결 성공")
        except Exception as e:
            logger.error(f"Supabase 클라이언트 연결 실패: {e}")
            self.client = None
    
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
            return True
        except Exception as e:
            logger.error(f"Supabase 연결 테스트 실패: {e}")
            return False

# 클라이언트 인스턴스 생성
supabase = SupabaseClient().get_client 