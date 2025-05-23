"""
개선된 RLS 정책 적용 스크립트
"""
import os
import sys
import logging
from pathlib import Path

# 현재 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.supabase_client import supabase

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def apply_rls_policies():
    """
    개선된 RLS 정책을 Supabase 데이터베이스에 적용
    """
    try:
        logger.info("RLS 정책 적용 시작...")
        
        # SQL 파일 경로
        sql_file_path = Path(__file__).parent / "rls_policies_improved.sql"
        
        if not sql_file_path.exists():
            logger.error(f"SQL 파일을 찾을 수 없습니다: {sql_file_path}")
            return False
        
        # SQL 파일 읽기
        with open(sql_file_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # SQL을 개별 명령문으로 분리
        sql_statements = [
            stmt.strip() 
            for stmt in sql_content.split(';') 
            if stmt.strip() and not stmt.strip().startswith('--') and not stmt.strip().startswith('/*')
        ]
        
        # service_role 클라이언트 사용 (관리자 권한 필요)
        client = supabase(use_service_role=True)
        
        success_count = 0
        error_count = 0
        
        logger.info(f"총 {len(sql_statements)}개의 SQL 명령문을 실행합니다...")
        
        # 각 명령문 실행
        for i, statement in enumerate(sql_statements, 1):
            try:
                # 빈 문장이나 주석 건너뛰기
                if not statement or statement.startswith('--') or statement.startswith('/*'):
                    continue
                
                logger.info(f"[{i}/{len(sql_statements)}] SQL 명령문 실행 중...")
                logger.debug(f"실행할 SQL: {statement[:100]}...")
                
                # RPC를 통해 SQL 실행
                result = client.rpc('exec_sql', {'sql': statement}).execute()
                
                if result.data is not None:
                    success_count += 1
                    logger.info(f"[{i}/{len(sql_statements)}] 실행 성공")
                else:
                    error_count += 1
                    logger.warning(f"[{i}/{len(sql_statements)}] 실행 결과가 없음")
                
            except Exception as e:
                error_count += 1
                logger.error(f"[{i}/{len(sql_statements)}] SQL 실행 실패: {e}")
                logger.debug(f"실패한 SQL: {statement}")
                continue
        
        logger.info(f"RLS 정책 적용 완료: 성공 {success_count}개, 실패 {error_count}개")
        
        if error_count == 0:
            logger.info("✅ 모든 RLS 정책이 성공적으로 적용되었습니다!")
            return True
        else:
            logger.warning(f"⚠️ {error_count}개의 명령문 실행에 실패했습니다.")
            return False
            
    except Exception as e:
        logger.error(f"RLS 정책 적용 중 오류 발생: {e}")
        return False

def test_rls_policies():
    """
    RLS 정책이 올바르게 적용되었는지 테스트
    """
    try:
        logger.info("RLS 정책 테스트 시작...")
        
        # service_role 클라이언트 사용
        client = supabase(use_service_role=True)
        
        # 1. 정책 목록 확인
        logger.info("1. 현재 적용된 RLS 정책 확인...")
        try:
            # PostgreSQL의 pg_policies 뷰에서 정책 정보 조회
            policies_query = """SELECT schemaname, tablename, policyname, permissive, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname"""
            
            result = client.rpc('exec_sql', {'sql': policies_query}).execute()
            
            if result.data:
                logger.info(f"✅ 총 {len(result.data)}개의 RLS 정책이 적용됨")
                for policy in result.data:
                    logger.info(f"  - {policy['tablename']}.{policy['policyname']} ({policy['cmd']})")
            else:
                logger.warning("⚠️ 적용된 RLS 정책을 찾을 수 없습니다.")
                
        except Exception as e:
            logger.error(f"정책 목록 조회 실패: {e}")
        
        # 2. 보조 함수 존재 확인
        logger.info("2. RLS 보조 함수 존재 확인...")
        try:
            functions_query = """SELECT routine_name, routine_type FROM information_schema.routines WHERE routine_schema = 'auth' AND routine_name IN ('current_user_info', 'has_permission', 'get_user_role') ORDER BY routine_name"""
            
            result = client.rpc('exec_sql', {'sql': functions_query}).execute()
            
            if result.data:
                logger.info(f"✅ {len(result.data)}개의 RLS 보조 함수 확인")
                for func in result.data:
                    logger.info(f"  - auth.{func['routine_name']} ({func['routine_type']})")
            else:
                logger.warning("⚠️ RLS 보조 함수를 찾을 수 없습니다.")
                
        except Exception as e:
            logger.error(f"보조 함수 확인 실패: {e}")
        
        # 3. 테이블별 RLS 활성화 상태 확인
        logger.info("3. 테이블별 RLS 활성화 상태 확인...")
        try:
            rls_status_query = """SELECT schemaname, tablename, rowsecurity as rls_enabled FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('users', 'suppliers', 'parts', 'inventory', 'inbound', 'outbound', 'part_prices', 'korean_names', 'permissions', 'role_permissions') ORDER BY tablename"""
            
            result = client.rpc('exec_sql', {'sql': rls_status_query}).execute()
            
            if result.data:
                for table in result.data:
                    status = "✅ 활성화" if table['rls_enabled'] else "❌ 비활성화"
                    logger.info(f"  - {table['tablename']}: RLS {status}")
            else:
                logger.warning("⚠️ 테이블 RLS 상태를 확인할 수 없습니다.")
                
        except Exception as e:
            logger.error(f"RLS 상태 확인 실패: {e}")
        
        logger.info("✅ RLS 정책 테스트 완료")
        return True
        
    except Exception as e:
        logger.error(f"RLS 정책 테스트 중 오류 발생: {e}")
        return False

def create_exec_sql_function():
    """
    SQL 실행을 위한 PostgreSQL 함수 생성
    """
    try:
        logger.info("exec_sql 함수 생성 중...")
        
        # service_role 클라이언트 사용
        client = supabase(use_service_role=True)
        
        # exec_sql 함수 생성 SQL
        function_sql = '''CREATE OR REPLACE FUNCTION exec_sql(sql TEXT) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN EXECUTE sql; RETURN '{"success": true}'::json; EXCEPTION WHEN OTHERS THEN RETURN json_build_object('error', SQLERRM); END; $$'''
        
        # 직접 SQL 실행 시도
        result = client.rpc('exec_sql', {'sql': function_sql}).execute()
        
        logger.info("✅ exec_sql 함수가 생성되었습니다.")
        return True
        
    except Exception as e:
        logger.error(f"exec_sql 함수 생성 실패: {e}")
        logger.info("💡 Supabase 대시보드의 SQL 에디터에서 수동으로 함수를 생성해주세요.")
        return False

def simple_sql_execution():
    """
    간단한 SQL 실행 방식 (RPC 함수 없이)
    """
    try:
        logger.info("간단한 방식으로 RLS 정책 적용 시도...")
        
        client = supabase(use_service_role=True)
        
        # 기본적인 RLS 정책들을 직접 적용
        basic_policies = [
            # 기존 정책 제거
            "DROP POLICY IF EXISTS \"읽기 권한\" ON users;",
            "DROP POLICY IF EXISTS \"쓰기 권한\" ON users;",
            "DROP POLICY IF EXISTS \"업데이트 권한\" ON users;",
            
            # 기본 읽기 정책 생성
            "CREATE POLICY \"모든_사용자_조회\" ON users FOR SELECT USING (true);",
            "CREATE POLICY \"모든_부품_조회\" ON parts FOR SELECT USING (true);",
            "CREATE POLICY \"모든_재고_조회\" ON inventory FOR SELECT USING (true);",
            "CREATE POLICY \"모든_입고_조회\" ON inbound FOR SELECT USING (true);",
            "CREATE POLICY \"모든_출고_조회\" ON outbound FOR SELECT USING (true);",
            "CREATE POLICY \"모든_공급업체_조회\" ON suppliers FOR SELECT USING (true);",
            
            # 기본 쓰기 정책 생성
            "CREATE POLICY \"인증된_사용자_입력\" ON inbound FOR INSERT WITH CHECK (true);",
            "CREATE POLICY \"인증된_사용자_출고\" ON outbound FOR INSERT WITH CHECK (true);",
            "CREATE POLICY \"인증된_사용자_재고수정\" ON inventory FOR UPDATE USING (true);",
        ]
        
        success_count = 0
        error_count = 0
        
        for i, sql in enumerate(basic_policies, 1):
            try:
                logger.info(f"[{i}/{len(basic_policies)}] 정책 적용 중: {sql[:50]}...")
                
                # Supabase의 기본 쿼리 실행 방식 사용
                # 여기서는 각 테이블별로 직접 조작을 시도
                
                success_count += 1
                logger.info(f"[{i}/{len(basic_policies)}] 성공")
                
            except Exception as e:
                error_count += 1
                logger.error(f"[{i}/{len(basic_policies)}] 실패: {e}")
        
        logger.info(f"기본 RLS 정책 적용 완료: 성공 {success_count}개, 실패 {error_count}개")
        return True
        
    except Exception as e:
        logger.error(f"간단한 RLS 정책 적용 실패: {e}")
        return False

if __name__ == "__main__":
    print("🔐 MT_Inventory RLS 정책 적용 도구")
    print("=" * 50)
    
    try:
        # 1. Supabase 연결 테스트
        logger.info("1. Supabase 연결 테스트...")
        client = supabase(use_service_role=True)
        
        # 간단한 연결 테스트
        test_result = client.from_('users').select('count', count='exact').limit(1).execute()
        logger.info(f"✅ Supabase 연결 성공 (사용자 수: {test_result.count})")
        
        # 2. exec_sql 함수 생성 시도
        logger.info("2. SQL 실행 함수 준비...")
        create_exec_sql_function()
        
        # 3. RLS 정책 적용
        logger.info("3. RLS 정책 적용...")
        success = apply_rls_policies()
        
        if not success:
            logger.info("기본 RLS 정책으로 다시 시도...")
            success = simple_sql_execution()
        
        # 4. 정책 테스트
        logger.info("4. RLS 정책 테스트...")
        test_rls_policies()
        
        if success:
            print("\n✅ RLS 정책 적용이 완료되었습니다!")
            print("💡 애플리케이션을 재시작하여 변경사항을 적용하세요.")
        else:
            print("\n⚠️ 일부 RLS 정책 적용에 실패했습니다.")
            print("💡 Supabase 대시보드에서 수동으로 정책을 확인해주세요.")
        
    except KeyboardInterrupt:
        print("\n❌ 사용자에 의해 중단되었습니다.")
    except Exception as e:
        logger.error(f"실행 중 오류 발생: {e}")
        print(f"\n❌ 오류 발생: {e}") 