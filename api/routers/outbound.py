from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from ..database import get_db
from ..models.outbound import Outbound
from ..schemas.outbound import OutboundCreate, OutboundUpdate, OutboundResponse
from ..middleware.auth import get_current_user, get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[OutboundResponse])
async def get_outbound_records(
    skip: int = Query(0, ge=0, description="건너뛸 항목 수"),
    limit: int = Query(100, ge=1, le=1000, description="가져올 항목 수"),
    part_id: Optional[int] = Query(None, description="부품 ID 필터"),
    requesting_department: Optional[str] = Query(None, description="요청 부서 필터"),
    status: Optional[str] = Query(None, description="상태 필터"),
    approval_status: Optional[str] = Query(None, description="승인 상태 필터"),
    start_date: Optional[date] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    work_order_number: Optional[str] = Query(None, description="작업 주문 번호 필터"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """출고 기록 목록 조회"""
    query = db.query(Outbound)
    
    # 부품 ID 필터
    if part_id is not None:
        query = query.filter(Outbound.part_id == part_id)
    
    # 요청 부서 필터
    if requesting_department:
        query = query.filter(Outbound.requesting_department.ilike(f"%{requesting_department}%"))
    
    # 상태 필터
    if status:
        query = query.filter(Outbound.status == status)
    
    # 승인 상태 필터
    if approval_status:
        query = query.filter(Outbound.approval_status == approval_status)
    
    # 날짜 범위 필터
    if start_date:
        query = query.filter(Outbound.request_date >= start_date)
    if end_date:
        query = query.filter(Outbound.request_date <= end_date)
    
    # 작업 주문 번호 필터
    if work_order_number:
        query = query.filter(Outbound.work_order_number.ilike(f"%{work_order_number}%"))
    
    # 정렬 및 페이징
    outbound_records = query.order_by(Outbound.request_date.desc()).offset(skip).limit(limit).all()
    return outbound_records


@router.get("/pending-approval", response_model=List[OutboundResponse])
async def get_pending_approval_outbound(
    limit: int = Query(50, ge=1, le=200, description="가져올 항목 수"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """승인 대기 중인 출고 요청 조회 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    outbound_records = db.query(Outbound).filter(
        Outbound.approval_status == "pending"
    ).order_by(Outbound.request_date.asc()).limit(limit).all()
    
    return outbound_records


@router.get("/urgent", response_model=List[OutboundResponse])
async def get_urgent_outbound(
    limit: int = Query(50, ge=1, le=200, description="가져올 항목 수"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """긴급 출고 요청 조회"""
    outbound_records = db.query(Outbound).filter(
        Outbound.priority == "urgent",
        Outbound.status.in_(["pending", "approved", "processing"])
    ).order_by(Outbound.needed_date.asc()).limit(limit).all()
    
    return outbound_records


@router.get("/overdue", response_model=List[OutboundResponse])
async def get_overdue_outbound(
    limit: int = Query(50, ge=1, le=200, description="가져올 항목 수"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """지연된 출고 요청 조회"""
    current_date = datetime.now().date()
    
    outbound_records = db.query(Outbound).filter(
        Outbound.status.in_(["pending", "approved", "processing"]),
        Outbound.needed_date < current_date
    ).order_by(Outbound.needed_date.asc()).limit(limit).all()
    
    return outbound_records


@router.get("/my-requests", response_model=List[OutboundResponse])
async def get_my_outbound_requests(
    skip: int = Query(0, ge=0, description="건너뛸 항목 수"),
    limit: int = Query(50, ge=1, le=200, description="가져올 항목 수"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """내가 요청한 출고 기록 조회"""
    outbound_records = db.query(Outbound).filter(
        Outbound.user_id == current_user.id
    ).order_by(Outbound.request_date.desc()).offset(skip).limit(limit).all()
    
    return outbound_records


@router.get("/by-work-order/{work_order}", response_model=List[OutboundResponse])
async def get_outbound_by_work_order(
    work_order: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """작업 주문 번호로 출고 기록 조회"""
    outbound_records = db.query(Outbound).filter(
        Outbound.work_order_number == work_order
    ).order_by(Outbound.request_date.desc()).all()
    
    return outbound_records


@router.get("/{outbound_id}", response_model=OutboundResponse)
async def get_outbound_record(
    outbound_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """특정 출고 기록 조회"""
    outbound = db.query(Outbound).filter(Outbound.id == outbound_id).first()
    if not outbound:
        raise HTTPException(status_code=404, detail="출고 기록을 찾을 수 없습니다")
    
    # 권한 확인 (본인이 요청한 기록이거나 관리자/매니저)
    if not (current_user.is_admin or current_user.is_manager or outbound.user_id == current_user.id):
        raise HTTPException(status_code=403, detail="권한이 없습니다")
    
    return outbound


@router.post("/", response_model=OutboundResponse)
async def create_outbound_request(
    outbound: OutboundCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """새 출고 요청 생성"""
    # 부품 존재 확인
    from ..models.part import Part
    part = db.query(Part).filter(Part.id == outbound.part_id).first()
    if not part:
        raise HTTPException(status_code=400, detail="부품을 찾을 수 없습니다")
    
    # 재고 확인
    if part.current_stock < outbound.quantity:
        raise HTTPException(status_code=400, detail="재고가 부족합니다")
    
    # 출고 요청 생성
    outbound_data = outbound.dict()
    outbound_data["user_id"] = current_user.id
    outbound_data["requester_name"] = current_user.full_name or current_user.username
    
    # 부서 정보 설정
    if current_user.department:
        outbound_data["requesting_department"] = current_user.department.name
    
    db_outbound = Outbound(**outbound_data)
    db.add(db_outbound)
    db.commit()
    db.refresh(db_outbound)
    
    return db_outbound


@router.put("/{outbound_id}", response_model=OutboundResponse)
async def update_outbound_request(
    outbound_id: int,
    outbound: OutboundUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """출고 요청 업데이트"""
    db_outbound = db.query(Outbound).filter(Outbound.id == outbound_id).first()
    if not db_outbound:
        raise HTTPException(status_code=404, detail="출고 기록을 찾을 수 없습니다")
    
    # 권한 확인 (본인이 요청한 기록이거나 관리자/매니저)
    if not (current_user.is_admin or current_user.is_manager or db_outbound.user_id == current_user.id):
        raise HTTPException(status_code=403, detail="권한이 없습니다")
    
    # 이미 승인되거나 완료된 요청은 수정 불가
    if db_outbound.approval_status == "approved" and not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=400, detail="승인된 요청은 수정할 수 없습니다")
    
    if db_outbound.status in ["shipped", "delivered", "completed"]:
        raise HTTPException(status_code=400, detail="완료된 요청은 수정할 수 없습니다")
    
    # 업데이트할 데이터만 추출
    update_data = outbound.dict(exclude_unset=True)
    
    # 부품 변경 시 존재 확인
    if "part_id" in update_data:
        from ..models.part import Part
        part = db.query(Part).filter(Part.id == update_data["part_id"]).first()
        if not part:
            raise HTTPException(status_code=400, detail="부품을 찾을 수 없습니다")
        
        # 재고 확인
        new_quantity = update_data.get("quantity", db_outbound.quantity)
        if part.current_stock < new_quantity:
            raise HTTPException(status_code=400, detail="재고가 부족합니다")
    
    # 업데이트 실행
    for field, value in update_data.items():
        setattr(db_outbound, field, value)
    
    db.commit()
    db.refresh(db_outbound)
    return db_outbound


@router.patch("/{outbound_id}/approve")
async def approve_outbound_request(
    outbound_id: int,
    approval_notes: Optional[str] = Query(None, description="승인 노트"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """출고 요청 승인 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    db_outbound = db.query(Outbound).filter(Outbound.id == outbound_id).first()
    if not db_outbound:
        raise HTTPException(status_code=404, detail="출고 기록을 찾을 수 없습니다")
    
    if db_outbound.approval_status != "pending":
        raise HTTPException(status_code=400, detail="승인 대기 중인 요청만 승인할 수 있습니다")
    
    # 재고 재확인
    from ..models.part import Part
    part = db.query(Part).filter(Part.id == db_outbound.part_id).first()
    if part.current_stock < db_outbound.quantity:
        raise HTTPException(status_code=400, detail="재고가 부족하여 승인할 수 없습니다")
    
    # 승인 처리
    db_outbound.approval_status = "approved"
    db_outbound.approved_by = current_user.id
    db_outbound.approval_notes = approval_notes
    db_outbound.status = "approved"
    
    db.commit()
    db.refresh(db_outbound)
    
    return {"message": "출고 요청이 승인되었습니다", "outbound_id": outbound_id}


@router.patch("/{outbound_id}/reject")
async def reject_outbound_request(
    outbound_id: int,
    approval_notes: str = Query(..., description="거부 사유"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """출고 요청 거부 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    db_outbound = db.query(Outbound).filter(Outbound.id == outbound_id).first()
    if not db_outbound:
        raise HTTPException(status_code=404, detail="출고 기록을 찾을 수 없습니다")
    
    if db_outbound.approval_status != "pending":
        raise HTTPException(status_code=400, detail="승인 대기 중인 요청만 거부할 수 있습니다")
    
    # 거부 처리
    db_outbound.approval_status = "rejected"
    db_outbound.approved_by = current_user.id
    db_outbound.approval_notes = approval_notes
    db_outbound.status = "rejected"
    
    db.commit()
    db.refresh(db_outbound)
    
    return {"message": "출고 요청이 거부되었습니다", "outbound_id": outbound_id}


@router.patch("/{outbound_id}/issue")
async def issue_outbound(
    outbound_id: int,
    issued_quantity: Optional[int] = Query(None, ge=1, description="실제 출고 수량"),
    storage_location: Optional[str] = Query(None, description="출고 위치"),
    lot_number: Optional[str] = Query(None, description="로트 번호"),
    serial_number: Optional[str] = Query(None, description="일련 번호"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """출고 처리 (실제 출고)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    db_outbound = db.query(Outbound).filter(Outbound.id == outbound_id).first()
    if not db_outbound:
        raise HTTPException(status_code=404, detail="출고 기록을 찾을 수 없습니다")
    
    if db_outbound.approval_status != "approved":
        raise HTTPException(status_code=400, detail="승인된 요청만 출고할 수 있습니다")
    
    if db_outbound.status in ["shipped", "delivered", "completed"]:
        raise HTTPException(status_code=400, detail="이미 출고된 요청입니다")
    
    # 출고 수량 설정
    actual_quantity = issued_quantity or db_outbound.quantity
    
    # 재고 확인 및 차감
    from ..models.part import Part
    part = db.query(Part).filter(Part.id == db_outbound.part_id).first()
    if part.current_stock < actual_quantity:
        raise HTTPException(status_code=400, detail="재고가 부족합니다")
    
    # 출고 정보 업데이트
    db_outbound.status = "issued"
    db_outbound.issued_date = datetime.now().date()
    db_outbound.quantity = actual_quantity
    
    if storage_location:
        db_outbound.storage_location = storage_location
    if lot_number:
        db_outbound.lot_number = lot_number
    if serial_number:
        db_outbound.serial_number = serial_number
    
    # 재고 차감
    part.current_stock -= actual_quantity
    
    # 재고 테이블에서도 차감
    await update_inventory_on_outbound(db, db_outbound)
    
    db.commit()
    db.refresh(db_outbound)
    
    return {"message": "출고 처리가 완료되었습니다", "outbound_id": outbound_id}


@router.delete("/{outbound_id}")
async def delete_outbound_request(
    outbound_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """출고 요청 삭제"""
    db_outbound = db.query(Outbound).filter(Outbound.id == outbound_id).first()
    if not db_outbound:
        raise HTTPException(status_code=404, detail="출고 기록을 찾을 수 없습니다")
    
    # 권한 확인 (본인이 요청한 기록이거나 관리자)
    if not (current_user.is_admin or db_outbound.user_id == current_user.id):
        raise HTTPException(status_code=403, detail="권한이 없습니다")
    
    # 승인되거나 출고된 요청은 삭제할 수 없음
    if db_outbound.approval_status == "approved" or db_outbound.status in ["issued", "shipped", "delivered", "completed"]:
        raise HTTPException(status_code=400, detail="승인되거나 출고된 요청은 삭제할 수 없습니다")
    
    db.delete(db_outbound)
    db.commit()
    return {"message": "출고 요청이 삭제되었습니다"}


@router.get("/summary/stats")
async def get_outbound_stats(
    start_date: Optional[date] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """출고 통계 조회"""
    from sqlalchemy import func
    
    query = db.query(Outbound)
    
    # 날짜 범위 필터
    if start_date:
        query = query.filter(Outbound.request_date >= start_date)
    if end_date:
        query = query.filter(Outbound.request_date <= end_date)
    
    # 전체 출고 요청 건수
    total_requests = query.count()
    
    # 승인 대기 건수
    pending_approval = query.filter(Outbound.approval_status == "pending").count()
    
    # 승인된 건수
    approved_count = query.filter(Outbound.approval_status == "approved").count()
    
    # 출고 완료 건수
    issued_count = query.filter(Outbound.status.in_(["issued", "shipped", "delivered", "completed"])).count()
    
    # 총 출고 금액
    total_amount = query.filter(Outbound.status.in_(["issued", "shipped", "delivered", "completed"])).with_entities(
        func.sum(Outbound.total_cost)
    ).scalar() or 0
    
    return {
        "total_requests": total_requests,
        "pending_approval": pending_approval,
        "approved_count": approved_count,
        "issued_count": issued_count,
        "total_amount": float(total_amount)
    }


async def update_inventory_on_outbound(db: Session, outbound: Outbound):
    """출고 시 재고 업데이트"""
    from ..models.inventory import Inventory
    
    # 해당 부품의 재고에서 차감
    inventories = db.query(Inventory).filter(
        Inventory.part_id == outbound.part_id,
        Inventory.is_active == True,
        Inventory.current_stock > 0
    ).order_by(Inventory.expiry_date.asc().nullslast()).all()
    
    remaining_quantity = outbound.quantity
    
    for inventory in inventories:
        if remaining_quantity <= 0:
            break
        
        if inventory.current_stock >= remaining_quantity:
            # 이 재고에서 모든 수량을 차감할 수 있음
            inventory.current_stock -= remaining_quantity
            inventory.last_movement_date = datetime.now()
            remaining_quantity = 0
        else:
            # 이 재고의 모든 수량을 차감하고 다음 재고로
            remaining_quantity -= inventory.current_stock
            inventory.current_stock = 0
            inventory.last_movement_date = datetime.now()
    
    if remaining_quantity > 0:
        # 재고가 부족한 경우 (이론적으로는 발생하지 않아야 함)
        raise HTTPException(status_code=400, detail="재고가 부족합니다")
    
    db.commit()