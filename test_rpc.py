"""
Supabase RPC 함수 테스트 스크립트
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
from database.supabase_client import supabase

def test_search_inventory_rpc():
    """
    search_inventory RPC 함수 테스트
    """
    logger.info("search_inventory RPC 테스트 시작...")
    
    try:
        # 간단한 SQL 쿼리로 테스트
        simple_query = """
        SELECT p.part_id, p.part_code, p.part_name, p.category, i.current_quantity
        FROM parts p
        LEFT JOIN inventory i ON p.part_id = i.part_id
        LIMIT 5
        """
        
        logger.info(f"실행할 쿼리: {simple_query}")
        
        # RPC 함수 호출
        result = supabase(True).rpc('search_inventory', {'query_sql': simple_query}).execute()
        
        # 결과 확인
        if result.data:
            logger.info(f"쿼리 결과: {result.data}")
            logger.info("RPC 함수 호출 성공")
        else:
            logger.warning("쿼리 결과가 없습니다.")
            
        # 직접 테이블 쿼리로 동일한 결과 확인
        direct_result = supabase(True).table("parts").select("part_id, part_code, part_name, category").limit(5).execute()
        logger.info(f"직접 쿼리 결과: {direct_result.data}")
            
    except Exception as e:
        logger.error(f"RPC 함수 호출 실패: {e}")
        import traceback
        logger.error(f"상세 에러: {traceback.format_exc()}")

if __name__ == "__main__":
    test_search_inventory_rpc() 