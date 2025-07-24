from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models.category import Category
from ..schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from ..middleware.auth import get_current_user, get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[CategoryResponse])
async def get_categories(
    skip: int = Query(0, ge=0, description="건너뛸 항목 수"),
    limit: int = Query(100, ge=1, le=1000, description="가져올 항목 수"),
    search: Optional[str] = Query(None, description="검색어 (카테고리명, 코드)"),
    parent_id: Optional[int] = Query(None, description="상위 카테고리 ID"),
    is_active: Optional[bool] = Query(None, description="활성 상태 필터"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """카테고리 목록 조회"""
    query = db.query(Category)
    
    # 검색 필터
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Category.name.ilike(search_filter)) |
            (Category.code.ilike(search_filter))
        )
    
    # 상위 카테고리 필터
    if parent_id is not None:
        query = query.filter(Category.parent_id == parent_id)
    
    # 활성 상태 필터
    if is_active is not None:
        query = query.filter(Category.is_active == is_active)
    
    # 정렬 및 페이징
    categories = query.order_by(Category.name).offset(skip).limit(limit).all()
    return categories


@router.get("/tree", response_model=List[CategoryResponse])
async def get_category_tree(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """카테고리 트리 구조 조회 (최상위 카테고리부터)"""
    # 최상위 카테고리들만 조회
    root_categories = db.query(Category).filter(
        Category.parent_id.is_(None),
        Category.is_active == True
    ).order_by(Category.name).all()
    
    return root_categories


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """특정 카테고리 조회"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다")
    return category


@router.get("/{category_id}/children", response_model=List[CategoryResponse])
async def get_category_children(
    category_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """특정 카테고리의 하위 카테고리들 조회"""
    # 상위 카테고리 존재 확인
    parent_category = db.query(Category).filter(Category.id == category_id).first()
    if not parent_category:
        raise HTTPException(status_code=404, detail="상위 카테고리를 찾을 수 없습니다")
    
    # 하위 카테고리들 조회
    children = db.query(Category).filter(
        Category.parent_id == category_id,
        Category.is_active == True
    ).order_by(Category.name).all()
    
    return children


@router.post("/", response_model=CategoryResponse)
async def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """새 카테고리 생성 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    # 카테고리 코드 중복 확인
    if category.code:
        existing_category = db.query(Category).filter(Category.code == category.code).first()
        if existing_category:
            raise HTTPException(status_code=400, detail="이미 존재하는 카테고리 코드입니다")
    
    # 카테고리명 중복 확인 (같은 상위 카테고리 내에서)
    existing_category = db.query(Category).filter(
        Category.name == category.name,
        Category.parent_id == category.parent_id
    ).first()
    if existing_category:
        raise HTTPException(status_code=400, detail="같은 상위 카테고리에 이미 존재하는 카테고리명입니다")
    
    # 상위 카테고리 존재 확인
    if category.parent_id:
        parent_category = db.query(Category).filter(Category.id == category.parent_id).first()
        if not parent_category:
            raise HTTPException(status_code=400, detail="상위 카테고리를 찾을 수 없습니다")
        if not parent_category.is_active:
            raise HTTPException(status_code=400, detail="비활성화된 상위 카테고리에는 하위 카테고리를 생성할 수 없습니다")
    
    db_category = Category(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """카테고리 정보 업데이트 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다")
    
    # 업데이트할 데이터만 추출
    update_data = category.dict(exclude_unset=True)
    
    # 카테고리 코드 중복 확인 (변경하는 경우)
    if "code" in update_data and update_data["code"]:
        existing_category = db.query(Category).filter(
            Category.code == update_data["code"],
            Category.id != category_id
        ).first()
        if existing_category:
            raise HTTPException(status_code=400, detail="이미 존재하는 카테고리 코드입니다")
    
    # 카테고리명 중복 확인 (변경하는 경우)
    if "name" in update_data:
        parent_id = update_data.get("parent_id", db_category.parent_id)
        existing_category = db.query(Category).filter(
            Category.name == update_data["name"],
            Category.parent_id == parent_id,
            Category.id != category_id
        ).first()
        if existing_category:
            raise HTTPException(status_code=400, detail="같은 상위 카테고리에 이미 존재하는 카테고리명입니다")
    
    # 상위 카테고리 변경 시 순환 참조 확인
    if "parent_id" in update_data and update_data["parent_id"]:
        if update_data["parent_id"] == category_id:
            raise HTTPException(status_code=400, detail="자기 자신을 상위 카테고리로 설정할 수 없습니다")
        
        # 하위 카테고리가 상위 카테고리가 되는 것을 방지
        def is_descendant(parent_id, child_id):
            if parent_id == child_id:
                return True
            children = db.query(Category).filter(Category.parent_id == child_id).all()
            for child in children:
                if is_descendant(parent_id, child.id):
                    return True
            return False
        
        if is_descendant(update_data["parent_id"], category_id):
            raise HTTPException(status_code=400, detail="하위 카테고리를 상위 카테고리로 설정할 수 없습니다")
        
        # 새로운 상위 카테고리 존재 확인
        parent_category = db.query(Category).filter(Category.id == update_data["parent_id"]).first()
        if not parent_category:
            raise HTTPException(status_code=400, detail="상위 카테고리를 찾을 수 없습니다")
        if not parent_category.is_active:
            raise HTTPException(status_code=400, detail="비활성화된 상위 카테고리로 이동할 수 없습니다")
    
    # 업데이트 실행
    for field, value in update_data.items():
        setattr(db_category, field, value)
    
    db.commit()
    db.refresh(db_category)
    return db_category


@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """카테고리 삭제 (비활성화) (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다")
    
    # 하위 카테고리가 있는지 확인
    children_count = db.query(Category).filter(Category.parent_id == category_id).count()
    
    # 카테고리에 속한 부품이 있는지 확인
    from ..models.part import Part
    parts_count = db.query(Part).filter(Part.category_id == category_id).count()
    
    if children_count > 0 or parts_count > 0:
        # 하위 카테고리나 부품이 있으면 비활성화만 수행
        db_category.is_active = False
        db.commit()
        return {"message": "하위 카테고리나 부품이 있어 비활성화되었습니다"}
    else:
        # 하위 카테고리나 부품이 없으면 완전 삭제
        db.delete(db_category)
        db.commit()
        return {"message": "카테고리가 삭제되었습니다"}


@router.patch("/{category_id}/toggle-status")
async def toggle_category_status(
    category_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """카테고리 활성/비활성 상태 토글 (관리자/매니저 전용)"""
    if not (current_user.is_admin or current_user.is_manager):
        raise HTTPException(status_code=403, detail="관리자 또는 매니저 권한이 필요합니다")
    
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다")
    
    db_category.is_active = not db_category.is_active
    db.commit()
    
    status = "활성화" if db_category.is_active else "비활성화"
    return {"message": f"카테고리가 {status}되었습니다", "is_active": db_category.is_active}