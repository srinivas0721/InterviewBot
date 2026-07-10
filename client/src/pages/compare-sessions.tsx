import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, GitCompare, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ComparisonResult {
  sessions: Array<{
    id: string;
    company: string;
    role: string;
    mode: string;
    difficulty: string;
    overallScore: number;
    categoryScores: Record<string, number>;
    totalQuestions: number;
    strengths: string[];
    weaknesses: string[];
    completedAt: string | null;
    createdAt: string | null;
  }>;
  improvement: {
    overallScoreChange: number;
    categoryChanges: Record<string, number>;
    timespan: string;
  };
  count: number;
}

export default function CompareSessions() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  // Get all completed sessions
  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ["/api/interviews/sessions"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/interviews/sessions");
      return response.json();
    },
    enabled: !!user,
  });

  const compareMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiRequest("POST", "/api/interviews/sessions/compare", {
        sessionIds: ids,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setComparisonResult(data);
    },
    onError: (error) => {
      toast({ title: "Comparison failed", description: error.message, variant: "destructive" });
    },
  });

  const sessions = (sessionsData || []).filter((s: any) => s.status === "completed");

  const toggleSession = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 5) {
        toast({ title: "Limit reached", description: "You can compare up to 5 sessions." });
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleCompare = () => {
    if (selectedIds.length < 2) {
      toast({ title: "Select more sessions", description: "Pick at least 2 sessions to compare." });
      return;
    }
    compareMutation.mutate(selectedIds);
  };

  const getChangeIcon = (change: number) => {
    if (change > 0.5) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < -0.5) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0.5) return "text-green-600";
    if (change < -0.5) return "text-red-600";
    return "text-muted-foreground";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <div className="p-3 bg-gradient-to-br from-secondary to-primary rounded-xl mr-3 pulse-glow">
                <GitCompare className="h-6 w-6 text-white" />
              </div>
              <span className="text-gradient">Compare Sessions</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Select 2-5 completed sessions to compare your progress
            </p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/")} className="glass-card border-primary/30">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </div>

        {/* Session Selector */}
        {!comparisonResult && (
          <Card className="glass-card border-primary/20 mb-8">
            <CardHeader>
              <CardTitle>Select Sessions to Compare ({selectedIds.length}/5)</CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Complete at least 2 interviews to compare them.
                </p>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {sessions.map((session: any) => (
                      <div
                        key={session.id}
                        className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${
                          selectedIds.includes(session.id) 
                            ? "glass-card border-primary/50 shadow-[0_0_15px_hsla(262,83%,58%,0.2)]" 
                            : "border border-border/50 hover:border-primary/30 hover:bg-primary/5"
                        }`}
                        onClick={() => toggleSession(session.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedIds.includes(session.id)}
                            onCheckedChange={() => toggleSession(session.id)}
                          />
                          <div>
                            <div className="font-medium text-foreground">
                              {session.company} — {session.role}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {session.completedAt ? new Date(session.completedAt).toLocaleDateString() : "N/A"} • {session.mode}
                            </div>
                          </div>
                        </div>
                        <div className="text-lg font-bold text-gradient">
                          {session.overallScore ? Number(session.overallScore).toFixed(1) : "0"}/10
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={handleCompare}
                      disabled={selectedIds.length < 2 || compareMutation.isPending}
                      className="btn-gradient"
                    >
                      {compareMutation.isPending ? "Comparing..." : `Compare ${selectedIds.length} Sessions`}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Comparison Results */}
        {comparisonResult && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-foreground">Comparison Results</h2>
              <Button variant="outline" onClick={() => setComparisonResult(null)}>
                New Comparison
              </Button>
            </div>

            {/* Improvement Summary */}
            <Card className="glass-card border-primary/20 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-primary mr-2" />
                  Progress Summary ({comparisonResult.improvement.timespan})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 glass-card rounded-xl">
                    <div className="text-sm text-muted-foreground mb-1">Overall Score Change</div>
                    <div className={`text-4xl font-bold ${getChangeColor(comparisonResult.improvement.overallScoreChange)}`}>
                      {comparisonResult.improvement.overallScoreChange > 0 ? "+" : ""}
                      {comparisonResult.improvement.overallScoreChange.toFixed(1)}
                    </div>
                  </div>
                  <div className="text-center p-6 glass-card rounded-xl">
                    <div className="text-sm text-muted-foreground mb-1">Sessions Compared</div>
                    <div className="text-4xl font-bold text-gradient">{comparisonResult.count}</div>
                  </div>
                  <div className="text-center p-6 glass-card rounded-xl">
                    <div className="text-sm text-muted-foreground mb-1">Categories Improved</div>
                    <div className="text-4xl font-bold text-green-500">
                      {Object.values(comparisonResult.improvement.categoryChanges).filter(v => v > 0.5).length}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Changes */}
            {Object.keys(comparisonResult.improvement.categoryChanges).length > 0 && (
              <Card className="glass-card border-primary/10 mb-6">
                <CardHeader>
                  <CardTitle>Category Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(comparisonResult.improvement.categoryChanges).map(([category, change]) => (
                      <div key={category} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                        <span className="text-foreground capitalize font-medium">{category.replace("_", " ")}</span>
                        <div className="flex items-center gap-2">
                          {getChangeIcon(change)}
                          <span className={`font-bold ${getChangeColor(change)}`}>
                            {change > 0 ? "+" : ""}{change.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Side by Side Scores */}
            <Card className="glass-card border-primary/10 mb-6">
              <CardHeader>
                <CardTitle>Score Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left p-3 text-muted-foreground">Session</th>
                        <th className="text-center p-3 text-muted-foreground">Score</th>
                        <th className="text-center p-3 text-muted-foreground">Company</th>
                        <th className="text-center p-3 text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonResult.sessions.map((session, idx) => (
                        <tr key={session.id} className="border-b border-border/30 last:border-0">
                          <td className="p-3 font-medium text-foreground">
                            Session {idx + 1}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`font-bold text-lg ${
                              session.overallScore >= 7 ? "text-green-500" :
                              session.overallScore >= 5 ? "text-yellow-500" : "text-red-500"
                            }`}>
                              {session.overallScore.toFixed(1)}/10
                            </span>
                          </td>
                          <td className="p-3 text-center text-muted-foreground">
                            {session.company} — {session.role}
                          </td>
                          <td className="p-3 text-center text-muted-foreground">
                            {session.completedAt ? new Date(session.completedAt).toLocaleDateString() : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
