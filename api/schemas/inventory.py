from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


class InventoryBase(BaseModel):
    """재고 기본 스키마"""
    part_id: int = Field(..., description="부품 ID")
    current_stock: int = Field(..., ge=0, description="현재 재고")
    reserved_stock: int = Field(0, ge=0, description="예약 재고")
    location: Optional[str] = Field(None, max_length=100, description="위치")
    lot_number: Optional[str] = Field(None, max_length=50, description="로트 번호")
    serial_number: Optional[str] = Field(None, max_length=100, description="일련 번호")
    expiry_date: Optional[date] = Field(None, description="만료일")
    last_counted_at: Optional[datetime] = Field(None, description="마지막 재고 조사 시간")
    last_movement_at: Optional[datetime] = Field(None, description="마지막 이동 시간")
    average_cost: Optional[Decimal] = Field(None, ge=0, description="평균 비용")
    reorder_status: Optional[str] = Field(None, max_length=20, description="재주문 상태")
    notes: Optional[str] = Field(None, max_length=500, description="메모")
    is_active: bool = Field(True, description="활성 상태")


class InventoryCreate(InventoryBase):
    """재고 생성 스키마"""
    pass


class InventoryUpdate(BaseModel):
    """재고 업데이트 스키마"""
    part_id: Optional[int] = Field(None, description="부품 ID")
    current_stock: Optional[int] = Field(None, ge=0, description="현재 재고")
    reserved_stock: Optional[int] = Field(None, ge=0, description="예약 재고")
    location: Optional[str] = Field(None, max_length=100, description="위치")
    lot_number: Optional[str] = Field(None, max_length=50, description="로트 번호")
    serial_number: Optional[str] = Field(None, max_length=100, description="일련 번호")
    expiry_date: Optional[date] = Field(None, description="만료일")
    last_counted_at: Optional[datetime] = Field(None, description="마지막 재고 조사 시간")
    last_movement_at: Optional[datetime] = Field(None, description="마지막 이동 시간")
    average_cost: Optional[Decimal] = Field(None, ge=0, description="평균 비용")
    reorder_status: Optional[str] = Field(None, max_length=20, description="재주문 상태")
    notes: Optional[str] = Field(None, max_length=500, description="메모")
    is_active: Optional[bool] = Field(None, description="활성 상태")


class InventoryResponse(InventoryBase):
    """재고 응답 스키마"""
    id: int = Field(..., description="재고 ID")
    available_stock: int = Field(..., description="가용 재고")
    total_value: Optional[Decimal] = Field(None, description="총 가치")
    stock_status: str = Field(..., description="재고 상태")
    created_at: datetime = Field(..., description="생성 시간")
    updated_at: datetime = Field(..., description="업데이트 시간")
    
    class Config:
        from_attributes = True


class InventoryAdjustment(BaseModel):
    """재고 조정 스키마"""
    adjustment_quantity: int = Field(..., description="조정 수량 (양수: 증가, 음수: 감소)")
    reason: str = Field(..., min_length=1, max_length=200, description="조정 사유")
    notes: Optional[str] = Field(None, max_length=500, description="메모")