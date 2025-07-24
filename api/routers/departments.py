from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models.department import Department
from ..schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from ..middleware.auth import get_current_user, get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[DepartmentResponse])
async def get_departments(
    skip: int = Query(0, ge=0, description="건너뛸 항목 수"),
    limit: int = Query(100, ge=1, le=1000, description="가져올 항목 수"),
    search: Optional[str] = Query(None, description="검색어 (부서명, 코드)"),
    is_active: Optional[bool] = Query(None, description="활성 상태 필터"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """부서 목록 조회"""
    query = db.query(Department)
    
    # 검색 필터
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Department.name.ilike(search_filter)) |
            (Department.code.ilike(search_filter))
        )
    
    # 활성 상태 필터
    if is_active is not None:
        query = query.filter(Department.is_active == is_active)
    
    # 정렬 및 페이징
    departments = query.order_by(Department.name).offset(skip).limit(limit).all()
    return departments


@router.get("/{department_id}", response_model=DepartmentResponse)
async def get_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """특정 부서 조회"""
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="부서를 찾을 수 없습니다")
    return department


@router.post("/", response_model=DepartmentResponse)
async def create_department(
    department: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """새 부서 생성 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    # 부서 코드 중복 확인
    if department.code:
        existing_dept = db.query(Department).filter(Department.code == department.code).first()
        if existing_dept:
            raise HTTPException(status_code=400, detail="이미 존재하는 부서 코드입니다")
    
    # 부서명 중복 확인
    existing_dept = db.query(Department).filter(Department.name == department.name).first()
    if existing_dept:
        raise HTTPException(status_code=400, detail="이미 존재하는 부서명입니다")
    
    db_department = Department(**department.dict())
    db.add(db_department)
    db.commit()
    db.refresh(db_department)
    return db_department


@router.put("/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: int,
    department: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """부서 정보 업데이트 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    db_department = db.query(Department).filter(Department.id == department_id).first()
    if not db_department:
        raise HTTPException(status_code=404, detail="부서를 찾을 수 없습니다")
    
    # 업데이트할 데이터만 추출
    update_data = department.dict(exclude_unset=True)
    
    # 부서 코드 중복 확인 (변경하는 경우)
    if "code" in update_data and update_data["code"]:
        existing_dept = db.query(Department).filter(
            Department.code == update_data["code"],
            Department.id != department_id
        ).first()
        if existing_dept:
            raise HTTPException(status_code=400, detail="이미 존재하는 부서 코드입니다")
    
    # 부서명 중복 확인 (변경하는 경우)
    if "name" in update_data:
        existing_dept = db.query(Department).filter(
            Department.name == update_data["name"],
            Department.id != department_id
        ).first()
        if existing_dept:
            raise HTTPException(status_code=400, detail="이미 존재하는 부서명입니다")
    
    # 업데이트 실행
    for field, value in update_data.items():
        setattr(db_department, field, value)
    
    db.commit()
    db.refresh(db_department)
    return db_department


@router.delete("/{department_id}")
async def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """부서 삭제 (비활성화) (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    db_department = db.query(Department).filter(Department.id == department_id).first()
    if not db_department:
        raise HTTPException(status_code=404, detail="부서를 찾을 수 없습니다")
    
    # 부서에 속한 사용자가 있는지 확인
    from ..models.user import User
    users_count = db.query(User).filter(User.department_id == department_id).count()
    if users_count > 0:
        # 사용자가 있으면 비활성화만 수행
        db_department.is_active = False
        db.commit()
        return {"message": "부서에 속한 사용자가 있어 비활성화되었습니다"}
    else:
        # 사용자가 없으면 완전 삭제
        db.delete(db_department)
        db.commit()
        return {"message": "부서가 삭제되었습니다"}


@router.patch("/{department_id}/toggle-status")
async def toggle_department_status(
    department_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """부서 활성/비활성 상태 토글 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    db_department = db.query(Department).filter(Department.id == department_id).first()
    if not db_department:
        raise HTTPException(status_code=404, detail="부서를 찾을 수 없습니다")
    
    db_department.is_active = not db_department.is_active
    db.commit()
    
    status = "활성화" if db_department.is_active else "비활성화"
    return {"message": f"부서가 {status}되었습니다", "is_active": db_department.is_active}