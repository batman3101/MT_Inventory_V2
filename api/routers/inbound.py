from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from ..database import get_db
from ..models.inbound import Inbound
from ..schemas.inbound import InboundCreate, InboundUpdate, InboundResponse
from ..middleware.auth import get_current_user, get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[InboundResponse])
async def get_inbound_records(
    skip: int = Query(0, ge=0, description="건너뛸 항목 수"),
    limit: int = Query(100, ge=1, le=1000, description="가져올 항목 수"),
    part_id: Optional[int] = Query(None, description="부품 ID 필터"),
    supplier_id: Optional[int] = Query(None, description="공급업체 ID 필터"),
    status: Optional[str] = Query(None, description="상태 필터"),
    start_date: Optional[date] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    purchase_order_number: Optional[str] = Query(None, description="구매 주문 번호 필터"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """입고 기록 목록 조회"""
    query = db.query(Inbound)
    
    # 부품 ID 필터
    if part_id is not None:
        query = query.filter(Inbound.part_id == part_id)
    
    # 공급업체 ID 필터
    if supplier_id is not None:
        query = query.filter(Inbound.supplier_id == supplier_id)
    
    # 상태 필터
    if status:
        query = query.filter(Inbound.status == status)
    
    # 날짜 범위 필터
    if start_date:
        query = query.filter(Inbound.received_date >= start_date)
    if end_date:
        query = query.filter(Inbound.received_date <= end_date)
    
    # 구매 주문 번호 필터
    if purchase_order_number:
        query = query.filter(Inbound.purchase_order_number.ilike(f"%{purchase_order_number}%"))
    
    # 정렬 및 페이징
    inbound_records = query.order_by(Inbound.received_date.desc()).offset(skip).limit(limit).all()
    return inbound_records


@router.get("/pending", response_model=List[InboundResponse])
async def get_pending_inbound(
    limit: int = Query(50, ge=1, le=200, description="가져올 항목 수"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """대기 중인 입고 기록 조회"""
    inbound_records = db.query(Inbound).filter(
        Inbound.status == "pending"
    ).order_by(Inbound.expected_date.asc()).limit(limit).all()
    
    return inbound_records


@router.get("/overdue", response_model=List[InboundResponse])
async def get_overdue_inbound(
    limit: int = Query(50, ge=1, le=200, description="가져올 항목 수"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """지연된 입고 기록 조회"""
    current_date = datetime.now().date()
    
    inbound_records = db.query(Inbound).filter(
        Inbound.status.in_(["pending", "in_transit"]),
        Inbound.expected_date < current_date
    ).order_by(Inbound.expected_date.asc()).limit(limit).all()
    
    return inbound_records


@router.get("/by-purchase-order/{po_number}", response_model=List[InboundResponse])
async def get_inbound_by_po(
    po_number: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """구매 주문 번호로 입고 기록 조회"""
    inbound_records = db.query(Inbound).filter(
        Inbound.purchase_order_number == po_number
    ).order_by(Inbound.received_date.desc()).all()
    
    return inbound_records


@router.get("/{inbound_id}", response_model=InboundResponse)
async def get_inbound_record(
    inbound_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """특정 입고 기록 조회"""
    inbound = db.query(Inbound).filter(Inbound.id == inbound_id).first()
    if not inbound:
        raise HTTPException(status_code=404, detail="입고 기록을 찾을 수 없습니다")
    return inbound


@router.post("/", response_model=InboundResponse)
async def create_inbound_record(
    inbound: InboundCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """새 입고 기록 생성"""
    # 부품 존재 확인
    from ..models.part import Part
    part = db.query(Part).filter(Part.id == inbound.part_id).first()
    if not part:
        raise HTTPException(status_code=400, detail="부품을 찾을 수 없습니다")
    
    # 공급업체 존재 확인
    from ..models.supplier import Supplier
    supplier = db.query(Supplier).filter(Supplier.id == inbound.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=400, detail="공급업체를 찾을 수 없습니다")
    
    # 입고 기록 생성
    inbound_data = inbound.dict()
    inbound_data["user_id"] = current_user.id
    
    db_inbound = Inbound(**inbound_data)
    db.add(db_inbound)
    db.commit()
    db.refresh(db_inbound)
    
    # 입고 완료 시 재고 업데이트
    if inbound.status == "received":
        await update_inventory_on_inbound(db, db_inbound)
    
    return db_inbound


@router.put("/{inbound_id}", response_model=InboundResponse)
async def update_inbound_record(
    inbound_id: int,
    inbound: InboundUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """입고 기록 업데이트"""
    db_inbound = db.query(Inbound).filter(Inbound.id == inbound_id).first()
    if not db_inbound:
        raise HTTPException(status_code=404, detail="입고 기록을 찾을 수 없습니다")
    
    # 권한 확인 (본인이 생성한 기록이거나 관리자/매니저)
    if not (current_user.is_admin or current_user.is_manager or db_inbound.user_id == current_user.id):
        raise HTTPException(status_code=403, detail="권한이 없습니다")
    
    # 업데이트할 데이터만 추출
    update_data = inbound.dict(exclude_unset=True)
    
    # 부품 변경 시 존재 확인
    if "part_id" in update_data:
        from ..models.part import Part
        part = db.query(Part).filter(Part.id == update_data["part_id"]).first()
        if not part:
            raise HTTPException(status_code=400, detail="부품을 찾을 수 없습니다")
    
    # 공급업체 변경 시 존재 확인
    if "supplier_id" in update_data:
        from ..models.supplier import Supplier
        supplier = db.query(Supplier).filter(Supplier.id == update_data["supplier_id"]).first()
        if not supplier:
            raise HTTPException(status_code=400, detail="공급업체를 찾을 수 없습니다")
    
    # 상태 변경 확인
    old_status = db_inbound.status
    new_status = update_data.get("status", old_status)
    
    # 업데이트 실행
    for field, value in update_data.items():
        setattr(db_inbound, field, value)
    
    db.commit()
    db.refresh(db_inbound)
    
    # 상태가 received로 변경된 경우 재고 업데이트
    if old_status != "received" and new_status == "received":
        await update_inventory_on_inbound(db, db_inbound)
    
    return db_inbound


@router.patch("/{inbound_id}/receive")
async def receive_inbound(
    inbound_id: int,
    received_quantity: Optional[int] = Query(None, ge=1, description="실제 수령 수량"),
    quality_check_status: Optional[str] = Query("passed", description="품질 검사 상태"),
    quality_check_notes: Optional[str] = Query(None, description="품질 검사 노트"),
    storage_location: Optional[str] = Query(None, description="보관 위치"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """입고 처리 (수령 완료)"""
    db_inbound = db.query(Inbound).filter(Inbound.id == inbound_id).first()
    if not db_inbound:
        raise HTTPException(status_code=404, detail="입고 기록을 찾을 수 없습니다")
    
    if db_inbound.status == "received":
        raise HTTPException(status_code=400, detail="이미 수령 완료된 입고입니다")
    
    # 수령 정보 업데이트
    db_inbound.status = "received"
    db_inbound.received_date = datetime.now().date()
    
    if received_quantity is not None:
        db_inbound.quantity = received_quantity
    
    if quality_check_status:
        db_inbound.quality_check_status = quality_check_status
    
    if quality_check_notes:
        db_inbound.quality_check_notes = quality_check_notes
    
    if storage_location:
        db_inbound.storage_location = storage_location
    
    db.commit()
    db.refresh(db_inbound)
    
    # 재고 업데이트
    await update_inventory_on_inbound(db, db_inbound)
    
    return {"message": "입고 처리가 완료되었습니다", "inbound_id": inbound_id}


@router.delete("/{inbound_id}")
async def delete_inbound_record(
    inbound_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """입고 기록 삭제 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    db_inbound = db.query(Inbound).filter(Inbound.id == inbound_id).first()
    if not db_inbound:
        raise HTTPException(status_code=404, detail="입고 기록을 찾을 수 없습니다")
    
    # 수령 완료된 입고는 삭제할 수 없음
    if db_inbound.status == "received":
        raise HTTPException(status_code=400, detail="수령 완료된 입고 기록은 삭제할 수 없습니다")
    
    db.delete(db_inbound)
    db.commit()
    return {"message": "입고 기록이 삭제되었습니다"}


@router.get("/summary/stats")
async def get_inbound_stats(
    start_date: Optional[date] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """입고 통계 조회"""
    from sqlalchemy import func
    
    query = db.query(Inbound)
    
    # 날짜 범위 필터
    if start_date:
        query = query.filter(Inbound.received_date >= start_date)
    if end_date:
        query = query.filter(Inbound.received_date <= end_date)
    
    # 전체 입고 건수
    total_inbound = query.count()
    
    # 수령 완료 건수
    received_count = query.filter(Inbound.status == "received").count()
    
    # 대기 중 건수
    pending_count = query.filter(Inbound.status == "pending").count()
    
    # 총 입고 금액
    total_amount = query.filter(Inbound.status == "received").with_entities(
        func.sum(Inbound.total_cost)
    ).scalar() or 0
    
    # 평균 입고 금액
    avg_amount = total_amount / received_count if received_count > 0 else 0
    
    return {
        "total_inbound": total_inbound,
        "received_count": received_count,
        "pending_count": pending_count,
        "total_amount": float(total_amount),
        "average_amount": float(avg_amount)
    }


async def update_inventory_on_inbound(db: Session, inbound: Inbound):
    """입고 시 재고 업데이트"""
    from ..models.inventory import Inventory
    
    # 같은 부품, 위치, 로트 번호의 기존 재고 찾기
    existing_inventory = db.query(Inventory).filter(
        Inventory.part_id == inbound.part_id,
        Inventory.location == (inbound.storage_location or "기본창고"),
        Inventory.lot_number == (inbound.lot_number or "")
    ).first()
    
    if existing_inventory:
        # 기존 재고에 추가
        existing_inventory.current_stock += inbound.quantity
        existing_inventory.last_movement_date = datetime.now()
        
        # 평균 비용 재계산
        if inbound.unit_price and existing_inventory.average_cost:
            total_value = (existing_inventory.current_stock - inbound.quantity) * existing_inventory.average_cost + inbound.quantity * inbound.unit_price
            existing_inventory.average_cost = total_value / existing_inventory.current_stock
        elif inbound.unit_price:
            existing_inventory.average_cost = inbound.unit_price
    else:
        # 새 재고 항목 생성
        new_inventory = Inventory(
            part_id=inbound.part_id,
            current_stock=inbound.quantity,
            reserved_stock=0,
            location=inbound.storage_location or "기본창고",
            lot_number=inbound.lot_number or "",
            serial_number=inbound.serial_number,
            expiry_date=inbound.expiry_date,
            last_movement_date=datetime.now(),
            average_cost=inbound.unit_price,
            reorder_status=False,
            is_active=True
        )
        db.add(new_inventory)
    
    # 부품의 현재 재고량도 업데이트
    from ..models.part import Part
    part = db.query(Part).filter(Part.id == inbound.part_id).first()
    if part:
        part.current_stock = (part.current_stock or 0) + inbound.quantity
    
    db.commit()