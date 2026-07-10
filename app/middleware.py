"""
Rate limiting middleware for the InterviewBot API.
Prevents abuse of AI endpoints that consume Gemini API credits.
"""
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from datetime import datetime, timedelta
import time


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiter per user session."""
    
    def __init__(self, app, requests_per_minute: int = 30, session_create_per_hour: int = 10):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.session_create_per_hour = session_create_per_hour
        # Track requests: {user_id: [(timestamp, path), ...]}
        self._request_log: dict = defaultdict(list)
        self._session_create_log: dict = defaultdict(list)
    
    async def dispatch(self, request: Request, call_next):
        # Only rate limit API endpoints
        if not request.url.path.startswith("/api"):
            return await call_next(request)
        
        # Skip health check
        if request.url.path == "/api/health":
            return await call_next(request)
        
        # Get user identifier from session
        # Note: SessionMiddleware may not have processed yet depending on middleware order.
        # We try to access it safely and fall back to IP-based limiting.
        user_id = None
        try:
            if hasattr(request, "session") and request.session:
                user_id = request.session.get("user_id")
        except Exception:
            pass
        
        if not user_id:
            # For unauthenticated requests or when session isn't available, use client IP
            user_id = f"ip:{request.client.host}" if request.client else "unknown"
        
        now = time.time()
        
        # Clean old entries (older than 1 hour)
        cutoff_minute = now - 60
        cutoff_hour = now - 3600
        
        self._request_log[user_id] = [
            ts for ts in self._request_log[user_id] if ts > cutoff_minute
        ]
        self._session_create_log[user_id] = [
            ts for ts in self._session_create_log[user_id] if ts > cutoff_hour
        ]
        
        # Check general rate limit
        if len(self._request_log[user_id]) >= self.requests_per_minute:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please wait a moment before trying again."
            )
        
        # Check session creation rate limit (expensive AI calls)
        if (request.method == "POST" and 
            ("/sessions" in request.url.path or request.url.path.endswith("/interviews"))):
            if len(self._session_create_log[user_id]) >= self.session_create_per_hour:
                raise HTTPException(
                    status_code=429,
                    detail=f"You've created too many interview sessions. Please wait before starting another. Limit: {self.session_create_per_hour} per hour."
                )
            self._session_create_log[user_id].append(now)
        
        # Log this request
        self._request_log[user_id].append(now)
        
        response = await call_next(request)
        return response
