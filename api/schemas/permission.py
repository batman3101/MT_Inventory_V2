from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PermissionBase(BaseModel):
    """권한 기본 스키마"""
    name: str = Field(..., min_length=1, max_length=100, description="권한명")
    code: str = Field(..., min_length=1, max_length=50, description="권한 코드")
    description: Optional[str] = Field(None, max_length=500, description="권한 설명")
    module: Optional[str] = Field(None, max_length=50, description="모듈")
    action: Optional[str] = Field(None, max_length=50, description="액션")
    resource: Optional[str] = Field(None, max_length=50, description="리소스")
    is_active: bool = Field(True, description="활성 상태")


class PermissionCreate(PermissionBase):
    """권한 생성 스키마"""
    pass


class PermissionUpdate(BaseModel):
    """권한 업데이트 스키마"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="권한명")
    code: Optional[str] = Field(None, min_length=1, max_length=50, description="권한 코드")
    description: Optional[str] = Field(None, max_length=500, description="권한 설명")
    module: Optional[str] = Field(None, max_length=50, description="모듈")
    action: Optional[str] = Field(None, max_length=50, description="액션")
    resource: Optional[str] = Field(None, max_length=50, description="리소스")
    is_active: Optional[bool] = Field(None, description="활성 상태")


class PermissionResponse(PermissionBase):
    """권한 응답 스키마"""
    id: int = Field(..., description="권한 ID")
    created_at: datetime = Field(..., description="생성 시간")
    updated_at: datetime = Field(..., description="업데이트 시간")
    
    class Config:
        from_attributes = True


class RolePermissionBase(BaseModel):
    """역할 권한 기본 스키마"""
    role: str = Field(..., min_length=1, max_length=50, description="역할")
    permission_id: int = Field(..., description="권한 ID")
    granted: bool = Field(True, description="부여 여부")
    granted_by: Optional[str] = Field(None, max_length=100, description="부여한 사람")
    granted_at: Optional[datetime] = Field(None, description="부여일")
    notes: Optional[str] = Field(None, max_length=500, description="노트")


class RolePermissionCreate(RolePermissionBase):
    """역할 권한 생성 스키마"""
    pass


class RolePermissionUpdate(BaseModel):
    """역할 권한 업데이트 스키마"""
    role: Optional[str] = Field(None, min_length=1, max_length=50, description="역할")
    permission_id: Optional[int] = Field(None, description="권한 ID")
    granted: Optional[bool] = Field(None, description="부여 여부")
    granted_by: Optional[str] = Field(None, max_length=100, description="부여한 사람")
    granted_at: Optional[datetime] = Field(None, description="부여일")
    notes: Optional[str] = Field(None, max_length=500, description="노트")


class RolePermissionResponse(RolePermissionBase):
    """역할 권한 응답 스키마"""
    id: int = Field(..., description="역할 권한 ID")
    created_at: datetime = Field(..., description="생성 시간")
    updated_at: datetime = Field(..., description="업데이트 시간")
    
    class Config:
        from_attributes = True