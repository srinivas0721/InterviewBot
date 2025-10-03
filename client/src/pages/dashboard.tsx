import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Settings
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

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user,
  });

  const startInterview = (mode: "subjective" | "voice") => {
    setLocation(`/interview/${mode}`);
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
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Bot className="h-8 w-8 text-primary mr-3" />
              <span className="text-xl font-bold text-foreground">InterviewBot</span>
            </div>
            <div className="flex items-center space-x-4">
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
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Play className="h-5 w-5 text-primary" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-foreground" data-testid="stat-sessions-completed">
                    {stats?.sessionsCompleted || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Sessions Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Star className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-foreground" data-testid="stat-average-score">
                    {stats?.averageScore || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Average Score</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Target className="h-5 w-5 text-orange-600" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-foreground" data-testid="stat-improvement-areas">
                    {stats?.improvementAreas || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Improvement Areas</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-foreground" data-testid="stat-total-time">
                    {stats?.totalTime || "0h"}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Practice Time</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Start New Interview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Start New Interview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-2 hover:border-primary transition-colors cursor-pointer" onClick={() => startInterview("subjective")}>
                <CardContent className="p-6">
                  <div className="flex items-center mb-3">
                    <div className="p-2 bg-primary/10 rounded-lg mr-3">
                      <ListChecks className="h-6 w-6 text-primary" />
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
                    <Button data-testid="button-start-subjective">
                      Start Subjective
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary transition-colors cursor-pointer" onClick={() => startInterview("voice")}>
                <CardContent className="p-6">
                  <div className="flex items-center mb-3">
                    <div className="p-2 bg-primary/10 rounded-lg mr-3">
                      <Mic className="h-6 w-6 text-primary" />
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
                    <Button data-testid="button-start-voice">
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
              <Button variant="ghost" size="sm" data-testid="button-view-all-sessions">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.recentSessions && stats.recentSessions.length > 0 ? (
              <div className="space-y-4">
                {stats.recentSessions.map((session) => (
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
                {stats?.recentSessions && stats.recentSessions.length > 0 && stats.recentSessions[0]?.recommendations && stats.recentSessions[0].recommendations.length > 0 ? (
                  stats.recentSessions[0].recommendations.map((rec: string, index: number) => (
                    <div key={index} className="flex items-start">
                      <div className="p-1 bg-blue-100 rounded mr-3 mt-1">
                        <Lightbulb className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">
                          {rec}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    Complete an interview to get AI-generated recommendations based on your performance
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
