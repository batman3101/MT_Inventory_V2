"""
권한 관리 시스템 테스트 스크립트
MT_Inventory 시스템
"""
import sys
import os
from datetime import datetime

# 모듈 경로 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.supabase_client import supabase
from utils.permission_manager import permission_manager

def test_permission_system():
    """권한 관리 시스템 종합 테스트"""
    print("=" * 60)
    print("🔐 권한 관리 시스템 테스트")
    print(f"⏰ 테스트 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    try:
        # 1. 데이터베이스 연결 테스트
        print("\n1️⃣ 데이터베이스 연결 테스트")
        client = supabase()
        users_result = client.from_('users').select('count').execute()
        print("   ✅ 데이터베이스 연결 성공")
        
        # 2. 권한 테이블 확인
        print("\n2️⃣ 권한 테이블 확인")
        permissions = permission_manager.get_all_permissions()
        print(f"   📋 총 권한 수: {len(permissions)}")
        for perm in permissions[:5]:  # 처음 5개만 표시
            print(f"      - {perm['permission_name']}: {perm['description']}")
        if len(permissions) > 5:
            print(f"      ... 및 {len(permissions) - 5}개 추가 권한")
        
        # 3. 사용자 목록 확인
        print("\n3️⃣ 사용자 목록 확인")
        users = permission_manager.get_all_users()
        print(f"   👥 총 사용자 수: {len(users)}")
        
        # 시스템 관리자 확인
        system_admins = [u for u in users if u['role'] == 'system_admin']
        print(f"   🔑 시스템 관리자 수: {len(system_admins)}")
        for admin in system_admins:
            print(f"      - {admin['username']} ({admin['email']})")
        
        # 4. 권한 관리 기능 테스트 (시스템 관리자가 있는 경우)
        if system_admins:
            print("\n4️⃣ 권한 관리 기능 테스트")
            test_admin = system_admins[0]
            
            # 권한 조회 테스트
            user_perms = permission_manager.get_user_permissions(test_admin['user_id'])
            print(f"   👤 테스트 사용자: {test_admin['username']}")
            print(f"   🏷️ 역할 기반 권한: {len(user_perms['role_permissions'])}")
            print(f"   👤 개별 권한: {len(user_perms['individual_permissions'])}")
            
            # 유효한 권한 목록
            effective_perms = permission_manager.get_user_effective_permissions_list(test_admin['user_id'])
            print(f"   🎯 유효한 권한 총 {len(effective_perms)}개")
        
        # 5. 페이지 파일 확인
        print("\n5️⃣ 권한 관리 페이지 확인")
        permission_page_path = "pages/permission_management.py"
        if os.path.exists(permission_page_path):
            print(f"   ✅ 권한 관리 페이지 존재: {permission_page_path}")
        else:
            print(f"   ❌ 권한 관리 페이지 없음: {permission_page_path}")
        
        # 6. 테스트 결과 요약
        print("\n" + "=" * 60)
        print("📊 테스트 결과 요약")
        print("=" * 60)
        print(f"✅ 데이터베이스 연결: 성공")
        print(f"✅ 권한 시스템: {len(permissions)}개 권한 로드됨")
        print(f"✅ 사용자 관리: {len(users)}명 사용자 등록됨")
        print(f"✅ 시스템 관리자: {len(system_admins)}명 확인됨")
        print(f"✅ 권한 관리 페이지: {'존재' if os.path.exists(permission_page_path) else '없음'}")
        
        print("\n🎉 권한 관리 시스템 테스트 완료!")
        print("\n📝 다음 단계:")
        print("   1. 웹 브라우저에서 http://localhost:8501 접속")
        print("   2. 시스템 관리자 계정으로 로그인")
        print("   3. 사이드바에서 '권한 관리' 페이지 선택")
        print("   4. 사용자별 권한 설정 테스트")
        
        return True
        
    except Exception as e:
        print(f"\n❌ 테스트 중 오류 발생: {e}")
        print("\n🔧 문제 해결 방법:")
        print("   1. .env 파일의 Supabase 설정 확인")
        print("   2. 데이터베이스 연결 상태 확인")
        print("   3. 권한 스키마 적용 여부 확인")
        return False

def show_access_instructions():
    """접근 방법 안내"""
    print("\n" + "=" * 60)
    print("📖 권한 관리 시스템 사용 방법")
    print("=" * 60)
    print("\n🔐 시스템 관리자 로그인:")
    print("   - 사용자명: zetooo1972")
    print("   - 비밀번호: [환경변수에서 설정된 비밀번호]")
    
    print("\n🏭 MT_Inventory 메인 앱:")
    print("   - URL: http://localhost:8501")
    print("   - 사이드바 → '권한 관리' 선택")
    
    print("\n📋 권한 관리 기능:")
    print("   1. 사용자별 권한 관리")
    print("      - 개별 권한 부여/취소")
    print("      - 권한 만료일 설정")
    print("      - 권한 부여/취소 사유 기록")
    
    print("\n   2. 권한 변경 이력")
    print("      - 모든 권한 변경 기록 조회")
    print("      - 사용자별 필터링")
    print("      - 변경 통계 확인")
    
    print("\n   3. 시스템 설정")
    print("      - 시스템 정보 확인")
    print("      - 권한 목록 관리")
    print("      - 스키마 업데이트")

if __name__ == "__main__":
    success = test_permission_system()
    show_access_instructions()
    
    if success:
        print("\n🎯 권한 관리 시스템이 정상적으로 구축되었습니다!")
    else:
        print("\n⚠️ 권한 관리 시스템에 문제가 있습니다. 로그를 확인해주세요.") 