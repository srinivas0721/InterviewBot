import { useState, useEffect, useRef } from "react";
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
  const [expiredQuestions, setExpiredQuestions] = useState<Set<number>>(new Set());  // Questions whose timer ran out (locked)
  const [timers, setTimers] = useState<Record<number, number>>({});  // Track remaining time per question
  const timersRef = useRef<Record<number, number>>({});  // Authoritative store (avoids stale closure reads)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);  // Final review/confirm modal
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);  // Finalizing the whole interview
  
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
      setTimeout(() => setLocation("/"), 3000);
    }
  }));

  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [hasStartedFullscreen, setHasStartedFullscreen] = useState(false);

  // Get user data for profile preferences
  const { data: userData, isSuccess: isUserLoaded } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });
  const hasCreatedSession = useRef(false);

  // Timer for each question (300 seconds = 5 minutes)
  const { timeLeft, isRunning, start, stop, reset, isWarning } = useTimer(300, () => {
    // Time is up for the current question: freeze its draft and lock the box.
    const idx = currentQuestionIndex;
    if (textAnswer.trim()) {
      setAnswers(prev => ({ ...prev, [idx]: textAnswer }));
    }
    persistTime(idx, 0);
    setExpiredQuestions(prev => new Set([...prev, idx]));

    if (idx >= questions.length - 1) {
      // Last question — open the final review instead of forcing completion
      toast({
        title: "Time's up!",
        description: "This question is now locked. Review and submit your interview.",
        variant: "destructive",
      });
      setShowSubmitConfirm(true);
    } else {
      toast({
        title: "Time's up!",
        description: "This question is locked. Moving to the next one...",
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

  // Initialize session once. For a fresh interview, wait until the user profile
  // has loaded so we use the real target company/role instead of the defaults.
  useEffect(() => {
    if (hasCreatedSession.current) return;
    if (!resumeSessionId && !isUserLoaded) return;
    hasCreatedSession.current = true;
    createSessionMutation.mutate();
  }, [isUserLoaded, resumeSessionId]);

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

  // A question is locked (read-only) once it has been submitted or its timer expired.
  const isLocked = (index: number) => submittedQuestions.has(index) || expiredQuestions.has(index);

  // Resolve the remaining time to show for a question.
  // Locked questions sit at 0; unvisited questions start fresh at 300.
  const resolveTimeFor = (index: number) => {
    if (isLocked(index)) return 0;
    return timersRef.current[index] ?? 300;
  };

  const persistTime = (index: number, value: number) => {
    timersRef.current[index] = value;
    setTimers({ ...timersRef.current });
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion) return;

    const isLastQuestion = currentQuestionIndex >= questions.length - 1;

    // If the last question is already locked (submitted earlier, or its timer
    // expired), there's nothing new to save — just open the review modal.
    if (isLastQuestion && isLocked(currentQuestionIndex)) {
      stop();
      setShowSubmitConfirm(true);
      return;
    }

    // Non-final questions that are locked have nothing to do.
    if (isLocked(currentQuestionIndex)) return;

    if (isLastQuestion) {
      // On the final question, don't finalize immediately. Save this answer (if any)
      // then open the review modal so the user can confirm and revisit drafts.
      if (textAnswer.trim()) {
        const answeredIndex = currentQuestionIndex;
        const answerText = textAnswer;
        const timeSpent = 300 - timeLeft;
        setAnswers(prev => ({ ...prev, [answeredIndex]: answerText }));
        setSubmittedQuestions(prev => new Set([...prev, answeredIndex]));
        try {
          await submitAnswerMutation.mutateAsync({
            questionId: currentQuestion.id,
            answer: answerText,
            timeSpent,
          });
          persistTime(answeredIndex, 0);
        } catch (error) {
          setSubmittedQuestions(prev => {
            const next = new Set(prev);
            next.delete(answeredIndex);
            return next;
          });
          return;  // Keep the modal closed so the user can retry
        }
      }
      stop();  // Pause the countdown while the user reviews
      setShowSubmitConfirm(true);
      return;
    }

    // Not the last question — require an answer, submit in the background, advance
    if (!textAnswer.trim()) return;
    const answeredIndex = currentQuestionIndex;
    const answerText = textAnswer;
    const timeSpent = 300 - timeLeft;
    setAnswers(prev => ({ ...prev, [answeredIndex]: answerText }));
    setSubmittedQuestions(prev => new Set([...prev, answeredIndex]));
    submitAnswerMutation.mutate({
      questionId: currentQuestion.id,
      answer: answerText,
      timeSpent,
    });
    handleNextQuestion();
  };

  // Indices of questions that have a draft answer but were never submitted.
  const getDraftIndices = () =>
    questions
      .map((_, i) => i)
      .filter((i) => {
        if (submittedQuestions.has(i)) return false;
        const ans = (i === currentQuestionIndex ? textAnswer : answers[i]) || "";
        return ans.trim().length > 0;
      });

  // Finalize: submit any remaining drafts, then complete the interview.
  const handleConfirmFinalSubmit = async () => {
    setIsSubmittingAll(true);
    try {
      const draftIndices = getDraftIndices();
      for (const i of draftIndices) {
        const q = questions[i];
        const ans = (i === currentQuestionIndex ? textAnswer : answers[i]) || "";
        if (!q || !ans.trim()) continue;
        const timeSpent = 300 - (timersRef.current[i] ?? 0);
        await submitAnswerMutation.mutateAsync({
          questionId: q.id,
          answer: ans,
          timeSpent,
        });
        setSubmittedQuestions(prev => new Set([...prev, i]));
      }
      setShowSubmitConfirm(false);
      fullscreenMonitor.stop();
      completeInterviewMutation.mutate();
    } catch (error: any) {
      toast({
        title: "Failed to submit interview",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingAll(false);
    }
  };

  const navigateToQuestion = (index: number) => {
    if (index === currentQuestionIndex) return;

    // Save current answer and remaining time before navigating
    if (textAnswer.trim() && !isLocked(currentQuestionIndex)) {
      setAnswers(prev => ({ ...prev, [currentQuestionIndex]: textAnswer }));
    }
    persistTime(currentQuestionIndex, isLocked(currentQuestionIndex) ? 0 : timeLeft);

    // Navigate to the target question
    setCurrentQuestionIndex(index);
    setTextAnswer(answers[index] || "");

    // Resume saved time (submitted = locked at 0, unvisited = fresh 300)
    const savedTime = resolveTimeFor(index);
    reset(savedTime);
    if (savedTime > 0) start();
  };

  const handleNextQuestion = () => {
    // Current question was just submitted — lock its timer at 0
    persistTime(currentQuestionIndex, 0);
    setTextAnswer("");

    if (currentQuestionIndex < questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      const savedTime = resolveTimeFor(nextIdx);
      setTextAnswer(answers[nextIdx] || "");
      reset(savedTime);
      if (savedTime > 0) start();
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
    setLocation("/");
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

      {/* Final review / confirm-before-submit modal */}
      {showSubmitConfirm && (() => {
        const completedCount = submittedQuestions.size;
        const draftIndices = getDraftIndices();
        const draftCount = draftIndices.length;
        const unansweredCount = Math.max(0, questions.length - completedCount - draftCount);
        return (
          <AlertDialog open={showSubmitConfirm}>
            <AlertDialogContent className="max-w-lg">
              <AlertDialogTitle className="text-2xl font-bold">
                Submit your interview?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <span className="block text-muted-foreground">
                  Here's a summary of your {questions.length} questions. Once you submit,
                  answers are final and can't be changed.
                </span>
                <span className="grid grid-cols-3 gap-2">
                  <span className="block text-center rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                    <span className="block text-2xl font-bold text-green-500">{completedCount}</span>
                    <span className="block text-xs text-muted-foreground">Submitted</span>
                  </span>
                  <span className="block text-center rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                    <span className="block text-2xl font-bold text-yellow-500">{draftCount}</span>
                    <span className="block text-xs text-muted-foreground">Drafts</span>
                  </span>
                  <span className="block text-center rounded-lg border border-muted p-3">
                    <span className="block text-2xl font-bold text-muted-foreground">{unansweredCount}</span>
                    <span className="block text-xs text-muted-foreground">Unanswered</span>
                  </span>
                </span>
                {draftCount > 0 && (
                  <span className="block rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-foreground">
                    You have {draftCount} draft{draftCount > 1 ? "s" : ""} (question
                    {draftCount > 1 ? "s" : ""} {draftIndices.map((i) => i + 1).join(", ")}).
                    They'll be submitted as-is. Choose "Go Back" if you want to edit them first.
                  </span>
                )}
                {unansweredCount > 0 && (
                  <span className="block text-sm text-muted-foreground">
                    {unansweredCount} question{unansweredCount > 1 ? "s" : ""} will be left unanswered.
                  </span>
                )}
              </AlertDialogDescription>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowSubmitConfirm(false)}
                  disabled={isSubmittingAll}
                >
                  Go Back
                </Button>
                <Button
                  onClick={handleConfirmFinalSubmit}
                  className="btn-gradient"
                  disabled={isSubmittingAll}
                  data-testid="button-confirm-submit"
                >
                  {isSubmittingAll ? (
                    <span className="flex items-center">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                      Submitting...
                    </span>
                  ) : (
                    "Submit Interview"
                  )}
                </Button>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        );
      })()}

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
                    disabled={isLocked(currentQuestionIndex)}
                    className="min-h-[200px] lg:min-h-[280px] resize-vertical text-base disabled:opacity-70"
                    placeholder={
                      submittedQuestions.has(currentQuestionIndex)
                        ? "This answer has already been submitted."
                        : expiredQuestions.has(currentQuestionIndex)
                        ? "Time's up — this answer is locked."
                        : "Type your detailed answer here..."
                    }
                    data-testid="text-answer-input"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {textAnswer.length > 0 && <span className="text-primary font-medium">{textAnswer.split(/\s+/).filter(Boolean).length} words</span>}
                      {isLocked(currentQuestionIndex) && (
                        <span className="ml-2 text-muted-foreground">🔒 Locked</span>
                      )}
                    </p>
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={
                        submitAnswerMutation.isPending ||
                        completeInterviewMutation.isPending ||
                        // Last question always allows opening the review modal;
                        // other questions need an unlocked, non-empty answer.
                        (currentQuestionIndex < questions.length - 1 &&
                          (!textAnswer.trim() || isLocked(currentQuestionIndex)))
                      }
                      className="btn-gradient px-8"
                      data-testid="button-submit-answer"
                    >
                      {submitAnswerMutation.isPending || completeInterviewMutation.isPending ? (
                        <span className="flex items-center">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                          {completeInterviewMutation.isPending ? "Finishing..." : "Evaluating..."}
                        </span>
                      ) : currentQuestionIndex >= questions.length - 1 ? (
                        "Review & Submit"
                      ) : submittedQuestions.has(currentQuestionIndex) ? (
                        "Submitted"
                      ) : (
                        "Submit Answer"
                      )}
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
                          : expiredQuestions.has(idx)
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : answers[idx]
                          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                      title={
                        submittedQuestions.has(idx)
                          ? "Submitted"
                          : expiredQuestions.has(idx)
                          ? "Time expired (locked)"
                          : answers[idx]
                          ? "Draft saved"
                          : "Not answered"
                      }
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500/50"></span>Submitted</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-yellow-500/50"></span>Draft</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500/50"></span>Expired</span>
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
