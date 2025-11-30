from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import uuid
from datetime import datetime

from ..database import get_db
from ..models import User, InterviewSession, Question, Answer
from ..routers.auth import get_current_user
# Removed complex workflow system for simpler direct processing
from ..schemas import (
    InterviewSessionCreate, InterviewSessionResponse, 
    QuestionResponse, AnswerCreate, AnswerResponse,
    MessageResponse
)

router = APIRouter(tags=["interviews"])

@router.post("/sessions")
async def create_interview_session(
    session_data: InterviewSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new interview session"""
    try:
        # Create database record
        db_session = InterviewSession(
            user_id=current_user.id,
            mode=session_data.mode,
            company=session_data.company,
            role=session_data.role,
            total_questions=session_data.total_questions,
            status="in_progress"
        )
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        
        # Start LangGraph workflow
        workflow_data = {
            "session_id": str(db_session.id),
            "user_id": str(current_user.id),
            "company": session_data.company,
            "role": session_data.role,
            "mode": session_data.mode,
            "experience_level": getattr(current_user, 'experience_level', None) or "mid-level",
            "target_companies": getattr(current_user, 'target_companies', None) or [],
            "target_roles": getattr(current_user, 'target_roles', None) or [],
            "total_questions": session_data.total_questions
        }
        
        # Generate questions directly without workflow complexity
        from ..services.ai_service import ai_service
        from ..schemas import QuestionGenerationRequest
        
        print(f"🎯 Creating interview: {session_data.company} - {session_data.role}")
        
        # Generate questions using AI service directly
        questions_request = QuestionGenerationRequest(
            company=session_data.company,
            role=session_data.role,
            experience_level=getattr(current_user, 'experience_level', None) or "mid-level",
            categories=["technical", "behavioral", "system_design", "domain_knowledge", "communication"],
            total_questions=session_data.total_questions,
            target_companies=getattr(current_user, 'target_companies', None) or [],
            target_roles=getattr(current_user, 'target_roles', None) or []
        )
        
        print(f"🧠 Generating {session_data.total_questions} questions...")
        generated_questions = await ai_service.generate_questions(questions_request)
        print(f"✅ Generated {len(generated_questions)} questions successfully")
        
        # Store questions in database
        for i, q in enumerate(generated_questions, 1):
            db_question = Question(
                session_id=db_session.id,
                question_number=i,
                category=q.category,
                question_text=q.question_text,
                options=q.options,
                correct_answer=q.correct_answer,
                explanation=q.explanation,
                difficulty=q.difficulty
            )
            db.add(db_question)
        
        db.commit()
        print(f"💾 Stored {len(generated_questions)} questions in database")
        
        thread_id = f"interview_{db_session.id}"
        
        # Store thread_id in session for reference (you might want to add this to the DB)
        
        return {"session": InterviewSessionResponse.model_validate(db_session)}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create session: {str(e)}")

@router.get("/sessions", response_model=List[InterviewSessionResponse])
async def get_user_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all interview sessions for current user"""
    sessions = db.query(InterviewSession)\
        .filter(InterviewSession.user_id == current_user.id)\
        .order_by(InterviewSession.created_at.desc())\
        .all()
    
    return [InterviewSessionResponse.model_validate(session) for session in sessions]

# IMPORTANT: Define /sessions/recent BEFORE /sessions/{session_id} to avoid route conflicts
@router.get("/sessions/recent")
async def get_recent_completed_sessions(
    limit: int = 5,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get only completed sessions for recent sessions list"""
    sessions = db.query(InterviewSession)\
        .filter(
            InterviewSession.user_id == current_user.id,
            InterviewSession.status == "completed"  # Only completed sessions
        )\
        .order_by(InterviewSession.completed_at.desc())\
        .limit(limit)\
        .all()
    
    return {
        "sessions": [InterviewSessionResponse.model_validate(session) for session in sessions]
    }

@router.get("/sessions/{session_id}", response_model=InterviewSessionResponse)
async def get_interview_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific interview session"""
    session = db.query(InterviewSession)\
        .filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)\
        .first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return InterviewSessionResponse.model_validate(session)

@router.get("/sessions/{session_id}/questions")
async def get_session_questions(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all questions for a session"""
    # Verify session belongs to user
    session = db.query(InterviewSession)\
        .filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)\
        .first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    questions = db.query(Question)\
        .filter(Question.session_id == session_id)\
        .order_by(Question.question_number)\
        .all()
    
    return {"questions": [QuestionResponse.model_validate(q) for q in questions]}

@router.post("/sessions/{session_id}/answers")
async def submit_answer(
    session_id: str,
    answer_data: AnswerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit an answer and get evaluation"""
    try:
        # Verify session belongs to user
        session = db.query(InterviewSession)\
            .filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)\
            .first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Direct answer evaluation without complex workflow
        
        # Get the question
        question = db.query(Question).filter(Question.id == answer_data.question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        # Evaluate answer directly
        evaluation = None
        corrected_answer = None
        missing_points = None
        
        try:
            from ..services.ai_service import ai_service
            from ..schemas import AnswerEvaluationRequest
            
            request = AnswerEvaluationRequest(
                question_text=str(question.question_text),
                category=str(question.category),
                answer_text=answer_data.subjective_answer or answer_data.voice_transcript or "",
                is_voice_answer=answer_data.answer_type == "voice"
            )
            
            evaluation_result = await ai_service.evaluate_answer(request)
            evaluation = {
                "score": evaluation_result.score,
                "feedback": evaluation_result.feedback,
                "evaluation_details": evaluation_result.evaluation_details.dict() if evaluation_result.evaluation_details else {}
            }
            corrected_answer = evaluation_result.corrected_answer
            missing_points = evaluation_result.missing_points
            print(f"📊 Answer scored: {evaluation_result.score}/10")
            
        except Exception as e:
            print(f"❌ Error evaluating answer: {e}")
            # Default evaluation if AI fails - use 1.0 for failed evaluations
            evaluation = {
                "score": 1.0,
                "feedback": "Answer evaluation failed. Please provide a clear, relevant technical response.",
                "evaluation_details": {}
            }
            corrected_answer = "Unable to provide corrected answer due to evaluation error."
            missing_points = "Unable to analyze missing points due to evaluation error."
        
        # Post-evaluation sanity check to ensure consistent scoring for nonsensical answers
        answer_text = answer_data.subjective_answer or answer_data.voice_transcript or ""
        if evaluation and answer_text:
            # Use the AI service's nonsensical answer checker with error handling
            try:
                if ai_service.answer_evaluator._is_nonsensical_answer(answer_text.strip().lower()):
                    print(f"🚫 Nonsensical answer detected, overriding score to 1.0")
                    evaluation["score"] = 1.0
                    evaluation["feedback"] = "Your answer doesn't appear to address the question. Please provide a relevant technical response."
                    corrected_answer = "Please provide a clear, structured answer that directly addresses the question asked."
                    missing_points = "The answer provided does not contain relevant technical content."
            except Exception as e:
                print(f"⚠️ Could not check for nonsensical answer: {e}")
                # Continue with original evaluation without override
        
        # Store answer in database
        db_answer = Answer(
            question_id=answer_data.question_id,
            session_id=session_id,
            user_id=current_user.id,
            answer_type=answer_data.answer_type,
            subjective_answer=answer_data.subjective_answer,
            voice_transcript=answer_data.voice_transcript,
            audio_file_url=answer_data.audio_file_url,
            time_spent=answer_data.time_spent,
            score=evaluation["score"] if evaluation else None,
            feedback=evaluation["feedback"] if evaluation else None,
            evaluation_details=evaluation["evaluation_details"] if evaluation else None,
            corrected_answer=corrected_answer,
            missing_points=missing_points
        )
        
        db.add(db_answer)
        
        # Check if interview is complete
        total_questions = db.query(Question).filter(Question.session_id == session_id).count()
        answered_questions = db.query(Answer).filter(Answer.session_id == session_id).count()
        
        current_question = answered_questions
        completed = current_question >= total_questions
        
        # Update session progress
        db.query(InterviewSession).filter(InterviewSession.id == session_id).update({
            InterviewSession.current_question: current_question
        })
        
        if completed:
            # Calculate final scores from answers
            all_answers = db.query(Answer).filter(Answer.session_id == session_id).all()
            scores = [float(ans.score) for ans in all_answers if ans.score is not None]
            overall_score = sum(scores) / len(scores) if scores else 0.0
            
            # Calculate category scores
            category_scores = {}
            for answer in all_answers:
                if answer.score is not None:
                    q = db.query(Question).filter(Question.id == answer.question_id).first()
                    if q and q.category:
                        cat = str(q.category)
                        if cat not in category_scores:
                            category_scores[cat] = []
                        category_scores[cat].append(float(answer.score))
            
            # Average scores by category
            for category in category_scores:
                category_scores[category] = sum(category_scores[category]) / len(category_scores[category])
            
            updates = {
                "status": "completed",
                "completed_at": datetime.utcnow(),
                "overall_score": overall_score,
                "category_scores": category_scores,
                "strengths": ["Strong technical knowledge", "Clear explanations"] if overall_score >= 8 else (["Good understanding of basics"] if overall_score >= 6 else (["Shows some knowledge"] if overall_score >= 4 else ["Room for significant improvement"])),
                "weaknesses": ["Minor areas for refinement"] if overall_score >= 8 else (["Needs more depth in technical answers"] if overall_score >= 6 else (["Lacks depth in technical explanations", "Poor preparation evident"] if overall_score >= 4 else ["Inadequate technical responses", "Poor interview preparation"])),
                "recommendations": ["Continue practicing advanced topics"] if overall_score >= 8 else (["Practice explaining concepts more clearly"] if overall_score >= 6 else (["Focus on fundamentals", "Practice technical questions"] if overall_score >= 4 else ["Study fundamental concepts thoroughly", "Focus on providing relevant technical answers"]))
            }
            
            # Update session with final results
            db.query(InterviewSession).filter(InterviewSession.id == session_id).update(updates)
        
        db.commit()
        
        print(f"💾 Progress saved: question {current_question}/{total_questions}")
        
        # Get next question if not completed
        next_question = None
        if not completed:
            remaining_questions = db.query(Question)\
                .filter(Question.session_id == session_id, Question.question_number > current_question)\
                .order_by(Question.question_number)\
                .first()
            if remaining_questions:
                next_question = {
                    "id": str(remaining_questions.id),
                    "question_text": str(remaining_questions.question_text),
                    "category": str(remaining_questions.category),
                    "difficulty": str(remaining_questions.difficulty),
                    "options": remaining_questions.options
                }
        
        return {
            "evaluation": evaluation,
            "next_question": next_question,
            "progress": {
                "current": current_question,
                "total": total_questions,
                "completed": completed
            },
            "current_scores": category_scores if completed and 'category_scores' in locals() else {}
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to submit answer: {str(e)}")

@router.get("/{session_id}")
async def get_interview_results(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get complete interview results - Main endpoint frontend calls"""
    session = db.query(InterviewSession)\
        .filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)\
        .first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get questions and answers
    questions = db.query(Question)\
        .filter(Question.session_id == session_id)\
        .order_by(Question.question_number)\
        .all()
    
    answers = db.query(Answer)\
        .filter(Answer.session_id == session_id)\
        .all()
    
    # Create answers lookup
    answers_by_question = {str(ans.question_id): ans for ans in answers}
    
    # Build detailed results
    detailed_results = []
    for question in questions:
        answer = answers_by_question.get(str(question.id))
        detailed_results.append({
            "question": QuestionResponse.model_validate(question).model_dump(),
            "answer": AnswerResponse.model_validate(answer).model_dump() if answer else None
        })
    
    # Use model_validate and model_dump for proper camelCase conversion
    session_data = InterviewSessionResponse.model_validate(session).model_dump()
    
    return {
        "session": session_data,
        "detailed_results": detailed_results,
        "overallScore": float(session.overall_score) if session.overall_score else 0.0,
        "categoryScores": session.category_scores or {},
        "strengths": session.strengths or [],
        "weaknesses": session.weaknesses or [],
        "recommendations": session.recommendations or [],
        "summary": {
            "totalQuestions": len(questions),
            "answeredQuestions": len(answers),
            "overallScore": session.overall_score,
            "categoryScores": session.category_scores,
            "strengths": session.strengths,
            "weaknesses": session.weaknesses,
            "recommendations": session.recommendations
        }
    }

@router.post("/sessions/{session_id}/complete")
async def complete_interview_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete an interview session"""
    try:
        # Verify session belongs to user
        session = db.query(InterviewSession)\
            .filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)\
            .first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Mark session as completed using SQLAlchemy update
        updates = {
            "status": "completed",
            "completed_at": datetime.utcnow()
        }
        
        # Calculate actual scores from answers instead of relying on workflow
        try:
            # Get all answers for this session
            answers = db.query(Answer).filter(Answer.session_id == session_id).all()
            questions = db.query(Question).filter(Question.session_id == session_id).all()
            
            if answers:
                # Calculate real overall score
                individual_scores = [float(answer.score or 0) for answer in answers]
                overall_score = sum(individual_scores) / len(individual_scores) if individual_scores else 0.0
                
                # Calculate category scores
                category_scores = {}
                category_question_map = {q.id: q.category for q in questions}
                
                for category in set(category_question_map.values()):
                    category_answers = [a for a in answers if category_question_map.get(a.question_id) == category]
                    if category_answers:
                        category_avg = sum(float(a.score or 0) for a in category_answers) / len(category_answers)
                        category_scores[category] = round(category_avg, 1)
                
                # Generate AI-powered performance analysis
                strengths = []
                weaknesses = []
                
                # Analyze performance by category for intelligent insights
                for category, score in category_scores.items():
                    if score >= 8.0:
                        strengths.append(f"Excellent {category} knowledge")
                    elif score >= 6.0:
                        strengths.append(f"Good {category} understanding")
                    elif score <= 4.0:
                        weaknesses.append(f"Needs improvement in {category}")
                    elif score <= 6.0:
                        weaknesses.append(f"Room for growth in {category}")
                
                # Add overall performance insights
                if overall_score >= 8.0:
                    strengths.extend(["Strong technical communication", "Well-structured responses"])
                elif overall_score >= 6.0:
                    strengths.append("Shows technical potential")
                elif overall_score >= 4.0:
                    weaknesses.extend(["Lacks detail in technical explanations", "Needs more preparation"])
                else:
                    weaknesses.extend(["Insufficient technical depth", "Poor interview readiness"])
                
                # Ensure we have at least some insights
                if not strengths:
                    strengths = ["Shows willingness to engage with questions"]
                if not weaknesses:
                    weaknesses = ["Minor areas for refinement"]
                
                # Generate AI-powered personalized recommendations
                print(f"🧠 Starting AI recommendations generation for session {session_id}")
                print(f"📊 Performance data: Overall={overall_score:.1f}, Categories={category_scores}")
                
                try:
                    from ..services.ai_service import ai_service
                    print(f"✅ AI service imported successfully")
                    
                    recommendations = await ai_service.generate_recommendations(
                        overall_score=overall_score,
                        category_scores=category_scores,
                        strengths=strengths,
                        weaknesses=weaknesses
                    )
                    print(f"✅ Generated {len(recommendations)} AI recommendations: {recommendations[:2]}...")
                    
                except Exception as e:
                    print(f"❌ Error generating AI recommendations: {str(e)}")
                    import traceback
                    print(f"❌ Full traceback: {traceback.format_exc()}")
                    # Fallback recommendations if AI fails
                    recommendations = [
                        "Focus on explaining technical concepts with specific examples",
                        "Practice structuring answers with clear problem-solution approach",
                        "Study the specific technologies mentioned in your target roles",
                        "Improve confidence by practicing similar interview questions"
                    ]
                    print(f"🔧 Using fallback recommendations")
                
                updates.update({
                    "overall_score": round(overall_score, 1),
                    "category_scores": category_scores,
                    "strengths": strengths,
                    "weaknesses": weaknesses,
                    "recommendations": recommendations
                })
            else:
                # No answers - session incomplete
                updates.update({
                    "overall_score": 0.0,
                    "category_scores": {},
                    "strengths": ["No responses provided"],
                    "weaknesses": ["Session incomplete"],
                    "recommendations": ["Complete the interview to receive proper feedback"]
                })
                
        except Exception as e:
            print(f"Error calculating interview results: {e}")
            # True fallback only if calculation completely fails
            updates.update({
                "overall_score": 0.0,
                "category_scores": {"unknown": 0.0},
                "strengths": ["Unable to calculate results"],
                "weaknesses": ["System error in evaluation"],
                "recommendations": ["Please contact support"]
            })
        
        # Convert string keys to column references
        column_updates = {
            InterviewSession.status: updates["status"],
            InterviewSession.completed_at: updates["completed_at"]
        }
        if "overall_score" in updates:
            column_updates.update({
                InterviewSession.overall_score: updates["overall_score"],
                InterviewSession.category_scores: updates["category_scores"],
                InterviewSession.strengths: updates["strengths"],
                InterviewSession.weaknesses: updates["weaknesses"],
                InterviewSession.recommendations: updates["recommendations"]
            })
        
        db.query(InterviewSession).filter(InterviewSession.id == session_id).update(column_updates)
        
        db.commit()
        
        return {
            "message": "Interview completed successfully",
            "session_id": session_id,
            "status": "completed"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to complete session: {str(e)}")

@router.delete("/sessions/{session_id}", response_model=MessageResponse)
async def delete_interview_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an interview session"""
    session = db.query(InterviewSession)\
        .filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)\
        .first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db.delete(session)
    db.commit()
    
    return MessageResponse(message="Session deleted successfully")

# Add route aliases for frontend compatibility (frontend expects /interviews/{id} not /sessions/{id})
@router.get("/{session_id}/report")
async def download_report(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate and download interview report"""
    try:
        # Verify session belongs to user and is completed
        session = db.query(InterviewSession)\
            .filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)\
            .first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
            
        if getattr(session, 'status', None) != "completed":
            raise HTTPException(status_code=400, detail="Session not completed yet")
        
        # Get questions and answers for the session
        questions = db.query(Question)\
            .filter(Question.session_id == session_id)\
            .order_by(Question.question_number)\
            .all()
            
        answers = db.query(Answer)\
            .filter(Answer.session_id == session_id)\
            .order_by(Answer.created_at)\
            .all()
        
        # Generate HTML report
        html_report = generate_html_report(session, questions, answers)
        
        # Return as data URL that frontend can download
        import urllib.parse
        encoded_html = urllib.parse.quote(html_report)
        report_url = f"data:text/html;charset=utf-8,{encoded_html}"
        
        return {"reportUrl": report_url}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


def generate_html_report(session: InterviewSession, questions: List[Question], answers: List[Answer]) -> str:
    """Generate HTML report for interview session"""
    
    # Create answer lookup
    answer_lookup = {answer.question_id: answer for answer in answers}
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Interview Report - {session.company} {session.role}</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; }}
            .header {{ text-align: center; margin-bottom: 40px; }}
            .section {{ margin-bottom: 30px; }}
            .question {{ background: #f5f5f5; padding: 15px; margin: 20px 0; }}
            .answer {{ background: #fff; padding: 15px; border-left: 4px solid #007acc; }}
            .score {{ font-weight: bold; color: #007acc; }}
            .feedback {{ font-style: italic; color: #666; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Interview Report</h1>
            <h2>{getattr(session, 'company', 'Unknown')} - {getattr(session, 'role', 'Unknown')}</h2>
            <p>Completed: {getattr(session, 'completed_at', None).strftime('%B %d, %Y') if getattr(session, 'completed_at', None) is not None else 'N/A'}</p>
            <p class="score">Overall Score: {getattr(session, 'overall_score', 0)}/10</p>
        </div>
        
        <div class="section">
            <h3>Summary</h3>
            <p><strong>Strengths:</strong> {', '.join(getattr(session, 'strengths', None) or [])}</p>
            <p><strong>Areas for Improvement:</strong> {', '.join(getattr(session, 'weaknesses', None) or [])}</p>
            <p><strong>Recommendations:</strong> {', '.join(getattr(session, 'recommendations', None) or [])}</p>
        </div>
        
        <div class="section">
            <h3>Questions and Answers</h3>
    """
    
    for question in questions:
        answer = answer_lookup.get(question.id)
        html += f"""
            <div class="question">
                <h4>Question {question.question_number}</h4>
                <p><strong>Category:</strong> {question.category.replace('_', ' ').title()}</p>
                <p>{question.question_text}</p>
            </div>
        """
        
        if answer:
            answer_text = getattr(answer, 'subjective_answer', None) or getattr(answer, 'voice_transcript', None) or "No answer provided"
            html += f"""
                <div class="answer">
                    <p><strong>Answer:</strong> {answer_text}</p>
                    <p class="score">Score: {getattr(answer, 'score', 0)}/10</p>
                    <p class="feedback">Feedback: {getattr(answer, 'feedback', None) or 'No feedback provided'}</p>
                </div>
            """
    
    html += """
        </div>
    </body>
    </html>
    """
    
    return html


# Route aliases for frontend compatibility
# Frontend expects /interviews/{id} routes, but backend uses /interviews/sessions/{id}

@router.post("")
async def create_interview_session_alias(
    session_data: InterviewSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create interview session - alias for frontend compatibility"""
    result = await create_interview_session(session_data, current_user, db)
    # Ensure the alias returns the same format
    if isinstance(result, dict) and "session" in result:
        return result
    else:
        return {"session": result}

@router.get("/{session_id}/questions")
async def get_session_questions_alias(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get session questions - alias for frontend compatibility"""
    return await get_session_questions(session_id, current_user, db)

@router.post("/{session_id}/answers")
async def submit_answer_alias(
    session_id: str,
    answer_data: AnswerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit answer - alias for frontend compatibility"""
    return await submit_answer(session_id, answer_data, current_user, db)

@router.post("/{session_id}/complete")
async def complete_interview_session_alias(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete interview session - alias for frontend compatibility"""
    return await complete_interview_session(session_id, current_user, db)

@router.get("/{session_id}/results")
async def get_interview_results_alias(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get interview results - alias for frontend compatibility"""
    return await get_interview_results(session_id, current_user, db)

@router.get("/{session_id}/report")
async def get_session_report_alias(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get session report - alias for frontend compatibility"""
    return await get_session_report(session_id, current_user, db)

@router.get("/{session_id}/detailed-answers")
async def get_detailed_answers(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed answers - what the frontend is actually calling"""
    from fastapi.encoders import jsonable_encoder
    
    # Just return the detailed_results from the main results endpoint
    results = await get_interview_results(session_id, current_user, db)
    detailed_results = results.get("detailed_results", [])
    
    # Debug logging
    print(f"🔍 Session ID: {session_id}")
    print(f"🔍 User ID: {current_user.id}")
    print(f"🔍 Results keys: {list(results.keys())}")
    print(f"🔍 Detailed results count: {len(detailed_results)}")
    
    # Ensure proper JSON serialization
    json_serializable_results = jsonable_encoder(detailed_results)
    print(f"🔍 JSON serializable count: {len(json_serializable_results)}")
    print(f"🔍 First serialized item type: {type(json_serializable_results[0]) if json_serializable_results else 'None'}")
    
    return {
        "detailed_results": json_serializable_results
    }

# Share endpoints - frontend compatibility aliases
@router.post("/{session_id}/share")
async def create_share_link_alias(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create share link - alias for frontend compatibility"""
    return await create_share_link(session_id, current_user, db)

@router.delete("/{session_id}/share")
async def remove_share_link_alias(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove share link - alias for frontend compatibility"""
    return await remove_share_link(session_id, current_user, db)

# Share functionality endpoints
@router.post("/sessions/{session_id}/share")
async def create_share_link(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a shareable link for the interview session"""
    import uuid
    
    # Verify session belongs to user and is completed
    session = db.query(InterviewSession)\
        .filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)\
        .first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if getattr(session, 'status', None) != "completed":
        raise HTTPException(status_code=400, detail="Session not completed yet")
    
    # Generate share token if not exists
    if not getattr(session, 'share_token', None):
        share_token = str(uuid.uuid4())
        db.query(InterviewSession).filter(InterviewSession.id == session_id).update({
            InterviewSession.share_token: share_token
        })
        db.commit()
    else:
        share_token = session.share_token
    
    # Generate share URL - Get from environment or use relative URL
    import os
    base_url = os.getenv("REPLIT_DOMAIN", "http://localhost:5000")
    if not base_url.startswith("http"):
        base_url = f"https://{base_url}"
    share_url = f"{base_url}/share/{share_token}"
    
    return {
        "shareUrl": share_url,
        "shareToken": share_token,
        "message": "Share link created successfully"
    }

@router.get("/sessions/{session_id}/detailed-answers")
async def get_detailed_answers_sessions(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed answers - backend sessions route"""
    # Just return the detailed_results from the main results endpoint
    results = await get_interview_results(session_id, current_user, db)
    return {
        "detailed_results": results.get("detailed_results", [])
    }

@router.delete("/sessions/{session_id}/share")
async def remove_share_link(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove the shareable link for the interview session"""
    # Verify session belongs to user
    session = db.query(InterviewSession)\
        .filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)\
        .first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Remove share token
    db.query(InterviewSession).filter(InterviewSession.id == session_id).update({
        InterviewSession.share_token: None
    })
    db.commit()
    
    return {
        "message": "Share link removed successfully"
    }

# NEW ENDPOINTS FOR SESSION CLEANUP AND FULLSCREEN MONITORING

@router.delete("/sessions/{session_id}/terminate")
async def terminate_incomplete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Terminate and delete an incomplete interview session"""
    try:
        # Verify session belongs to user
        session = db.query(InterviewSession)\
            .filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)\
            .first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Only allow deletion of in_progress sessions
        if session.status != "in_progress":
            raise HTTPException(status_code=400, detail="Can only terminate in-progress sessions")
        
        # Delete all related data
        # Delete answers
        db.query(Answer).filter(Answer.session_id == session_id).delete()
        
        # Delete questions
        db.query(Question).filter(Question.session_id == session_id).delete()
        
        # Delete the session
        db.delete(session)
        db.commit()
        
        print(f"✅ Terminated incomplete session {session_id}")
        
        return {
            "message": "Session terminated and deleted successfully",
            "session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to terminate session: {str(e)}")


@router.patch("/sessions/{session_id}/abandon")
async def abandon_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark session as abandoned and clean up"""
    try:
        session = db.query(InterviewSession)\
            .filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)\
            .first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if session.status != "in_progress":
            raise HTTPException(status_code=400, detail="Can only abandon in-progress sessions")
        
        # Delete all data instead of marking as abandoned
        db.query(Answer).filter(Answer.session_id == session_id).delete()
        db.query(Question).filter(Question.session_id == session_id).delete()
        db.delete(session)
        db.commit()
        
        print(f"🗑️ Abandoned and deleted session {session_id}")
        
        return {
            "message": "Session abandoned and deleted successfully",
            "session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to abandon session: {str(e)}")