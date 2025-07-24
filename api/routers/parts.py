from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models.part import Part
from ..schemas.part import PartCreate, PartUpdate, PartResponse
from ..middleware.auth import get_current_user, get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[PartResponse])
async def get_parts(
    skip: int = Query(0, ge=0, description="건너뛸 항목 수"),
    limit: int = Query(100, ge=1, le=1000, description="가져올 항목 수"),
    search: Optional[str] = Query(None, description="검색어 (부품번호, 이름, 설명)"),
    category_id: Optional[int] = Query(None, description="카테고리 ID 필터"),
    manufacturer: Optional[str] = Query(None, description="제조업체 필터"),
    is_active: Optional[bool] = Query(None, description="활성 상태 필터"),
    low_stock: Optional[bool] = Query(None, description="재고 부족 필터"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """부품 목록 조회"""
    query = db.query(Part)
    
    # 검색 필터
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Part.part_number.ilike(search_filter)) |
            (Part.name.ilike(search_filter)) |
            (Part.description.ilike(search_filter))
        )
    
    # 카테고리 필터
    if category_id is not None:
        query = query.filter(Part.category_id == category_id)
    
    # 제조업체 필터
    if manufacturer:
        query = query.filter(Part.manufacturer.ilike(f"%{manufacturer}%"))
    
    # 활성 상태 필터
    if is_active is not None:
        query = query.filter(Part.is_active == is_active)
    
    # 재고 부족 필터
    if low_stock:
        query = query.filter(Part.current_stock <= Part.safety_stock)
    
    # 정렬 및 페이징
    parts = query.order_by(Part.part_number).offset(skip).limit(limit).all()
    return parts


@router.get("/low-stock", response_model=List[PartResponse])
async def get_low_stock_parts(
    limit: int = Query(50, ge=1, le=200, description="가져올 항목 수"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """재고 부족 부품 목록 조회"""
    parts = db.query(Part).filter(
        Part.is_active == True,
        Part.current_stock <= Part.safety_stock
    ).order_by(
        (Part.current_stock - Part.safety_stock).asc(),
        Part.part_number
    ).limit(limit).all()
    
    return parts


@router.get("/search-by-barcode/{barcode}", response_model=PartResponse)
async def search_part_by_barcode(
    barcode: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """바코드로 부품 검색"""
    part = db.query(Part).filter(Part.barcode == barcode).first()
    if not part:
        raise HTTPException(status_code=404, detail="해당 바코드의 부품을 찾을 수 없습니다")
    return part


@router.get("/{part_id}", response_model=PartResponse)
async def get_part(
    part_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """특정 부품 조회"""
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="부품을 찾을 수 없습니다")
    return part


@router.post("/", response_model=PartResponse)
async def create_part(
    part: PartCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """새 부품 생성 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    # 부품 번호 중복 확인
    existing_part = db.query(Part).filter(Part.part_number == part.part_number).first()
    if existing_part:
        raise HTTPException(status_code=400, detail="이미 존재하는 부품 번호입니다")
    
    # 바코드 중복 확인 (바코드가 있는 경우)
    if part.barcode:
        existing_part = db.query(Part).filter(Part.barcode == part.barcode).first()
        if existing_part:
            raise HTTPException(status_code=400, detail="이미 존재하는 바코드입니다")
    
    # 카테고리 존재 확인
    if part.category_id:
        from ..models.category import Category
        category = db.query(Category).filter(Category.id == part.category_id).first()
        if not category:
            raise HTTPException(status_code=400, detail="카테고리를 찾을 수 없습니다")
        if not category.is_active:
            raise HTTPException(status_code=400, detail="비활성화된 카테고리에는 부품을 생성할 수 없습니다")
    
    db_part = Part(**part.dict())
    db.add(db_part)
    db.commit()
    db.refresh(db_part)
    return db_part


@router.put("/{part_id}", response_model=PartResponse)
async def update_part(
    part_id: int,
    part: PartUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """부품 정보 업데이트 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    db_part = db.query(Part).filter(Part.id == part_id).first()
    if not db_part:
        raise HTTPException(status_code=404, detail="부품을 찾을 수 없습니다")
    
    # 업데이트할 데이터만 추출
    update_data = part.dict(exclude_unset=True)
    
    # 부품 번호 중복 확인 (변경하는 경우)
    if "part_number" in update_data:
        existing_part = db.query(Part).filter(
            Part.part_number == update_data["part_number"],
            Part.id != part_id
        ).first()
        if existing_part:
            raise HTTPException(status_code=400, detail="이미 존재하는 부품 번호입니다")
    
    # 바코드 중복 확인 (변경하는 경우)
    if "barcode" in update_data and update_data["barcode"]:
        existing_part = db.query(Part).filter(
            Part.barcode == update_data["barcode"],
            Part.id != part_id
        ).first()
        if existing_part:
            raise HTTPException(status_code=400, detail="이미 존재하는 바코드입니다")
    
    # 카테고리 존재 확인 (변경하는 경우)
    if "category_id" in update_data and update_data["category_id"]:
        from ..models.category import Category
        category = db.query(Category).filter(Category.id == update_data["category_id"]).first()
        if not category:
            raise HTTPException(status_code=400, detail="카테고리를 찾을 수 없습니다")
        if not category.is_active:
            raise HTTPException(status_code=400, detail="비활성화된 카테고리로 이동할 수 없습니다")
    
    # 업데이트 실행
    for field, value in update_data.items():
        setattr(db_part, field, value)
    
    db.commit()
    db.refresh(db_part)
    return db_part


@router.delete("/{part_id}")
async def delete_part(
    part_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """부품 삭제 (비활성화) (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    db_part = db.query(Part).filter(Part.id == part_id).first()
    if not db_part:
        raise HTTPException(status_code=404, detail="부품을 찾을 수 없습니다")
    
    # 부품과 관련된 재고가 있는지 확인
    from ..models.inventory import Inventory
    inventory_count = db.query(Inventory).filter(Inventory.part_id == part_id).count()
    
    # 부품과 관련된 입고/출고 기록이 있는지 확인
    from ..models.inbound import Inbound
    from ..models.outbound import Outbound
    inbound_count = db.query(Inbound).filter(Inbound.part_id == part_id).count()
    outbound_count = db.query(Outbound).filter(Outbound.part_id == part_id).count()
    
    if inventory_count > 0 or inbound_count > 0 or outbound_count > 0:
        # 관련 기록이 있으면 비활성화만 수행
        db_part.is_active = False
        db.commit()
        return {"message": "재고나 입출고 기록이 있어 비활성화되었습니다"}
    else:
        # 관련 기록이 없으면 완전 삭제
        db.delete(db_part)
        db.commit()
        return {"message": "부품이 삭제되었습니다"}


@router.patch("/{part_id}/toggle-status")
async def toggle_part_status(
    part_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """부품 활성/비활성 상태 토글 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    db_part = db.query(Part).filter(Part.id == part_id).first()
    if not db_part:
        raise HTTPException(status_code=404, detail="부품을 찾을 수 없습니다")
    
    db_part.is_active = not db_part.is_active
    db.commit()
    
    status = "활성화" if db_part.is_active else "비활성화"
    return {"message": f"부품이 {status}되었습니다", "is_active": db_part.is_active}


@router.patch("/{part_id}/stock")
async def update_part_stock(
    part_id: int,
    current_stock: Optional[int] = Query(None, ge=0, description="현재 재고량"),
    safety_stock: Optional[int] = Query(None, ge=0, description="안전 재고량"),
    reorder_point: Optional[int] = Query(None, ge=0, description="재주문 시점"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """부품 재고 정보 업데이트 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    db_part = db.query(Part).filter(Part.id == part_id).first()
    if not db_part:
        raise HTTPException(status_code=404, detail="부품을 찾을 수 없습니다")
    
    # 재고 정보 업데이트
    if current_stock is not None:
        db_part.current_stock = current_stock
    if safety_stock is not None:
        db_part.safety_stock = safety_stock
    if reorder_point is not None:
        db_part.reorder_point = reorder_point
    
    db.commit()
    db.refresh(db_part)
    
    return {
        "message": "부품 재고 정보가 업데이트되었습니다",
        "current_stock": db_part.current_stock,
        "safety_stock": db_part.safety_stock,
        "reorder_point": db_part.reorder_point
    }