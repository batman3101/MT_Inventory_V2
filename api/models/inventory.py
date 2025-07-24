from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class Inventory(Base):
    __tablename__ = "inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    part_id = Column(Integer, ForeignKey("parts.id"), nullable=False)
    current_stock = Column(Integer, default=0, nullable=False)
    reserved_stock = Column(Integer, default=0, nullable=False)
    available_stock = Column(Integer, default=0, nullable=False)
    location = Column(String(100))
    bin_location = Column(String(50))
    lot_number = Column(String(100))
    serial_numbers = Column(Text)  # JSON array of serial numbers
    expiry_date = Column(DateTime(timezone=True))
    last_counted = Column(DateTime(timezone=True))
    last_movement = Column(DateTime(timezone=True))
    average_cost = Column(Numeric(10, 2), default=0.00)
    total_value = Column(Numeric(12, 2), default=0.00)
    reorder_status = Column(String(20), default="normal")  # normal, low, critical, excess
    notes = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    part = relationship("Part", back_populates="inventory_records")
    
    def __repr__(self):
        return f"<Inventory(id={self.id}, part_id={self.part_id}, current_stock={self.current_stock})>"
    
    @property
    def stock_status(self):
        """Determine stock status based on reorder points"""
        if not self.part:
            return "unknown"
        
        if self.current_stock <= 0:
            return "out_of_stock"
        elif self.current_stock <= self.part.reorder_point:
            return "low_stock"
        elif self.current_stock >= self.part.maximum_stock:
            return "excess_stock"
        else:
            return "normal"
    
    def update_available_stock(self):
        """Update available stock calculation"""
        self.available_stock = max(0, self.current_stock - self.reserved_stock)
        
    def update_total_value(self):
        """Update total inventory value"""
        self.total_value = self.current_stock * self.average_cost