"""
사용자 인증 관련 문제 해결 스크립트
"""
import os
import sys
import yaml
import bcrypt
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

# Supabase 클라이언트 가져오기
from database.supabase_client import supabase

def check_and_fix_user_auth():
    """
    사용자 인증 관련 문제 확인 및 해결
    """
    logger.info("사용자 인증 관련 문제 확인 및 해결 시작...")
    
    # 1. 기본 관리자 계정 확인 및 생성
    try:
        admin_email = os.getenv("SYSTEM_ADMIN_EMAIL")
        admin_password = os.getenv("SYSTEM_ADMIN_PASSWORD")
        
        if not admin_email or not admin_password:
            logger.error("환경 변수에 관리자 계정 정보가 없습니다.")
            admin_email = "admin@example.com"
            admin_password = "admin123"
            logger.warning(f"기본 관리자 계정을 사용합니다: {admin_email}")
        
        # Supabase에서 관리자 계정 확인
        response = supabase(True).from_('users').select('*').eq('email', admin_email).execute()
        
        if not response.data:
            logger.info(f"관리자 계정({admin_email})이 존재하지 않습니다. 생성합니다.")
            
            # 비밀번호 해시 생성
            password_hash = bcrypt.hashpw(admin_password.encode(), bcrypt.gensalt()).decode()
            
            # 관리자 계정 생성
            new_admin = {
                'email': admin_email,
                'username': admin_email.split('@')[0],
                'password_hash': password_hash,
                'full_name': '시스템 관리자',
                'role': 'admin',
                'status': 'active',
                'department': '통합 관리'
            }
            
            # Supabase에 관리자 계정 추가
            response = supabase(True).from_('users').insert(new_admin).execute()
            
            if response.data:
                logger.info("관리자 계정이 성공적으로 생성되었습니다.")
            else:
                logger.error("관리자 계정 생성에 실패했습니다.")
        else:
            logger.info(f"관리자 계정({admin_email})이 이미 존재합니다.")
    
    except Exception as e:
        logger.error(f"관리자 계정 확인 중 오류 발생: {e}")
    
    # 2. auth.yaml 파일 확인 및 업데이트
    try:
        # config 폴더 생성 (없는 경우)
        os.makedirs('config', exist_ok=True)
        
        # auth.yaml 파일이 있는지 확인
        yaml_path = 'config/auth.yaml'
        if os.path.exists(yaml_path):
            logger.info("auth.yaml 파일이 존재합니다. 내용을 확인합니다.")
            
            # 파일 내용 로드
            with open(yaml_path, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)
            
            # 내용 검증
            if not config or 'credentials' not in config or 'usernames' not in config['credentials']:
                logger.warning("auth.yaml 파일의 형식이 올바르지 않습니다. 파일을 재생성합니다.")
                config = None
        else:
            logger.info("auth.yaml 파일이 존재하지 않습니다. 새로 생성합니다.")
            config = None
        
        # 설정 파일이 없거나 유효하지 않은 경우 새로 생성
        if config is None:
            # Supabase에서 사용자 목록 가져오기
            response = supabase(True).from_('users').select('*').execute()
            users = response.data
            
            if not users:
                logger.warning("사용자 정보를 가져올 수 없습니다.")
                # 기본 사용자 데이터 생성
                config = {
                    'credentials': {
                        'usernames': {
                            'admin': {
                                'email': admin_email,
                                'name': '관리자',
                                'password': bcrypt.hashpw('admin123'.encode(), bcrypt.gensalt()).decode(),
                                'role': 'admin'
                            }
                        }
                    },
                    'cookie': {
                        'expiry_days': 30,
                        'key': 'mtinventory_auth',
                        'name': 'mtinventory_auth'
                    }
                }
            else:
                # 사용자 정보로 설정 파일 생성
                usernames = {}
                for user in users:
                    username = user.get('username') or user.get('email', '').split('@')[0]
                    usernames[username] = {
                        'email': user.get('email', ''),
                        'name': user.get('full_name', username),
                        'password': user.get('password_hash', bcrypt.hashpw('changeme'.encode(), bcrypt.gensalt()).decode()),
                        'role': user.get('role', 'user')
                    }
                
                config = {
                    'credentials': {
                        'usernames': usernames
                    },
                    'cookie': {
                        'expiry_days': 30,
                        'key': 'mtinventory_auth',
                        'name': 'mtinventory_auth'
                    }
                }
            
            # 설정 파일 저장
            with open(yaml_path, 'w', encoding='utf-8') as f:
                yaml.dump(config, f, default_flow_style=False)
            
            logger.info("auth.yaml 파일이 성공적으로 생성되었습니다.")
    
    except Exception as e:
        logger.error(f"auth.yaml 파일 처리 중 오류 발생: {e}")
    
    # 3. Supabase RLS 정책 확인
    try:
        # 여기서는 데이터베이스 연결 확인만 수행합니다.
        # 실제 RLS 정책 적용은 db_update.sql을 실행해야 합니다.
        logger.info("Supabase 데이터베이스 연결 확인 중...")
        
        response = supabase(True).from_('users').select('count', count='exact').limit(1).execute()
        user_count = response.count
        
        logger.info(f"데이터베이스 연결 성공. 사용자 수: {user_count}")
        
        logger.info("데이터베이스 연결이 정상적으로 확인되었습니다.")
        logger.info("RLS 정책을 업데이트하려면 database/db_update.sql 스크립트를 실행하세요.")
    
    except Exception as e:
        logger.error(f"데이터베이스 확인 중 오류 발생: {e}")
    
    logger.info("사용자 인증 관련 문제 확인 및 해결 완료.")
    logger.info("애플리케이션 실행 전 README.md 파일을 확인하여 추가 설정 방법을 참고하세요.")

if __name__ == "__main__":
    check_and_fix_user_auth() 