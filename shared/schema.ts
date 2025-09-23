import { pgTable, text, uuid, timestamp, integer, json, numeric, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Sessions table for authentication
export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
}, (table) => ({
  expireIdx: index("IDX_session_expire").on(table.expire),
}));

// Users table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  experienceLevel: text("experience_level"), // fresher, mid-level, senior
  targetCompanies: json("target_companies").$type<string[]>().default([]),
  targetRoles: json("target_roles").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Interview sessions
export const interviewSessions = pgTable("interview_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  mode: text("mode").notNull(), // subjective, voice
  company: text("company").notNull(),
  role: text("role").notNull(),
  status: text("status").default("in_progress").notNull(), // in_progress, completed, abandoned
  totalQuestions: integer("total_questions").default(10).notNull(),
  currentQuestion: integer("current_question").default(0).notNull(),
  overallScore: numeric("overall_score", { precision: 3, scale: 1 }),
  categoryScores: json("category_scores").$type<Record<string, number>>().default({}),
  strengths: json("strengths").$type<string[]>().default([]),
  weaknesses: json("weaknesses").$type<string[]>().default([]),
  recommendations: json("recommendations").$type<string[]>().default([]),
  shareToken: text("share_token").unique(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Questions
export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").references(() => interviewSessions.id, { onDelete: "cascade" }).notNull(),
  questionNumber: integer("question_number").notNull(),
  category: text("category").notNull(), // technical, behavioral, system_design, domain_knowledge, communication
  questionText: text("question_text").notNull(),
  options: json("options").$type<string[]>(),
  correctAnswer: text("correct_answer"),
  explanation: text("explanation"),
  difficulty: text("difficulty").default("medium"), // easy, medium, hard
  createdAt: timestamp("created_at").defaultNow(),
});

// Answers
export const answers = pgTable("answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id").references(() => questions.id, { onDelete: "cascade" }).notNull(),
  sessionId: uuid("session_id").references(() => interviewSessions.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  answerType: text("answer_type").notNull(), // subjective, voice
  subjectiveAnswer: text("subjective_answer"),
  mcqAnswer: text("mcq_answer"),
  voiceTranscript: text("voice_transcript"),
  audioFileUrl: text("audio_file_url"),
  isCorrect: boolean("is_correct"),
  score: numeric("score", { precision: 3, scale: 1 }),
  feedback: text("feedback"),
  correctedAnswer: text("corrected_answer"),
  missingPoints: text("missing_points"),
  timeSpent: integer("time_spent"), // in seconds
  evaluationDetails: json("evaluation_details").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  interviewSessions: many(interviewSessions),
  answers: many(answers),
}));

export const interviewSessionsRelations = relations(interviewSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [interviewSessions.userId],
    references: [users.id],
  }),
  questions: many(questions),
  answers: many(answers),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  session: one(interviewSessions, {
    fields: [questions.sessionId],
    references: [interviewSessions.id],
  }),
  answers: many(answers),
}));

export const answersRelations = relations(answers, ({ one }) => ({
  question: one(questions, {
    fields: [answers.questionId],
    references: [questions.id],
  }),
  session: one(interviewSessions, {
    fields: [answers.sessionId],
    references: [interviewSessions.id],
  }),
  user: one(users, {
    fields: [answers.userId],
    references: [users.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type InterviewSession = typeof interviewSessions.$inferSelect;
export type InsertInterviewSession = typeof interviewSessions.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;
export type Answer = typeof answers.$inferSelect;
export type InsertAnswer = typeof answers.$inferInsert;