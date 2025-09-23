from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session
import os

from .routers import auth, interviews, dashboard, health
from .database import engine, Base, get_db
from .config import settings
from .schemas import UserUpdate, UserResponse
from .models import User

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="InterviewBot API",
    description="AI-powered interview practice platform",
    version="1.0.0"
)

# Add session middleware
app.add_middleware(
    SessionMiddleware, 
    secret_key=settings.session_secret
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",
        "http://localhost:5173", 
        "https://interviewbot-frontend.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api/auth")
app.include_router(interviews.router, prefix="/api/interviews")
app.include_router(dashboard.router, prefix="/api/dashboard")

# Profile endpoint at root level to match frontend expectations
@app.put("/api/profile")
async def update_profile_root(
    profile_data: UserUpdate, 
    request: Request, 
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Update user profile - root level endpoint to match frontend"""
    
    try:
        # Update user profile using proper SQLAlchemy update
        db.query(User).filter(User.id == current_user.id).update({
            "experience_level": profile_data.experience_level,
            "target_companies": profile_data.target_companies,
            "target_roles": profile_data.target_roles
        })
        
        db.commit()
        
        # Get updated user
        updated_user = db.query(User).filter(User.id == current_user.id).first()
        
        return {"user": UserResponse.model_validate(updated_user)}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Profile update failed: {str(e)}")

# Public sharing endpoint
@app.get("/api/share/{share_token}")
async def get_shared_interview(share_token: str, db: Session = Depends(get_db)):
    """Public endpoint to view shared interview results"""
    try:
        from .models import InterviewSession, User
        from sqlalchemy import and_
        
        # Find the session by share token
        result = db.query(InterviewSession, User).join(
            User, InterviewSession.user_id == User.id
        ).filter(
            and_(
                InterviewSession.share_token == share_token,
                InterviewSession.status == "completed"
            )
        ).first()
        
        if not result:
            raise HTTPException(status_code=404, detail="Shared interview not found")
            
        session, user = result
        
        # Return public results (excluding sensitive info)
        return {
            "session": {
                "id": str(session.id),
                "company": session.company,
                "role": session.role,
                "mode": session.mode,
                "status": session.status,
                "total_questions": session.total_questions,
                "completed_at": session.completed_at,
                "created_at": session.created_at
            },
            "candidateName": "Anonymous",  # Default to anonymous for privacy
            "overallScore": float(session.overall_score) if session.overall_score else 0,
            "categoryScores": session.category_scores or {},
            "strengths": session.strengths or [],
            "weaknesses": session.weaknesses or [],
            "recommendations": session.recommendations or []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch shared interview: {str(e)}")

# Serve static files (React build) with SPA fallback
if os.path.exists("dist/public"):
    from fastapi.responses import FileResponse
    
    # Serve static assets first
    app.mount("/assets", StaticFiles(directory="dist/public/assets"), name="assets")
    
    # Catch-all route for SPA - serve index.html for all non-API routes
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        # Serve index.html for all other routes (let React router handle them)
        return FileResponse("dist/public/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=5000, reload=True)