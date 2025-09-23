import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import ProfileSetup from "@/pages/profile-setup";
import SubjectiveInterview from "@/pages/subjective-interview";
import VoiceInterview from "@/pages/voice-interview";
import InterviewResults from "@/pages/interview-results";
import SharedResults from "@/pages/shared-results";

// Protected Route wrapper to handle authentication and profile checks
function ProtectedRoute({ component: Component, requiresProfile = true, ...props }: any) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  if (requiresProfile && (!user?.experienceLevel || !user?.targetCompanies?.length || !user?.targetRoles?.length)) {
    return <ProfileSetup />;
  }

  return <Component {...props} />;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/share/:shareToken" component={SharedResults} />
      
      {/* Protected routes */}
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/profile-setup" component={() => <ProtectedRoute component={ProfileSetup} requiresProfile={false} />} />
      <Route path="/interview/subjective" component={() => <ProtectedRoute component={SubjectiveInterview} />} />
      <Route path="/interview/voice" component={() => <ProtectedRoute component={VoiceInterview} />} />
      <Route path="/interview/:sessionId/results" component={() => <ProtectedRoute component={InterviewResults} />} />
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
