from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from decimal import Decimal


class SupplierBase(BaseModel):
    """공급업체 기본 스키마"""
    name: str = Field(..., min_length=1, max_length=200, description="공급업체명")
    code: Optional[str] = Field(None, max_length=20, description="공급업체 코드")
    contact_person: Optional[str] = Field(None, max_length=100, description="담당자명")
    email: Optional[EmailStr] = Field(None, description="이메일")
    phone: Optional[str] = Field(None, max_length=20, description="전화번호")
    fax: Optional[str] = Field(None, max_length=20, description="팩스번호")
    website: Optional[str] = Field(None, max_length=200, description="웹사이트")
    address: Optional[str] = Field(None, max_length=500, description="주소")
    city: Optional[str] = Field(None, max_length=100, description="도시")
    state: Optional[str] = Field(None, max_length=100, description="주/도")
    postal_code: Optional[str] = Field(None, max_length=20, description="우편번호")
    country: Optional[str] = Field(None, max_length=100, description="국가")
    tax_id: Optional[str] = Field(None, max_length=50, description="세금 ID")
    business_registration: Optional[str] = Field(None, max_length=50, description="사업자 등록번호")
    payment_terms: Optional[str] = Field(None, max_length=100, description="결제 조건")
    credit_limit: Optional[Decimal] = Field(None, ge=0, description="신용 한도")
    currency: Optional[str] = Field(None, max_length=3, description="통화")
    lead_time_days: Optional[int] = Field(None, ge=0, description="리드 타임(일)")
    quality_rating: Optional[int] = Field(None, ge=1, le=10, description="품질 평점(1-10)")
    delivery_rating: Optional[int] = Field(None, ge=1, le=10, description="배송 평점(1-10)")
    price_rating: Optional[int] = Field(None, ge=1, le=10, description="가격 평점(1-10)")
    notes: Optional[str] = Field(None, max_length=1000, description="메모")
    is_active: bool = Field(True, description="활성 상태")


class SupplierCreate(SupplierBase):
    """공급업체 생성 스키마"""
    pass


class SupplierUpdate(BaseModel):
    """공급업체 업데이트 스키마"""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="공급업체명")
    code: Optional[str] = Field(None, max_length=20, description="공급업체 코드")
    contact_person: Optional[str] = Field(None, max_length=100, description="담당자명")
    email: Optional[EmailStr] = Field(None, description="이메일")
    phone: Optional[str] = Field(None, max_length=20, description="전화번호")
    fax: Optional[str] = Field(None, max_length=20, description="팩스번호")
    website: Optional[str] = Field(None, max_length=200, description="웹사이트")
    address: Optional[str] = Field(None, max_length=500, description="주소")
    city: Optional[str] = Field(None, max_length=100, description="도시")
    state: Optional[str] = Field(None, max_length=100, description="주/도")
    postal_code: Optional[str] = Field(None, max_length=20, description="우편번호")
    country: Optional[str] = Field(None, max_length=100, description="국가")
    tax_id: Optional[str] = Field(None, max_length=50, description="세금 ID")
    business_registration: Optional[str] = Field(None, max_length=50, description="사업자 등록번호")
    payment_terms: Optional[str] = Field(None, max_length=100, description="결제 조건")
    credit_limit: Optional[Decimal] = Field(None, ge=0, description="신용 한도")
    currency: Optional[str] = Field(None, max_length=3, description="통화")
    lead_time_days: Optional[int] = Field(None, ge=0, description="리드 타임(일)")
    quality_rating: Optional[int] = Field(None, ge=1, le=10, description="품질 평점(1-10)")
    delivery_rating: Optional[int] = Field(None, ge=1, le=10, description="배송 평점(1-10)")
    price_rating: Optional[int] = Field(None, ge=1, le=10, description="가격 평점(1-10)")
    notes: Optional[str] = Field(None, max_length=1000, description="메모")
    is_active: Optional[bool] = Field(None, description="활성 상태")


class SupplierResponse(SupplierBase):
    """공급업체 응답 스키마"""
    id: int = Field(..., description="공급업체 ID")
    created_at: datetime = Field(..., description="생성 시간")
    updated_at: datetime = Field(..., description="업데이트 시간")
    
    class Config:
        from_attributes = True