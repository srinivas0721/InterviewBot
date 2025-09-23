"""
Database CRUD operations
Centralized database operations for clean separation of concerns
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from .models import User, InterviewSession, Question, Answer
from .schemas import UserCreate, InterviewSessionCreate, QuestionCreate, AnswerCreate

# User CRUD operations
class UserCRUD:
    @staticmethod
    def get_by_id(db: Session, user_id: str) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()
    
    @staticmethod
    def get_by_username(db: Session, username: str) -> Optional[User]:
        return db.query(User).filter(User.username == username).first()
    
    @staticmethod
    def create(db: Session, user_create: UserCreate, hashed_password: str) -> User:
        db_user = User(
            username=user_create.username,
            email=user_create.email,
            password=hashed_password,
            first_name=user_create.first_name,
            last_name=user_create.last_name,
            experience_level=user_create.experience_level,
            target_companies=user_create.target_companies,
            target_roles=user_create.target_roles
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

# Interview Session CRUD operations  
class InterviewSessionCRUD:
    @staticmethod
    def create(db: Session, session_create: InterviewSessionCreate, user_id: str) -> InterviewSession:
        db_session = InterviewSession(
            user_id=user_id,
            mode=session_create.mode,
            company=session_create.company,
            role=session_create.role,
            total_questions=session_create.total_questions
        )
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        return db_session
    
    @staticmethod
    def get_by_id(db: Session, session_id: str) -> Optional[InterviewSession]:
        return db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    
    @staticmethod
    def get_user_sessions(db: Session, user_id: str) -> List[InterviewSession]:
        return db.query(InterviewSession)\
            .filter(InterviewSession.user_id == user_id)\
            .order_by(InterviewSession.created_at.desc())\
            .all()

# Question CRUD operations
class QuestionCRUD:
    @staticmethod
    def create_batch(db: Session, questions_data: List[dict], session_id: str) -> List[Question]:
        questions = []
        for q_data in questions_data:
            db_question = Question(
                session_id=session_id,
                question_number=q_data["question_number"],
                category=q_data["category"],
                question_text=q_data["question_text"],
                options=q_data.get("options"),
                correct_answer=q_data.get("correct_answer"),
                explanation=q_data.get("explanation"),
                difficulty=q_data.get("difficulty", "medium")
            )
            questions.append(db_question)
        
        db.add_all(questions)
        db.commit()
        for q in questions:
            db.refresh(q)
        return questions
    
    @staticmethod
    def get_session_questions(db: Session, session_id: str) -> List[Question]:
        return db.query(Question)\
            .filter(Question.session_id == session_id)\
            .order_by(Question.question_number)\
            .all()

# Answer CRUD operations
class AnswerCRUD:
    @staticmethod
    def create(db: Session, answer_create: AnswerCreate, evaluation_data: dict = None) -> Answer:
        db_answer = Answer(
            question_id=answer_create.question_id,
            session_id=answer_create.session_id,
            user_id=answer_create.user_id,
            answer_type=answer_create.answer_type,
            subjective_answer=answer_create.subjective_answer,
            voice_transcript=answer_create.voice_transcript,
            audio_file_url=answer_create.audio_file_url,
            time_spent=answer_create.time_spent
        )
        
        if evaluation_data:
            db_answer.score = evaluation_data.get("score")
            db_answer.feedback = evaluation_data.get("feedback")
            db_answer.evaluation_details = evaluation_data.get("evaluation_details")
            db_answer.is_correct = evaluation_data.get("is_correct")
        
        db.add(db_answer)
        db.commit()
        db.refresh(db_answer)
        return db_answer
    
    @staticmethod
    def get_session_answers(db: Session, session_id: str) -> List[Answer]:
        return db.query(Answer)\
            .filter(Answer.session_id == session_id)\
            .all()

# Global CRUD instances
user_crud = UserCRUD()
session_crud = InterviewSessionCRUD()
question_crud = QuestionCRUD()
answer_crud = AnswerCRUD()