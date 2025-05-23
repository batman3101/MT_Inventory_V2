"""
사용자 역할을 system_admin으로 업데이트
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

def update_user_to_system_admin():
    """사용자 역할을 system_admin으로 업데이트"""
    try:
        # 현재 등록된 모든 사용자 조회
        response = supabase(True).from_('users').select('*').execute()
        
        print("=== 현재 등록된 사용자 목록 ===")
        for user in response.data:
            print(f"사용자명: {user['username']}")
            print(f"이메일: {user['email']}")
            print(f"현재 역할: {user['role']}")
            print("---")
        
        # 시스템 관리자 계정 찾기 또는 업데이트
        admin_email = os.getenv("SYSTEM_ADMIN_EMAIL", "zetooo1972@gmail.com")
        
        print(f"\n시스템 관리자 이메일로 사용자 찾기: {admin_email}")
        
        # 해당 이메일의 사용자 찾기
        user_response = supabase(True).from_('users').select('*').eq('email', admin_email).execute()
        
        if user_response.data:
            user = user_response.data[0]
            current_role = user['role']
            
            print(f"사용자 발견: {user['username']} ({user['email']})")
            print(f"현재 역할: {current_role}")
            
            if current_role != 'system_admin':
                print("역할을 system_admin으로 업데이트 중...")
                
                # 역할 업데이트
                update_response = supabase(True).from_('users').update({
                    'role': 'system_admin'
                }).eq('user_id', user['user_id']).execute()
                
                if update_response.data:
                    print("✅ 역할이 성공적으로 system_admin으로 업데이트되었습니다!")
                else:
                    print("❌ 역할 업데이트에 실패했습니다.")
            else:
                print("✅ 이미 system_admin 역할입니다.")
        else:
            print(f"❌ 이메일 {admin_email}에 해당하는 사용자를 찾을 수 없습니다.")
            
            # 모든 사용자를 다시 확인
            print("\n=== 다른 사용자들 중에서 시스템 관리자로 설정할 사용자를 선택하세요 ===")
            for i, user in enumerate(response.data):
                print(f"{i+1}. {user['username']} ({user['email']}) - 현재 역할: {user['role']}")
            
            try:
                choice = int(input("번호를 선택하세요 (1부터 시작): ")) - 1
                if 0 <= choice < len(response.data):
                    selected_user = response.data[choice]
                    
                    # 선택된 사용자를 system_admin으로 업데이트
                    update_response = supabase(True).from_('users').update({
                        'role': 'system_admin'
                    }).eq('user_id', selected_user['user_id']).execute()
                    
                    if update_response.data:
                        print(f"✅ {selected_user['username']}의 역할이 system_admin으로 업데이트되었습니다!")
                    else:
                        print("❌ 역할 업데이트에 실패했습니다.")
                else:
                    print("❌ 잘못된 선택입니다.")
            except (ValueError, KeyboardInterrupt):
                print("❌ 업데이트가 취소되었습니다.")
        
    except Exception as e:
        logger.error(f"사용자 역할 업데이트 중 오류 발생: {e}")

if __name__ == "__main__":
    update_user_to_system_admin() 