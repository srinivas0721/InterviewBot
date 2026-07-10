import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { 
  Bot, 
  Bell, 
  ChevronDown, 
  Play, 
  Star, 
  Target, 
  Clock,
  ListChecks,
  Mic,
  TrendingUp,
  AlertTriangle,
  Info,
  Lightbulb,
  LogOut,
  Trash2,
  User,
  Settings,
  RotateCcw
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DashboardStats {
  sessionsCompleted: number;
  averageScore: number;
  improvementAreas: number;
  totalTime: string;
  categoryAverages: Array<{
    name: string;
    score: number;
    color: string;
  }>;
  recentSessions: Array<{
    id: string;
    company: string;
    role: string;
    mode: string;
    score: number;
    date: string;
    recommendations?: string[];
  }>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("medium");

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user,
  });

  // Separate query for recent COMPLETED sessions only
  const { data: recentSessionsData } = useQuery({
    queryKey: ["/api/interviews/sessions/recent"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/interviews/sessions/recent?limit=5");
      return response.json();
    },
    enabled: !!user,
  });

  // Query for in-progress sessions that can be resumed
  const { data: inProgressData } = useQuery({
    queryKey: ["/api/interviews/sessions/in-progress"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/interviews/sessions/in-progress");
      return response.json();
    },
    enabled: !!user,
  });

  // Use recent sessions from new endpoint instead of stats
  const recentSessions = recentSessionsData?.sessions || [];
  const resumableSessions = inProgressData?.sessions || [];

  const startInterview = (mode: "subjective" | "voice") => {
    setLocation(`/interview/${mode}?difficulty=${selectedDifficulty}`);
  };

  const resumeInterview = (sessionId: string, mode: string) => {
    setLocation(`/interview/${mode}?resume=${sessionId}`);
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await apiRequest("DELETE", "/api/auth/account");
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    } catch (error) {
      console.error("Delete account failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass-card border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center mr-3 pulse-glow">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">InterviewBot</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/question-bank")} title="Question Bank">
                <Star className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground text-sm font-medium">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem disabled className="cursor-default">
                    <User className="mr-2 h-4 w-4" />
                    <span>{user?.email}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/profile-setup")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                        <span className="text-destructive">Delete Account</span>
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account
                          and remove all your interview data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, <span data-testid="text-user-name">{user?.firstName}!</span>
          </h1>
          <p className="mt-2 text-muted-foreground">Ready to practice your interview skills?</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card hover-lift border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-primary to-primary/60 rounded-xl pulse-glow">
                  <Play className="h-5 w-5 text-white" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gradient" data-testid="stat-sessions-completed">
                    {stats?.sessionsCompleted || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Sessions Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                  <Star className="h-5 w-5 text-white" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gradient" data-testid="stat-average-score">
                    {stats?.averageScore || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Average Score</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift border-orange-500/20">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gradient" data-testid="stat-improvement-areas">
                    {stats?.improvementAreas || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Improvement Areas</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gradient" data-testid="stat-total-time">
                    {stats?.totalTime || "0h"}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Practice Time</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resume In-Progress Sessions */}
        {resumableSessions.length > 0 && (
          <Card className="mb-8 border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-700 dark:text-orange-400">
                <RotateCcw className="h-5 w-5 mr-2" />
                Resume In-Progress Interview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {resumableSessions.map((item: any) => (
                  <div
                    key={item.session.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-card border rounded-lg"
                  >
                    <div>
                      <div className="font-semibold text-foreground">
                        {item.session.company} — {item.session.role}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.questionsAnswered}/{item.questionsGenerated} questions answered • {item.session.mode} mode
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await apiRequest("PATCH", `/api/interviews/sessions/${item.session.id}/abandon`);
                            queryClient.invalidateQueries({ queryKey: ["/api/interviews/sessions/in-progress"] });
                          } catch (e) { console.error(e); }
                        }}
                      >
                        Discard
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => resumeInterview(item.session.id, item.session.mode)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Resume
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Start New Interview */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Start New Interview</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Difficulty:</span>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="w-[130px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="adaptive">Adaptive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-card mode-card border-2 border-primary/20 hover:border-primary/50 transition-all cursor-pointer" onClick={() => startInterview("subjective")}>
                <CardContent className="p-6">
                  <div className="flex items-center mb-3">
                    <div className="p-3 bg-gradient-to-br from-primary to-primary/60 rounded-xl mr-3 pulse-glow">
                      <ListChecks className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Subjective Mode</h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">
                    Practice with text-based questions and get detailed feedback on your written answers.
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 inline mr-1" />
                      15-20 minutes
                    </div>
                    <Button className="btn-gradient" data-testid="button-start-subjective">
                      Start Subjective
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card mode-card border-2 border-secondary/20 hover:border-secondary/50 transition-all cursor-pointer" onClick={() => startInterview("voice")}>
                <CardContent className="p-6">
                  <div className="flex items-center mb-3">
                    <div className="p-3 bg-gradient-to-br from-secondary to-secondary/60 rounded-xl mr-3 pulse-glow">
                      <Mic className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Voice/Video Mode</h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">
                    Simulate real interviews with voice answers and AI-powered evaluation.
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 inline mr-1" />
                      25-30 minutes
                    </div>
                    <Button className="btn-secondary text-white" data-testid="button-start-voice">
                      Start Voice
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Sessions</CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setLocation("/compare")}>
                  Compare
                </Button>
                <Button variant="ghost" size="sm" data-testid="button-view-all-sessions">
                  View All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recentSessions && recentSessions.length > 0 ? (
              <div className="space-y-4">
                {recentSessions.map((session: any) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                    data-testid={`session-${session.id}`}
                  >
                    <div className="flex items-center">
                      <div className="p-2 bg-primary/10 rounded-lg mr-4">
                        {session.mode === "voice" ? (
                          <Mic className="h-5 w-5 text-primary" />
                        ) : (
                          <ListChecks className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {session.mode === "voice" ? "Voice" : "Subjective"} Interview - {session.company} {session.role}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {session.date} • Score: {session.score}/10
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setLocation(`/interview/${session.id}/results`)}
                      data-testid={`button-view-report-${session.id}`}
                    >
                      View Report
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No interview sessions yet. Start your first interview above!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(stats?.categoryAverages && stats.categoryAverages.length > 0 ? stats.categoryAverages : [
                  { name: "No data yet", score: 0, color: "bg-gray-400" }
                ]).map((category) => (
                  <div key={category.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{category.name}</span>
                      <span className="text-muted-foreground" data-testid={`score-${category.name.toLowerCase().replace(' ', '-')}`}>
                        {category.score}/10
                      </span>
                    </div>
                    <Progress 
                      value={category.score * 10} 
                      className={`h-2 ${
                        category.score >= 8.5 ? '[&>div]:bg-green-500' :
                        category.score >= 7.5 ? '[&>div]:bg-yellow-500' :
                        category.score >= 6.0 ? '[&>div]:bg-orange-500' :
                        '[&>div]:bg-red-500'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Improvement Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSessions && recentSessions.length > 0 &&
                  recentSessions[0]?.recommendations &&
                  recentSessions[0].recommendations.length > 0 ? (
                      recentSessions[0].recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start">
                          <div className="p-1 bg-blue-100 rounded mr-3 mt-1">
                            <Lightbulb className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {rec}
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      Complete an interview to get AI-generated recommendations
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
