from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


class InboundBase(BaseModel):
    """입고 기본 스키마"""
    transaction_id: Optional[str] = Field(None, max_length=100, description="트랜잭션 ID")
    part_id: int = Field(..., description="부품 ID")
    supplier_id: Optional[int] = Field(None, description="공급업체 ID")
    user_id: int = Field(..., description="사용자 ID")
    quantity: int = Field(..., gt=0, description="수량")
    unit_price: Optional[Decimal] = Field(None, ge=0, description="단가")
    total_cost: Optional[Decimal] = Field(None, ge=0, description="총 비용")
    currency: Optional[str] = Field(None, max_length=3, description="통화")
    exchange_rate: Optional[Decimal] = Field(None, gt=0, description="환율")
    purchase_order_number: Optional[str] = Field(None, max_length=100, description="구매 주문 번호")
    invoice_number: Optional[str] = Field(None, max_length=100, description="송장 번호")
    delivery_note_number: Optional[str] = Field(None, max_length=100, description="배송 메모 번호")
    lot_number: Optional[str] = Field(None, max_length=50, description="로트 번호")
    serial_number: Optional[str] = Field(None, max_length=100, description="일련 번호")
    expiry_date: Optional[date] = Field(None, description="만료일")
    received_date: Optional[datetime] = Field(None, description="수령일")
    expected_date: Optional[datetime] = Field(None, description="예상일")
    quality_check_status: Optional[str] = Field(None, max_length=20, description="품질 검사 상태")
    quality_check_notes: Optional[str] = Field(None, max_length=500, description="품질 검사 노트")
    received_location: Optional[str] = Field(None, max_length=100, description="수령 위치")
    storage_location: Optional[str] = Field(None, max_length=100, description="보관 위치")
    condition_on_arrival: Optional[str] = Field(None, max_length=100, description="도착 시 상태")
    warranty_start_date: Optional[date] = Field(None, description="보증 시작일")
    warranty_end_date: Optional[date] = Field(None, description="보증 종료일")
    customs_declaration: Optional[str] = Field(None, max_length=100, description="세관 신고")
    shipping_cost: Optional[Decimal] = Field(None, ge=0, description="배송비")
    tax_amount: Optional[Decimal] = Field(None, ge=0, description="세금")
    discount_amount: Optional[Decimal] = Field(None, ge=0, description="할인 금액")
    status: str = Field("pending", max_length=20, description="상태")
    notes: Optional[str] = Field(None, max_length=1000, description="노트")


class InboundCreate(InboundBase):
    """입고 생성 스키마"""
    pass


class InboundUpdate(BaseModel):
    """입고 업데이트 스키마"""
    transaction_id: Optional[str] = Field(None, max_length=100, description="트랜잭션 ID")
    part_id: Optional[int] = Field(None, description="부품 ID")
    supplier_id: Optional[int] = Field(None, description="공급업체 ID")
    user_id: Optional[int] = Field(None, description="사용자 ID")
    quantity: Optional[int] = Field(None, gt=0, description="수량")
    unit_price: Optional[Decimal] = Field(None, ge=0, description="단가")
    total_cost: Optional[Decimal] = Field(None, ge=0, description="총 비용")
    currency: Optional[str] = Field(None, max_length=3, description="통화")
    exchange_rate: Optional[Decimal] = Field(None, gt=0, description="환율")
    purchase_order_number: Optional[str] = Field(None, max_length=100, description="구매 주문 번호")
    invoice_number: Optional[str] = Field(None, max_length=100, description="송장 번호")
    delivery_note_number: Optional[str] = Field(None, max_length=100, description="배송 메모 번호")
    lot_number: Optional[str] = Field(None, max_length=50, description="로트 번호")
    serial_number: Optional[str] = Field(None, max_length=100, description="일련 번호")
    expiry_date: Optional[date] = Field(None, description="만료일")
    received_date: Optional[datetime] = Field(None, description="수령일")
    expected_date: Optional[datetime] = Field(None, description="예상일")
    quality_check_status: Optional[str] = Field(None, max_length=20, description="품질 검사 상태")
    quality_check_notes: Optional[str] = Field(None, max_length=500, description="품질 검사 노트")
    received_location: Optional[str] = Field(None, max_length=100, description="수령 위치")
    storage_location: Optional[str] = Field(None, max_length=100, description="보관 위치")
    condition_on_arrival: Optional[str] = Field(None, max_length=100, description="도착 시 상태")
    warranty_start_date: Optional[date] = Field(None, description="보증 시작일")
    warranty_end_date: Optional[date] = Field(None, description="보증 종료일")
    customs_declaration: Optional[str] = Field(None, max_length=100, description="세관 신고")
    shipping_cost: Optional[Decimal] = Field(None, ge=0, description="배송비")
    tax_amount: Optional[Decimal] = Field(None, ge=0, description="세금")
    discount_amount: Optional[Decimal] = Field(None, ge=0, description="할인 금액")
    status: Optional[str] = Field(None, max_length=20, description="상태")
    notes: Optional[str] = Field(None, max_length=1000, description="노트")


class InboundResponse(InboundBase):
    """입고 응답 스키마"""
    id: int = Field(..., description="입고 ID")
    total_cost_with_extras: Optional[Decimal] = Field(None, description="배송비와 세금을 포함한 총 비용")
    created_at: datetime = Field(..., description="생성 시간")
    updated_at: datetime = Field(..., description="업데이트 시간")
    
    class Config:
        from_attributes = True