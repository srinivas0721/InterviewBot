from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
from typing import Dict, Any, List, TypedDict, Optional
import uuid
from datetime import datetime

from ..services.ai_service import ai_service
from ..schemas import (
    QuestionGenerationRequest, 
    AnswerEvaluationRequest, 
    GeneratedQuestion, 
    AnswerEvaluation,
    ExperienceLevel,
    InterviewMode
)

# State definition for interview workflow
class InterviewState(TypedDict):
    session_id: str
    user_id: str
    company: str
    role: str
    mode: str
    experience_level: str
    target_companies: List[str]
    target_roles: List[str]
    
    # Interview progress
    total_questions: int
    current_question_index: int
    questions: List[Dict[str, Any]]
    answers: List[Dict[str, Any]]
    
    # Scoring and feedback
    category_scores: Dict[str, float]
    overall_score: float
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]
    
    # Workflow control
    stage: str  # "generating_questions", "interviewing", "evaluating", "completed"
    error: Optional[str]

class InterviewWorkflow:
    def __init__(self):
        self.checkpointer = MemorySaver()
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build the complete interview workflow graph"""
        
        # Create the workflow graph
        workflow = StateGraph(InterviewState)

        # Add nodes
        workflow.add_node("initialize_session", self._initialize_session)
        workflow.add_node("generate_questions", self._generate_questions) 
        workflow.add_node("present_question", self._present_question)
        workflow.add_node("evaluate_answer", self._evaluate_answer)
        workflow.add_node("check_completion", self._check_completion)
        workflow.add_node("calculate_final_scores", self._calculate_final_scores)
        workflow.add_node("generate_recommendations", self._generate_recommendations)
        workflow.add_node("finalize_session", self._finalize_session)

        # Set entry point
        workflow.set_entry_point("initialize_session")

        # Add edges (workflow flow)
        workflow.add_edge("initialize_session", "generate_questions")
        workflow.add_edge("generate_questions", "present_question")
        workflow.add_edge("present_question", "evaluate_answer")
        workflow.add_edge("evaluate_answer", "check_completion")
        
        # Conditional edge based on completion
        workflow.add_conditional_edges(
            "check_completion",
            self._should_continue_interview,
            {
                "continue": "present_question",
                "complete": "calculate_final_scores"
            }
        )
        
        workflow.add_edge("calculate_final_scores", "generate_recommendations")
        workflow.add_edge("generate_recommendations", "finalize_session")
        workflow.add_edge("finalize_session", END)

        return workflow.compile(checkpointer=self.checkpointer)

    async def _initialize_session(self, state: InterviewState) -> InterviewState:
        """Initialize the interview session"""
        print(f"🎯 Initializing interview session for {state['company']} - {state['role']}")
        
        state.update({
            "current_question_index": 0,
            "questions": [],
            "answers": [],
            "category_scores": {},
            "overall_score": 0.0,
            "strengths": [],
            "weaknesses": [],
            "recommendations": [],
            "stage": "generating_questions",
            "error": None
        })
        
        return state

    async def _generate_questions(self, state: InterviewState) -> InterviewState:
        """Generate AI-powered interview questions"""
        print(f"🧠 Generating {state['total_questions']} questions using LangChain...")
        
        try:
            # Categories for different interview types
            categories = ["technical", "behavioral", "system_design", "domain_knowledge", "communication"]
            
            request = QuestionGenerationRequest(
                company=state["company"],
                role=state["role"],
                experience_level=ExperienceLevel(state["experience_level"]),
                categories=categories,
                total_questions=state["total_questions"],
                target_companies=state.get("target_companies", []),
                target_roles=state.get("target_roles", [])
            )
            
            questions = await ai_service.generate_questions(request)
            
            # Convert to dict format for state storage
            questions_data = []
            for i, question in enumerate(questions):
                questions_data.append({
                    "id": str(uuid.uuid4()),
                    "question_number": i + 1,
                    "category": question.category,
                    "question_text": question.question_text,
                    "options": question.options,
                    "correct_answer": question.correct_answer,
                    "explanation": question.explanation,
                    "difficulty": question.difficulty
                })
            
            state["questions"] = questions_data
            state["stage"] = "interviewing"
            
            print(f"✅ Generated {len(questions_data)} questions successfully")
            
        except Exception as e:
            print(f"❌ Error generating questions: {e}")
            state["error"] = f"Failed to generate questions: {str(e)}"
            state["stage"] = "error"
        
        return state

    async def _present_question(self, state: InterviewState) -> InterviewState:
        """Present current question to user"""
        current_index = state["current_question_index"]
        
        if current_index < len(state["questions"]):
            current_question = state["questions"][current_index]
            print(f"❓ Presenting question {current_index + 1}/{len(state['questions'])}: {current_question['category']}")
            state["stage"] = "awaiting_answer"
        
        return state

    async def _evaluate_answer(self, state: InterviewState) -> InterviewState:
        """Evaluate user's answer using LangChain"""
        current_index = state["current_question_index"]
        
        if current_index < len(state["questions"]) and current_index < len(state["answers"]):
            current_question = state["questions"][current_index]
            current_answer = state["answers"][current_index]
            
            print(f"🔍 Evaluating answer for question {current_index + 1}...")
            
            try:
                request = AnswerEvaluationRequest(
                    question_text=current_question["question_text"],
                    category=current_question["category"],
                    answer_text=current_answer.get("answer_text", ""),
                    is_voice_answer=current_answer.get("answer_type") == "voice"
                )
                
                evaluation = await ai_service.evaluate_answer(request)
                
                # Store evaluation in answer
                state["answers"][current_index].update({
                    "score": evaluation.score,
                    "feedback": evaluation.feedback,
                    "evaluation_details": evaluation.evaluation_details.dict() if evaluation.evaluation_details else {}
                })
                
                # Update category scores
                category = current_question["category"]
                if category not in state["category_scores"]:
                    state["category_scores"][category] = []
                
                # Track scores by category (we'll average them later)
                if category not in state["category_scores"]:
                    state["category_scores"][category] = 0.0
                    
                # Running average for category scores
                existing_scores = [ans.get("score", 0) for ans in state["answers"][:current_index+1] 
                                 if state["questions"][state["answers"].index(ans)]["category"] == category]
                state["category_scores"][category] = sum(existing_scores) / len(existing_scores)
                
                print(f"📊 Answer scored: {evaluation.score}/10")
                
            except Exception as e:
                print(f"❌ Error evaluating answer: {e}")
                # Set default evaluation
                state["answers"][current_index].update({
                    "score": 5.0,
                    "feedback": "Unable to evaluate answer due to technical issue.",
                    "evaluation_details": {}
                })
        
        state["current_question_index"] += 1
        return state

    async def _check_completion(self, state: InterviewState) -> InterviewState:
        """Check if interview is complete"""
        completed = state["current_question_index"] >= len(state["questions"])
        
        if completed:
            print(f"🏁 Interview completed! {len(state['answers'])} questions answered")
            state["stage"] = "calculating_scores"
        else:
            print(f"▶️  Continuing interview: {state['current_question_index']}/{len(state['questions'])}")
        
        return state

    def _should_continue_interview(self, state: InterviewState) -> str:
        """Conditional logic for interview continuation"""
        return "complete" if state["current_question_index"] >= len(state["questions"]) else "continue"

    async def _calculate_final_scores(self, state: InterviewState) -> InterviewState:
        """Calculate overall scores and identify strengths/weaknesses"""
        print("📊 Calculating final scores and performance analysis...")
        
        try:
            # Calculate overall score
            all_scores = [ans.get("score", 0) for ans in state["answers"]]
            state["overall_score"] = sum(all_scores) / len(all_scores) if all_scores else 0
            
            # Analyze strengths and weaknesses
            strengths = []
            weaknesses = []
            
            for category, score in state["category_scores"].items():
                if score >= 8.0:
                    strengths.append(f"Strong performance in {category} questions")
                elif score <= 5.0:
                    weaknesses.append(f"Needs improvement in {category} concepts")
            
            # Additional analysis based on evaluation details
            clarity_scores = []
            depth_scores = []
            
            for answer in state["answers"]:
                eval_details = answer.get("evaluation_details", {})
                if eval_details.get("clarity"):
                    clarity_scores.append(eval_details["clarity"])
                if eval_details.get("depth"):
                    depth_scores.append(eval_details["depth"])
            
            if clarity_scores and sum(clarity_scores) / len(clarity_scores) >= 8.0:
                strengths.append("Clear and well-structured communication")
            elif clarity_scores and sum(clarity_scores) / len(clarity_scores) <= 5.0:
                weaknesses.append("Communication clarity needs improvement")
                
            if depth_scores and sum(depth_scores) / len(depth_scores) <= 5.0:
                weaknesses.append("Answers lack technical depth")
            
            state["strengths"] = strengths
            state["weaknesses"] = weaknesses
            state["stage"] = "generating_recommendations"
            
            print(f"📈 Overall Score: {state['overall_score']:.1f}/10")
            print(f"💪 Strengths: {len(strengths)}")
            print(f"📚 Areas for improvement: {len(weaknesses)}")
            
        except Exception as e:
            print(f"❌ Error calculating scores: {e}")
            state["error"] = f"Failed to calculate scores: {str(e)}"
        
        return state

    async def _generate_recommendations(self, state: InterviewState) -> InterviewState:
        """Generate personalized recommendations using LangChain"""
        print("🎯 Generating personalized improvement recommendations...")
        
        try:
            recommendations = await ai_service.generate_recommendations(
                overall_score=state["overall_score"],
                category_scores=state["category_scores"],
                strengths=state["strengths"],
                weaknesses=state["weaknesses"]
            )
            
            state["recommendations"] = recommendations
            print(f"✨ Generated {len(recommendations)} personalized recommendations")
            
        except Exception as e:
            print(f"❌ Error generating recommendations: {e}")
            state["recommendations"] = [
                "Practice explaining technical concepts clearly",
                "Work on providing more detailed answers",
                "Review fundamental concepts in your target technology stack"
            ]
        
        state["stage"] = "finalizing"
        return state

    async def _finalize_session(self, state: InterviewState) -> InterviewState:
        """Finalize the interview session"""
        print("🎉 Finalizing interview session...")
        
        state.update({
            "stage": "completed",
            "completed_at": datetime.utcnow().isoformat()
        })
        
        return state

    async def start_interview(self, session_data: Dict[str, Any]) -> str:
        """Start a new interview session"""
        thread_id = f"interview_{session_data['session_id']}"
        
        try:
            print(f"🎯 Initializing interview session for {session_data['company']} - {session_data['role']}")
            
            # Just generate questions synchronously and store them
            questions_request = QuestionGenerationRequest(
                company=session_data["company"],
                role=session_data["role"],
                experience_level=session_data["experience_level"],
                categories=["technical", "behavioral", "system_design", "domain_knowledge", "communication"],
                total_questions=session_data.get("total_questions", 10),
                target_companies=session_data.get("target_companies", []),
                target_roles=session_data.get("target_roles", [])
            )
            
            print(f"🧠 Generating {session_data.get('total_questions', 10)} questions using LangChain...")
            generated_questions = await ai_service.generate_questions(questions_request)
            print(f"✅ Generated {len(generated_questions)} questions successfully")
            
            # Store questions in database immediately
            from ..models import Question
            from ..database import SessionLocal
            
            db = SessionLocal()
            try:
                for i, q in enumerate(generated_questions, 1):
                    db_question = Question(
                        session_id=session_data["session_id"],
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
            finally:
                db.close()
            
            return thread_id
            
        except Exception as e:
            print(f"❌ Error in start_interview: {str(e)}")
            raise e

    async def submit_answer(self, thread_id: str, answer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Submit an answer and get evaluation"""
        config = {"configurable": {"thread_id": thread_id}}
        
        # Get current state
        current_state = await self.graph.aget_state(config)
        state = current_state.values if current_state.values else {}
        
        # Check if we need to initialize OR reload state from database
        session_id = thread_id.replace("interview_", "")
        # Only initialize if state is completely empty (first time)
        should_initialize = not state or not state.get("questions")
        
        if should_initialize:
            # Extract session info from thread_id and initialize
            session_id = thread_id.replace("interview_", "")
            
            # Get questions from database to initialize state
            from ..database import SessionLocal
            from ..models import Question, InterviewSession, User
            
            db = SessionLocal()
            try:
                # Get session details
                session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
                if not session:
                    raise Exception("Session not found")
                
                # Get questions for this session
                questions = db.query(Question).filter(Question.session_id == session_id).order_by(Question.question_number).all()
                
                # Get existing answers to resume from correct position
                from ..models import Answer
                existing_db_answers = db.query(Answer).filter(Answer.session_id == session_id).order_by(Answer.created_at).all()
                existing_answers_count = len(existing_db_answers)
                
                # Load existing answers into state
                existing_answers = []
                for db_answer in existing_db_answers:
                    existing_answers.append({
                        "question_id": str(db_answer.question_id),
                        "answer_text": db_answer.subjective_answer or db_answer.voice_transcript or "",
                        "answer_type": db_answer.answer_type,
                        "time_spent": db_answer.time_spent,
                        "score": float(db_answer.score) if db_answer.score is not None else None,
                        "feedback": db_answer.feedback,
                        "evaluation_details": db_answer.evaluation_details or {}
                    })
                
                # Initialize workflow state
                state.update({
                    "session_id": session_id,
                    "user_id": str(session.user_id),
                    "company": session.company,
                    "role": session.role,
                    "mode": session.mode,
                    "experience_level": "mid-level",  # Default
                    "target_companies": [],
                    "target_roles": [],
                    "total_questions": session.total_questions,
                    "current_question_index": existing_answers_count,  # Resume from where we left off
                    "questions": [{
                        "id": str(q.id),
                        "category": q.category,
                        "question_text": q.question_text,
                        "difficulty": q.difficulty,
                        "options": q.options,
                        "explanation": q.explanation
                    } for q in questions],
                    "answers": existing_answers,
                    "category_scores": {},
                    "overall_score": 0.0,
                    "strengths": [],
                    "weaknesses": [],
                    "recommendations": [],
                    "stage": "interviewing",
                    "error": None
                })
                print(f"🚀 Initialized workflow state with {len(questions)} questions")
            finally:
                db.close()
        
        # Add the answer to state
        state["answers"].append(answer_data)
        current_index = len(state["answers"]) - 1
        
        # Evaluate the answer directly using AI service (bypass complex workflow)
        if current_index < len(state["questions"]):
            current_question = state["questions"][current_index]
            current_answer = answer_data
            
            print(f"🔍 Evaluating answer for question {current_index + 1}...")
            
            try:
                from ..services.ai_service import ai_service
                from ..schemas import AnswerEvaluationRequest
                
                request = AnswerEvaluationRequest(
                    question_text=current_question["question_text"],
                    category=current_question["category"],
                    answer_text=current_answer.get("answer_text", ""),
                    is_voice_answer=current_answer.get("answer_type") == "voice"
                )
                
                evaluation_result = await ai_service.evaluate_answer(request)
                
                # Store evaluation in answer
                state["answers"][current_index].update({
                    "score": evaluation_result.score,
                    "feedback": evaluation_result.feedback,
                    "evaluation_details": evaluation_result.evaluation_details.dict() if evaluation_result.evaluation_details else {}
                })
                
                # Update category scores
                category = current_question["category"]
                if category not in state["category_scores"]:
                    state["category_scores"][category] = 0.0
                    
                # Running average for category scores
                category_answers = [ans for i, ans in enumerate(state["answers"]) 
                                  if i < len(state["questions"]) and state["questions"][i]["category"] == category and "score" in ans and ans["score"] is not None]
                if category_answers:
                    scores = [float(ans["score"]) for ans in category_answers]
                    state["category_scores"][category] = sum(scores) / len(scores)
                
                print(f"📊 Answer scored: {evaluation_result.score}/10")
                
                evaluation = {
                    "score": evaluation_result.score,
                    "feedback": evaluation_result.feedback,
                    "evaluation_details": evaluation_result.evaluation_details.dict() if evaluation_result.evaluation_details else {}
                }
                
            except Exception as e:
                print(f"❌ Error evaluating answer: {e}")
                # Set default evaluation
                state["answers"][current_index].update({
                    "score": 5.0,
                    "feedback": "Unable to evaluate answer due to technical issue.",
                    "evaluation_details": {}
                })
                evaluation = {
                    "score": 5.0,
                    "feedback": "Unable to evaluate answer due to technical issue.",
                    "evaluation_details": {}
                }
        else:
            evaluation = None
        
        # Update current question index AFTER adding the answer
        state["current_question_index"] = len(state["answers"])
        
        # Check if interview is complete
        completed = state["current_question_index"] >= len(state["questions"])
        if completed:
            state["stage"] = "completed"
        
        # Get next question if available
        next_question = None
        if state["current_question_index"] < len(state["questions"]):
            next_question = state["questions"][state["current_question_index"]]
        
        # Store key progress in database to maintain state between requests
        try:
            from ..database import SessionLocal
            from ..models import InterviewSession
            
            db = SessionLocal()
            try:
                session_id = thread_id.replace("interview_", "")
                db.query(InterviewSession).filter(InterviewSession.id == session_id).update({
                    "current_question": state["current_question_index"]
                })
                db.commit()
                print(f"💾 Progress saved: question {state['current_question_index']}/{len(state['questions'])}")
            finally:
                db.close()
        except Exception as e:
            print(f"⚠️ Database progress update warning: {e}")
        
        return {
            "evaluation": evaluation,
            "next_question": next_question,
            "progress": {
                "current": state["current_question_index"],
                "total": len(state["questions"]),
                "completed": completed
            },
            "current_scores": state["category_scores"]
        }

    async def get_final_report(self, thread_id: str) -> Dict[str, Any]:
        """Get the final interview report"""
        config = {"configurable": {"thread_id": thread_id}}
        
        # Get final state
        current_state = await self.graph.aget_state(config)
        state = current_state.values
        
        return {
            "overall_score": state["overall_score"],
            "category_scores": state["category_scores"],
            "strengths": state["strengths"],
            "weaknesses": state["weaknesses"],
            "recommendations": state["recommendations"],
            "total_questions": len(state["questions"]),
            "stage": state["stage"]
        }

# Global workflow instance
interview_workflow = InterviewWorkflow()