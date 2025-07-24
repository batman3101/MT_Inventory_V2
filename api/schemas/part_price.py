from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


class PartPriceBase(BaseModel):
    """부품 가격 기본 스키마"""
    part_id: int = Field(..., description="부품 ID")
    price: Decimal = Field(..., gt=0, description="가격")
    currency: str = Field(..., max_length=3, description="통화")
    price_type: str = Field(..., max_length=20, description="가격 유형")
    supplier_name: Optional[str] = Field(None, max_length=200, description="공급업체명")
    quantity_break: Optional[int] = Field(None, ge=1, description="수량 할인")
    effective_from: Optional[date] = Field(None, description="유효 시작일")
    effective_until: Optional[date] = Field(None, description="유효 만료일")
    source: Optional[str] = Field(None, max_length=100, description="출처")
    reference_document: Optional[str] = Field(None, max_length=200, description="참조 문서")
    notes: Optional[str] = Field(None, max_length=500, description="노트")
    is_active: bool = Field(True, description="활성 상태")


class PartPriceCreate(PartPriceBase):
    """부품 가격 생성 스키마"""
    pass


class PartPriceUpdate(BaseModel):
    """부품 가격 업데이트 스키마"""
    part_id: Optional[int] = Field(None, description="부품 ID")
    price: Optional[Decimal] = Field(None, gt=0, description="가격")
    currency: Optional[str] = Field(None, max_length=3, description="통화")
    price_type: Optional[str] = Field(None, max_length=20, description="가격 유형")
    supplier_name: Optional[str] = Field(None, max_length=200, description="공급업체명")
    quantity_break: Optional[int] = Field(None, ge=1, description="수량 할인")
    effective_from: Optional[date] = Field(None, description="유효 시작일")
    effective_until: Optional[date] = Field(None, description="유효 만료일")
    source: Optional[str] = Field(None, max_length=100, description="출처")
    reference_document: Optional[str] = Field(None, max_length=200, description="참조 문서")
    notes: Optional[str] = Field(None, max_length=500, description="노트")
    is_active: Optional[bool] = Field(None, description="활성 상태")


class PartPriceResponse(PartPriceBase):
    """부품 가격 응답 스키마"""
    id: int = Field(..., description="가격 ID")
    is_current: bool = Field(..., description="현재 유효 여부")
    days_until_expiry: Optional[int] = Field(None, description="만료까지 남은 일수")
    created_at: datetime = Field(..., description="생성 시간")
    updated_at: datetime = Field(..., description="업데이트 시간")
    
    class Config:
        from_attributes = True