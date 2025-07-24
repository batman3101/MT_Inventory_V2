from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import uvicorn
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Import routers
from api.routers import auth, users, departments, categories, parts, suppliers, inventory, inbound, outbound
from api.database import engine, Base
from api.middleware.auth import get_current_user

# Create database tables
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    pass

# Initialize FastAPI app
app = FastAPI(
    title="MT Inventory Management System",
    description="Advanced Inventory Management System API",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3006", "http://localhost:3000"],  # React frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(departments.router, prefix="/api/departments", tags=["Departments"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(parts.router, prefix="/api/parts", tags=["Parts"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["Suppliers"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(inbound.router, prefix="/api/inbound", tags=["Inbound"])
app.include_router(outbound.router, prefix="/api/outbound", tags=["Outbound"])

@app.get("/")
async def root():
    return {"message": "MT Inventory Management System API v2.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )