from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    contact_person = Column(String(100))
    email = Column(String(100))
    phone = Column(String(20))
    fax = Column(String(20))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(100), default="South Korea")
    website = Column(String(200))
    tax_id = Column(String(50))
    business_registration = Column(String(50))
    payment_terms = Column(String(100))
    credit_limit = Column(Numeric(12, 2))
    currency = Column(String(10), default="KRW")
    lead_time_days = Column(Integer, default=7)
    quality_rating = Column(Integer, default=5)  # 1-10 scale
    delivery_rating = Column(Integer, default=5)  # 1-10 scale
    price_rating = Column(Integer, default=5)  # 1-10 scale
    notes = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    inbound_records = relationship("Inbound", back_populates="supplier")
    
    def __repr__(self):
        return f"<Supplier(id={self.id}, name='{self.name}', code='{self.code}')>"
    
    @property
    def overall_rating(self):
        """Calculate overall supplier rating"""
        return round((self.quality_rating + self.delivery_rating + self.price_rating) / 3, 1)