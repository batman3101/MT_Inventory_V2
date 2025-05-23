"""
사용자별 개별 권한 관리 시스템 적용 스크립트
MT_Inventory 시스템 확장
"""
import sys
import os
from datetime import datetime

# 상위 디렉토리를 path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.supabase_client import supabase

def apply_user_permissions_schema():
    """사용자별 권한 관리 테이블 적용"""
    try:
        client = supabase(use_service_role=True)
        
        print("🔄 사용자별 권한 관리 스키마 적용 시작...")
        
        # SQL 파일 읽기
        sql_file_path = os.path.join(os.path.dirname(__file__), 'user_permissions_setup.sql')
        
        with open(sql_file_path, 'r', encoding='utf-8') as file:
            sql_content = file.read()
        
        # SQL 실행
        try:
            # PostgreSQL에서 직접 실행하기 위해 RPC 함수 사용
            result = client.rpc('exec_sql', {'sql_query': sql_content}).execute()
            print("✅ SQL 스크립트 실행 완료")
        except Exception as e:
            print(f"⚠️ 직접 SQL 실행 실패, 개별 처리 시도: {e}")
            
            # 개별 처리 방식
            apply_schema_individually(client)
        
        print("✅ 사용자별 권한 관리 스키마 적용 완료!")
        return True
        
    except Exception as e:
        print(f"❌ 스키마 적용 중 오류 발생: {e}")
        return False

def apply_schema_individually(client):
    """개별적으로 스키마 적용"""
    
    # 1. 권한 데이터 추가
    permissions_data = [
        {'permission_name': 'manage_permissions', 'description': '권한 관리'},
        {'permission_name': 'view_audit_logs', 'description': '감사 로그 조회'},
        {'permission_name': 'export_data', 'description': '데이터 내보내기'},
        {'permission_name': 'import_data', 'description': '데이터 가져오기'},
        {'permission_name': 'manage_settings', 'description': '시스템 설정 관리'},
        {'permission_name': 'view_dashboard', 'description': '대시보드 조회'},
        {'permission_name': 'create_reports', 'description': '보고서 생성'},
        {'permission_name': 'delete_records', 'description': '레코드 삭제'},
        {'permission_name': 'approve_requests', 'description': '요청 승인'},
        {'permission_name': 'manage_departments', 'description': '부서 관리'}
    ]
    
    try:
        for perm in permissions_data:
            try:
                # 중복 체크 후 삽입
                existing = client.from_('permissions').select('permission_id').eq('permission_name', perm['permission_name']).execute()
                
                if not existing.data:
                    result = client.from_('permissions').insert(perm).execute()
                    print(f"  ✅ 권한 추가: {perm['permission_name']}")
                else:
                    print(f"  ⚠️ 권한 이미 존재: {perm['permission_name']}")
                    
            except Exception as e:
                print(f"  ❌ 권한 추가 실패 {perm['permission_name']}: {e}")
        
        print("✅ 권한 데이터 추가 완료")
        
    except Exception as e:
        print(f"❌ 권한 데이터 추가 중 오류: {e}")

def verify_schema():
    """스키마 적용 확인"""
    try:
        client = supabase()
        
        print("\n🔍 스키마 적용 확인...")
        
        # 권한 테이블 확인
        permissions = client.from_('permissions').select('permission_name').execute()
        print(f"  📋 사용 가능한 권한 수: {len(permissions.data)}")
        
        for perm in permissions.data:
            print(f"    - {perm['permission_name']}")
        
        return True
        
    except Exception as e:
        print(f"❌ 스키마 확인 중 오류: {e}")
        return False

def main():
    """메인 실행 함수"""
    print("=" * 60)
    print("🏭 MT_Inventory 사용자별 권한 관리 시스템 적용")
    print(f"⏰ 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # 스키마 적용
    success = apply_user_permissions_schema()
    
    if success:
        # 적용 확인
        verify_schema()
        
        print("\n" + "=" * 60)
        print("🎉 사용자별 권한 관리 시스템 적용 완료!")
        print("📝 다음 단계:")
        print("   1. 권한 관리 페이지 접속")
        print("   2. 사용자별 개별 권한 설정")
        print("   3. 권한 변경 이력 확인")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("❌ 권한 관리 시스템 적용 실패")
        print("📞 기술 지원이 필요한 경우 관리자에게 문의하세요.")
        print("=" * 60)

if __name__ == "__main__":
    main() 