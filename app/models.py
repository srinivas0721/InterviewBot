from sqlalchemy import Column, String, Text, DateTime, Integer, JSON, Boolean, Numeric, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import uuid

# Session storage for authentication
class Session(Base):
    __tablename__ = "sessions"
    
    sid = Column(String, primary_key=True)
    sess = Column(JSON, nullable=False)
    expire = Column(DateTime, nullable=False)
    
    __table_args__ = (
        Index('IDX_session_expire', 'expire'),
    )

# Users table
class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(255), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(Text, nullable=False)
    first_name = Column(String(255), name="first_name")
    last_name = Column(String(255), name="last_name")
    profile_image_url = Column(String(500), name="profile_image_url")
    experience_level = Column(String(50), name="experience_level")  # fresher, mid-level, senior
    target_companies = Column(JSON, name="target_companies", default=list)
    target_roles = Column(JSON, name="target_roles", default=list)
    created_at = Column(DateTime, name="created_at", server_default=func.now())
    updated_at = Column(DateTime, name="updated_at", server_default=func.now(), onupdate=func.now())
    
    # Relationships
    interview_sessions = relationship("InterviewSession", back_populates="user", cascade="all, delete-orphan")
    answers = relationship("Answer", back_populates="user", cascade="all, delete-orphan")

# Interview sessions
class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, name="user_id")
    mode = Column(String(20), nullable=False)  # subjective, voice
    company = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="in_progress")  # in_progress, completed, abandoned
    total_questions = Column(Integer, nullable=False, default=10, name="total_questions")
    current_question = Column(Integer, nullable=False, default=0, name="current_question")
    overall_score = Column(Numeric(3, 1), name="overall_score")
    category_scores = Column(JSON, name="category_scores", default=dict)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    recommendations = Column(JSON, default=list)
    share_token = Column(String(32), unique=True, name="share_token")  # for public sharing
    completed_at = Column(DateTime, name="completed_at")
    created_at = Column(DateTime, name="created_at", server_default=func.now())
    updated_at = Column(DateTime, name="updated_at", server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="interview_sessions")
    questions = relationship("Question", back_populates="session", cascade="all, delete-orphan")
    answers = relationship("Answer", back_populates="session", cascade="all, delete-orphan")

# Questions
class Question(Base):
    __tablename__ = "questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, name="session_id")
    question_number = Column(Integer, nullable=False, name="question_number")
    category = Column(String(50), nullable=False)  # technical, behavioral, system_design, domain_knowledge, communication
    question_text = Column(Text, nullable=False, name="question_text")
    options = Column(JSON)  # for legacy MCQ questions (unused in subjective mode)
    correct_answer = Column(String(10), name="correct_answer")  # for legacy MCQ questions (unused)
    explanation = Column(Text)
    difficulty = Column(String(20), default="medium")  # easy, medium, hard
    created_at = Column(DateTime, name="created_at", server_default=func.now())
    
    # Relationships
    session = relationship("InterviewSession", back_populates="questions")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")

# Answers
class Answer(Base):
    __tablename__ = "answers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, name="question_id")
    session_id = Column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, name="session_id")
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, name="user_id")
    answer_type = Column(String(20), nullable=False, name="answer_type")  # subjective, voice
    subjective_answer = Column(Text, name="subjective_answer")  # text answer for subjective questions
    mcq_answer = Column(String(10), name="mcq_answer")  # legacy field (a, b, c, d)
    voice_transcript = Column(Text, name="voice_transcript")
    audio_file_url = Column(String(500), name="audio_file_url")
    is_correct = Column(Boolean, name="is_correct")
    score = Column(Numeric(3, 1))
    feedback = Column(Text)
    corrected_answer = Column(Text, name="corrected_answer")  # AI-provided corrected answer
    missing_points = Column(Text, name="missing_points")  # points missing from user's answer
    time_spent = Column(Integer, name="time_spent")  # in seconds
    evaluation_details = Column(JSON, name="evaluation_details")  # clarity, depth, confidence, relevance, structure
    created_at = Column(DateTime, name="created_at", server_default=func.now())
    
    # Relationships
    question = relationship("Question", back_populates="answers")
    session = relationship("InterviewSession", back_populates="answers")
    user = relationship("User", back_populates="answers")