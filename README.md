# InterviewBot

AI-powered interview practice platform with personalized feedback and recommendations.

**Live Demo:** [https://interviewbot-frontend.onrender.com/](https://interviewbot-frontend.onrender.com/)

## Features

- AI-generated interview questions tailored to your role and company
- Real-time answer evaluation and feedback
- Performance tracking and analytics
- Support for technical, behavioral, and system design questions

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** FastAPI (Python) + PostgreSQL
- **AI:** LangChain + Google Gemini

## Setup

### Environment Variables

Create a `.env` file or add these environment variables:

```
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=your_postgresql_connection_string
```

Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Install Dependencies

```bash
# Python dependencies
pip install -r requirements.txt

# Node.js dependencies
npm install
```

### Running

```bash
npm run dev
```

The app will be available at http://localhost:5000

## Project Structure

- `app/` - FastAPI backend
- `client/` - React frontend
- `shared/` - Shared TypeScript schemas

## License

MIT
