from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models.supplier import Supplier
from ..schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse
from ..middleware.auth import get_current_user, get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[SupplierResponse])
async def get_suppliers(
    skip: int = Query(0, ge=0, description="건너뛸 항목 수"),
    limit: int = Query(100, ge=1, le=1000, description="가져올 항목 수"),
    search: Optional[str] = Query(None, description="검색어 (공급업체명, 코드, 담당자명)"),
    country: Optional[str] = Query(None, description="국가 필터"),
    is_active: Optional[bool] = Query(None, description="활성 상태 필터"),
    min_quality_rating: Optional[float] = Query(None, ge=0, le=5, description="최소 품질 평점"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """공급업체 목록 조회"""
    query = db.query(Supplier)
    
    # 검색 필터
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Supplier.name.ilike(search_filter)) |
            (Supplier.code.ilike(search_filter)) |
            (Supplier.contact_person.ilike(search_filter))
        )
    
    # 국가 필터
    if country:
        query = query.filter(Supplier.country.ilike(f"%{country}%"))
    
    # 활성 상태 필터
    if is_active is not None:
        query = query.filter(Supplier.is_active == is_active)
    
    # 품질 평점 필터
    if min_quality_rating is not None:
        query = query.filter(Supplier.quality_rating >= min_quality_rating)
    
    # 정렬 및 페이징
    suppliers = query.order_by(Supplier.name).offset(skip).limit(limit).all()
    return suppliers


@router.get("/top-rated", response_model=List[SupplierResponse])
async def get_top_rated_suppliers(
    limit: int = Query(10, ge=1, le=50, description="가져올 항목 수"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """평점 높은 공급업체 목록 조회"""
    suppliers = db.query(Supplier).filter(
        Supplier.is_active == True,
        Supplier.quality_rating.isnot(None)
    ).order_by(
        Supplier.quality_rating.desc(),
        Supplier.delivery_rating.desc(),
        Supplier.price_rating.desc()
    ).limit(limit).all()
    
    return suppliers


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """특정 공급업체 조회"""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="공급업체를 찾을 수 없습니다")
    return supplier


@router.post("/", response_model=SupplierResponse)
async def create_supplier(
    supplier: SupplierCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """새 공급업체 생성 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    # 공급업체 코드 중복 확인
    if supplier.code:
        existing_supplier = db.query(Supplier).filter(Supplier.code == supplier.code).first()
        if existing_supplier:
            raise HTTPException(status_code=400, detail="이미 존재하는 공급업체 코드입니다")
    
    # 공급업체명 중복 확인
    existing_supplier = db.query(Supplier).filter(Supplier.name == supplier.name).first()
    if existing_supplier:
        raise HTTPException(status_code=400, detail="이미 존재하는 공급업체명입니다")
    
    # 사업자 등록 번호 중복 확인
    if supplier.business_registration_number:
        existing_supplier = db.query(Supplier).filter(
            Supplier.business_registration_number == supplier.business_registration_number
        ).first()
        if existing_supplier:
            raise HTTPException(status_code=400, detail="이미 존재하는 사업자 등록 번호입니다")
    
    db_supplier = Supplier(**supplier.dict())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: int,
    supplier: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """공급업체 정보 업데이트 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    db_supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="공급업체를 찾을 수 없습니다")
    
    # 업데이트할 데이터만 추출
    update_data = supplier.dict(exclude_unset=True)
    
    # 공급업체 코드 중복 확인 (변경하는 경우)
    if "code" in update_data and update_data["code"]:
        existing_supplier = db.query(Supplier).filter(
            Supplier.code == update_data["code"],
            Supplier.id != supplier_id
        ).first()
        if existing_supplier:
            raise HTTPException(status_code=400, detail="이미 존재하는 공급업체 코드입니다")
    
    # 공급업체명 중복 확인 (변경하는 경우)
    if "name" in update_data:
        existing_supplier = db.query(Supplier).filter(
            Supplier.name == update_data["name"],
            Supplier.id != supplier_id
        ).first()
        if existing_supplier:
            raise HTTPException(status_code=400, detail="이미 존재하는 공급업체명입니다")
    
    # 사업자 등록 번호 중복 확인 (변경하는 경우)
    if "business_registration_number" in update_data and update_data["business_registration_number"]:
        existing_supplier = db.query(Supplier).filter(
            Supplier.business_registration_number == update_data["business_registration_number"],
            Supplier.id != supplier_id
        ).first()
        if existing_supplier:
            raise HTTPException(status_code=400, detail="이미 존재하는 사업자 등록 번호입니다")
    
    # 업데이트 실행
    for field, value in update_data.items():
        setattr(db_supplier, field, value)
    
    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@router.delete("/{supplier_id}")
async def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """공급업체 삭제 (비활성화) (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    db_supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="공급업체를 찾을 수 없습니다")
    
    # 공급업체와 관련된 입고 기록이 있는지 확인
    from ..models.inbound import Inbound
    inbound_count = db.query(Inbound).filter(Inbound.supplier_id == supplier_id).count()
    
    if inbound_count > 0:
        # 입고 기록이 있으면 비활성화만 수행
        db_supplier.is_active = False
        db.commit()
        return {"message": "입고 기록이 있어 비활성화되었습니다"}
    else:
        # 입고 기록이 없으면 완전 삭제
        db.delete(db_supplier)
        db.commit()
        return {"message": "공급업체가 삭제되었습니다"}


@router.patch("/{supplier_id}/toggle-status")
async def toggle_supplier_status(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """공급업체 활성/비활성 상태 토글 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    db_supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="공급업체를 찾을 수 없습니다")
    
    db_supplier.is_active = not db_supplier.is_active
    db.commit()
    
    status = "활성화" if db_supplier.is_active else "비활성화"
    return {"message": f"공급업체가 {status}되었습니다", "is_active": db_supplier.is_active}


@router.patch("/{supplier_id}/rating")
async def update_supplier_rating(
    supplier_id: int,
    quality_rating: Optional[float] = Query(None, ge=0, le=5, description="품질 평점 (0-5)"),
    delivery_rating: Optional[float] = Query(None, ge=0, le=5, description="배송 평점 (0-5)"),
    price_rating: Optional[float] = Query(None, ge=0, le=5, description="가격 평점 (0-5)"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """공급업체 평점 업데이트 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    db_supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="공급업체를 찾을 수 없습니다")
    
    # 평점 업데이트
    if quality_rating is not None:
        db_supplier.quality_rating = quality_rating
    if delivery_rating is not None:
        db_supplier.delivery_rating = delivery_rating
    if price_rating is not None:
        db_supplier.price_rating = price_rating
    
    db.commit()
    db.refresh(db_supplier)
    
    return {
        "message": "공급업체 평점이 업데이트되었습니다",
        "quality_rating": db_supplier.quality_rating,
        "delivery_rating": db_supplier.delivery_rating,
        "price_rating": db_supplier.price_rating
    }