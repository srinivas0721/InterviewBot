from fastapi import APIRouter
from datetime import datetime
from ..schemas import MessageResponse

router = APIRouter(tags=["health"])

@router.get("/health")
@router.head("/health")
async def health_check():
    """Health check endpoint for deployment platforms"""
    return {
        "status": "ok", 
        "timestamp": datetime.utcnow().isoformat()
    }