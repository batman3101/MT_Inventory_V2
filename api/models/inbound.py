from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class Inbound(Base):
    __tablename__ = "inbound"
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(100), unique=True, nullable=False, index=True)
    part_id = Column(Integer, ForeignKey("parts.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Numeric(10, 2), nullable=False)
    total_cost = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="KRW")
    exchange_rate = Column(Numeric(10, 4), default=1.0000)
    purchase_order_number = Column(String(100))
    invoice_number = Column(String(100))
    delivery_note_number = Column(String(100))
    lot_number = Column(String(100))
    serial_numbers = Column(Text)  # JSON array of serial numbers
    expiry_date = Column(DateTime(timezone=True))
    received_date = Column(DateTime(timezone=True), nullable=False)
    expected_date = Column(DateTime(timezone=True))
    quality_check_status = Column(String(20), default="pending")  # pending, passed, failed, partial
    quality_check_notes = Column(Text)
    location = Column(String(100))
    bin_location = Column(String(50))
    condition_status = Column(String(20), default="new")  # new, used, refurbished, damaged
    warranty_info = Column(Text)
    customs_declaration = Column(String(100))
    shipping_cost = Column(Numeric(10, 2), default=0.00)
    tax_amount = Column(Numeric(10, 2), default=0.00)
    discount_amount = Column(Numeric(10, 2), default=0.00)
    status = Column(String(20), default="received")  # received, processed, cancelled
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    part = relationship("Part", back_populates="inbound_records")
    supplier = relationship("Supplier", back_populates="inbound_records")
    user = relationship("User", back_populates="inbound_records")
    
    def __repr__(self):
        return f"<Inbound(id={self.id}, transaction_id='{self.transaction_id}', quantity={self.quantity})>"
    
    @property
    def total_cost_with_extras(self):
        """Calculate total cost including shipping and tax"""
        return self.total_cost + self.shipping_cost + self.tax_amount - self.discount_amount