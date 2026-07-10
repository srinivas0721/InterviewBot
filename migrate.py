#!/usr/bin/env python3
"""
Database migration script for new features.
Run this ONCE after deploying to add new columns/tables.

Usage: python3 migrate.py
"""
import os
import sys

# Ensure we can import the app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text, inspect

# Get DATABASE_URL from env
database_url = os.getenv("DATABASE_URL")
if not database_url:
    # Try loading from .env file
    try:
        with open(".env") as f:
            for line in f:
                if line.startswith("DATABASE_URL="):
                    database_url = line.strip().split("=", 1)[1]
    except FileNotFoundError:
        pass

if not database_url:
    print("❌ DATABASE_URL not set. Set it in .env or environment.")
    sys.exit(1)

engine = create_engine(database_url)

def run_migrations():
    with engine.connect() as conn:
        inspector = inspect(engine)
        
        # Migration 1: Add 'difficulty' column to interview_sessions
        columns = [col["name"] for col in inspector.get_columns("interview_sessions")]
        if "difficulty" not in columns:
            print("➕ Adding 'difficulty' column to interview_sessions...")
            conn.execute(text(
                "ALTER TABLE interview_sessions ADD COLUMN difficulty VARCHAR(20) DEFAULT 'medium'"
            ))
            conn.commit()
            print("   ✅ Done")
        else:
            print("   ⏭️  'difficulty' column already exists")
        
        # Migration 2: Create bookmarked_questions table
        if "bookmarked_questions" not in inspector.get_table_names():
            print("➕ Creating 'bookmarked_questions' table...")
            conn.execute(text("""
                CREATE TABLE bookmarked_questions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                    note TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(user_id, question_id)
                )
            """))
            conn.commit()
            print("   ✅ Done")
        else:
            print("   ⏭️  'bookmarked_questions' table already exists")
        
        print("\n✅ All migrations complete!")

if __name__ == "__main__":
    print("🔄 Running InterviewBot database migrations...\n")
    try:
        run_migrations()
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)
