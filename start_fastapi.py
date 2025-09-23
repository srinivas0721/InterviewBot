#!/usr/bin/env python3
"""
FastAPI InterviewBot Server Startup Script
"""
import uvicorn
import os

if __name__ == "__main__":
    # Set environment
    os.environ.setdefault("PYTHONPATH", ".")
    
    # Run FastAPI server
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0", 
        port=8000,
        reload=True if os.getenv("NODE_ENV") != "production" else False,
        log_level="info"
    )