from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy import desc
from typing import Dict, Any, List
from datetime import datetime, timedelta

from ..database import get_db
from ..models import User, InterviewSession, Answer
from ..routers.auth import get_current_user

router = APIRouter(tags=["dashboard"])

@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive dashboard statistics"""
    
    # Get completed sessions
    completed_sessions = db.query(InterviewSession)\
        .filter(
            InterviewSession.user_id == current_user.id,
            InterviewSession.status == "completed"
        )\
        .all()
    
    # Basic stats
    sessions_completed = len(completed_sessions)
    
    # Calculate average score
    scores = [float(session.overall_score) for session in completed_sessions if session.overall_score]
    average_score = sum(scores) / len(scores) if scores else 0
    
    # Calculate total time spent (sum of all answers' time_spent)
    total_time_minutes = db.query(func.sum(Answer.time_spent))\
        .filter(Answer.user_id == current_user.id)\
        .scalar() or 0
    
    total_time_hours = total_time_minutes / 60 if total_time_minutes else 0
    total_time_str = f"{int(total_time_hours)}h {int(total_time_minutes % 60)}m"
    
    # Category averages
    category_scores = {}
    for session in completed_sessions:
        if session.category_scores:
            for category, score in session.category_scores.items():
                if category not in category_scores:
                    category_scores[category] = []
                category_scores[category].append(float(score))
    
    category_averages = []
    colors = ["#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4"]
    
    for i, (category, scores) in enumerate(category_scores.items()):
        avg_score = sum(scores) / len(scores) if scores else 0
        category_averages.append({
            "name": category.replace("_", " ").title(),
            "score": round(avg_score, 1),
            "color": colors[i % len(colors)]
        })
    
    # Count improvement areas (categories with score < 7)
    improvement_areas = sum(1 for cat in category_averages if cat["score"] < 7.0)
    
    # Recent sessions (last 5)
    recent_sessions = db.query(InterviewSession)\
        .filter(InterviewSession.user_id == current_user.id)\
        .order_by(desc(InterviewSession.created_at))\
        .limit(5)\
        .all()
    
    recent_sessions_data = []
    for session in recent_sessions:
        recent_sessions_data.append({
            "id": str(session.id),
            "company": session.company,
            "role": session.role,
            "mode": session.mode,
            "score": float(session.overall_score) if session.overall_score else 0,
            "date": session.created_at.strftime("%Y-%m-%d"),
            "recommendations": session.recommendations[:3] if session.recommendations else []
        })
    
    return {
        "sessionsCompleted": sessions_completed,
        "averageScore": round(average_score, 1),
        "improvementAreas": improvement_areas,
        "totalTime": total_time_str,
        "categoryAverages": category_averages,
        "recentSessions": recent_sessions_data
    }

@router.get("/performance-trend")
async def get_performance_trend(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get performance trend over time"""
    
    # Get sessions from last 3 months
    three_months_ago = datetime.utcnow() - timedelta(days=90)
    
    sessions = db.query(InterviewSession)\
        .filter(
            InterviewSession.user_id == current_user.id,
            InterviewSession.status == "completed",
            InterviewSession.created_at >= three_months_ago
        )\
        .order_by(InterviewSession.created_at)\
        .all()
    
    trend_data = []
    for session in sessions:
        trend_data.append({
            "date": session.created_at.strftime("%Y-%m-%d"),
            "score": float(session.overall_score) if session.overall_score else 0,
            "company": session.company,
            "role": session.role
        })
    
    return {"trend": trend_data}

@router.get("/category-breakdown")
async def get_category_breakdown(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed category performance breakdown"""
    
    completed_sessions = db.query(InterviewSession)\
        .filter(
            InterviewSession.user_id == current_user.id,
            InterviewSession.status == "completed"
        )\
        .all()
    
    # Aggregate category data
    category_data = {}
    
    for session in completed_sessions:
        if session.category_scores:
            for category, score in session.category_scores.items():
                if category not in category_data:
                    category_data[category] = {
                        "scores": [],
                        "total_questions": 0,
                        "sessions": 0
                    }
                
                category_data[category]["scores"].append(float(score))
                category_data[category]["sessions"] += 1
    
    # Calculate statistics for each category
    breakdown = []
    for category, data in category_data.items():
        scores = data["scores"]
        breakdown.append({
            "category": category.replace("_", " ").title(),
            "average": round(sum(scores) / len(scores), 1),
            "best": round(max(scores), 1),
            "worst": round(min(scores), 1),
            "sessions": data["sessions"],
            "trend": "improving" if len(scores) > 1 and scores[-1] > scores[0] else "stable"
        })
    
    # Sort by average score descending
    breakdown.sort(key=lambda x: x["average"], reverse=True)
    
    return {"categories": breakdown}