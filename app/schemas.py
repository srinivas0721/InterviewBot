from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum
import uuid

# Enums
class ExperienceLevel(str, Enum):
    fresher = "fresher"
    mid_level = "mid-level"
    senior = "senior"

class InterviewMode(str, Enum):
    subjective = "subjective"
    voice = "voice"

class SessionStatus(str, Enum):
    in_progress = "in_progress"
    completed = "completed"
    abandoned = "abandoned"

class AnswerType(str, Enum):
    subjective = "subjective"
    voice = "voice"

# Base schemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3)
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    experience_level: Optional[ExperienceLevel] = None
    target_companies: List[str] = Field(default_factory=list)
    target_roles: List[str] = Field(default_factory=list)

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserUpdate(BaseModel):
    experience_level: ExperienceLevel = Field(..., alias="experienceLevel")
    target_companies: List[str] = Field(default=[], alias="targetCompanies")
    target_roles: List[str] = Field(default=[], alias="targetRoles")
    
    class Config:
        populate_by_name = True

class UserResponse(UserBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
        
    def model_dump(self, **kwargs):
        data = super().model_dump(**kwargs)
        # Convert snake_case to camelCase for frontend compatibility
        if 'experience_level' in data:
            data['experienceLevel'] = data.pop('experience_level')
        if 'target_companies' in data:
            data['targetCompanies'] = data.pop('target_companies')
        if 'target_roles' in data:
            data['targetRoles'] = data.pop('target_roles')
        if 'first_name' in data:
            data['firstName'] = data.pop('first_name')
        if 'last_name' in data:
            data['lastName'] = data.pop('last_name')
        if 'profile_image_url' in data:
            data['profileImageUrl'] = data.pop('profile_image_url')
        if 'created_at' in data:
            data['createdAt'] = data.pop('created_at')
        if 'updated_at' in data:
            data['updatedAt'] = data.pop('updated_at')
        return data

# Interview Session schemas
class InterviewSessionBase(BaseModel):
    mode: InterviewMode
    company: str
    role: str

class InterviewSessionCreate(InterviewSessionBase):
    total_questions: int = Field(default=10, alias="totalQuestions")
    
    class Config:
        populate_by_name = True

class InterviewSessionResponse(InterviewSessionBase):
    id: uuid.UUID
    user_id: uuid.UUID
    total_questions: int = 10
    status: SessionStatus
    current_question: int
    overall_score: Optional[float] = None
    category_scores: Dict[str, float] = Field(default_factory=dict)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    share_token: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
        
    def model_dump(self, **kwargs):
        data = super().model_dump(**kwargs)
        # Convert snake_case to camelCase for frontend compatibility
        if 'user_id' in data:
            data['userId'] = data.pop('user_id')
        if 'total_questions' in data:
            data['totalQuestions'] = data.pop('total_questions')
        if 'current_question' in data:
            data['currentQuestion'] = data.pop('current_question')
        if 'overall_score' in data:
            data['overallScore'] = data.pop('overall_score')
        if 'category_scores' in data:
            data['categoryScores'] = data.pop('category_scores')
        if 'share_token' in data:
            data['shareToken'] = data.pop('share_token')
        if 'completed_at' in data:
            data['completedAt'] = data.pop('completed_at')
        if 'created_at' in data:
            data['createdAt'] = data.pop('created_at')
        if 'updated_at' in data:
            data['updatedAt'] = data.pop('updated_at')
        return data

# Question schemas
class QuestionBase(BaseModel):
    category: str
    question_text: str
    difficulty: str = "medium"

class QuestionCreate(QuestionBase):
    session_id: uuid.UUID
    question_number: int
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None

class QuestionResponse(QuestionBase):
    id: uuid.UUID
    session_id: uuid.UUID
    question_number: int
    options: Optional[List[str]] = None
    explanation: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
        
    def model_dump(self, **kwargs):
        data = super().model_dump(**kwargs)
        # Convert snake_case to camelCase for frontend compatibility
        if 'question_text' in data:
            data['questionText'] = data.pop('question_text')
        if 'session_id' in data:
            data['sessionId'] = data.pop('session_id') 
        if 'question_number' in data:
            data['questionNumber'] = data.pop('question_number')
        if 'created_at' in data:
            data['createdAt'] = data.pop('created_at')
        return data

# Answer schemas
class AnswerBase(BaseModel):
    answer_type: AnswerType = Field(alias="answerType")
    subjective_answer: Optional[str] = Field(None, alias="subjectiveAnswer")
    voice_transcript: Optional[str] = Field(None, alias="voiceTranscript")
    time_spent: Optional[int] = Field(None, alias="timeSpent")
    
    class Config:
        populate_by_name = True

class AnswerCreate(AnswerBase):
    question_id: Union[str, uuid.UUID] = Field(alias="questionId")
    session_id: Optional[Union[str, uuid.UUID]] = Field(None, alias="sessionId")
    user_id: Optional[Union[str, uuid.UUID]] = Field(None, alias="userId")
    audio_file_url: Optional[str] = Field(None, alias="audioFileUrl")
    
    @validator('question_id', 'session_id', 'user_id', pre=True)
    def validate_uuid_fields(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            try:
                return uuid.UUID(v)
            except ValueError:
                raise ValueError(f'Invalid UUID format: {v}')
        return v

class AnswerResponse(BaseModel):
    id: uuid.UUID
    question_id: uuid.UUID
    session_id: uuid.UUID
    user_id: uuid.UUID
    answer_type: AnswerType
    subjective_answer: Optional[str] = None
    voice_transcript: Optional[str] = None
    time_spent: Optional[int] = None
    is_correct: Optional[bool] = None
    score: Optional[float] = None
    feedback: Optional[str] = None
    evaluation_details: Optional[Dict[str, Any]] = None
    corrected_answer: Optional[str] = None
    missing_points: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
        
    def model_dump(self, **kwargs):
        data = super().model_dump(**kwargs)
        # Convert snake_case to camelCase for frontend compatibility
        if 'question_id' in data:
            data['questionId'] = data.pop('question_id')
        if 'session_id' in data:
            data['sessionId'] = data.pop('session_id')
        if 'user_id' in data:
            data['userId'] = data.pop('user_id')
        if 'answer_type' in data:
            data['answerType'] = data.pop('answer_type')
        if 'subjective_answer' in data:
            data['subjectiveAnswer'] = data.pop('subjective_answer')
        if 'voice_transcript' in data:
            data['voiceTranscript'] = data.pop('voice_transcript')
        if 'time_spent' in data:
            data['timeSpent'] = data.pop('time_spent')
        if 'is_correct' in data:
            data['isCorrect'] = data.pop('is_correct')
        if 'evaluation_details' in data:
            data['evaluationDetails'] = data.pop('evaluation_details')
        if 'corrected_answer' in data:
            data['correctedAnswer'] = data.pop('corrected_answer')
        if 'missing_points' in data:
            data['missingPoints'] = data.pop('missing_points')
        if 'created_at' in data:
            data['createdAt'] = data.pop('created_at')
        return data

# API Response schemas
class AuthResponse(BaseModel):
    user: UserResponse

class MessageResponse(BaseModel):
    message: str

# LangChain/LangGraph specific schemas
class QuestionGenerationRequest(BaseModel):
    company: str
    role: str
    experience_level: ExperienceLevel
    categories: List[str]
    total_questions: int
    target_companies: Optional[List[str]] = None
    target_roles: Optional[List[str]] = None

class AnswerEvaluationRequest(BaseModel):
    question_text: str
    category: str
    answer_text: str
    expected_answer: Optional[str] = None
    is_voice_answer: bool = False

class EvaluationDetails(BaseModel):
    clarity: Optional[float] = None
    depth: Optional[float] = None
    confidence: Optional[float] = None
    relevance: Optional[float] = None
    structure: Optional[float] = None

class AnswerEvaluation(BaseModel):
    score: float
    is_correct: Optional[bool] = None
    feedback: str
    corrected_answer: Optional[str] = None
    missing_points: Optional[str] = None
    evaluation_details: EvaluationDetails

class GeneratedQuestion(BaseModel):
    category: str
    question_text: str
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: str