from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models.permission import Permission, RolePermission
from ..schemas.permission import (
    PermissionCreate, PermissionUpdate, PermissionResponse,
    RolePermissionCreate, RolePermissionUpdate, RolePermissionResponse
)
from ..middleware.auth import get_current_user, get_current_active_user

router = APIRouter()


# Permission 관련 엔드포인트
@router.get("/", response_model=List[PermissionResponse])
async def get_permissions(
    skip: int = Query(0, ge=0, description="건너뛸 항목 수"),
    limit: int = Query(100, ge=1, le=1000, description="가져올 항목 수"),
    search: Optional[str] = Query(None, description="권한명 또는 코드 검색"),
    module: Optional[str] = Query(None, description="모듈 필터"),
    action: Optional[str] = Query(None, description="액션 필터"),
    is_active: Optional[bool] = Query(None, description="활성 상태 필터"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """권한 목록 조회 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    query = db.query(Permission)
    
    # 검색 필터
    if search:
        query = query.filter(
            (Permission.name.ilike(f"%{search}%")) |
            (Permission.code.ilike(f"%{search}%"))
        )
    
    # 모듈 필터
    if module:
        query = query.filter(Permission.module == module)
    
    # 액션 필터
    if action:
        query = query.filter(Permission.action == action)
    
    # 활성 상태 필터
    if is_active is not None:
        query = query.filter(Permission.is_active == is_active)
    
    # 정렬 및 페이징
    permissions = query.order_by(Permission.module, Permission.action).offset(skip).limit(limit).all()
    return permissions


@router.get("/modules")
async def get_permission_modules(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """권한 모듈 목록 조회 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    from sqlalchemy import distinct
    
    modules = db.query(distinct(Permission.module)).filter(
        Permission.is_active == True
    ).order_by(Permission.module).all()
    
    return [module[0] for module in modules if module[0]]


@router.get("/actions")
async def get_permission_actions(
    module: Optional[str] = Query(None, description="모듈 필터"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """권한 액션 목록 조회 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    from sqlalchemy import distinct
    
    query = db.query(distinct(Permission.action)).filter(Permission.is_active == True)
    
    if module:
        query = query.filter(Permission.module == module)
    
    actions = query.order_by(Permission.action).all()
    
    return [action[0] for action in actions if action[0]]


@router.get("/by-module/{module}", response_model=List[PermissionResponse])
async def get_permissions_by_module(
    module: str,
    is_active: Optional[bool] = Query(True, description="활성 상태 필터"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """모듈별 권한 조회 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    query = db.query(Permission).filter(Permission.module == module)
    
    if is_active is not None:
        query = query.filter(Permission.is_active == is_active)
    
    permissions = query.order_by(Permission.action).all()
    return permissions


@router.get("/{permission_id}", response_model=PermissionResponse)
async def get_permission(
    permission_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """특정 권한 조회 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not permission:
        raise HTTPException(status_code=404, detail="권한을 찾을 수 없습니다")
    
    return permission


@router.post("/", response_model=PermissionResponse)
async def create_permission(
    permission: PermissionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """새 권한 생성 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    # 권한 코드 중복 확인
    existing_permission = db.query(Permission).filter(Permission.code == permission.code).first()
    if existing_permission:
        raise HTTPException(status_code=400, detail="이미 존재하는 권한 코드입니다")
    
    # 권한명 중복 확인 (같은 모듈 내에서)
    existing_name = db.query(Permission).filter(
        Permission.name == permission.name,
        Permission.module == permission.module
    ).first()
    if existing_name:
        raise HTTPException(status_code=400, detail="같은 모듈에 이미 존재하는 권한명입니다")
    
    db_permission = Permission(**permission.dict())
    db.add(db_permission)
    db.commit()
    db.refresh(db_permission)
    
    return db_permission


@router.put("/{permission_id}", response_model=PermissionResponse)
async def update_permission(
    permission_id: int,
    permission: PermissionUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """권한 업데이트 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    db_permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not db_permission:
        raise HTTPException(status_code=404, detail="권한을 찾을 수 없습니다")
    
    # 업데이트할 데이터만 추출
    update_data = permission.dict(exclude_unset=True)
    
    # 권한 코드 중복 확인
    if "code" in update_data:
        existing_permission = db.query(Permission).filter(
            Permission.code == update_data["code"],
            Permission.id != permission_id
        ).first()
        if existing_permission:
            raise HTTPException(status_code=400, detail="이미 존재하는 권한 코드입니다")
    
    # 권한명 중복 확인 (같은 모듈 내에서)
    if "name" in update_data or "module" in update_data:
        name = update_data.get("name", db_permission.name)
        module = update_data.get("module", db_permission.module)
        
        existing_name = db.query(Permission).filter(
            Permission.name == name,
            Permission.module == module,
            Permission.id != permission_id
        ).first()
        if existing_name:
            raise HTTPException(status_code=400, detail="같은 모듈에 이미 존재하는 권한명입니다")
    
    # 업데이트 실행
    for field, value in update_data.items():
        setattr(db_permission, field, value)
    
    db.commit()
    db.refresh(db_permission)
    return db_permission


@router.delete("/{permission_id}")
async def delete_permission(
    permission_id: int,
    force: bool = Query(False, description="강제 삭제 여부"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """권한 삭제 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    db_permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not db_permission:
        raise HTTPException(status_code=404, detail="권한을 찾을 수 없습니다")
    
    # 역할에 할당된 권한인지 확인
    role_permission_count = db.query(RolePermission).filter(
        RolePermission.permission_id == permission_id
    ).count()
    
    if role_permission_count > 0 and not force:
        # 역할에 할당된 권한은 비활성화만
        db_permission.is_active = False
        db.commit()
        return {"message": "역할에 할당된 권한이므로 비활성화되었습니다"}
    else:
        # 완전 삭제 (역할 권한도 함께 삭제)
        db.query(RolePermission).filter(RolePermission.permission_id == permission_id).delete()
        db.delete(db_permission)
        db.commit()
        return {"message": "권한이 삭제되었습니다"}


@router.patch("/{permission_id}/toggle-active")
async def toggle_permission_active(
    permission_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """권한 활성/비활성 상태 토글 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    db_permission = db.query(Permission).filter(Permission.id == permission_id).first()
    if not db_permission:
        raise HTTPException(status_code=404, detail="권한을 찾을 수 없습니다")
    
    db_permission.is_active = not db_permission.is_active
    db.commit()
    db.refresh(db_permission)
    
    status = "활성화" if db_permission.is_active else "비활성화"
    return {"message": f"권한이 {status}되었습니다", "is_active": db_permission.is_active}


# RolePermission 관련 엔드포인트
@router.get("/role-permissions/", response_model=List[RolePermissionResponse])
async def get_role_permissions(
    skip: int = Query(0, ge=0, description="건너뛸 항목 수"),
    limit: int = Query(100, ge=1, le=1000, description="가져올 항목 수"),
    role: Optional[str] = Query(None, description="역할 필터"),
    permission_id: Optional[int] = Query(None, description="권한 ID 필터"),
    is_granted: Optional[bool] = Query(None, description="부여 여부 필터"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """역할 권한 목록 조회 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    query = db.query(RolePermission)
    
    # 역할 필터
    if role:
        query = query.filter(RolePermission.role == role)
    
    # 권한 ID 필터
    if permission_id is not None:
        query = query.filter(RolePermission.permission_id == permission_id)
    
    # 부여 여부 필터
    if is_granted is not None:
        query = query.filter(RolePermission.is_granted == is_granted)
    
    # 정렬 및 페이징
    role_permissions = query.order_by(RolePermission.role, RolePermission.permission_id).offset(skip).limit(limit).all()
    return role_permissions


@router.get("/role-permissions/by-role/{role}", response_model=List[RolePermissionResponse])
async def get_permissions_by_role(
    role: str,
    is_granted: Optional[bool] = Query(True, description="부여 여부 필터"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """역할별 권한 조회 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    query = db.query(RolePermission).filter(RolePermission.role == role)
    
    if is_granted is not None:
        query = query.filter(RolePermission.is_granted == is_granted)
    
    role_permissions = query.order_by(RolePermission.permission_id).all()
    return role_permissions


@router.get("/role-permissions/{role_permission_id}", response_model=RolePermissionResponse)
async def get_role_permission(
    role_permission_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """특정 역할 권한 조회 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    role_permission = db.query(RolePermission).filter(RolePermission.id == role_permission_id).first()
    if not role_permission:
        raise HTTPException(status_code=404, detail="역할 권한을 찾을 수 없습니다")
    
    return role_permission


@router.post("/role-permissions/", response_model=RolePermissionResponse)
async def create_role_permission(
    role_permission: RolePermissionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """새 역할 권한 생성 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    # 권한 존재 확인
    permission = db.query(Permission).filter(Permission.id == role_permission.permission_id).first()
    if not permission:
        raise HTTPException(status_code=400, detail="권한을 찾을 수 없습니다")
    
    # 중복 확인
    existing_role_permission = db.query(RolePermission).filter(
        RolePermission.role == role_permission.role,
        RolePermission.permission_id == role_permission.permission_id
    ).first()
    if existing_role_permission:
        raise HTTPException(status_code=400, detail="이미 존재하는 역할 권한입니다")
    
    # 역할 권한 생성
    role_permission_data = role_permission.dict()
    role_permission_data["granted_by"] = current_user.id
    role_permission_data["granted_date"] = datetime.now()
    
    db_role_permission = RolePermission(**role_permission_data)
    db.add(db_role_permission)
    db.commit()
    db.refresh(db_role_permission)
    
    return db_role_permission


@router.put("/role-permissions/{role_permission_id}", response_model=RolePermissionResponse)
async def update_role_permission(
    role_permission_id: int,
    role_permission: RolePermissionUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """역할 권한 업데이트 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    db_role_permission = db.query(RolePermission).filter(RolePermission.id == role_permission_id).first()
    if not db_role_permission:
        raise HTTPException(status_code=404, detail="역할 권한을 찾을 수 없습니다")
    
    # 업데이트할 데이터만 추출
    update_data = role_permission.dict(exclude_unset=True)
    
    # 권한 변경 시 존재 확인
    if "permission_id" in update_data:
        permission = db.query(Permission).filter(Permission.id == update_data["permission_id"]).first()
        if not permission:
            raise HTTPException(status_code=400, detail="권한을 찾을 수 없습니다")
    
    # 중복 확인 (역할과 권한 ID 조합)
    if "role" in update_data or "permission_id" in update_data:
        role = update_data.get("role", db_role_permission.role)
        permission_id = update_data.get("permission_id", db_role_permission.permission_id)
        
        existing_role_permission = db.query(RolePermission).filter(
            RolePermission.role == role,
            RolePermission.permission_id == permission_id,
            RolePermission.id != role_permission_id
        ).first()
        if existing_role_permission:
            raise HTTPException(status_code=400, detail="이미 존재하는 역할 권한입니다")
    
    # 업데이트 실행
    for field, value in update_data.items():
        setattr(db_role_permission, field, value)
    
    db.commit()
    db.refresh(db_role_permission)
    return db_role_permission


@router.delete("/role-permissions/{role_permission_id}")
async def delete_role_permission(
    role_permission_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """역할 권한 삭제 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    db_role_permission = db.query(RolePermission).filter(RolePermission.id == role_permission_id).first()
    if not db_role_permission:
        raise HTTPException(status_code=404, detail="역할 권한을 찾을 수 없습니다")
    
    db.delete(db_role_permission)
    db.commit()
    return {"message": "역할 권한이 삭제되었습니다"}


@router.patch("/role-permissions/{role_permission_id}/toggle-grant")
async def toggle_role_permission_grant(
    role_permission_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """역할 권한 부여/취소 토글 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    db_role_permission = db.query(RolePermission).filter(RolePermission.id == role_permission_id).first()
    if not db_role_permission:
        raise HTTPException(status_code=404, detail="역할 권한을 찾을 수 없습니다")
    
    db_role_permission.is_granted = not db_role_permission.is_granted
    db_role_permission.granted_by = current_user.id
    db_role_permission.granted_date = datetime.now()
    
    db.commit()
    db.refresh(db_role_permission)
    
    status = "부여" if db_role_permission.is_granted else "취소"
    return {"message": f"역할 권한이 {status}되었습니다", "is_granted": db_role_permission.is_granted}


@router.get("/summary/stats")
async def get_permission_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """권한 통계 조회 (관리자 전용)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    from sqlalchemy import func, distinct
    
    # 전체 권한 수
    total_permissions = db.query(Permission).count()
    
    # 활성 권한 수
    active_permissions = db.query(Permission).filter(Permission.is_active == True).count()
    
    # 모듈 수
    total_modules = db.query(distinct(Permission.module)).filter(
        Permission.is_active == True
    ).count()
    
    # 역할 권한 수
    total_role_permissions = db.query(RolePermission).count()
    
    # 부여된 역할 권한 수
    granted_role_permissions = db.query(RolePermission).filter(
        RolePermission.is_granted == True
    ).count()
    
    # 역할 수
    total_roles = db.query(distinct(RolePermission.role)).count()
    
    return {
        "total_permissions": total_permissions,
        "active_permissions": active_permissions,
        "total_modules": total_modules,
        "total_role_permissions": total_role_permissions,
        "granted_role_permissions": granted_role_permissions,
        "total_roles": total_roles
    }