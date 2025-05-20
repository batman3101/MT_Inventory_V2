"""
데이터베이스 마이그레이션 스크립트 실행 도구
"""
import os
import sys
import logging
from dotenv import load_dotenv
from datetime import datetime

# 로깅 설정
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 현재 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# .env 파일 로드
load_dotenv()

# Supabase 클라이언트 가져오기
from database.supabase_client import supabase

def run_migration():
    """
    데이터베이스 마이그레이션 스크립트 실행
    """
    logger.info("데이터베이스 마이그레이션 스크립트 실행 시작...")
    
    try:
        # SQL 파일 경로
        sql_file_path = os.path.join('database', 'db_update.sql')
        
        # SQL 파일이 존재하는지 확인
        if not os.path.exists(sql_file_path):
            logger.error(f"SQL 파일을 찾을 수 없습니다: {sql_file_path}")
            return False
        
        # SQL 파일 읽기
        with open(sql_file_path, 'r', encoding='utf-8') as f:
            sql_script = f.read()
        
        # SQL 스크립트를 세미콜론으로 분리
        sql_statements = sql_script.split(';')
        
        # Supabase 클라이언트 얻기 (service role 권한 필요)
        sb = supabase(True)
        
        # 각 SQL 명령 실행
        statements_executed = 0
        for statement in sql_statements:
            # 빈 문장 무시
            statement = statement.strip()
            if not statement:
                continue
            
            try:
                # NOTICE 블록은 건너뛰기
                if statement.upper().startswith('DO $$') and 'RAISE NOTICE' in statement:
                    logger.info("NOTICE 블록 건너뛰기")
                    continue
                
                # SQL 실행 (rpc 호출을 통해)
                # response = sb.rpc('exec_sql', {'sql_statement': statement}).execute()
                
                # 직접 테이블 조회 방식으로 변경 (supabase-py는 일반 SQL 실행을 직접 지원하지 않음)
                # 대신 테이블별로 업데이트 수행
                if 'UPDATE parts' in statement:
                    logger.info("parts 테이블 업데이트 중...")
                    # 직접 업데이트할 데이터 찾기
                    records = sb.from_('parts').select('part_id').is_('created_by', 'null').execute()
                    for record in records.data:
                        sb.from_('parts').update({'created_by': 'system_migration'}).eq('part_id', record['part_id']).execute()
                    logger.info(f"{len(records.data)}개의 parts 레코드 업데이트 완료")
                    statements_executed += 1
                
                elif 'UPDATE inventory' in statement and 'last_count_date' in statement:
                    logger.info("inventory 테이블의 last_count_date 업데이트 중...")
                    records = sb.from_('inventory').select('inventory_id').is_('last_count_date', 'null').execute()
                    today = datetime.now().strftime('%Y-%m-%d')
                    for record in records.data:
                        sb.from_('inventory').update({'last_count_date': today}).eq('inventory_id', record['inventory_id']).execute()
                    logger.info(f"{len(records.data)}개의 inventory 레코드의 last_count_date 업데이트 완료")
                    statements_executed += 1
                
                elif 'UPDATE inventory' in statement and 'updated_by' in statement:
                    logger.info("inventory 테이블의 updated_by 업데이트 중...")
                    records = sb.from_('inventory').select('inventory_id').is_('updated_by', 'null').execute()
                    for record in records.data:
                        sb.from_('inventory').update({'updated_by': 'system_migration'}).eq('inventory_id', record['inventory_id']).execute()
                    logger.info(f"{len(records.data)}개의 inventory 레코드의 updated_by 업데이트 완료")
                    statements_executed += 1
                
                elif 'UPDATE outbound' in statement:
                    logger.info("outbound 테이블 업데이트 중...")
                    records = sb.from_('outbound').select('outbound_id, department_id').is_('department', 'null').not_.is_('department_id', 'null').execute()
                    for record in records.data:
                        # department_id로 department_name 찾기
                        dept = sb.from_('departments').select('department_name').eq('department_id', record['department_id']).execute()
                        if dept.data:
                            dept_name = dept.data[0]['department_name']
                            # department 필드 업데이트
                            sb.from_('outbound').update({'department': dept_name}).eq('outbound_id', record['outbound_id']).execute()
                    logger.info(f"{len(records.data)}개의 outbound 레코드 업데이트 완료")
                    statements_executed += 1
                
                elif 'UPDATE suppliers' in statement and 'website' in statement:
                    logger.info("suppliers 테이블의 website 업데이트 중...")
                    records = sb.from_('suppliers').select('supplier_id').is_('website', 'null').execute()
                    for record in records.data:
                        sb.from_('suppliers').update({'website': ''}).eq('supplier_id', record['supplier_id']).execute()
                    logger.info(f"{len(records.data)}개의 suppliers 레코드의 website 업데이트 완료")
                    statements_executed += 1
                
                elif 'UPDATE suppliers' in statement and 'status' in statement:
                    logger.info("suppliers 테이블의 status 업데이트 중...")
                    records = sb.from_('suppliers').select('supplier_id').is_('status', 'null').execute()
                    for record in records.data:
                        sb.from_('suppliers').update({'status': 'ACTIVE'}).eq('supplier_id', record['supplier_id']).execute()
                    logger.info(f"{len(records.data)}개의 suppliers 레코드의 status 업데이트 완료")
                    statements_executed += 1
                
                elif 'UPDATE suppliers' in statement and 'created_by' in statement:
                    logger.info("suppliers 테이블의 created_by 업데이트 중...")
                    records = sb.from_('suppliers').select('supplier_id').is_('created_by', 'null').execute()
                    for record in records.data:
                        sb.from_('suppliers').update({'created_by': 'system_migration'}).eq('supplier_id', record['supplier_id']).execute()
                    logger.info(f"{len(records.data)}개의 suppliers 레코드의 created_by 업데이트 완료")
                    statements_executed += 1
                
                # 인덱스 및 트리거는 생략 (Supabase에서 일반 SQL 실행 권한이 필요)
                elif 'CREATE INDEX' in statement or 'CREATE TRIGGER' in statement or 'DROP TRIGGER' in statement or 'CREATE OR REPLACE FUNCTION' in statement:
                    logger.info(f"인덱스/트리거/함수 생성은 Supabase 콘솔에서 직접 실행해야 합니다: {statement[:50]}...")
                    # statements_executed += 1  # 건너뜀
                
                else:
                    logger.warning(f"지원되지 않는 SQL 문: {statement[:50]}...")
            
            except Exception as e:
                logger.error(f"SQL 문 실행 중 오류 발생: {e}")
                logger.error(f"문제의 SQL 문: {statement}")
        
        logger.info(f"총 {statements_executed}개의 SQL 문이 성공적으로 실행되었습니다.")
        
        # 사용자 인증 수정 스크립트 실행
        logger.info("사용자 인증 관련 수정 실행...")
        from fix_user_auth import check_and_fix_user_auth
        check_and_fix_user_auth()
        
        return True
    
    except Exception as e:
        logger.error(f"데이터베이스 마이그레이션 중 오류 발생: {e}")
        return False
    
    finally:
        logger.info("데이터베이스 마이그레이션 스크립트 실행 완료.")

if __name__ == "__main__":
    success = run_migration()
    logger.info(f"마이그레이션 결과: {'성공' if success else '실패'}")
    
    if success:
        logger.info("애플리케이션을 재시작하여 변경사항을 적용하세요.")
    else:
        logger.error("마이그레이션에 실패했습니다. 로그를 확인하고 문제를 해결하세요.") 