import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Star, 
  CheckCircle, 
  TrendingUp, 
  AlertTriangle, 
  Bot,
  Calendar,
  Building,
  Briefcase
} from "lucide-react";

interface SharedInterviewSession {
  id: string;
  company: string;
  role: string;
  mode: string;
  status: string;
  totalQuestions: number;
  completedAt: string;
  createdAt: string;
}

interface SharedSessionResults {
  session: SharedInterviewSession;
  candidateName: string;
  overallScore: number;
  categoryScores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export default function SharedResults() {
  const params = useParams();
  const shareToken = params.shareToken;

  // Get shared interview results
  const { data: results, isLoading, error } = useQuery<SharedSessionResults>({
    queryKey: ["/api/share", shareToken],
    enabled: !!shareToken,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared results...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Interview Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This shared interview link is either invalid or has expired.
          </p>
          <Button 
            onClick={() => window.location.href = '/'}
            className="w-full"
          >
            Go to InterviewBot
          </Button>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (!score && score !== 0) return "text-gray-500";
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 8) return Trophy;
    if (score >= 6) return Star;
    return AlertTriangle;
  };

  const ScoreIcon = getScoreIcon(results.overallScore);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <div className="flex items-center">
              <Bot className="h-8 w-8 text-primary mr-3" />
              <span className="text-xl font-bold text-foreground">InterviewBot</span>
            </div>
            <div className="ml-auto">
              <span className="text-sm text-muted-foreground">Shared Interview Results</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className={`p-3 rounded-full bg-background border-2 ${getScoreColor(results.overallScore).replace('text-', 'border-')}`}>
                <ScoreIcon className={`h-8 w-8 ${getScoreColor(results.overallScore)}`} />
              </div>
            </div>
            <CardTitle className="text-2xl">
              {results.candidateName}'s Interview Results
            </CardTitle>
            <div className="flex justify-center items-center space-x-6 text-sm text-muted-foreground mt-4">
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4" />
                <span>{results.session.company}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Briefcase className="h-4 w-4" />
                <span>{results.session.role}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(results.session.completedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Overall Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="h-5 w-5 mr-2" />
              Overall Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className={`text-6xl font-bold ${getScoreColor(results.overallScore)} mb-2`}>
                {results.overallScore.toFixed(1)}
              </div>
              <div className="text-2xl text-muted-foreground mb-4">out of 10</div>
              <Progress 
                value={(results.overallScore / 10) * 100} 
                className="w-full max-w-md mx-auto h-3"
              />
              <p className="text-sm text-muted-foreground mt-4">
                Based on {results.session.totalQuestions} questions in {results.session.mode.toUpperCase()} mode
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Category Performance */}
        {Object.keys(results.categoryScores).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Category Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(results.categoryScores).map(([category, score]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium capitalize">
                        {category.replace('_', ' ')}
                      </span>
                      <span className={`font-bold ${getScoreColor(score)}`}>
                        {score.toFixed(1)}/10
                      </span>
                    </div>
                    <Progress value={(score / 10) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Strengths */}
          {results.strengths.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {results.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Areas for Improvement */}
          {results.weaknesses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-orange-600">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {results.weaknesses.map((weakness, index) => (
                    <li key={index} className="flex items-start">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{weakness}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recommendations */}
        {results.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-blue-600">
                <Star className="h-5 w-5 mr-2" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {results.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                      <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                    </div>
                    <span className="text-sm">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10">
          <CardContent className="text-center p-8">
            <Bot className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Want to improve your interview skills?</h3>
            <p className="text-muted-foreground mb-6">
              Practice with AI-powered interviews and get instant feedback to boost your confidence.
            </p>
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/'}
              className="w-full sm:w-auto"
            >
              Start Practicing with InterviewBot
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}