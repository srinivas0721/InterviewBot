# Local Setup Guide for InterviewBot

This guide explains how to run the InterviewBot project in a local development environment.

## Prerequisites

Before starting, ensure you have the following installed:
- Node.js (v18 or higher)
- Python 3.11+
- PostgreSQL database
- Git

## Step 1: Clone and Setup Project

1. Download the project files to your local machine
2. Navigate to the project directory in your terminal

## Step 2: Environment Variables

1. Create a `.env` file in the root directory
2. Add the following environment variables:

```
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://username:password@localhost:5432/interviewbot
PGHOST=localhost
PGPORT=5432
PGDATABASE=interviewbot
PGUSER=your_db_username
PGPASSWORD=your_db_password
```

## Step 3: Database Setup

1. Create a PostgreSQL database named `interviewbot`
2. Make sure PostgreSQL is running on your system
3. Update the database connection details in your `.env` file

## Step 4: Install Dependencies

### Backend (Python/FastAPI)
```bash
pip install -r requirements.txt
```

### Frontend (React/TypeScript)
```bash
npm install
```

## Step 5: Database Migrations

Run the database setup script to create the necessary tables:
```bash
python app/create_tables.py
```

## Step 6: Run the Application

### Option 1: Run Both Services Simultaneously
```bash
# Start both backend and frontend
python start_fastapi.py & npx vite & wait
```

### Option 2: Run Services Separately

**Terminal 1 - Backend (FastAPI):**
```bash
python start_fastapi.py
```

**Terminal 2 - Frontend (Vite):**
```bash
npx vite
```

## Step 7: Access the Application

- Frontend: http://localhost:5000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Troubleshooting

1. **Database Connection Issues:**
   - Ensure PostgreSQL is running
   - Check database credentials in `.env`
   - Verify database exists

2. **Missing Dependencies:**
   - Run `pip install -r requirements.txt` for Python packages
   - Run `npm install` for Node.js packages

3. **Port Conflicts:**
   - Make sure ports 5000 and 8000 are available
   - Kill any processes using these ports if needed

4. **API Key Issues:**
   - Ensure GEMINI_API_KEY is set in `.env`
   - Get your API key from https://makersuite.google.com/app/apikey

## Project Structure

- `/app` - FastAPI backend application
- `/client` - React frontend application  
- `/requirements.txt` - Python dependencies
- `/package.json` - Node.js dependencies
- `start_fastapi.py` - Backend startup script
- `vite.config.ts` - Frontend build configuration

## Development Notes

- The backend runs on port 8000
- The frontend runs on port 5000
- Hot reloading is enabled for both services
- API documentation is auto-generated at /docs endpoint