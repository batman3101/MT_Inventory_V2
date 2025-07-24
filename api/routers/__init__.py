# 라우터 모듈 초기화
# 모든 라우터를 여기서 임포트하여 main.py에서 쉽게 사용할 수 있도록 함

from . import (
    auth,
    users,
    departments,
    categories,
    suppliers,
    parts,
    inventory,
    inbound,
    outbound,
    part_price,
    permissions
)

__all__ = [
    "auth",
    "users", 
    "departments",
    "categories",
    "suppliers",
    "parts",
    "inventory",
    "inbound",
    "outbound",
    "part_price",
    "permissions"
]