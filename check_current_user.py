"""
현재 로그인한 사용자 정보 확인
"""
import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# Supabase 클라이언트 설정
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def check_all_users():
    """모든 사용자 조회"""
    try:
        response = supabase.table('users').select('*').execute()
        
        print("=== 전체 사용자 목록 ===")
        for user in response.data:
            print(f"사용자명: {user['username']}")
            print(f"이메일: {user['email']}")
            print(f"역할: {user['role']}")
            print(f"활성: {user['is_active']}")
            print("---")
            
    except Exception as e:
        print(f"사용자 조회 오류: {e}")

if __name__ == "__main__":
    check_all_users() 