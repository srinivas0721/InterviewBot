import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AuthModal from "@/components/auth-modal";
import { Sparkles, Brain, TrendingUp, Award, Zap, Target, CheckCircle2, ArrowRight, Video, MessageSquare, BarChart3 } from "lucide-react";

export default function Landing() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleGetStarted = () => {
    setAuthMode('signup');
    setShowAuth(true);
  };

  const handleLogin = () => {
    setAuthMode('login');
    setShowAuth(true);
  };

  return (
    <div className="min-h-screen bg-animated">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Navigation */}
        <nav className="relative z-10 container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gradient">InterviewBot</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={handleLogin}
                className="text-foreground hover:text-primary transition-colors"
              >
                Sign In
              </Button>
              <Button
                onClick={handleGetStarted}
                className="btn-gradient px-6"
              >
                Get Started
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-primary/10 rounded-full mb-8 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-semibold">AI-Powered Interview Practice</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Master Your Next
              <br />
              <span className="text-gradient">Technical Interview</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Practice with AI-generated questions, get instant feedback, and track your progress with our intelligent interview platform.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="btn-gradient px-8 py-6 text-lg w-full sm:w-auto"
              >
                Start Practicing Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-6 text-lg w-full sm:w-auto glass-card border-primary/20 hover:border-primary/40"
              >
                Watch Demo
                <Video className="ml-2 w-5 h-5" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
              <div className="glass-card p-4 rounded-xl">
                <div className="text-3xl font-bold text-gradient mb-1">10K+</div>
                <div className="text-sm text-muted-foreground">Interviews Completed</div>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <div className="text-3xl font-bold text-gradient mb-1">95%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <div className="text-3xl font-bold text-gradient mb-1">4.9★</div>
                <div className="text-sm text-muted-foreground">User Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Powerful Features for
            <span className="text-gradient"> Interview Success</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to ace your technical interviews
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <Card className="glass-card hover-lift border-primary/20">
            <CardContent className="p-8">
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary-glow rounded-2xl flex items-center justify-center mb-6 pulse-glow">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">AI-Generated Questions</h3>
              <p className="text-muted-foreground mb-4">
                Get personalized questions tailored to your target role and experience level using advanced AI technology.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary mr-2" />
                  Company-specific questions
                </li>
                <li className="flex items-center text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary mr-2" />
                  Role-based customization
                </li>
                <li className="flex items-center text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary mr-2" />
                  Multiple difficulty levels
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 2 */}
          <Card className="glass-card hover-lift border-secondary/20">
            <CardContent className="p-8">
              <div className="w-14 h-14 bg-gradient-to-br from-secondary to-secondary-glow rounded-2xl flex items-center justify-center mb-6 pulse-glow">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Real-time Feedback</h3>
              <p className="text-muted-foreground mb-4">
                Receive instant, detailed feedback on your answers with AI-powered evaluation and suggestions.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-secondary mr-2" />
                  Detailed score breakdown
                </li>
                <li className="flex items-center text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-secondary mr-2" />
                  Corrected answers provided
                </li>
                <li className="flex items-center text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-secondary mr-2" />
                  Missing points identified
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Feature 3 */}
          <Card className="glass-card hover-lift border-accent/20">
            <CardContent className="p-8">
              <div className="w-14 h-14 bg-gradient-to-br from-accent to-accent-glow rounded-2xl flex items-center justify-center mb-6 pulse-glow">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Progress Analytics</h3>
              <p className="text-muted-foreground mb-4">
                Track your improvement over time with comprehensive analytics and personalized recommendations.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-accent mr-2" />
                  Category-wise performance
                </li>
                <li className="flex items-center text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-accent mr-2" />
                  Trend visualization
                </li>
                <li className="flex items-center text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-accent mr-2" />
                  Actionable insights
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Interview Modes Section */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Choose Your
            <span className="text-gradient"> Interview Mode</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Practice the way that works best for you
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Subjective Mode */}
          <Card className="glass-card mode-card hover-lift border-primary/20 overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-glow rounded-xl flex items-center justify-center mr-4">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold">Subjective Interview</h3>
              </div>
              <p className="text-muted-foreground mb-6">
                Type detailed answers and receive comprehensive feedback on your technical knowledge and communication skills.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <Zap className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">5 minutes per question to formulate detailed responses</span>
                </li>
                <li className="flex items-start">
                  <Target className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Perfect for practicing structured technical answers</span>
                </li>
                <li className="flex items-start">
                  <TrendingUp className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">AI evaluates clarity, depth, and technical accuracy</span>
                </li>
              </ul>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Best for:</span>
                  <span className="text-foreground font-semibold">Written communication & depth</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Voice Mode */}
          <Card className="glass-card mode-card hover-lift border-secondary/20 overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-secondary to-secondary-glow rounded-xl flex items-center justify-center mr-4">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold">Voice Interview</h3>
              </div>
              <p className="text-muted-foreground mb-6">
                Simulate real interviews with voice recording and live transcription for authentic practice sessions.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <Zap className="w-5 h-5 text-secondary mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">5 minutes per question with video recording</span>
                </li>
                <li className="flex items-start">
                  <Target className="w-5 h-5 text-secondary mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Real-time speech-to-text transcription</span>
                </li>
                <li className="flex items-start">
                  <TrendingUp className="w-5 h-5 text-secondary mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Practice verbal communication and confidence</span>
                </li>
              </ul>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Best for:</span>
                  <span className="text-foreground font-semibold">Verbal skills & real interviews</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <Card className="glass-card border-primary/20 overflow-hidden">
          <CardContent className="p-12 text-center">
            <div className="max-w-3xl mx-auto">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-6 pulse-glow">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-4xl font-bold mb-6">
                Ready to Ace Your Interview?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join thousands of successful candidates who have improved their interview skills with InterviewBot.
              </p>
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="btn-gradient px-12 py-6 text-lg"
              >
                Start Your Free Practice
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                No credit card required • Instant access • AI-powered feedback
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gradient">InterviewBot</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 InterviewBot. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        initialMode={authMode}   // <-- REQUIRED so the correct tab opens
        onSuccess={() => {}}     // optional
      />
    </div>
  );
}
