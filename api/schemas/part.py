from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal


class PartBase(BaseModel):
    """부품 기본 스키마"""
    part_number: str = Field(..., min_length=1, max_length=100, description="부품 번호")
    name: str = Field(..., min_length=1, max_length=200, description="부품명")
    description: Optional[str] = Field(None, max_length=1000, description="부품 설명")
    category_id: Optional[int] = Field(None, description="카테고리 ID")
    unit: str = Field(..., max_length=20, description="단위")
    unit_price: Optional[Decimal] = Field(None, ge=0, description="단가")
    min_stock: Optional[int] = Field(None, ge=0, description="최소 재고")
    max_stock: Optional[int] = Field(None, ge=0, description="최대 재고")
    reorder_point: Optional[int] = Field(None, ge=0, description="재주문 지점")
    location: Optional[str] = Field(None, max_length=100, description="위치")
    barcode: Optional[str] = Field(None, max_length=100, description="바코드")
    manufacturer: Optional[str] = Field(None, max_length=100, description="제조업체")
    model_number: Optional[str] = Field(None, max_length=100, description="모델 번호")
    specifications: Optional[str] = Field(None, max_length=1000, description="사양")
    weight: Optional[Decimal] = Field(None, ge=0, description="무게")
    dimensions: Optional[str] = Field(None, max_length=100, description="치수")
    material: Optional[str] = Field(None, max_length=100, description="재료")
    color: Optional[str] = Field(None, max_length=50, description="색상")
    warranty_period: Optional[int] = Field(None, ge=0, description="보증 기간(일)")
    safety_stock: Optional[int] = Field(None, ge=0, description="안전 재고")
    lead_time: Optional[int] = Field(None, ge=0, description="리드 타임(일)")
    is_active: bool = Field(True, description="활성 상태")


class PartCreate(PartBase):
    """부품 생성 스키마"""
    pass


class PartUpdate(BaseModel):
    """부품 업데이트 스키마"""
    part_number: Optional[str] = Field(None, min_length=1, max_length=100, description="부품 번호")
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="부품명")
    description: Optional[str] = Field(None, max_length=1000, description="부품 설명")
    category_id: Optional[int] = Field(None, description="카테고리 ID")
    unit: Optional[str] = Field(None, max_length=20, description="단위")
    unit_price: Optional[Decimal] = Field(None, ge=0, description="단가")
    min_stock: Optional[int] = Field(None, ge=0, description="최소 재고")
    max_stock: Optional[int] = Field(None, ge=0, description="최대 재고")
    reorder_point: Optional[int] = Field(None, ge=0, description="재주문 지점")
    location: Optional[str] = Field(None, max_length=100, description="위치")
    barcode: Optional[str] = Field(None, max_length=100, description="바코드")
    manufacturer: Optional[str] = Field(None, max_length=100, description="제조업체")
    model_number: Optional[str] = Field(None, max_length=100, description="모델 번호")
    specifications: Optional[str] = Field(None, max_length=1000, description="사양")
    weight: Optional[Decimal] = Field(None, ge=0, description="무게")
    dimensions: Optional[str] = Field(None, max_length=100, description="치수")
    material: Optional[str] = Field(None, max_length=100, description="재료")
    color: Optional[str] = Field(None, max_length=50, description="색상")
    warranty_period: Optional[int] = Field(None, ge=0, description="보증 기간(일)")
    safety_stock: Optional[int] = Field(None, ge=0, description="안전 재고")
    lead_time: Optional[int] = Field(None, ge=0, description="리드 타임(일)")
    is_active: Optional[bool] = Field(None, description="활성 상태")


class PartResponse(PartBase):
    """부품 응답 스키마"""
    id: int = Field(..., description="부품 ID")
    created_at: datetime = Field(..., description="생성 시간")
    updated_at: datetime = Field(..., description="업데이트 시간")
    
    class Config:
        from_attributes = True