from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# 데이터베이스 및 라우터 임포트
from .database import engine, Base
from .routers import (
    auth, users, departments, categories, suppliers, 
    parts, inventory, inbound, outbound, part_price, permissions
)
from .middleware.auth import get_current_user

# 데이터베이스 테이블 생성
@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 시작 시 데이터베이스 테이블 생성"""
    Base.metadata.create_all(bind=engine)
    yield

# FastAPI 애플리케이션 생성
app = FastAPI(
    title="MT Inventory Management System",
    description="재고 관리 시스템 API",
    version="2.0.0",
    lifespan=lifespan
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://localhost:3005",
        "http://localhost:3006",
        "http://localhost:3007",
        "http://localhost:3008",
        "http://localhost:3009",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
        "http://127.0.0.1:3004",
        "http://127.0.0.1:3005",
        "http://127.0.0.1:3006",
        "http://127.0.0.1:3007",
        "http://127.0.0.1:3008",
        "http://127.0.0.1:3009",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 보안 스키마
security = HTTPBearer()

# 라우터 등록
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(departments.router, prefix="/api/departments", tags=["departments"])
app.include_router(categories.router, prefix="/api/categories", tags=["categories"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["suppliers"])
app.include_router(parts.router, prefix="/api/parts", tags=["parts"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["inventory"])
app.include_router(inbound.router, prefix="/api/inbound", tags=["inbound"])
app.include_router(outbound.router, prefix="/api/outbound", tags=["outbound"])
app.include_router(part_price.router, prefix="/api/part-prices", tags=["part-prices"])
app.include_router(permissions.router, prefix="/api/permissions", tags=["permissions"])

# 루트 엔드포인트
@app.get("/")
async def root():
    """API 루트 엔드포인트"""
    return {
        "message": "MT Inventory Management System API",
        "version": "2.0.0",
        "status": "running"
    }

# 헬스 체크 엔드포인트
@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    return {
        "status": "healthy",
        "message": "API is running properly"
    }

# 보호된 엔드포인트 예시
@app.get("/api/protected")
async def protected_route(current_user = Depends(get_current_user)):
    """보호된 라우트 예시"""
    return {
        "message": "This is a protected route",
        "user": current_user.username
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )