"""
Supabase 연결 테스트 스크립트
"""
import sys
import os
import logging
from datetime import datetime

# 로깅 설정
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 현재 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Supabase 클라이언트 가져오기
from database.supabase_client import supabase, SupabaseClient

def test_supabase_connection():
    """
    Supabase 연결 테스트
    """
    logger.info("Supabase 연결 테스트 시작...")
    
    # 1. 클라이언트 초기화 확인
    client = SupabaseClient()
    logger.info(f"클라이언트 초기화 결과: anon={bool(client._anon_client)}, service={bool(client._service_client)}")
    
    # 2. 서비스 롤 클라이언트로 연결 테스트
    try:
        service_client = supabase(use_service_role=True)
        logger.info("서비스 롤 클라이언트 호출 성공")
        
        # 테이블 리스트 조회
        response = service_client.table('parts').select('count', count='exact').limit(1).execute()
        logger.info(f"parts 테이블 조회 결과: {response}")
        
        logger.info("서비스 롤 클라이언트 연결 테스트 성공")
        
    except Exception as e:
        logger.error(f"서비스 롤 클라이언트 연결 테스트 실패: {e}")
    
    # 3. 익명 클라이언트로 연결 테스트
    try:
        anon_client = supabase(use_service_role=False)
        logger.info("익명 클라이언트 호출 성공")
        
        # 테이블 리스트 조회
        response = anon_client.table('parts').select('count', count='exact').limit(1).execute()
        logger.info(f"parts 테이블 조회 결과: {response}")
        
        logger.info("익명 클라이언트 연결 테스트 성공")
        
    except Exception as e:
        logger.error(f"익명 클라이언트 연결 테스트 실패: {e}")
    
    # 4. 테이블 구조 확인
    try:
        tables_to_check = ['parts', 'inventory', 'part_prices', 'inbound', 'outbound', 'suppliers']
        
        for table in tables_to_check:
            try:
                response = supabase(True).table(table).select('*').limit(1).execute()
                record = response.data[0] if response.data else None
                if record:
                    logger.info(f"테이블 '{table}' 구조: {list(record.keys())}")
                else:
                    logger.warning(f"테이블 '{table}'에 데이터가 없습니다.")
            except Exception as e:
                logger.error(f"테이블 '{table}' 조회 중 오류: {e}")
    
    except Exception as e:
        logger.error(f"테이블 구조 확인 중 오류: {e}")
    
    logger.info("Supabase 연결 테스트 완료")

if __name__ == "__main__":
    test_supabase_connection() 