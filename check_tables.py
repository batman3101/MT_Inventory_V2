"""
테이블 스키마 확인 스크립트
"""
import sys
import os
import logging
import json

# 로깅 설정
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 현재 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Supabase 클라이언트 가져오기
from database.supabase_client import supabase

def check_table_schema():
    """
    테이블 스키마 확인
    """
    logger.info("테이블 스키마 확인 시작...")
    
    # 확인할 테이블 목록
    tables = [
        'parts',
        'inventory',
        'part_prices',
        'inbound',
        'outbound',
        'suppliers',
        'departments'
    ]
    
    for table_name in tables:
        logger.info(f"테이블 '{table_name}' 확인 중...")
        try:
            # 테이블에서 첫 번째 레코드 가져오기
            response = supabase(True).table(table_name).select('*').limit(1).execute()
            
            # 첫 번째 레코드가 없으면 스키마를 알 수 없음
            if not response.data:
                logger.warning(f"테이블 '{table_name}'에 데이터가 없어 스키마를 확인할 수 없습니다. 빈 레코드 삽입 시도...")
                
                # 테이블별 샘플 데이터 생성
                sample_data = create_sample_data(table_name)
                if sample_data:
                    # 샘플 데이터 삽입
                    insert_result = supabase(True).table(table_name).insert(sample_data).execute()
                    logger.info(f"샘플 데이터 삽입 결과: {insert_result}")
                    
                    # 다시 조회
                    response = supabase(True).table(table_name).select('*').limit(1).execute()
            
            # 테이블 구조 출력
            if response.data:
                logger.info(f"테이블 '{table_name}' 구조:")
                for column, value in response.data[0].items():
                    value_type = type(value).__name__
                    logger.info(f"  - {column}: {value_type} (예: {value})")
            else:
                logger.warning(f"테이블 '{table_name}'에 데이터가 없습니다.")
        
        except Exception as e:
            logger.error(f"테이블 '{table_name}' 확인 중 오류 발생: {e}")
    
    logger.info("테이블 스키마 확인 완료")

def create_sample_data(table_name):
    """
    테이블에 따른 샘플 데이터 생성
    """
    if table_name == 'parts':
        return {
            'part_code': 'SAMPLE001',
            'part_name': 'Sample Part',
            'category': '샘플',
            'unit': 'EA',
            'min_stock': 5,
            'status': 'NEW'
        }
    
    elif table_name == 'inventory':
        # 먼저 part_id 찾기
        try:
            part_result = supabase(True).table('parts').select('part_id').limit(1).execute()
            if part_result.data:
                part_id = part_result.data[0]['part_id']
                return {
                    'part_id': part_id,
                    'current_quantity': 10
                }
        except Exception as e:
            logger.error(f"부품 ID 조회 중 오류: {e}")
        return None
    
    elif table_name == 'part_prices':
        # 먼저 part_id 찾기
        try:
            part_result = supabase(True).table('parts').select('part_id').limit(1).execute()
            if part_result.data:
                part_id = part_result.data[0]['part_id']
                return {
                    'part_id': part_id,
                    'unit_price': 1000,
                    'currency': 'VND',
                    'is_current': True
                }
        except Exception as e:
            logger.error(f"부품 ID 조회 중 오류: {e}")
        return None
    
    elif table_name == 'inbound':
        # 먼저 필요한 ID 찾기
        try:
            part_result = supabase(True).table('parts').select('part_id').limit(1).execute()
            supplier_result = supabase(True).table('suppliers').select('supplier_id').limit(1).execute()
            
            if part_result.data and supplier_result.data:
                part_id = part_result.data[0]['part_id']
                supplier_id = supplier_result.data[0]['supplier_id']
                return {
                    'part_id': part_id,
                    'supplier_id': supplier_id,
                    'inbound_date': '2023-05-01',
                    'quantity': 5,
                    'unit_price': 1000,
                    'currency': 'VND'
                }
        except Exception as e:
            logger.error(f"필요한 ID 조회 중 오류: {e}")
        return None
    
    elif table_name == 'outbound':
        # 먼저 part_id 찾기
        try:
            part_result = supabase(True).table('parts').select('part_id').limit(1).execute()
            if part_result.data:
                part_id = part_result.data[0]['part_id']
                return {
                    'part_id': part_id,
                    'outbound_date': '2023-05-01',
                    'quantity': 2,
                    'requester': 'Sample User'
                }
        except Exception as e:
            logger.error(f"부품 ID 조회 중 오류: {e}")
        return None
    
    elif table_name == 'suppliers':
        return {
            'supplier_code': 'SUP001',
            'supplier_name': 'Sample Supplier',
            'contact_person': 'John Doe',
            'email': 'john@example.com',
            'phone': '123-456-7890',
            'status': 'active'
        }
    
    return None

if __name__ == "__main__":
    check_table_schema()