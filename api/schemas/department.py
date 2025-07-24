from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class DepartmentBase(BaseModel):
    """부서 기본 스키마"""
    name: str = Field(..., min_length=1, max_length=100, description="부서명")
    code: Optional[str] = Field(None, max_length=20, description="부서 코드")
    description: Optional[str] = Field(None, max_length=500, description="부서 설명")
    manager_name: Optional[str] = Field(None, max_length=100, description="부서 관리자명")
    location: Optional[str] = Field(None, max_length=200, description="부서 위치")
    budget_code: Optional[str] = Field(None, max_length=50, description="예산 코드")
    is_active: bool = Field(True, description="활성 상태")


class DepartmentCreate(DepartmentBase):
    """부서 생성 스키마"""
    pass


class DepartmentUpdate(BaseModel):
    """부서 업데이트 스키마"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="부서명")
    code: Optional[str] = Field(None, max_length=20, description="부서 코드")
    description: Optional[str] = Field(None, max_length=500, description="부서 설명")
    manager_name: Optional[str] = Field(None, max_length=100, description="부서 관리자명")
    location: Optional[str] = Field(None, max_length=200, description="부서 위치")
    budget_code: Optional[str] = Field(None, max_length=50, description="예산 코드")
    is_active: Optional[bool] = Field(None, description="활성 상태")


class DepartmentResponse(DepartmentBase):
    """부서 응답 스키마"""
    id: int = Field(..., description="부서 ID")
    created_at: datetime = Field(..., description="생성 시간")
    updated_at: datetime = Field(..., description="업데이트 시간")
    
    class Config:
        from_attributes = True