# Add these endpoints to app/routers/interviews.py
# Insert before the existing route aliases section

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
