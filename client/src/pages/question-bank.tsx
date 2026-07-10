import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Star, Trash2, ArrowLeft, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Bookmark {
  bookmarkId: string;
  questionId: string;
  category: string;
  questionText: string;
  difficulty: string;
  createdAt: string | null;
  userScore: number | null;
  userFeedback: string | null;
}

export default function QuestionBank() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ bookmarks: Bookmark[]; total: number }>({
    queryKey: ["/api/interviews/bookmarks"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/interviews/bookmarks");
      return response.json();
    },
    enabled: !!user,
  });

  const removeBookmarkMutation = useMutation({
    mutationFn: async (questionId: string) => {
      await apiRequest("DELETE", `/api/interviews/questions/${questionId}/bookmark`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews/bookmarks"] });
      toast({ title: "Bookmark removed", description: "Question removed from your collection." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove bookmark.", variant: "destructive" });
    },
  });

  const bookmarks = data?.bookmarks || [];

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 7) return "text-green-600";
    if (score >= 5) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your question bank...</p>
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
            <h1 className="text-3xl font-bold flex items-center">
              <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-xl mr-3 pulse-glow">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <span className="text-gradient">Question Bank</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              {bookmarks.length} bookmarked question{bookmarks.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/")} className="glass-card border-primary/30">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {bookmarks.length === 0 ? (
          <Card className="glass-card border-primary/20">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Bookmarks Yet</h3>
              <p className="text-muted-foreground mb-6">
                After completing an interview, click the star icon next to any question to save it here for future practice.
              </p>
              <Button onClick={() => setLocation("/")} className="btn-gradient">
                Start an Interview
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Category filter summary */}
            <Card className="glass-card border-primary/10 mb-6">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  {[...new Set(bookmarks.map(b => b.category))].map(category => {
                    const count = bookmarks.filter(b => b.category === category).length;
                    return (
                      <span
                        key={category}
                        className="category-badge"
                      >
                        {(category || "").replace("_", " ")} ({count})
                      </span>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Bookmark list */}
            {bookmarks.map((bookmark) => (
              <Card key={bookmark.bookmarkId} className="glass-card hover-lift border-primary/10">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="category-badge text-xs">
                          {(bookmark.category || "").replace("_", " ")}
                        </span>
                        <span className="inline-block bg-muted/50 text-muted-foreground px-2 py-0.5 rounded text-xs capitalize">
                          {bookmark.difficulty}
                        </span>
                        {bookmark.userScore !== null && (
                          <span className={`text-sm font-semibold ${getScoreColor(bookmark.userScore)}`}>
                            Score: {bookmark.userScore.toFixed(1)}/10
                          </span>
                        )}
                      </div>
                      <p className="text-foreground font-medium mb-2">{bookmark.questionText}</p>
                      {bookmark.userFeedback && (
                        <p className="text-sm text-muted-foreground italic">
                          Feedback: {bookmark.userFeedback}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBookmarkMutation.mutate(bookmark.questionId)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
