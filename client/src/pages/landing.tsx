import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AuthModal } from "@/components/auth-modal";
import { Bot, Brain, Mic, ChartLine, Clock, Play } from "lucide-react";
import { useLocation } from "wouter";

export default function Landing() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleAuthSuccess = () => {
    setLocation("/dashboard");
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Bot className="h-8 w-8 text-primary mr-3" />
                <span className="text-xl font-bold text-foreground">InterviewBot</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => scrollToSection('about')}
                data-testid="button-about"
              >
                About
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => scrollToSection('features')}
                data-testid="button-features"
              >
                Features
              </Button>
              <Button 
                onClick={() => setIsAuthModalOpen(true)}
                data-testid="button-get-started"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 pt-16 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="lg:grid lg:grid-cols-12 lg:gap-8">
              <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
                <h1 className="text-4xl font-bold text-foreground tracking-tight sm:text-5xl md:text-6xl">
                  Master Your
                  <span className="text-primary"> Interview Skills</span>
                  with AI
                </h1>
                <p className="mt-3 text-base text-muted-foreground sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
                  Practice with AI-powered interviews tailored to your target companies and roles. Get instant feedback, identify weaknesses, and improve with personalized recommendations.
                </p>
                <div className="mt-8 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left lg:mx-0">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4">
                      <div className="text-2xl font-bold text-primary">Subjective Mode</div>
                      <div className="text-sm text-muted-foreground">Text-based questions with instant feedback</div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-2xl font-bold text-primary">Voice Mode</div>
                      <div className="text-sm text-muted-foreground">Real interview simulation with AI evaluation</div>
                    </Card>
                  </div>
                  <Button 
                    size="lg" 
                    className="mt-6 w-full"
                    onClick={() => setIsAuthModalOpen(true)}
                    data-testid="button-start-practicing"
                  >
                    Start Practicing Now
                  </Button>
                </div>
              </div>
              <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6 lg:flex lg:items-center">
                <Card className="p-6 w-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-medium text-muted-foreground">Live Interview Session</div>
                    <div className="flex items-center text-green-600">
                      <div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></div>
                      <span className="text-xs">Recording</span>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-lg font-semibold mb-2">Question 3 of 10</div>
                    <Card className="bg-muted p-4">
                      <p className="text-sm">Explain the difference between REST and GraphQL APIs. When would you choose one over the other?</p>
                    </Card>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">Time Remaining</div>
                    <div className="text-lg font-bold text-primary">01:23</div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 mt-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: "70%" }}></div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div id="about" className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground">About InterviewBot</h2>
            <p className="mt-4 text-lg text-muted-foreground">Your AI-powered interview preparation companion</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Our Mission</h3>
              <p className="text-muted-foreground mb-6">
                We believe that everyone deserves to succeed in their career journey. InterviewBot was created to democratize interview preparation by providing AI-powered, personalized practice sessions that adapt to your target companies and roles.
              </p>
              <h3 className="text-xl font-semibold text-foreground mb-4">How to Use InterviewBot</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">Sign Up & Set Profile:</span> Create your account and specify your target companies, desired roles, and experience level.</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">Choose Interview Mode:</span> Select between Subjective (text-based) or Voice (real-time speech) interview practice.</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">Start Practicing:</span> Answer AI-generated questions tailored to your profile with real-time feedback and scoring.</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">4</div>
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">Review & Improve:</span> Get detailed results with strengths, weaknesses, and personalized recommendations to boost your performance.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-6">
              <Card className="p-6">
                <div className="flex items-center mb-4">
                  <Clock className="h-6 w-6 text-primary mr-3" />
                  <h3 className="text-lg font-semibold text-foreground">Save Time</h3>
                </div>
                <p className="text-muted-foreground">Practice anytime, anywhere with our 24/7 available AI interviewer. No scheduling needed.</p>
              </Card>
              <Card className="p-6">
                <div className="flex items-center mb-4">
                  <Brain className="h-6 w-6 text-primary mr-3" />
                  <h3 className="text-lg font-semibold text-foreground">Personalized Learning</h3>
                </div>
                <p className="text-muted-foreground">Questions and feedback tailored to your experience level, target companies, and desired roles.</p>
              </Card>
              <Card className="p-6">
                <div className="flex items-center mb-4">
                  <ChartLine className="h-6 w-6 text-primary mr-3" />
                  <h3 className="text-lg font-semibold text-foreground">Track Progress</h3>
                </div>
                <p className="text-muted-foreground">Detailed analytics help you understand your strengths and focus on areas that need improvement.</p>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-16 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground">Comprehensive Interview Preparation</h2>
            <p className="mt-4 text-lg text-muted-foreground">Everything you need to ace your next interview</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-primary/10 rounded-lg">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">AI-Powered Questions</h3>
              <p className="mt-2 text-muted-foreground">Questions generated specifically for your target company and role using advanced AI</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-primary/10 rounded-lg">
                <Mic className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Voice & Video Practice</h3>
              <p className="mt-2 text-muted-foreground">Practice with realistic voice and video interviews with speech-to-text analysis</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-primary/10 rounded-lg">
                <ChartLine className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Detailed Analytics</h3>
              <p className="mt-2 text-muted-foreground">Get insights into your strengths and weaknesses across different categories</p>
            </div>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
