from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class PartPrice(Base):
    __tablename__ = "part_prices"
    
    id = Column(Integer, primary_key=True, index=True)
    part_id = Column(Integer, ForeignKey("parts.id"), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), default="KRW", nullable=False)
    price_type = Column(String(20), default="purchase")  # purchase, sale, standard, average
    supplier_name = Column(String(200))
    quantity_break = Column(Integer, default=1)  # Minimum quantity for this price
    effective_date = Column(DateTime(timezone=True), nullable=False)
    expiry_date = Column(DateTime(timezone=True))
    source = Column(String(50), default="manual")  # manual, import, api, calculation
    reference_document = Column(String(200))
    notes = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    part = relationship("Part", back_populates="price_history")
    
    def __repr__(self):
        return f"<PartPrice(id={self.id}, part_id={self.part_id}, price={self.price}, type='{self.price_type}')>"
    
    @property
    def is_current(self):
        """Check if this price is currently effective"""
        from datetime import datetime
        now = datetime.now()
        
        if not self.is_active:
            return False
            
        if self.effective_date > now:
            return False
            
        if self.expiry_date and self.expiry_date < now:
            return False
            
        return True
    
    @property
    def days_until_expiry(self):
        """Calculate days until price expires"""
        if not self.expiry_date:
            return None
            
        from datetime import datetime
        delta = self.expiry_date - datetime.now()
        return delta.days if delta.days >= 0 else 0