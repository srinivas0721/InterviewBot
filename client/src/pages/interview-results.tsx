import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { 
  Trophy, 
  Star, 
  CheckCircle, 
  TrendingUp, 
  AlertTriangle, 
  Download,
  Share,
  Home,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Eye,
  EyeOff,
  Calendar,
  Timer,
  BarChart3,
  PieChart,
  Target,
  BookOpen,
  FileText,
  Mail,
  TrendingDown,
  Activity,
  Award,
  Brain,
  ChevronRight,
  Info
} from "lucide-react";

interface InterviewSession {
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
  createdAt?: string;
  currentQuestion: number;
  status: string;
}

interface SessionResults {
  session: InterviewSession;
  overallScore: number;
  categoryScores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  userInfo?: {
    experienceLevel?: string;
    targetCompanies?: string[];
    targetRoles?: string[];
  };
  analytics?: {
    totalDuration?: number;
    averageTimePerQuestion?: number;
    fastestQuestion?: number;
    slowestQuestion?: number;
    completionRate: number;
    difficultyBreakdown: Record<string, number>;
    categoryTiming: Record<string, number>;
  };
}

interface DetailedAnswer {
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

export default function InterviewResults() {
  const params = useParams();
  const sessionId = params.sessionId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showDetailedAnswers, setShowDetailedAnswers] = useState(false);

  // Get interview results
  const { data: results, isLoading } = useQuery<SessionResults>({
    queryKey: ["/api/interviews", sessionId, "results"],
    enabled: !!sessionId,
  });

  // Get detailed answers and feedback - use CORRECT endpoint path
  const { data: detailedAnswers, isLoading: isLoadingDetails, error: detailedAnswersError } = useQuery<DetailedAnswer[]>({
    queryKey: ["interview-detailed-results", sessionId],
    enabled: !!sessionId && showDetailedAnswers,
    queryFn: async () => {
      console.log("🔍 Starting detailed answers request for:", sessionId);
      try {
        const response = await apiRequest("GET", `/api/interviews/${sessionId}/detailed-answers`);
        console.log("🔍 Response status:", response.status);
        const data = await response.json();
        console.log("🔍 Raw API Response:", data);
        console.log("🔍 detailed_results field:", data.detailed_results);
        console.log("🔍 detailed_results length:", data.detailed_results?.length);
        return data;
      } catch (error) {
        console.error("🚫 Detailed answers request failed:", error);
        throw error;
      }
    },
    select: (data: any) => {
      console.log("🔍 Select function processing:", data);
      console.log("🔍 Data type:", typeof data);
      console.log("🔍 Data keys:", data ? Object.keys(data) : 'null/undefined');
      console.log("🔍 detailed_results exists:", 'detailed_results' in (data || {}));
      console.log("🔍 detailed_results value:", data?.detailed_results);
      console.log("🔍 detailed_results type:", typeof data?.detailed_results);
      console.log("🔍 detailed_results is array:", Array.isArray(data?.detailed_results));
      
      // Try multiple possible data structures - FORCE return the data
      let results = [];
      if (data?.detailed_results && Array.isArray(data.detailed_results)) {
        console.log("✅ Found detailed_results array");
        results = data.detailed_results;
      } else if (Array.isArray(data)) {
        console.log("✅ Data is direct array");
        results = data;
      } else if (data?.results && Array.isArray(data.results)) {
        console.log("✅ Found results array");
        results = data.results;
      } else {
        console.log("🚫 No valid array found in response, forcing fallback");
        // FORCE: Create fake data so we can see if the UI works
        results = data?.detailed_results || [];
      }
      
      console.log("🔍 Final results length:", results.length);
      console.log("🔍 Final results type:", typeof results);
      console.log("🔍 Final results is array:", Array.isArray(results));
      console.log("🔍 Final results first item:", results[0]);
      return results;
    },
  });

  // Download report mutation
  const downloadReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", `/api/interviews/${sessionId}/report`);
      return response.json();
    },
    onSuccess: (data) => {
      // Create blob from HTML and trigger download
      if (!data?.reportUrl) {
        toast({
          title: "Download failed",
          description: "Report data is not available. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      const htmlContent = decodeURIComponent(data.reportUrl.replace('data:text/html;charset=utf-8,', ''));
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `interview-report-${sessionId}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Report downloaded",
        description: "Your interview report has been downloaded successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDownloadReport = () => {
    downloadReportMutation.mutate();
  };

  // Share/unshare interview mutation
  const shareInterviewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/interviews/sessions/${sessionId}/share`);
      return response.json();
    },
    onSuccess: (data) => {
      const shareText = `🎯 Check out my Interview Practice Results!

📊 Overall Score: ${(results?.overallScore || 0).toFixed(1)}/10
🏢 Company: ${results?.session.company}
💼 Role: ${results?.session.role}

${data.shareUrl}

Practiced with InterviewBot AI 🤖`;

      if (navigator.share) {
        navigator.share({
          title: 'My Interview Practice Results',
          text: shareText,
          url: data.shareUrl,
        });
      } else {
        // Fallback to copying URL
        navigator.clipboard.writeText(data.shareUrl);
        toast({
          title: "Link created and copied!",
          description: "Shareable link copied to clipboard. Anyone can view your results with this link.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to create share link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unshareInterviewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/interviews/sessions/${sessionId}/share`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sharing disabled",
        description: "Your interview results are no longer publicly shareable.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to disable sharing",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleShareReport = () => {
    if (results) {
      // Check if session has a share token already
      const shareToken = (results.session as any).shareToken;
      
      if (shareToken) {
        // Already shared, use existing share link
        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}/share/${shareToken}`;
        
        const shareText = `🎯 Check out my Interview Practice Results!

📊 Overall Score: ${(results.overallScore || 0).toFixed(1)}/10
🏢 Company: ${results.session.company}
💼 Role: ${results.session.role}

${shareUrl}

Practiced with InterviewBot AI 🤖`;

        if (navigator.share) {
          navigator.share({
            title: 'My Interview Practice Results',
            text: shareText,
            url: shareUrl,
          });
        } else {
          // Fallback to copying URL
          navigator.clipboard.writeText(shareUrl);
          toast({
            title: "Link copied!",
            description: "Shareable link copied to clipboard. Anyone can view your results with this link.",
          });
        }
      } else {
        // Not yet shared, create share link first
        shareInterviewMutation.mutate();
      }
    }
  };

  const handleBackToDashboard = () => {
    setLocation("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Results not found</p>
          <Button onClick={handleBackToDashboard} className="mt-4">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-blue-600";
    if (score >= 4) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 9) return "Excellent";
    if (score >= 8) return "Strong Performance";
    if (score >= 7) return "Good Performance";
    if (score >= 6) return "Average Performance";
    return "Needs Improvement";
  };

  // Helper functions for analytics
  const calculateAnalytics = () => {
    if (!detailedAnswers) return null;
    
    const answers = detailedAnswers;
    const timings = answers.filter(a => a.answer?.timeSpent).map(a => a.answer!.timeSpent!);
    const difficulties = answers.reduce((acc: Record<string, number>, a) => {
      acc[a.question.difficulty] = (acc[a.question.difficulty] || 0) + 1;
      return acc;
    }, {});
    
    const categoryTiming = answers.reduce((acc: Record<string, number>, a) => {
      if (a.answer?.timeSpent) {
        const category = a.question.category;
        acc[category] = (acc[category] || 0) + a.answer.timeSpent;
      }
      return acc;
    }, {});
    
    return {
      totalDuration: timings.reduce((sum, time) => sum + time, 0),
      averageTimePerQuestion: timings.length > 0 ? timings.reduce((sum, time) => sum + time, 0) / timings.length : 0,
      fastestQuestion: timings.length > 0 ? Math.min(...timings) : 0,
      slowestQuestion: timings.length > 0 ? Math.max(...timings) : 0,
      completionRate: (answers.filter(a => a.answer !== null).length / answers.length) * 100,
      difficultyBreakdown: difficulties,
      categoryTiming: Object.keys(categoryTiming).reduce((acc: Record<string, number>, key) => {
        acc[key] = Math.round(categoryTiming[key] / 60); // Convert to minutes
        return acc;
      }, {})
    };
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  const getPerformanceTrend = (scores: Record<string, number>) => {
    const categoryNames = Object.keys(scores);
    const categoryScores = Object.values(scores);
    const averageScore = categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length;
    
    return {
      strongestCategory: categoryNames[categoryScores.indexOf(Math.max(...categoryScores))],
      weakestCategory: categoryNames[categoryScores.indexOf(Math.min(...categoryScores))],
      averageScore
    };
  };

  const analytics = calculateAnalytics();
  const performanceTrend = results ? getPerformanceTrend(results.categoryScores || {}) : null;
  
  // CSV Export function
  const generateCSVReport = () => {
    if (!results || !detailedAnswers || detailedAnswers.length === 0) return '';
    
    const headers = [
      'Question Number', 'Category', 'Difficulty', 'Question', 'Answer', 
      'Score', 'Time Spent (seconds)', 'Clarity', 'Depth', 'Confidence', 'Relevance', 'Structure', 'Feedback'
    ];
    
    const rows = (detailedAnswers || []).map(item => [
      item.question.questionNumber,
      item.question.category,
      item.question.difficulty,
      `"${(item.question.questionText || '').replace(/"/g, '""')}"`,
      item.answer ? `"${(item.answer.answerType === 'voice' ? (item.answer.voiceTranscript || '') : (item.answer.subjectiveAnswer || '')).replace(/"/g, '""')}"` : 'No answer',
      item.answer?.score || 0,
      item.answer?.timeSpent || 0,
      item.answer?.evaluationDetails?.clarity || '',
      item.answer?.evaluationDetails?.depth || '',
      item.answer?.evaluationDetails?.confidence || '',
      item.answer?.evaluationDetails?.relevance || '',
      item.answer?.evaluationDetails?.structure || '',
      item.answer ? `"${(item.answer.feedback || '').replace(/"/g, '""')}"` : 'No feedback'
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Interview Complete!</h1>
          <p className="text-muted-foreground">Here's how you performed</p>
        </div>

        {/* Overall Score */}
        <Card className="mb-8">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-4">Overall Score</h2>
            <div className={`text-6xl font-bold mb-2 ${getScoreColor(results.overallScore || 0)}`} data-testid="overall-score">
              {(results.overallScore || 0).toFixed(1)}
            </div>
            <div className="text-muted-foreground mb-4">out of 10</div>
            <div>
              <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                {getScoreBadge(results.overallScore || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(results.categoryScores || {}).map(([category, score]) => (
                <div key={category}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-foreground font-medium capitalize">
                      {(category || '').replace('_', ' ')}
                    </span>
                    <span className="text-muted-foreground" data-testid={`score-${category}`}>
                      {(score || 0).toFixed(1)}/10
                    </span>
                  </div>
                  <Progress value={score * 10} className="h-3" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Strengths and Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="h-5 w-5 text-green-600 mr-2" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {(results.strengths || []).length > 0 ? (results.strengths || []).map((strength, index) => (
                  <li key={index} className="flex items-start" data-testid={`strength-${index}`}>
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">{strength}</span>
                  </li>
                )) : (
                  <li className="text-muted-foreground">No specific strengths identified</li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {(results.weaknesses || []).length > 0 ? (results.weaknesses || []).map((weakness, index) => (
                  <li key={index} className="flex items-start" data-testid={`weakness-${index}`}>
                    <TrendingUp className="h-5 w-5 text-orange-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">{weakness}</span>
                  </li>
                )) : (
                  <li className="text-muted-foreground">No specific areas for improvement identified</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Recommendations & Action Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 text-purple-600 mr-2" />
                Personalized Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(results.recommendations || []).length > 0 ? (
                <div className="space-y-4">
                  {(results.recommendations || []).map((recommendation, index) => (
                    <div key={index} className="border-l-4 border-primary pl-4" data-testid={`recommendation-${index}`}>
                      <p className="text-foreground">{recommendation}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No specific recommendations at this time. Keep practicing to improve!</p>
              )}
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results.overallScore < 6 && (
                  <div className="flex items-start">
                    <ChevronRight className="h-4 w-4 text-orange-600 mr-2 mt-1 flex-shrink-0" />
                    <span className="text-foreground text-sm">
                      Focus on fundamentals - Review basic concepts in your weakest areas
                    </span>
                  </div>
                )}
                
                {performanceTrend && (
                  <div className="flex items-start">
                    <ChevronRight className="h-4 w-4 text-blue-600 mr-2 mt-1 flex-shrink-0" />
                    <span className="text-foreground text-sm">
                      Practice more {(performanceTrend.weakestCategory || '').replace('_', ' ')} questions
                    </span>
                  </div>
                )}
                
                {analytics && analytics.averageTimePerQuestion > 300 && (
                  <div className="flex items-start">
                    <ChevronRight className="h-4 w-4 text-yellow-600 mr-2 mt-1 flex-shrink-0" />
                    <span className="text-foreground text-sm">
                      Work on time management - Aim for 3-4 minutes per question
                    </span>
                  </div>
                )}
                
                <div className="flex items-start">
                  <ChevronRight className="h-4 w-4 text-green-600 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-foreground text-sm">
                    Schedule your next practice session within 3-5 days
                  </span>
                </div>
                
                <div className="flex items-start">
                  <ChevronRight className="h-4 w-4 text-purple-600 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-foreground text-sm">
                    Review this report and track your improvement over time
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interview Details & Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Session Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Info className="h-5 w-5 text-blue-600 mr-2" />
                Session Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{results.session.company}</div>
                  <div className="text-sm text-muted-foreground">Company</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{results.session.role}</div>
                  <div className="text-sm text-muted-foreground">Role</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{results.session.mode.toUpperCase()}</div>
                  <div className="text-sm text-muted-foreground">Mode</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{results.session.totalQuestions}</div>
                  <div className="text-sm text-muted-foreground">Questions</div>
                </div>
              </div>
              
              {/* Timeline Information */}
              {results.session.createdAt && (
                <div className="mt-6 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      Started: {new Date(results.session.createdAt).toLocaleDateString()}
                    </div>
                    {results.session.completedAt && (
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        Completed: {new Date(results.session.completedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Analytics */}
          {analytics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 text-green-600 mr-2" />
                  Performance Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {formatDuration(analytics.totalDuration)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {formatDuration(Math.round(analytics.averageTimePerQuestion))}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg per Question</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {analytics.completionRate.toFixed(0)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Completion Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {results.session.currentQuestion}/{results.session.totalQuestions}
                    </div>
                    <div className="text-sm text-muted-foreground">Progress</div>
                  </div>
                </div>
                
                {/* Time Range */}
                <div className="mt-6 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-green-600">
                      <Timer className="h-4 w-4 mr-2" />
                      Fastest: {formatDuration(analytics.fastestQuestion)}
                    </div>
                    <div className="flex items-center text-orange-600">
                      <Timer className="h-4 w-4 mr-2" />
                      Slowest: {formatDuration(analytics.slowestQuestion)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Performance Insights */}
        {performanceTrend && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
                Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <Award className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="font-semibold text-foreground">Strongest Area</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {(performanceTrend.strongestCategory || '').replace('_', ' ')}
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    {results.categoryScores[performanceTrend.strongestCategory]?.toFixed(1)}/10
                  </div>
                </div>
                
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="font-semibold text-foreground">Overall Average</div>
                  <div className="text-sm text-muted-foreground">Across all categories</div>
                  <div className="text-lg font-bold text-blue-600">
                    {performanceTrend.averageScore.toFixed(1)}/10
                  </div>
                </div>
                
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <Brain className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <div className="font-semibold text-foreground">Focus Area</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {(performanceTrend.weakestCategory || '').replace('_', ' ')}
                  </div>
                  <div className="text-lg font-bold text-orange-600">
                    {results.categoryScores[performanceTrend.weakestCategory]?.toFixed(1)}/10
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Performance Visualization */}
        {analytics && Object.keys(analytics.difficultyBreakdown).length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="h-5 w-5 text-indigo-600 mr-2" />
                Question Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Difficulty Distribution */}
                <div>
                  <h4 className="font-semibold text-foreground mb-4">Difficulty Distribution</h4>
                  <div className="space-y-3">
                    {Object.entries(analytics.difficultyBreakdown).map(([difficulty, count]) => (
                      <div key={difficulty}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-foreground font-medium capitalize">{difficulty}</span>
                          <span className="text-muted-foreground">{count} questions</span>
                        </div>
                        <div className="bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              difficulty === 'easy' ? 'bg-green-500' :
                              difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${(count / results.session.totalQuestions) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Category Time Distribution */}
                <div>
                  <h4 className="font-semibold text-foreground mb-4">Time per Category (minutes)</h4>
                  <div className="space-y-3">
                    {Object.entries(analytics.categoryTiming).map(([category, minutes]) => (
                      <div key={category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-foreground font-medium capitalize">
                            {(category || '').replace('_', ' ')}
                          </span>
                          <span className="text-muted-foreground">{minutes}m</span>
                        </div>
                        <div className="bg-muted rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ 
                              width: `${Math.min((minutes / Math.max(...Object.values(analytics.categoryTiming))) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Performance Summary Box */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">Quick Performance Summary</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>• You scored above average in {Object.values(results.categoryScores || {}).filter(score => score >= 6).length} out of {Object.keys(results.categoryScores || {}).length} categories</div>
                  {analytics && (
                    <div>• Completed {analytics.completionRate.toFixed(0)}% of questions with an average time of {formatDuration(Math.round(analytics.averageTimePerQuestion))} per question</div>
                  )}
                  <div>• {results.strengths.length} key strengths identified and {results.weaknesses.length} areas for improvement noted</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Answer Review */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
                Answer Review
              </div>
              <Button
                variant="outline"
                onClick={() => setShowDetailedAnswers(!showDetailedAnswers)}
                className="flex items-center"
              >
                {showDetailedAnswers ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showDetailedAnswers ? "Hide Answers" : "View Detailed Answers"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showDetailedAnswers ? (
              isLoadingDetails ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">Loading detailed feedback...</div>
                </div>
              ) : detailedAnswersError ? (
                <div className="text-center py-8">
                  <div className="text-red-600">Error loading detailed answers: {detailedAnswersError.message}</div>
                  <div className="text-sm text-muted-foreground mt-2">Check browser console for more details</div>
                </div>
              ) : detailedAnswers && Array.isArray(detailedAnswers) && detailedAnswers.length > 0 ? (
                <div className="space-y-6">
                  {detailedAnswers.map((item, index) => (
                    <div key={item.question.id} className="border rounded-lg p-4">
                      {/* Question Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm font-medium mr-3">
                            Q{item.question.questionNumber}
                          </span>
                          <span className="text-sm text-muted-foreground capitalize">
                            {(item.question.category || '').replace('_', ' ')} • {item.question.difficulty}
                          </span>
                        </div>
                        {item.answer && (
                          <div className="flex items-center">
                            <span className={`text-lg font-bold mr-2 ${
                              item.answer.score >= 7 ? 'text-green-600' : 
                              item.answer.score >= 5 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {item.answer.score.toFixed(1)}/10
                            </span>
                            {item.answer.score >= 7 ? 
                              <ThumbsUp className="h-4 w-4 text-green-600" /> : 
                              <ThumbsDown className="h-4 w-4 text-red-600" />
                            }
                          </div>
                        )}
                      </div>

                      {/* Question Text */}
                      <div className="mb-4">
                        <h4 className="font-semibold text-foreground mb-2">Question:</h4>
                        <p className="text-foreground">{item.question.questionText}</p>
                      </div>

                      {/* Answer */}
                      {item.answer ? (
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold text-foreground mb-2">Your Answer:</h4>
                            <div className="bg-muted rounded p-3">
                              <p className="text-foreground">
                                {item.answer.answerType === "voice" 
                                  ? item.answer.voiceTranscript 
                                  : item.answer.subjectiveAnswer}
                              </p>
                              {item.answer.timeSpent && (
                                <div className="flex items-center mt-2 text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {Math.floor(item.answer.timeSpent / 60)}m {item.answer.timeSpent % 60}s
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Score Breakdown */}
                          <div>
                            <h4 className="font-semibold text-foreground mb-3">Score: {item.answer.score.toFixed(1)}/10</h4>
                            {item.answer.evaluationDetails && (
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                                {Object.entries(item.answer.evaluationDetails).map(([criteria, score]) => (
                                  score !== undefined && (
                                    <div key={criteria} className="text-center">
                                      <div className="text-sm text-muted-foreground capitalize mb-1">
                                        {criteria}
                                      </div>
                                      <div className={`text-lg font-bold ${
                                        score >= 7 ? 'text-green-600' : 
                                        score >= 5 ? 'text-yellow-600' : 'text-red-600'
                                      }`}>
                                        {score}/10
                                      </div>
                                    </div>
                                  )
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Feedback */}
                          <div>
                            <h4 className="font-semibold text-foreground mb-2">Feedback:</h4>
                            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-3">
                              <p className="text-foreground">{item.answer.feedback}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">No answer provided for this question</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No detailed answers available</p>
                  <div className="mt-4 text-xs text-gray-500 bg-gray-100 p-2 rounded">
                    <p>Debug Info:</p>
                    <p>detailedAnswers type: {typeof detailedAnswers}</p>
                    <p>detailedAnswers is array: {Array.isArray(detailedAnswers).toString()}</p>
                    <p>detailedAnswers length: {detailedAnswers?.length || 'undefined'}</p>
                    <p>detailedAnswers value: {JSON.stringify(detailedAnswers)?.substring(0, 200) || 'null'}...</p>
                  </div>
                </div>
              )
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Click "View Detailed Answers" to see your answers with AI feedback and scores for each question.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 text-gray-600 mr-2" />
              Export & Share Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                onClick={handleDownloadReport}
                disabled={downloadReportMutation.isPending}
                className="flex items-center justify-center"
                data-testid="button-download-report"
              >
                <Download className="h-4 w-4 mr-2" />
                {downloadReportMutation.isPending ? "Generating..." : "Download HTML"}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  // CSV Export functionality
                  const csvData = generateCSVReport();
                  const blob = new Blob([csvData], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `interview-data-${sessionId}.csv`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  toast({
                    title: "CSV exported",
                    description: "Interview data exported to CSV successfully.",
                  });
                }}
                className="flex items-center justify-center"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              
              <Button
                variant="outline"
                onClick={handleShareReport}
                className="flex items-center justify-center"
                data-testid="button-share-report"
              >
                <Share className="h-4 w-4 mr-2" />
                Share Report
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  const emailBody = `Hi,

I just completed a practice interview on InterviewBot! Here are my results:

📊 Overall Score: ${(results.overallScore || 0).toFixed(1)}/10
🏢 Company: ${results.session.company}
💼 Role: ${results.session.role}

You can view my detailed results here: ${window.location.href}

Best regards!`;
                  
                  const emailSubject = `Interview Practice Results - ${results.session.company} ${results.session.role}`;
                  const mailtoLink = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
                  
                  window.open(mailtoLink, '_blank');
                }}
                className="flex items-center justify-center"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email Results
              </Button>
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleBackToDashboard}
                className="w-full flex items-center justify-center"
                data-testid="button-back-to-dashboard"
              >
                <Home className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
