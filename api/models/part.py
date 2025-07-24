from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class Part(Base):
    __tablename__ = "parts"
    
    id = Column(Integer, primary_key=True, index=True)
    part_number = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    unit = Column(String(20), nullable=False, default="EA")
    unit_price = Column(Numeric(10, 2), default=0.00)
    minimum_stock = Column(Integer, default=0)
    maximum_stock = Column(Integer, default=1000)
    reorder_point = Column(Integer, default=10)
    location = Column(String(100))
    barcode = Column(String(100), unique=True)
    manufacturer = Column(String(100))
    model_number = Column(String(100))
    specifications = Column(Text)
    weight = Column(Numeric(8, 3))
    dimensions = Column(String(100))
    material = Column(String(100))
    color = Column(String(50))
    warranty_period = Column(String(50))
    safety_stock = Column(Integer, default=0)
    lead_time_days = Column(Integer, default=7)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    category = relationship("Category", back_populates="parts")
    inventory_records = relationship("Inventory", back_populates="part")
    inbound_records = relationship("Inbound", back_populates="part")
    outbound_records = relationship("Outbound", back_populates="part")
    price_history = relationship("PartPrice", back_populates="part")
    
    def __repr__(self):
        return f"<Part(id={self.id}, part_number='{self.part_number}', name='{self.name}')>"