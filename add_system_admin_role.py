"""
roles 테이블에 system_admin 역할 추가
"""
import os
import sys
import logging
from dotenv import load_dotenv

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 현재 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# .env 파일 로드
load_dotenv()

# Supabase 클라이언트 가져오기
from database.supabase_client import supabase

def add_system_admin_role():
    """roles 테이블에 system_admin 역할 추가"""
    try:
        # 현재 roles 테이블 확인
        logger.info("=== 현재 roles 테이블 조회 ===")
        response = supabase(True).table('roles').select('*').execute()
        
        print("현재 역할 목록:")
        for role in response.data:
            print(f"- {role['role_name']}: {role['description']}")
        
        # system_admin 역할이 이미 있는지 확인
        existing_system_admin = None
        for role in response.data:
            if role['role_name'] == 'system_admin':
                existing_system_admin = role
                break
        
        if existing_system_admin:
            print(f"\n✅ system_admin 역할이 이미 존재합니다: {existing_system_admin}")
            return True
        
        # system_admin 역할 추가
        print("\n➕ system_admin 역할을 추가합니다...")
        new_role_data = {
            'role_name': 'system_admin',
            'description': '시스템 관리자'
        }
        
        insert_response = supabase(True).table('roles').insert(new_role_data).execute()
        
        if insert_response.data:
            print(f"✅ system_admin 역할이 성공적으로 추가되었습니다: {insert_response.data[0]}")
            
            # 추가 후 전체 역할 목록 다시 조회
            print("\n=== 업데이트된 roles 테이블 ===")
            updated_response = supabase(True).table('roles').select('*').execute()
            for role in updated_response.data:
                print(f"- {role['role_name']}: {role['description']}")
            
            return True
        else:
            print("❌ system_admin 역할 추가에 실패했습니다.")
            return False
            
    except Exception as e:
        logger.error(f"roles 테이블 업데이트 중 오류 발생: {e}")
        return False

if __name__ == "__main__":
    success = add_system_admin_role()
    if success:
        print("\n🎉 system_admin 역할 설정이 완료되었습니다!")
    else:
        print("\n❌ system_admin 역할 설정에 실패했습니다.") 