"""
애플리케이션 설정 파일
"""
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# Supabase 설정
SUPABASE_URL = "https://yeucugpcywmtfytvtzum.supabase.co"
# anon 키 (공개 작업용)
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldWN1Z3BjeXdtdGZ5dHZ0enVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MDYxMzgsImV4cCI6MjA2MjE4MjEzOH0.S4t_MWtzTGzeKrNSfDacMlPaC45JjRw_2nWj1Eu0CCg"
# service_role 키 (관리자 작업용)
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldWN1Z3BjeXdtdGZ5dHZ0enVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjYwNjEzOCwiZXhwIjoyMDYyMTgyMTM4fQ.Pl166ZVAS6xj1joMgp33KNfRBRnutueEdd6j_kFdlfA"

# 애플리케이션 설정
APP_NAME = "설비 유지보수 부품 관리 시스템 (EqMS)"
APP_VERSION = "1.0.0"
APP_ENV = "development"

# 화면 설정
PAGE_TITLE = "MT Inventory System"
PAGE_ICON = "🏭"

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

# 테마 설정
THEME = {
    "primary": "#1E3A8A",
    "secondary": "#E6E9EF",
    "background": "#F8F9FC",
    "text": "#333333",
    "accent": "#4CAF50"
} 