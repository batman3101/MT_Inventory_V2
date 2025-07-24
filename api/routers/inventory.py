from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models.inventory import Inventory
from ..schemas.inventory import InventoryCreate, InventoryUpdate, InventoryResponse, InventoryAdjustment
from ..middleware.auth import get_current_user, get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[InventoryResponse])
async def get_inventory(
    skip: int = Query(0, ge=0, description="건너뛸 항목 수"),
    limit: int = Query(100, ge=1, le=1000, description="가져올 항목 수"),
    part_id: Optional[int] = Query(None, description="부품 ID 필터"),
    location: Optional[str] = Query(None, description="위치 필터"),
    lot_number: Optional[str] = Query(None, description="로트 번호 필터"),
    low_stock: Optional[bool] = Query(None, description="재고 부족 필터"),
    expired: Optional[bool] = Query(None, description="만료된 재고 필터"),
    is_active: Optional[bool] = Query(None, description="활성 상태 필터"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """재고 목록 조회"""
    query = db.query(Inventory)
    
    # 부품 ID 필터
    if part_id is not None:
        query = query.filter(Inventory.part_id == part_id)
    
    # 위치 필터
    if location:
        query = query.filter(Inventory.location.ilike(f"%{location}%"))
    
    # 로트 번호 필터
    if lot_number:
        query = query.filter(Inventory.lot_number.ilike(f"%{lot_number}%"))
    
    # 재고 부족 필터
    if low_stock:
        query = query.filter(Inventory.current_stock <= 10)  # 임계값 10개 이하
    
    # 만료된 재고 필터
    if expired:
        current_date = datetime.now().date()
        query = query.filter(
            Inventory.expiry_date.isnot(None),
            Inventory.expiry_date <= current_date
        )
    
    # 활성 상태 필터
    if is_active is not None:
        query = query.filter(Inventory.is_active == is_active)
    
    # 정렬 및 페이징
    inventory = query.order_by(Inventory.part_id, Inventory.location).offset(skip).limit(limit).all()
    return inventory


@router.get("/low-stock", response_model=List[InventoryResponse])
async def get_low_stock_inventory(
    threshold: int = Query(10, ge=0, description="재고 부족 임계값"),
    limit: int = Query(50, ge=1, le=200, description="가져올 항목 수"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """재고 부족 항목 조회"""
    inventory = db.query(Inventory).filter(
        Inventory.is_active == True,
        Inventory.current_stock <= threshold
    ).order_by(
        Inventory.current_stock.asc(),
        Inventory.part_id
    ).limit(limit).all()
    
    return inventory


@router.get("/expiring-soon", response_model=List[InventoryResponse])
async def get_expiring_inventory(
    days: int = Query(30, ge=1, le=365, description="만료까지 남은 일수"),
    limit: int = Query(50, ge=1, le=200, description="가져올 항목 수"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """만료 예정 재고 조회"""
    from datetime import timedelta
    
    current_date = datetime.now().date()
    target_date = current_date + timedelta(days=days)
    
    inventory = db.query(Inventory).filter(
        Inventory.is_active == True,
        Inventory.expiry_date.isnot(None),
        Inventory.expiry_date <= target_date,
        Inventory.expiry_date >= current_date
    ).order_by(
        Inventory.expiry_date.asc(),
        Inventory.part_id
    ).limit(limit).all()
    
    return inventory


@router.get("/by-part/{part_id}", response_model=List[InventoryResponse])
async def get_inventory_by_part(
    part_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """특정 부품의 모든 재고 조회"""
    # 부품 존재 확인
    from ..models.part import Part
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="부품을 찾을 수 없습니다")
    
    inventory = db.query(Inventory).filter(
        Inventory.part_id == part_id,
        Inventory.is_active == True
    ).order_by(Inventory.location, Inventory.lot_number).all()
    
    return inventory


@router.get("/{inventory_id}", response_model=InventoryResponse)
async def get_inventory_item(
    inventory_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """특정 재고 항목 조회"""
    inventory = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="재고 항목을 찾을 수 없습니다")
    return inventory


@router.post("/", response_model=InventoryResponse)
async def create_inventory(
    inventory: InventoryCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """새 재고 항목 생성 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    # 부품 존재 확인
    from ..models.part import Part
    part = db.query(Part).filter(Part.id == inventory.part_id).first()
    if not part:
        raise HTTPException(status_code=400, detail="부품을 찾을 수 없습니다")
    if not part.is_active:
        raise HTTPException(status_code=400, detail="비활성화된 부품에는 재고를 생성할 수 없습니다")
    
    # 같은 부품, 위치, 로트 번호의 재고가 이미 있는지 확인
    existing_inventory = db.query(Inventory).filter(
        Inventory.part_id == inventory.part_id,
        Inventory.location == inventory.location,
        Inventory.lot_number == inventory.lot_number
    ).first()
    
    if existing_inventory:
        raise HTTPException(
            status_code=400, 
            detail="같은 부품, 위치, 로트 번호의 재고가 이미 존재합니다. 기존 재고를 업데이트하세요."
        )
    
    db_inventory = Inventory(**inventory.dict())
    db.add(db_inventory)
    db.commit()
    db.refresh(db_inventory)
    return db_inventory


@router.put("/{inventory_id}", response_model=InventoryResponse)
async def update_inventory(
    inventory_id: int,
    inventory: InventoryUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """재고 정보 업데이트 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    db_inventory = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not db_inventory:
        raise HTTPException(status_code=404, detail="재고 항목을 찾을 수 없습니다")
    
    # 업데이트할 데이터만 추출
    update_data = inventory.dict(exclude_unset=True)
    
    # 부품 변경 시 존재 확인
    if "part_id" in update_data:
        from ..models.part import Part
        part = db.query(Part).filter(Part.id == update_data["part_id"]).first()
        if not part:
            raise HTTPException(status_code=400, detail="부품을 찾을 수 없습니다")
        if not part.is_active:
            raise HTTPException(status_code=400, detail="비활성화된 부품으로 변경할 수 없습니다")
    
    # 업데이트 실행
    for field, value in update_data.items():
        setattr(db_inventory, field, value)
    
    db.commit()
    db.refresh(db_inventory)
    return db_inventory


@router.post("/adjust", response_model=InventoryResponse)
async def adjust_inventory(
    adjustment: InventoryAdjustment,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """재고 조정 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    db_inventory = db.query(Inventory).filter(Inventory.id == adjustment.inventory_id).first()
    if not db_inventory:
        raise HTTPException(status_code=404, detail="재고 항목을 찾을 수 없습니다")
    
    # 조정 유형에 따른 처리
    if adjustment.adjustment_type == "add":
        db_inventory.current_stock += adjustment.quantity
    elif adjustment.adjustment_type == "subtract":
        if db_inventory.current_stock < adjustment.quantity:
            raise HTTPException(status_code=400, detail="재고가 부족합니다")
        db_inventory.current_stock -= adjustment.quantity
    elif adjustment.adjustment_type == "set":
        db_inventory.current_stock = adjustment.quantity
    else:
        raise HTTPException(status_code=400, detail="잘못된 조정 유형입니다")
    
    # 마지막 재고 조사 시간 업데이트
    db_inventory.last_count_date = datetime.now()
    
    # 메모 추가
    if adjustment.reason:
        current_notes = db_inventory.notes or ""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        new_note = f"[{timestamp}] 재고 조정 ({adjustment.adjustment_type}): {adjustment.quantity}개, 사유: {adjustment.reason}"
        db_inventory.notes = f"{current_notes}\n{new_note}" if current_notes else new_note
    
    db.commit()
    db.refresh(db_inventory)
    return db_inventory


@router.delete("/{inventory_id}")
async def delete_inventory(
    inventory_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """재고 항목 삭제 (비활성화) (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    db_inventory = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not db_inventory:
        raise HTTPException(status_code=404, detail="재고 항목을 찾을 수 없습니다")
    
    # 재고가 0이 아니면 비활성화만 수행
    if db_inventory.current_stock > 0:
        db_inventory.is_active = False
        db.commit()
        return {"message": "재고가 남아있어 비활성화되었습니다"}
    else:
        # 재고가 0이면 완전 삭제
        db.delete(db_inventory)
        db.commit()
        return {"message": "재고 항목이 삭제되었습니다"}


@router.patch("/{inventory_id}/toggle-status")
async def toggle_inventory_status(
    inventory_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """재고 활성/비활성 상태 토글 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    db_inventory = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not db_inventory:
        raise HTTPException(status_code=404, detail="재고 항목을 찾을 수 없습니다")
    
    db_inventory.is_active = not db_inventory.is_active
    db.commit()
    
    status = "활성화" if db_inventory.is_active else "비활성화"
    return {"message": f"재고 항목이 {status}되었습니다", "is_active": db_inventory.is_active}


@router.get("/summary/stats")
async def get_inventory_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """재고 통계 조회"""
    from sqlalchemy import func
    from datetime import timedelta
    
    current_date = datetime.now().date()
    
    # 전체 재고 항목 수
    total_items = db.query(Inventory).filter(Inventory.is_active == True).count()
    
    # 재고 부족 항목 수 (10개 이하)
    low_stock_items = db.query(Inventory).filter(
        Inventory.is_active == True,
        Inventory.current_stock <= 10
    ).count()
    
    # 만료 예정 항목 수 (30일 이내)
    expiring_soon = db.query(Inventory).filter(
        Inventory.is_active == True,
        Inventory.expiry_date.isnot(None),
        Inventory.expiry_date <= current_date + timedelta(days=30),
        Inventory.expiry_date >= current_date
    ).count()
    
    # 만료된 항목 수
    expired_items = db.query(Inventory).filter(
        Inventory.is_active == True,
        Inventory.expiry_date.isnot(None),
        Inventory.expiry_date < current_date
    ).count()
    
    # 총 재고 가치 (평균 비용 기준)
    total_value = db.query(func.sum(Inventory.current_stock * Inventory.average_cost)).filter(
        Inventory.is_active == True,
        Inventory.average_cost.isnot(None)
    ).scalar() or 0
    
    return {
        "total_items": total_items,
        "low_stock_items": low_stock_items,
        "expiring_soon": expiring_soon,
        "expired_items": expired_items,
        "total_value": float(total_value)
    }