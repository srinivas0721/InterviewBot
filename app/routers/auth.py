from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from ..database import get_db
from ..models import User
from ..schemas import (
    UserCreate, UserLogin, UserResponse, AuthResponse, 
    MessageResponse, UserUpdate
)

router = APIRouter(tags=["authentication"])

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def create_user(db: Session, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        password=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name,
        profile_image_url=user.profile_image_url,
        experience_level=user.experience_level,
        target_companies=user.target_companies,
        target_roles=user.target_roles
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_current_user(request: Request, db: Session = Depends(get_db)):
    """Get current user from session"""
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

@router.post("/signup", response_model=AuthResponse)
async def signup(user_data: UserCreate, request: Request, db: Session = Depends(get_db)):
    """User registration"""
    try:
        # Check if user already exists
        existing_user = get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="User already exists with this email")
        
        existing_username = get_user_by_username(db, user_data.username)
        if existing_username:
            raise HTTPException(status_code=400, detail="Username already taken")
        
        # Create user
        user = create_user(db, user_data)
        
        # Set session
        request.session["user_id"] = str(user.id)
        
        return AuthResponse(user=UserResponse.model_validate(user))
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Signup failed: {str(e)}")

@router.post("/login", response_model=AuthResponse)
async def login(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    """User authentication"""
    try:
        # Find user
        user = get_user_by_email(db, login_data.email)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Verify password
        if not verify_password(login_data.password, str(user.password)):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Set session
        request.session["user_id"] = str(user.id)
        
        return AuthResponse(user=UserResponse.model_validate(user))
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Login failed: {str(e)}")

@router.post("/logout", response_model=MessageResponse)
async def logout(request: Request):
    """User logout"""
    request.session.clear()
    return MessageResponse(message="Logged out successfully")

@router.get("/user", response_model=UserResponse)
async def get_user(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse.model_validate(current_user)

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: UserUpdate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Update user profile"""
    try:
        # Update user profile
        for attr, value in profile_data.model_dump().items():
            setattr(current_user, attr, value)
        
        db.commit()
        db.refresh(current_user)
        
        return UserResponse.model_validate(current_user)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Profile update failed: {str(e)}")

@router.delete("/account", response_model=MessageResponse)
async def delete_account(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user account and all associated data"""
    try:
        from ..models import InterviewSession, Question, Answer
        
        # Delete user's interview sessions and related data
        sessions = db.query(InterviewSession).filter(InterviewSession.user_id == current_user.id).all()
        
        for session in sessions:
            # Delete answers for this session
            db.query(Answer).filter(Answer.session_id == session.id).delete()
            # Delete questions for this session
            db.query(Question).filter(Question.session_id == session.id).delete()
            # Delete the session itself
            db.delete(session)
        
        # Delete the user
        db.delete(current_user)
        db.commit()
        
        # Clear the session
        request.session.clear()
        
        return MessageResponse(message="Account deleted successfully")
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete account: {str(e)}")