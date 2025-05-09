"""
애플리케이션 설정 파일
"""
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# Supabase 설정
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# 애플리케이션 설정
APP_NAME = "설비 유지보수 부품 관리 시스템 (EqMS)"
APP_VERSION = "1.0.0"
APP_ENV = "development"

# 화면 설정
PAGE_TITLE = APP_NAME
PAGE_ICON = "🔧"

# 언어 설정
SUPPORTED_LANGUAGES = {
    "ko": "한국어",
    "en": "English",
    "vi": "Tiếng Việt"
}
DEFAULT_LANGUAGE = "ko"

# 페이지 설정
PAGES = {
    "dashboard": "대시보드",
    "parts": "부품 관리",
    "inventory": "재고 관리",
    "inbound": "입고 관리",
    "outbound": "출고 관리",
    "suppliers": "공급업체 관리",
    "reports": "보고서"
}

# 관리자용 페이지 설정
ADMIN_PAGES = {
    "admin_management": "관리자 관리",
    "user_management": "사용자 관리",
    "supabase_settings": "Supabase 설정"
}

# 데이터베이스 테이블 이름
DB_TABLES = {
    "parts": "parts",
    "suppliers": "suppliers",
    "part_prices": "part_prices",
    "inventory": "inventory",
    "inbound": "inbound",
    "outbound": "outbound",
    "users": "users",
    "permissions": "permissions",
    "role_permissions": "role_permissions",
    "korean_names": "korean_names"
} 