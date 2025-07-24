from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class Outbound(Base):
    __tablename__ = "outbound"
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(100), unique=True, nullable=False, index=True)
    part_id = Column(Integer, ForeignKey("parts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Numeric(10, 2), nullable=False)
    total_cost = Column(Numeric(12, 2), nullable=False)
    request_department = Column(String(100), nullable=False)
    requester_name = Column(String(100), nullable=False)
    requester_email = Column(String(100))
    purpose = Column(String(200))
    project_code = Column(String(100))
    cost_center = Column(String(100))
    work_order_number = Column(String(100))
    delivery_address = Column(Text)
    lot_number = Column(String(100))
    serial_numbers = Column(Text)  # JSON array of serial numbers
    requested_date = Column(DateTime(timezone=True), nullable=False)
    required_date = Column(DateTime(timezone=True))
    issued_date = Column(DateTime(timezone=True))
    delivered_date = Column(DateTime(timezone=True))
    location = Column(String(100))
    bin_location = Column(String(50))
    priority = Column(String(20), default="normal")  # urgent, high, normal, low
    approval_status = Column(String(20), default="pending")  # pending, approved, rejected
    approval_notes = Column(Text)
    approved_by = Column(String(100))
    approved_date = Column(DateTime(timezone=True))
    delivery_method = Column(String(50), default="pickup")  # pickup, delivery, courier
    tracking_number = Column(String(100))
    recipient_signature = Column(String(200))
    return_expected = Column(Boolean, default=False)
    return_date = Column(DateTime(timezone=True))
    status = Column(String(20), default="requested")  # requested, approved, issued, delivered, completed, cancelled
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    part = relationship("Part", back_populates="outbound_records")
    user = relationship("User", back_populates="outbound_records")
    
    def __repr__(self):
        return f"<Outbound(id={self.id}, transaction_id='{self.transaction_id}', quantity={self.quantity})>"
    
    @property
    def is_overdue(self):
        """Check if delivery is overdue"""
        if self.required_date and self.status not in ['delivered', 'completed']:
            from datetime import datetime
            return datetime.now() > self.required_date
        return False
    
    @property
    def days_pending(self):
        """Calculate days since request"""
        from datetime import datetime
        return (datetime.now() - self.created_at).days