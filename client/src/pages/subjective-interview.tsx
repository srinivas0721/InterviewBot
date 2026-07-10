import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Timer } from "@/components/timer";
import { ProgressBar } from "@/components/progress-bar";
import { useTimer } from "@/hooks/useTimer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import type { Question, Answer } from "@/lib/types";
import { FullscreenMonitor, getFullscreenInitialMessage, getFullscreenWarningMessage, getFullscreenTerminationMessage } from '@/lib/fullscreenMonitor';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface InterviewSession {
  id: string;
  mode: string;
  company: string;
  role: string;
  totalQuestions: number;
  currentQuestion: number;
}


export default function SubjectiveInterview() {
  const [, setLocation] = useLocation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [textAnswer, setTextAnswer] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});  // Track answers per question index
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<number>>(new Set());  // Which questions were submitted
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Parse query params for difficulty and resume
  const searchParams = new URLSearchParams(window.location.search);
  const difficulty = searchParams.get("difficulty") || "medium";
  const resumeSessionId = searchParams.get("resume");

  const [fullscreenMonitor] = useState(() => new FullscreenMonitor({
    maxExits: 3,
    warningTimeout: 30000,
    onWarning: (exitsRemaining) => {
      toast({
        title: "⚠️ Fullscreen Warning",
        description: getFullscreenWarningMessage(exitsRemaining, 30),
        variant: "destructive",
        duration: 10000
      });
    },
    onTimeout: () => {
      toast({
        title: "⏰ Timeout",
        description: "You didn't return to fullscreen in time!",
        variant: "destructive"
      });
    },
    onSessionTerminated: async () => {
      if (sessionId) {
        try {
          await apiRequest("DELETE", `/api/interviews/sessions/${sessionId}/terminate`);
        } catch (error) {
          console.error("Failed to terminate session:", error);
        }
      }
      toast({
        title: "🚨 Session Terminated",
        description: getFullscreenTerminationMessage(),
        variant: "destructive",
        duration: 8000
      });
      setTimeout(() => setLocation("/dashboard"), 3000);
    }
  }));

  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [hasStartedFullscreen, setHasStartedFullscreen] = useState(false);

  // Get user data for profile preferences
  const { data: userData } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  // Timer for each question (300 seconds = 5 minutes)
  const { timeLeft, isRunning, start, reset, isWarning } = useTimer(300, () => {
    // Auto-submit when time runs out
    if (textAnswer.trim()) {
      handleSubmitAnswer();
    } else {
      toast({
        title: "Time's up!",
        description: "Moving to next question...",
        variant: "destructive",
      });
      handleNextQuestion();
    }
  });

  // Create interview session
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      // If resuming, just return the existing session
      if (resumeSessionId) {
        setIsResuming(true);
        const response = await apiRequest("GET", `/api/interviews/sessions/${resumeSessionId}`);
        const session = await response.json();
        return { session };
      }
      
      // Use user's first target company and role, with fallbacks
      const company = userData?.targetCompanies?.[0] || "Google";
      const role = userData?.targetRoles?.[0] || "Software Engineer";
      
      const response = await apiRequest("POST", "/api/interviews", {
        mode: "subjective",
        company,
        role,
        totalQuestions: 10,
        difficulty,
      });
      return response.json();
    },
    onSuccess: (data) => {
      const sid = data.session?.id || data.id;
      setSessionId(sid);
      
      // If resuming, figure out which question to start from
      if (isResuming || resumeSessionId) {
        const currentQ = data.session?.currentQuestion || data.currentQuestion || 0;
        setCurrentQuestionIndex(currentQ);
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to start interview",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get questions for session
  const { data: questionsData, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ["/api/interviews/sessions", sessionId, "questions"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/interviews/sessions/${sessionId}/questions`);
      return response.json();
    },
    enabled: !!sessionId,
  });

  // Submit answer mutation
  const submitAnswerMutation = useMutation({
    mutationFn: async (answerData: { questionId: string; answer: string; timeSpent: number }) => {
      const requestData = {
        questionId: answerData.questionId,
        subjectiveAnswer: answerData.answer,
        timeSpent: answerData.timeSpent,
        answerType: "subjective",
      };
      
      const response = await apiRequest("POST", `/api/interviews/sessions/${sessionId}/answers`, requestData);
      return response.json();
    },
    onSuccess: (data) => {
      // Answer submitted and evaluated — nothing else to do since we already moved to next question
    },
    onError: (error) => {
      toast({
        title: "Failed to submit answer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Complete interview mutation
  const completeInterviewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/interviews/sessions/${sessionId}/complete`);
      return response.json();
    },
    onSuccess: async () => {
      fullscreenMonitor.stop();
      if (document.fullscreenElement) {
        try { await document.exitFullscreen(); } catch (e) { console.error(e); }
      }
      
      setLocation(`/interview/${sessionId}/results`);
    },
    onError: (error) => {
      toast({
        title: "Failed to complete interview",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize session on component mount
  useEffect(() => {
    createSessionMutation.mutate();
  }, []);

  // Show fullscreen prompt when session is ready
  useEffect(() => {
    if (sessionId && !hasStartedFullscreen && !createSessionMutation.isPending && !isLoadingQuestions) {
      const questions = (questionsData as { questions: Question[] })?.questions || [];
      if (questions.length > 0) {
        setShowFullscreenPrompt(true);
      }
    }
  }, [sessionId, hasStartedFullscreen, createSessionMutation.isPending, isLoadingQuestions, questionsData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      fullscreenMonitor.stop();
    };
  }, [fullscreenMonitor]);

  const questions: Question[] = (questionsData as { questions: Question[] })?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  const handleStartFullscreen = async () => {
    const success = await fullscreenMonitor.requestFullscreen();
    if (success) {
      setShowFullscreenPrompt(false);
      setHasStartedFullscreen(true);
      fullscreenMonitor.start();
      start(); // Start the timer
    } else {
      toast({
        title: "Fullscreen Required",
        description: "Please allow fullscreen access to continue with the interview",
        variant: "destructive"
      });
    }
  };

  const handleSubmitAnswer = () => {
    if (!textAnswer.trim() || !currentQuestion) return;

    const timeSpent = 300 - timeLeft;
    
    // Save answer locally
    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: textAnswer }));
    setSubmittedQuestions(prev => new Set([...prev, currentQuestionIndex]));
    
    // Fire the submission (runs in background — don't wait for it)
    submitAnswerMutation.mutate({
      questionId: currentQuestion.id,
      answer: textAnswer,
      timeSpent,
    });

    // Immediately move to next question (optimistic UX)
    handleNextQuestion();
  };

  const navigateToQuestion = (index: number) => {
    // Save current answer before navigating
    if (textAnswer.trim()) {
      setAnswers(prev => ({ ...prev, [currentQuestionIndex]: textAnswer }));
    }
    
    // Navigate to the target question
    setCurrentQuestionIndex(index);
    setTextAnswer(answers[index] || "");
    reset(300);
    start();
  };

  const handleNextQuestion = () => {
    setTextAnswer("");
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      reset(300);
      start();
    } else {
      // Interview complete
      fullscreenMonitor.stop();
      completeInterviewMutation.mutate();
    }
  };

  const handleExit = async () => {
    fullscreenMonitor.stop();
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch (e) { console.error(e); }
    }
    if (sessionId) {
      try {
        await apiRequest("PATCH", `/api/interviews/sessions/${sessionId}/abandon`);
      } catch (error) {
        console.error("Failed to abandon session:", error);
      }
    }
    setLocation("/dashboard");
  };

  if (createSessionMutation.isPending || isLoadingQuestions) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Setting Up Your Interview</h2>
          </div>
          
          <div className="space-y-4">
            {/* Progress Steps */}
            <div className="flex items-center justify-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                createSessionMutation.isPending ? 'bg-primary animate-pulse' : 'bg-primary'
              }`}></div>
              <div className="text-sm text-foreground font-medium">
                {createSessionMutation.isPending ? 'Creating session...' : 'Session created ✓'}
              </div>
            </div>
            
            {!createSessionMutation.isPending && (
              <div className="flex items-center justify-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  isLoadingQuestions ? 'bg-primary animate-pulse' : 'bg-muted'
                }`}></div>
                <div className="text-sm text-foreground font-medium">
                  {isLoadingQuestions ? 'Generating questions with AI...' : 'Questions ready ✓'}
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-8 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 We're using AI to create personalized questions based on your target role and experience level.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              This usually takes 10-15 seconds
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No questions available</p>
          <Button onClick={handleExit} className="mt-4">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fullscreen Prompt Dialog */}
      {showFullscreenPrompt && (
        <AlertDialog open={showFullscreenPrompt}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogTitle className="text-2xl font-bold">
              📢 Fullscreen Mode Required
            </AlertDialogTitle>
            <AlertDialogDescription className="text-lg leading-relaxed space-y-4">
              <p className="text-foreground">{getFullscreenInitialMessage()}</p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
                <p className="text-sm text-yellow-900 dark:text-yellow-100">
                  <strong>Important:</strong> If you exit fullscreen 3 times, your interview will be automatically terminated and all progress will be lost.
                </p>
              </div>
            </AlertDialogDescription>
            <div className="flex justify-end space-x-4 mt-6">
              <Button variant="outline" onClick={handleExit}>
                Cancel Interview
              </Button>
              <Button onClick={handleStartFullscreen} className="btn-gradient">
                Start in Fullscreen Mode
              </Button>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Subjective Interview Session</h1>
            <p className="text-muted-foreground">
              {(() => {
                const companies = userData?.targetCompanies || ["Google"];
                const roles = userData?.targetRoles || ["Software Engineer"];
                
                const companyText = companies.length > 1 
                  ? `${companies[0]} + ${companies.length - 1} more`
                  : companies[0];
                
                const roleText = roles.length > 1
                  ? `${roles[0]} + ${roles.length - 1} more roles`
                  : roles[0];
                
                return `${companyText} - ${roleText}`;
              })()}
            </p>
          </div>
          <Button variant="ghost" onClick={handleExit} data-testid="button-exit-interview">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Progress Bar */}
        <Card className="glass-card mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <ProgressBar 
                current={currentQuestionIndex + 1} 
                total={questions.length} 
                className="flex-1 mr-8"
              />
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Time Remaining</div>
                <Timer timeLeft={timeLeft} isWarning={isWarning} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content — Two Column Layout on Large Screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Question & Answer (2/3 width) */}
          <div className="lg:col-span-2">
            <Card className="glass-card border-primary/10">
              <CardContent className="p-6 lg:p-8">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="category-badge">
                      {currentQuestion.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                  </div>
                  <h2 className="text-xl lg:text-2xl font-semibold text-foreground leading-relaxed" data-testid="question-text">
                    {currentQuestion.questionText}
                  </h2>
                </div>

                <div className="space-y-4">
                  <Label htmlFor="text-answer" className="text-sm font-medium">
                    Your Answer:
                  </Label>
                  <Textarea
                    id="text-answer"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    className="min-h-[200px] lg:min-h-[280px] resize-vertical text-base"
                    placeholder="Type your detailed answer here..."
                    data-testid="text-answer-input"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {textAnswer.length > 0 && <span className="text-primary font-medium">{textAnswer.split(/\s+/).filter(Boolean).length} words</span>}
                    </p>
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={!textAnswer.trim() || submitAnswerMutation.isPending}
                      className="btn-gradient px-8"
                      data-testid="button-submit-answer"
                    >
                      {submitAnswerMutation.isPending ? (
                        <span className="flex items-center">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                          Evaluating...
                        </span>
                      ) : "Submit Answer"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Sidebar with tips and question navigation (1/3 width) */}
          <div className="lg:col-span-1 space-y-4">
            {/* Question Navigation */}
            <Card className="glass-card border-primary/10">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">Questions</h4>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q: Question, idx: number) => (
                    <button
                      key={q.id}
                      onClick={() => navigateToQuestion(idx)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer hover:scale-110 ${
                        idx === currentQuestionIndex
                          ? "bg-primary text-white shadow-[0_0_10px_hsla(262,83%,58%,0.5)]"
                          : submittedQuestions.has(idx)
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : answers[idx]
                          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                      title={submittedQuestions.has(idx) ? "Submitted" : answers[idx] ? "Draft saved" : "Not answered"}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500/50"></span>Submitted</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-yellow-500/50"></span>Draft</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-primary"></span>Current</span>
                </div>
              </CardContent>
            </Card>

            {/* Tips Panel */}
            <Card className="glass-card border-primary/10">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">💡 Tips</h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Structure your answer: problem → approach → solution</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Include specific examples or metrics when possible</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Aim for 100-200 words per answer for best scores</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Mention trade-offs and alternative approaches</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Category Info */}
            <Card className="glass-card border-primary/10">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-foreground mb-2">Category</h4>
                <p className="text-sm text-primary capitalize font-medium">
                  {(currentQuestion.category || "").replace("_", " ")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentQuestion.category === "technical" && "Focus on accuracy, depth, and real-world examples."}
                  {currentQuestion.category === "behavioral" && "Use the STAR method: Situation, Task, Action, Result."}
                  {currentQuestion.category === "system_design" && "Discuss scale, trade-offs, and component interactions."}
                  {currentQuestion.category === "domain_knowledge" && "Show understanding of core concepts and their applications."}
                  {currentQuestion.category === "communication" && "Be clear, concise, and well-structured."}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
