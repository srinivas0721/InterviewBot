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
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user data for profile preferences
  const { data: userData } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  // Timer for each question (90 seconds)
  const { timeLeft, isRunning, start, reset, isWarning } = useTimer(90, () => {
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
      // Use user's first target company and role, with fallbacks
      const company = userData?.targetCompanies?.[0] || "Google";
      const role = userData?.targetRoles?.[0] || "Software Engineer";
      
      const response = await apiRequest("POST", "/api/interviews", {
        mode: "subjective",
        company,
        role,
        totalQuestions: 10,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setSessionId(data.session.id);
      start(); // Start timer for first question
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
      // Don't show feedback immediately - save it for final results
      handleNextQuestion();
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
    onSuccess: () => {
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

  const questions: Question[] = (questionsData as { questions: Question[] })?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  const handleSubmitAnswer = () => {
    if (!textAnswer.trim() || !currentQuestion) return;

    const timeSpent = 90 - timeLeft;
    submitAnswerMutation.mutate({
      questionId: currentQuestion.id,
      answer: textAnswer,
      timeSpent,
    });
  };

  const handleNextQuestion = () => {
    setTextAnswer("");
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      reset(90);
      start();
    } else {
      // Interview complete
      completeInterviewMutation.mutate();
    }
  };


  const handleExit = () => {
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Subjective Interview Session</h1>
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

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
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

        {/* Question */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="mb-6">
              <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-4">
                {currentQuestion.category}
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-4" data-testid="question-text">
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
                className="min-h-[120px] resize-vertical"
                placeholder="Type your detailed answer here..."
                data-testid="text-answer-input"
              />
              <p className="text-sm text-muted-foreground">
                Provide a comprehensive answer with examples and explanations to demonstrate your knowledge.
              </p>
            </div>

            <div className="flex justify-end items-center mt-6">
              <Button
                onClick={handleSubmitAnswer}
                disabled={!textAnswer.trim() || submitAnswerMutation.isPending}
                data-testid="button-submit-answer"
              >
                {submitAnswerMutation.isPending ? "Submitting..." : "Submit Answer"}
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
