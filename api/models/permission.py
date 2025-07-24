from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text)
    module = Column(String(50), nullable=False)  # users, parts, inventory, reports, etc.
    action = Column(String(50), nullable=False)  # create, read, update, delete, export, etc.
    resource = Column(String(100))  # specific resource if applicable
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    role_permissions = relationship("RolePermission", back_populates="permission")
    
    def __repr__(self):
        return f"<Permission(id={self.id}, name='{self.name}', code='{self.code}')>"

class RolePermission(Base):
    __tablename__ = "role_permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    role = Column(String(20), nullable=False, index=True)  # admin, manager, user
    permission_id = Column(Integer, ForeignKey("permissions.id"), nullable=False)
    granted = Column(Boolean, default=True, nullable=False)
    granted_by = Column(String(100))
    granted_date = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    permission = relationship("Permission", back_populates="role_permissions")
    
    def __repr__(self):
        return f"<RolePermission(id={self.id}, role='{self.role}', permission_id={self.permission_id})>"