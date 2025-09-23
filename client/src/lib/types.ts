import { z } from "zod";

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  experienceLevel?: "fresher" | "mid-level" | "senior";
  targetCompanies?: string[];
  targetRoles?: string[];
  profileImageUrl?: string;
}

// Auth schemas and types
export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  experienceLevel: z.enum(["fresher", "mid-level", "senior"]).optional(),
  targetCompanies: z.array(z.string()).optional(),
  targetRoles: z.array(z.string()).optional(),
  profileImageUrl: z.string().optional(),
});

export const profileUpdateSchema = z.object({
  experienceLevel: z.enum(["fresher", "mid-level", "senior"]),
  targetCompanies: z.array(z.string()),
  targetRoles: z.array(z.string()),
});

export type LoginData = z.infer<typeof loginSchema>;
export type SignupData = z.infer<typeof signupSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

// Interview types
export interface Question {
  id: string;
  questionNumber: number;
  category: string;
  questionText: string;
  difficulty: string;
  sessionId: string;
}

export interface Answer {
  id: string;
  questionId: string;
  sessionId: string;
  answerType: string;
  subjectiveAnswer?: string;
  voiceTranscript?: string;
  score: number;
  feedback: string;
  evaluationDetails: {
    clarity?: number;
    depth?: number;
    confidence?: number;
    relevance?: number;
    structure?: number;
  };
  timeSpent?: number;
  createdAt: string;
}

export interface InterviewSession {
  id: string;
  company: string;
  role: string;
  mode: string;
  overallScore: string;
  categoryScores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  totalQuestions: number;
  completedAt: string;
}

export interface SessionResults {
  session: InterviewSession;
  overallScore: number;
  categoryScores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface DetailedAnswer {
  question: {
    id: string;
    questionNumber: number;
    category: string;
    questionText: string;
    difficulty: string;
  };
  answer: {
    id: string;
    answerType: string;
    subjectiveAnswer?: string;
    voiceTranscript?: string;
    score: number;
    feedback: string;
    evaluationDetails: {
      clarity?: number;
      depth?: number;
      confidence?: number;
      relevance?: number;
      structure?: number;
    };
    timeSpent?: number;
    createdAt: string;
  } | null;
}

// Shared results types
export interface SharedInterviewSession {
  id: string;
  company: string;
  role: string;
  mode: string;
  status: string;
  totalQuestions: number;
  completedAt: string;
  createdAt: string;
}

export interface SharedSessionResults {
  session: SharedInterviewSession;
  candidateName: string;
  overallScore: number;
  categoryScores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}