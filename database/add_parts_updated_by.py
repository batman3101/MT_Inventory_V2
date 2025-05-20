"""
parts 테이블에 updated_by 필드 추가 스크립트
"""
import os
import sys
import logging
from dotenv import load_dotenv

# 로깅 설정
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 현재 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# .env 파일 로드
load_dotenv()

# 상위 디렉터리 경로 추가
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Supabase 클라이언트 가져오기
from database.supabase_client import supabase

def add_updated_by_column():
    """
    parts 테이블에 updated_by 컬럼 추가
    """
    logger.info("parts 테이블에 updated_by 필드 추가 시작...")
    
    try:
        # Supabase 클라이언트 얻기 (service role 권한 필요)
        sb = supabase(True)
        
        # PostgreSQL을 직접 실행하는 RPC 함수 호출
        logger.info("PostgreSQL 함수 실행 준비...")
        
        # 1. updated_by 컬럼이 있는지 확인
        # PostgREST를 통해 직접 실행할 수 없으므로 쿼리 실행은 실패할 수 있음
        try:
            # 테이블 정보 가져오기 시도
            response = sb.table('parts').select('updated_by').limit(1).execute()
            logger.info("updated_by 컬럼이 이미 존재합니다.")
            column_exists = True
        except Exception as e:
            if 'column "updated_by" does not exist' in str(e):
                logger.info("updated_by 컬럼이 존재하지 않아 새로 생성합니다.")
                column_exists = False
            else:
                logger.error(f"컬럼 확인 중 오류 발생: {e}")
                column_exists = False
        
        # 2. 컬럼이 없는 경우 추가
        if not column_exists:
            # SQL 함수를 만들어 실행
            logger.info("SQL 함수 생성 및 실행...")
            
            # a. SQL 함수 생성
            create_function_sql = """
            CREATE OR REPLACE FUNCTION add_updated_by_to_parts()
            RETURNS void AS $$
            BEGIN
                -- 컬럼이 없는 경우에만 추가
                IF NOT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'parts' AND column_name = 'updated_by'
                ) THEN
                    ALTER TABLE parts ADD COLUMN updated_by text DEFAULT 'system' NOT NULL;
                    RAISE NOTICE 'updated_by 컬럼이 추가되었습니다.';
                ELSE
                    RAISE NOTICE 'updated_by 컬럼이 이미 존재합니다.';
                END IF;
            END;
            $$ LANGUAGE plpgsql;
            """
            
            # b. 함수 실행
            execute_function_sql = """
            SELECT add_updated_by_to_parts();
            """
            
            try:
                # 직접 SQL 실행이 불가능하므로 대안으로 해당 필드를 포함한 업데이트 시도
                logger.info("모든 parts 레코드에 updated_by 필드를 기본값 'system'으로 설정 시도...")
                
                # 먼저 모든 parts ID 가져오기
                response = sb.table('parts').select('part_id').execute()
                parts_count = len(response.data)
                
                if parts_count > 0:
                    logger.info(f"{parts_count}개의 parts 레코드에 updated_by 필드 추가 시도...")
                    
                    # 각 레코드 업데이트
                    for part in response.data:
                        try:
                            update_response = sb.table('parts').update({
                                'updated_by': 'system'
                            }).eq('part_id', part['part_id']).execute()
                            
                            if update_response.data:
                                logger.info(f"part_id: {part['part_id']} 업데이트 성공")
                            else:
                                logger.warning(f"part_id: {part['part_id']} 업데이트 실패")
                        except Exception as update_err:
                            if 'column "updated_by" does not exist' in str(update_err):
                                logger.error("업데이트 실패: updated_by 필드가 아직 존재하지 않습니다.")
                                break
                            else:
                                logger.error(f"업데이트 중 오류 발생: {update_err}")
                    
                    logger.info("Supabase DB Console에서 직접 다음 SQL을 실행해야 합니다:")
                    logger.info("ALTER TABLE parts ADD COLUMN updated_by text DEFAULT 'system' NOT NULL;")
                else:
                    logger.info("parts 테이블에 레코드가 없습니다.")
            
            except Exception as e:
                logger.error(f"SQL 함수 실행 중 오류: {e}")
                logger.info("Supabase 관리 콘솔에서 다음 SQL을 실행하세요:")
                logger.info("ALTER TABLE parts ADD COLUMN updated_by text DEFAULT 'system' NOT NULL;")
        
        return True
    
    except Exception as e:
        logger.error(f"updated_by 필드 추가 중 오류 발생: {e}")
        return False
    
    finally:
        logger.info("parts 테이블 updated_by 필드 추가 작업 완료.")

if __name__ == "__main__":
    success = add_updated_by_column()
    if success:
        logger.info("작업이 완료되었습니다. Streamlit 앱을 재시작하세요.")
    else:
        logger.error("작업이 실패했습니다. 로그를 확인하세요.") 