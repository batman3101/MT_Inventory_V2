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

from config.config import SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_KEY

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SupabaseClient:
    """Supabase 클라이언트 클래스"""
    _instance = None
    _service_client = None  # service_role 권한 클라이언트
    _anon_client = None     # anon 권한 클라이언트
    
    def __new__(cls):
        """싱글톤 패턴 구현"""
        if cls._instance is None:
            cls._instance = super(SupabaseClient, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """클라이언트 초기화"""
        try:
            # URL 및 키 가져오기
            supabase_url = self._get_supabase_url()
            service_key = self._get_service_key()
            anon_key = self._get_anon_key()
            
            if not supabase_url:
                logger.error("Supabase URL이 설정되지 않았습니다.")
                self._anon_client = None
                self._service_client = None
                return
                
            # anon 키로 클라이언트 초기화
            if anon_key:
                logger.info(f"Supabase URL: {supabase_url}")
                logger.info(f"Anon 키 길이: {len(anon_key)} / 키 일부: {anon_key[:10]}...{anon_key[-5:]}")
                
                try:
                    self._anon_client = create_client(supabase_url, anon_key)
                    logger.info("Supabase anon 클라이언트 연결 성공")
                except Exception as e:
                    logger.error(f"Supabase anon 클라이언트 연결 실패: {e}")
                    self._anon_client = None
            else:
                logger.warning("Supabase anon 키가 설정되지 않았습니다.")
                self._anon_client = None
                
            # service_role 키로 클라이언트 초기화
            if service_key:
                logger.info(f"Service 키 길이: {len(service_key)} / 키 일부: {service_key[:10]}...{service_key[-5:]}")
                
                try:
                    self._service_client = create_client(supabase_url, service_key)
                    logger.info("Supabase service_role 클라이언트 연결 성공")
                except Exception as e:
                    logger.error(f"Supabase service_role 클라이언트 연결 실패: {e}")
                    self._service_client = None
            else:
                logger.warning("Supabase service_role 키가 설정되지 않았습니다.")
                self._service_client = None
                
        except Exception as e:
            logger.error(f"Supabase 클라이언트 초기화 중 오류 발생: {e}")
            import traceback
            logger.error(f"스택 트레이스: {traceback.format_exc()}")
            self._anon_client = None
            self._service_client = None
    
    def _get_supabase_url(self):
        """Supabase URL 가져오기"""
        # 1. Streamlit 시크릿에서 시도
        try:
            if 'SUPABASE_URL' in st.secrets:
                return st.secrets['SUPABASE_URL']
        except Exception:
            logger.info("Streamlit 시크릿에서 Supabase URL을 찾을 수 없습니다.")
        
        # 2. 환경 변수에서 시도
        return SUPABASE_URL
    
    def _get_anon_key(self):
        """Supabase anon API 키 가져오기"""
        # 1. Streamlit 시크릿에서 시도
        try:
            # 1) API_KEY 키로 시도
            if 'API_KEY' in st.secrets:
                return st.secrets['API_KEY']
            # 2) SUPABASE_KEY 키로 시도
            if 'SUPABASE_KEY' in st.secrets:
                key = st.secrets['SUPABASE_KEY']
                if 'role":"anon"' in key or 'role":"authenticated"' in key:  # anon/authenticated 키 확인
                    return key
        except Exception:
            logger.info("Streamlit 시크릿에서 Supabase anon 키를 찾을 수 없습니다.")
        
        # 2. 환경 변수에서 시도
        try:
            # SUPABASE_KEY 환경 변수를 직접 사용 (role 체크 없이)
            if SUPABASE_KEY:
                # anon 키 확인 로직을 완화하여 값이 있는 경우 사용
                logger.info(f"환경 변수에서 anon 키를 찾았습니다. 길이: {len(SUPABASE_KEY)}")
                return SUPABASE_KEY
            else:
                logger.warning("환경 변수 SUPABASE_KEY가 비어 있습니다.")
        except Exception as e:
            logger.error(f"환경 변수에서 anon 키를 가져오는 중 오류 발생: {e}")
        
        return None
    
    def _get_service_key(self):
        """Supabase service_role API 키 가져오기"""
        # 1. Streamlit 시크릿에서 시도
        try:
            # SUPABASE_SERVICE_KEY로 시도 (우선순위 높음)
            if 'SUPABASE_SERVICE_KEY' in st.secrets:
                service_key = st.secrets['SUPABASE_SERVICE_KEY']
                logger.info(f"SUPABASE_SERVICE_KEY를 찾았습니다. 길이: {len(service_key)}")
                return service_key
                
            # SUPABASE_KEY가 service_role인 경우 시도
            if 'SUPABASE_KEY' in st.secrets:
                key = st.secrets['SUPABASE_KEY']
                if 'role":"service_role"' in key:  # service_role 키 확인
                    logger.info("SUPABASE_KEY에서 service_role 키를 찾았습니다.")
                    return key
                else:
                    logger.warning("SUPABASE_KEY가 service_role 키가 아닙니다.")
        except Exception as e:
            logger.error(f"Streamlit 시크릿에서 Supabase service_role 키를 찾는 중 오류 발생: {e}")
        
        # 2. 환경 변수에서 시도
        try:
            if SUPABASE_KEY and 'role":"service_role"' in SUPABASE_KEY:
                logger.info("환경 변수에서 service_role 키를 찾았습니다.")
                return SUPABASE_KEY
            elif SUPABASE_SERVICE_KEY:
                logger.info(f"환경 변수 SUPABASE_SERVICE_KEY를 사용합니다. 길이: {len(SUPABASE_SERVICE_KEY)}")
                return SUPABASE_SERVICE_KEY
            else:
                logger.warning("환경 변수의 SUPABASE_KEY가 service_role 키가 아니거나 비어 있고, SUPABASE_SERVICE_KEY도 없습니다.")
        except Exception as e:
            logger.error(f"환경 변수에서 service_role 키를 가져오는 중 오류 발생: {e}")
        
        # 3. 키를 찾을 수 없는 경우
        logger.error("서비스 롤 키를 찾을 수 없습니다. 환경 변수 또는 Streamlit 시크릿 설정을 확인하세요.")
        return None
    
    def get_client(self, use_service_role=False) -> Client:
        """
        Supabase 클라이언트 반환
        
        Args:
            use_service_role (bool): True면 service_role 클라이언트 반환, False면 anon 클라이언트 반환
            
        Returns:
            Client: Supabase 클라이언트
        """
        # 요청된 클라이언트가 없으면 초기화 시도
        if (use_service_role and not self._service_client) or (not use_service_role and not self._anon_client):
            logger.info(f"클라이언트 초기화 시도 (use_service_role={use_service_role})")
            self._initialize()
        
        # 요청된 클라이언트 반환
        if use_service_role:
            if not self._service_client:
                # 마지막 시도로 service_role 클라이언트 직접 생성
                try:
                    url = self._get_supabase_url()
                    key = self._get_service_key()
                    if url and key:
                        logger.info("마지막 시도로 service_role 클라이언트 직접 생성 중...")
                        self._service_client = create_client(url, key)
                        logger.info("service_role 클라이언트 직접 생성 성공")
                    else:
                        logger.error(f"service_role 클라이언트 생성 실패: URL={bool(url)}, KEY={bool(key)}")
                except Exception as e:
                    logger.error(f"service_role 클라이언트 직접 생성 중 오류: {e}")
                
                # 여전히 초기화 실패한 경우
                if not self._service_client:
                    error_msg = "Supabase service_role 클라이언트가 초기화되지 않았습니다."
                    logger.error(error_msg)
                    raise Exception(error_msg)
            return self._service_client
        else:
            if not self._anon_client:
                # anon 클라이언트 직접 생성 시도
                try:
                    url = self._get_supabase_url()
                    key = self._get_anon_key()
                    if url and key:
                        logger.info("마지막 시도로 anon 클라이언트 직접 생성 중...")
                        self._anon_client = create_client(url, key)
                        logger.info("anon 클라이언트 직접 생성 성공")
                    else:
                        logger.error(f"anon 클라이언트 생성 실패: URL={bool(url)}, KEY={bool(key)}")
                except Exception as e:
                    logger.error(f"anon 클라이언트 직접 생성 중 오류: {e}")
                
                # 여전히 초기화 실패한 경우, service_role로 대체
                if not self._anon_client and self._service_client:
                    logger.warning("anon 클라이언트가 없어 service_role 클라이언트를 대신 사용합니다.")
                    return self._service_client
                # 모든 클라이언트가 없는 경우
                elif not self._anon_client:
                    error_msg = "Supabase anon 클라이언트가 초기화되지 않았습니다."
                    logger.error(error_msg)
                    raise Exception(error_msg)
            return self._anon_client
    
    def test_connection(self, use_service_role=False):
        """
        Supabase 연결 테스트
        
        Args:
            use_service_role (bool): 서비스 롤 권한 사용 여부
            
        Returns:
            bool: 연결 성공 여부
        """
        try:
            client = self.get_client(use_service_role)
            if not client:
                return False
                
            # 간단한 쿼리로 연결 테스트
            response = client.table('users').select('count', count='exact').limit(1).execute()
            logger.info(f"Supabase 연결 테스트 성공 (use_service_role={use_service_role})")
            return True
        except Exception as e:
            logger.error(f"Supabase 연결 테스트 실패 (use_service_role={use_service_role}): {e}")
            return False

# 간단한 호출을 위한 함수
@st.cache_resource
def supabase(use_service_role=False):
    """
    Supabase 클라이언트 인스턴스 반환
    
    Args:
        use_service_role (bool): True면 service_role 권한, False면 anon 권한 사용
    
    Returns:
        Client: Supabase 클라이언트
    """
    return SupabaseClient().get_client(use_service_role) 