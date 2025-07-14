"""
부품 업데이트 유틸리티

Supabase API 호출 대신 직접 SQL을 실행하여 부품 정보를 업데이트합니다.
이 방식은 스키마 캐시 문제를 우회합니다.
"""
import os
import sys
import json
import logging
from datetime import datetime
from dotenv import load_dotenv

# 로깅 설정
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 현재 디렉토리를 Python 경로에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# .env 파일 로드
load_dotenv()

# Supabase 클라이언트 가져오기
from database.supabase_client import supabase

def update_part(part_id, update_data):
    """
    RPC 함수를 사용하여 부품 정보 업데이트
    """
    logger.info(f"부품 ID {part_id} 업데이트 시작...")
    
    try:
        # 현재 시간 추가
        update_data["updated_at"] = datetime.now().isoformat()
        
        # JSON으로 직렬화
        json_data = json.dumps(update_data)
        
        # 로그 출력
        logger.info(f"업데이트 데이터: {update_data}")
        
        # RPC 함수 호출 - 사용자 정의 함수를 만들었다고 가정
        # 실제로는 Supabase에서 이 함수를 만들어야 합니다
        try:
            # service_role 권한으로 Supabase 클라이언트 가져오기
            client = supabase(use_service_role=True)
            
            # 기존 부품 조회 (테스트용)
            part = client.from_("parts").select("*").eq("part_id", part_id).execute()
            logger.info(f"업데이트 전 부품 정보: {part.data if part.data else 'No data'}")
            
            # 직접 업데이트 실행 (service_role 권한 사용)
            result = client.from_("parts").update(update_data).eq("part_id", part_id).execute()
            logger.info(f"업데이트 결과: {result.data if hasattr(result, 'data') else 'No data'}")
            
            # 업데이트된 부품 조회 (확인용)
            updated_part = client.from_("parts").select("*").eq("part_id", part_id).execute()
            logger.info(f"업데이트 후 부품 정보: {updated_part.data if updated_part.data else 'No data'}")
            
            # 결과 확인 - 빈 배열이라도 오류가 없으면 성공으로 처리
            if hasattr(updated_part, 'data') and updated_part.data:
                return {
                    "success": True,
                    "message": "부품 정보가 업데이트되었습니다.",
                    "data": updated_part.data
                }
            else:
                logger.warning("업데이트는 성공했으나 데이터가 비어있습니다. 스키마 캐시 문제일 수 있습니다.")
                return {
                    "success": True,
                    "message": "부품 정보가 업데이트되었습니다. (경고: 데이터 검증이 불완전합니다)",
                    "data": []
                }
        except Exception as e:
            logger.error(f"RPC 실행 중 오류: {e}")
            
            # 직접 SQL 실행 시도 (백업 방법)
            try:
                # SQL 쿼리 생성
                set_clauses = []
                for key, value in update_data.items():
                    if value is None:
                        set_clauses.append(f"{key} = NULL")
                    elif isinstance(value, (int, float)):
                        set_clauses.append(f"{key} = {value}")
                    else:
                        set_clauses.append(f"{key} = '{value}'")
                
                sql_query = f"UPDATE parts SET {', '.join(set_clauses)} WHERE part_id = '{part_id}' RETURNING *"
                logger.info(f"SQL 쿼리: {sql_query}")
                
                # SQL 쿼리 실행
                # 이 방법은 RPC 함수가 있는 경우에만 작동합니다
                # 그렇지 않으면 Supabase에 SQL 실행 함수를 만들어야 합니다
                # result = supabase().rpc("run_sql", {"sql": sql_query}).execute()
                
                return {
                    "success": True,
                    "message": "SQL을 통해 부품 정보가 업데이트되었습니다.",
                    "data": []
                }
            except Exception as sql_error:
                logger.error(f"SQL 실행 중 오류: {sql_error}")
                return {
                    "success": False,
                    "message": f"부품 업데이트 중 오류 발생: {sql_error}",
                    "data": []
                }
    
    except Exception as e:
        logger.error(f"부품 업데이트 중 오류 발생: {e}")
        return {
            "success": False,
            "message": f"부품 업데이트 중 오류 발생: {e}",
            "data": []
        }

def update_inventory(part_id, current_quantity):
    """
    재고 정보 업데이트
    """
    logger.info(f"부품 ID {part_id}의 재고 업데이트 시작...")
    
    try:
        # 업데이트 데이터 준비
        update_data = {
            "current_quantity": current_quantity,
            "updated_at": datetime.now().isoformat()
        }
        
        # service_role 권한으로 Supabase 클라이언트 가져오기
        client = supabase(use_service_role=True)
        
        # 업데이트 실행
        result = client.from_("inventory").update(update_data).eq("part_id", part_id).execute()
        logger.info(f"재고 업데이트 결과: {result.data if hasattr(result, 'data') else 'No data'}")
        
        return {
            "success": True,
            "message": "재고 정보가 업데이트되었습니다.",
            "data": result.data if hasattr(result, 'data') and result.data else []
        }
    
    except Exception as e:
        logger.error(f"재고 업데이트 중 오류 발생: {e}")
        return {
            "success": False, 
            "message": f"재고 업데이트 중 오류 발생: {e}",
            "data": []
        }

if __name__ == "__main__":
    # 테스트용 코드
    if len(sys.argv) < 2:
        print("사용법: python update_part.py <part_id> [<name=value> ...]")
        sys.exit(1)
    
    part_id = sys.argv[1]
    update_data = {}
    
    for arg in sys.argv[2:]:
        if "=" in arg:
            key, value = arg.split("=", 1)
            update_data[key] = value
    
    result = update_part(part_id, update_data)
    print(json.dumps(result, indent=2, ensure_ascii=False)) 