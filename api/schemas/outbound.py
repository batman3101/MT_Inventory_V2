from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


class OutboundBase(BaseModel):
    """출고 기본 스키마"""
    transaction_id: Optional[str] = Field(None, max_length=100, description="트랜잭션 ID")
    part_id: int = Field(..., description="부품 ID")
    user_id: int = Field(..., description="사용자 ID")
    quantity: int = Field(..., gt=0, description="수량")
    unit_price: Optional[Decimal] = Field(None, ge=0, description="단가")
    total_cost: Optional[Decimal] = Field(None, ge=0, description="총 비용")
    requesting_department: Optional[str] = Field(None, max_length=100, description="요청 부서")
    requester_name: Optional[str] = Field(None, max_length=100, description="요청자명")
    requester_email: Optional[str] = Field(None, max_length=100, description="요청자 이메일")
    purpose: Optional[str] = Field(None, max_length=200, description="목적")
    project_code: Optional[str] = Field(None, max_length=50, description="프로젝트 코드")
    cost_center: Optional[str] = Field(None, max_length=50, description="비용 센터")
    work_order_number: Optional[str] = Field(None, max_length=100, description="작업 주문 번호")
    delivery_address: Optional[str] = Field(None, max_length=500, description="배송 주소")
    lot_number: Optional[str] = Field(None, max_length=50, description="로트 번호")
    serial_number: Optional[str] = Field(None, max_length=100, description="일련 번호")
    requested_date: Optional[datetime] = Field(None, description="요청일")
    required_date: Optional[datetime] = Field(None, description="필요일")
    issued_date: Optional[datetime] = Field(None, description="발행일")
    delivered_date: Optional[datetime] = Field(None, description="배송일")
    issued_location: Optional[str] = Field(None, max_length=100, description="발행 위치")
    storage_location: Optional[str] = Field(None, max_length=100, description="보관 위치")
    priority: Optional[str] = Field(None, max_length=20, description="우선순위")
    approval_status: Optional[str] = Field(None, max_length=20, description="승인 상태")
    approval_notes: Optional[str] = Field(None, max_length=500, description="승인 노트")
    approved_by: Optional[str] = Field(None, max_length=100, description="승인자")
    delivery_method: Optional[str] = Field(None, max_length=50, description="배송 방법")
    tracking_number: Optional[str] = Field(None, max_length=100, description="추적 번호")
    recipient_signature: Optional[str] = Field(None, max_length=100, description="수령인 서명")
    is_returned: bool = Field(False, description="반품 여부")
    returned_date: Optional[datetime] = Field(None, description="반품일")
    status: str = Field("pending", max_length=20, description="상태")
    notes: Optional[str] = Field(None, max_length=1000, description="노트")


class OutboundCreate(OutboundBase):
    """출고 생성 스키마"""
    pass


class OutboundUpdate(BaseModel):
    """출고 업데이트 스키마"""
    transaction_id: Optional[str] = Field(None, max_length=100, description="트랜잭션 ID")
    part_id: Optional[int] = Field(None, description="부품 ID")
    user_id: Optional[int] = Field(None, description="사용자 ID")
    quantity: Optional[int] = Field(None, gt=0, description="수량")
    unit_price: Optional[Decimal] = Field(None, ge=0, description="단가")
    total_cost: Optional[Decimal] = Field(None, ge=0, description="총 비용")
    requesting_department: Optional[str] = Field(None, max_length=100, description="요청 부서")
    requester_name: Optional[str] = Field(None, max_length=100, description="요청자명")
    requester_email: Optional[str] = Field(None, max_length=100, description="요청자 이메일")
    purpose: Optional[str] = Field(None, max_length=200, description="목적")
    project_code: Optional[str] = Field(None, max_length=50, description="프로젝트 코드")
    cost_center: Optional[str] = Field(None, max_length=50, description="비용 센터")
    work_order_number: Optional[str] = Field(None, max_length=100, description="작업 주문 번호")
    delivery_address: Optional[str] = Field(None, max_length=500, description="배송 주소")
    lot_number: Optional[str] = Field(None, max_length=50, description="로트 번호")
    serial_number: Optional[str] = Field(None, max_length=100, description="일련 번호")
    requested_date: Optional[datetime] = Field(None, description="요청일")
    required_date: Optional[datetime] = Field(None, description="필요일")
    issued_date: Optional[datetime] = Field(None, description="발행일")
    delivered_date: Optional[datetime] = Field(None, description="배송일")
    issued_location: Optional[str] = Field(None, max_length=100, description="발행 위치")
    storage_location: Optional[str] = Field(None, max_length=100, description="보관 위치")
    priority: Optional[str] = Field(None, max_length=20, description="우선순위")
    approval_status: Optional[str] = Field(None, max_length=20, description="승인 상태")
    approval_notes: Optional[str] = Field(None, max_length=500, description="승인 노트")
    approved_by: Optional[str] = Field(None, max_length=100, description="승인자")
    delivery_method: Optional[str] = Field(None, max_length=50, description="배송 방법")
    tracking_number: Optional[str] = Field(None, max_length=100, description="추적 번호")
    recipient_signature: Optional[str] = Field(None, max_length=100, description="수령인 서명")
    is_returned: Optional[bool] = Field(None, description="반품 여부")
    returned_date: Optional[datetime] = Field(None, description="반품일")
    status: Optional[str] = Field(None, max_length=20, description="상태")
    notes: Optional[str] = Field(None, max_length=1000, description="노트")


class OutboundResponse(OutboundBase):
    """출고 응답 스키마"""
    id: int = Field(..., description="출고 ID")
    is_overdue: bool = Field(..., description="배송 지연 여부")
    days_since_request: Optional[int] = Field(None, description="요청 후 경과일")
    created_at: datetime = Field(..., description="생성 시간")
    updated_at: datetime = Field(..., description="업데이트 시간")
    
    class Config:
        from_attributes = True