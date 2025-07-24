from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CategoryBase(BaseModel):
    """카테고리 기본 스키마"""
    name: str = Field(..., min_length=1, max_length=100, description="카테고리명")
    code: Optional[str] = Field(None, max_length=20, description="카테고리 코드")
    description: Optional[str] = Field(None, max_length=500, description="카테고리 설명")
    parent_id: Optional[int] = Field(None, description="상위 카테고리 ID")
    is_active: bool = Field(True, description="활성 상태")


class CategoryCreate(CategoryBase):
    """카테고리 생성 스키마"""
    pass


class CategoryUpdate(BaseModel):
    """카테고리 업데이트 스키마"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="카테고리명")
    code: Optional[str] = Field(None, max_length=20, description="카테고리 코드")
    description: Optional[str] = Field(None, max_length=500, description="카테고리 설명")
    parent_id: Optional[int] = Field(None, description="상위 카테고리 ID")
    is_active: Optional[bool] = Field(None, description="활성 상태")


class CategoryResponse(CategoryBase):
    """카테고리 응답 스키마"""
    id: int = Field(..., description="카테고리 ID")
    created_at: datetime = Field(..., description="생성 시간")
    updated_at: datetime = Field(..., description="업데이트 시간")
    
    # 관계 필드
    children: Optional[List['CategoryResponse']] = Field(None, description="하위 카테고리 목록")
    
    class Config:
        from_attributes = True


# 순환 참조 해결을 위한 모델 업데이트
CategoryResponse.model_rebuild()