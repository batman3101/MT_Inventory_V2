from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from ..database import get_db
from ..models.part_price import PartPrice
from ..schemas.part_price import PartPriceCreate, PartPriceUpdate, PartPriceResponse
from ..middleware.auth import get_current_user, get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[PartPriceResponse])
async def get_part_prices(
    skip: int = Query(0, ge=0, description="건너뛸 항목 수"),
    limit: int = Query(100, ge=1, le=1000, description="가져올 항목 수"),
    part_id: Optional[int] = Query(None, description="부품 ID 필터"),
    price_type: Optional[str] = Query(None, description="가격 유형 필터"),
    supplier_name: Optional[str] = Query(None, description="공급업체명 필터"),
    currency: Optional[str] = Query(None, description="통화 필터"),
    is_active: Optional[bool] = Query(None, description="활성 상태 필터"),
    is_current: Optional[bool] = Query(None, description="현재 유효 여부 필터"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """부품 가격 목록 조회"""
    query = db.query(PartPrice)
    
    # 부품 ID 필터
    if part_id is not None:
        query = query.filter(PartPrice.part_id == part_id)
    
    # 가격 유형 필터
    if price_type:
        query = query.filter(PartPrice.price_type == price_type)
    
    # 공급업체명 필터
    if supplier_name:
        query = query.filter(PartPrice.supplier_name.ilike(f"%{supplier_name}%"))
    
    # 통화 필터
    if currency:
        query = query.filter(PartPrice.currency == currency)
    
    # 활성 상태 필터
    if is_active is not None:
        query = query.filter(PartPrice.is_active == is_active)
    
    # 현재 유효 여부 필터
    if is_current is not None:
        current_date = datetime.now().date()
        if is_current:
            query = query.filter(
                PartPrice.effective_start_date <= current_date,
                (PartPrice.effective_end_date.is_(None)) | (PartPrice.effective_end_date >= current_date)
            )
        else:
            query = query.filter(
                (PartPrice.effective_start_date > current_date) |
                (PartPrice.effective_end_date < current_date)
            )
    
    # 정렬 및 페이징
    part_prices = query.order_by(PartPrice.effective_start_date.desc()).offset(skip).limit(limit).all()
    return part_prices


@router.get("/current", response_model=List[PartPriceResponse])
async def get_current_part_prices(
    part_id: Optional[int] = Query(None, description="부품 ID 필터"),
    price_type: Optional[str] = Query(None, description="가격 유형 필터"),
    supplier_name: Optional[str] = Query(None, description="공급업체명 필터"),
    limit: int = Query(100, ge=1, le=500, description="가져올 항목 수"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """현재 유효한 부품 가격 조회"""
    current_date = datetime.now().date()
    
    query = db.query(PartPrice).filter(
        PartPrice.is_active == True,
        PartPrice.effective_start_date <= current_date,
        (PartPrice.effective_end_date.is_(None)) | (PartPrice.effective_end_date >= current_date)
    )
    
    # 부품 ID 필터
    if part_id is not None:
        query = query.filter(PartPrice.part_id == part_id)
    
    # 가격 유형 필터
    if price_type:
        query = query.filter(PartPrice.price_type == price_type)
    
    # 공급업체명 필터
    if supplier_name:
        query = query.filter(PartPrice.supplier_name.ilike(f"%{supplier_name}%"))
    
    part_prices = query.order_by(PartPrice.price.asc()).limit(limit).all()
    return part_prices


@router.get("/expiring-soon", response_model=List[PartPriceResponse])
async def get_expiring_part_prices(
    days: int = Query(30, ge=1, le=365, description="만료까지 남은 일수"),
    limit: int = Query(50, ge=1, le=200, description="가져올 항목 수"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """만료 예정 부품 가격 조회"""
    from datetime import timedelta
    
    current_date = datetime.now().date()
    target_date = current_date + timedelta(days=days)
    
    part_prices = db.query(PartPrice).filter(
        PartPrice.is_active == True,
        PartPrice.effective_end_date.isnot(None),
        PartPrice.effective_end_date >= current_date,
        PartPrice.effective_end_date <= target_date
    ).order_by(PartPrice.effective_end_date.asc()).limit(limit).all()
    
    return part_prices


@router.get("/by-part/{part_id}", response_model=List[PartPriceResponse])
async def get_part_price_history(
    part_id: int,
    price_type: Optional[str] = Query(None, description="가격 유형 필터"),
    supplier_name: Optional[str] = Query(None, description="공급업체명 필터"),
    limit: int = Query(50, ge=1, le=200, description="가져올 항목 수"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """특정 부품의 가격 이력 조회"""
    # 부품 존재 확인
    from ..models.part import Part
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="부품을 찾을 수 없습니다")
    
    query = db.query(PartPrice).filter(PartPrice.part_id == part_id)
    
    # 가격 유형 필터
    if price_type:
        query = query.filter(PartPrice.price_type == price_type)
    
    # 공급업체명 필터
    if supplier_name:
        query = query.filter(PartPrice.supplier_name.ilike(f"%{supplier_name}%"))
    
    part_prices = query.order_by(PartPrice.effective_start_date.desc()).limit(limit).all()
    return part_prices


@router.get("/{price_id}", response_model=PartPriceResponse)
async def get_part_price(
    price_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """특정 부품 가격 조회"""
    part_price = db.query(PartPrice).filter(PartPrice.id == price_id).first()
    if not part_price:
        raise HTTPException(status_code=404, detail="부품 가격을 찾을 수 없습니다")
    
    return part_price


@router.post("/", response_model=PartPriceResponse)
async def create_part_price(
    part_price: PartPriceCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """새 부품 가격 생성 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    # 부품 존재 확인
    from ..models.part import Part
    part = db.query(Part).filter(Part.id == part_price.part_id).first()
    if not part:
        raise HTTPException(status_code=400, detail="부품을 찾을 수 없습니다")
    
    # 날짜 유효성 검사
    if part_price.effective_end_date and part_price.effective_start_date >= part_price.effective_end_date:
        raise HTTPException(status_code=400, detail="시작 날짜는 종료 날짜보다 이전이어야 합니다")
    
    # 중복 가격 확인 (같은 부품, 공급업체, 가격 유형, 기간 겹침)
    existing_price = db.query(PartPrice).filter(
        PartPrice.part_id == part_price.part_id,
        PartPrice.supplier_name == part_price.supplier_name,
        PartPrice.price_type == part_price.price_type,
        PartPrice.is_active == True,
        PartPrice.effective_start_date <= (part_price.effective_end_date or date.max),
        (PartPrice.effective_end_date.is_(None)) | (PartPrice.effective_end_date >= part_price.effective_start_date)
    ).first()
    
    if existing_price:
        raise HTTPException(status_code=400, detail="같은 기간에 중복되는 가격이 이미 존재합니다")
    
    db_part_price = PartPrice(**part_price.dict())
    db.add(db_part_price)
    db.commit()
    db.refresh(db_part_price)
    
    return db_part_price


@router.put("/{price_id}", response_model=PartPriceResponse)
async def update_part_price(
    price_id: int,
    part_price: PartPriceUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """부품 가격 업데이트 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    db_part_price = db.query(PartPrice).filter(PartPrice.id == price_id).first()
    if not db_part_price:
        raise HTTPException(status_code=404, detail="부품 가격을 찾을 수 없습니다")
    
    # 업데이트할 데이터만 추출
    update_data = part_price.dict(exclude_unset=True)
    
    # 부품 변경 시 존재 확인
    if "part_id" in update_data:
        from ..models.part import Part
        part = db.query(Part).filter(Part.id == update_data["part_id"]).first()
        if not part:
            raise HTTPException(status_code=400, detail="부품을 찾을 수 없습니다")
    
    # 날짜 유효성 검사
    start_date = update_data.get("effective_start_date", db_part_price.effective_start_date)
    end_date = update_data.get("effective_end_date", db_part_price.effective_end_date)
    
    if end_date and start_date >= end_date:
        raise HTTPException(status_code=400, detail="시작 날짜는 종료 날짜보다 이전이어야 합니다")
    
    # 중복 가격 확인 (자기 자신 제외)
    part_id = update_data.get("part_id", db_part_price.part_id)
    supplier_name = update_data.get("supplier_name", db_part_price.supplier_name)
    price_type = update_data.get("price_type", db_part_price.price_type)
    
    existing_price = db.query(PartPrice).filter(
        PartPrice.id != price_id,
        PartPrice.part_id == part_id,
        PartPrice.supplier_name == supplier_name,
        PartPrice.price_type == price_type,
        PartPrice.is_active == True,
        PartPrice.effective_start_date <= (end_date or date.max),
        (PartPrice.effective_end_date.is_(None)) | (PartPrice.effective_end_date >= start_date)
    ).first()
    
    if existing_price:
        raise HTTPException(status_code=400, detail="같은 기간에 중복되는 가격이 이미 존재합니다")
    
    # 업데이트 실행
    for field, value in update_data.items():
        setattr(db_part_price, field, value)
    
    db.commit()
    db.refresh(db_part_price)
    return db_part_price


@router.delete("/{price_id}")
async def delete_part_price(
    price_id: int,
    force: bool = Query(False, description="강제 삭제 여부"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """부품 가격 삭제 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    db_part_price = db.query(PartPrice).filter(PartPrice.id == price_id).first()
    if not db_part_price:
        raise HTTPException(status_code=404, detail="부품 가격을 찾을 수 없습니다")
    
    # 현재 유효한 가격인지 확인
    current_date = datetime.now().date()
    is_current = (
        db_part_price.effective_start_date <= current_date and
        (db_part_price.effective_end_date is None or db_part_price.effective_end_date >= current_date)
    )
    
    if is_current and not force:
        # 현재 유효한 가격은 비활성화만
        db_part_price.is_active = False
        db.commit()
        return {"message": "현재 유효한 가격이므로 비활성화되었습니다"}
    else:
        # 완전 삭제
        db.delete(db_part_price)
        db.commit()
        return {"message": "부품 가격이 삭제되었습니다"}


@router.patch("/{price_id}/toggle-active")
async def toggle_part_price_active(
    price_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """부품 가격 활성/비활성 상태 토글 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    db_part_price = db.query(PartPrice).filter(PartPrice.id == price_id).first()
    if not db_part_price:
        raise HTTPException(status_code=404, detail="부품 가격을 찾을 수 없습니다")
    
    db_part_price.is_active = not db_part_price.is_active
    db.commit()
    db.refresh(db_part_price)
    
    status = "활성화" if db_part_price.is_active else "비활성화"
    return {"message": f"부품 가격이 {status}되었습니다", "is_active": db_part_price.is_active}


@router.get("/summary/stats")
async def get_part_price_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """부품 가격 통계 조회"""
    from sqlalchemy import func
    from datetime import timedelta
    
    current_date = datetime.now().date()
    
    # 전체 가격 항목 수
    total_prices = db.query(PartPrice).count()
    
    # 활성 가격 항목 수
    active_prices = db.query(PartPrice).filter(PartPrice.is_active == True).count()
    
    # 현재 유효한 가격 항목 수
    current_valid_prices = db.query(PartPrice).filter(
        PartPrice.is_active == True,
        PartPrice.effective_start_date <= current_date,
        (PartPrice.effective_end_date.is_(None)) | (PartPrice.effective_end_date >= current_date)
    ).count()
    
    # 30일 내 만료 예정 가격 항목 수
    expiring_soon = db.query(PartPrice).filter(
        PartPrice.is_active == True,
        PartPrice.effective_end_date.isnot(None),
        PartPrice.effective_end_date >= current_date,
        PartPrice.effective_end_date <= current_date + timedelta(days=30)
    ).count()
    
    # 만료된 가격 항목 수
    expired_prices = db.query(PartPrice).filter(
        PartPrice.effective_end_date.isnot(None),
        PartPrice.effective_end_date < current_date
    ).count()
    
    return {
        "total_prices": total_prices,
        "active_prices": active_prices,
        "current_valid_prices": current_valid_prices,
        "expiring_soon": expiring_soon,
        "expired_prices": expired_prices
    }