import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Timer } from "@/components/timer";
import { ProgressBar } from "@/components/progress-bar";
import { AudioRecorder, AudioRecorderRef } from "@/components/audio-recorder";
import { useTimer } from "@/hooks/useTimer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { X, Brain } from "lucide-react";
import type { Question, Answer } from "@/lib/types";
import { FullscreenMonitor, getFullscreenInitialMessage, getFullscreenWarningMessage, getFullscreenTerminationMessage } from '@/lib/fullscreenMonitor';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface InterviewSession {
  id: string;
  mode: string;
  company: string;
  role: string;
  totalQuestions: number;
  currentQuestion: number;
}

export default function VoiceInterview() {
  const [, setLocation] = useLocation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showProcessing, setShowProcessing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const transcriptRef = useRef<string>(""); // Keep ref for immediate access
  const [liveAccumulatedTranscript, setLiveAccumulatedTranscript] = useState<string>("");
  const [liveCurrentTranscript, setLiveCurrentTranscript] = useState<string>("");
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  
  // Fullscreen monitoring
  const [fullscreenMonitor] = useState(() => new FullscreenMonitor({
    maxExits: 3,
    warningTimeout: 30000,
    onWarning: (exitsRemaining) => {
      toast({
        title: "⚠️ Fullscreen Warning",
        description: getFullscreenWarningMessage(exitsRemaining, 30),
        variant: "destructive",
        duration: 10000
      });
    },
    onTimeout: () => {
      toast({
        title: "⏰ Timeout",
        description: "You didn't return to fullscreen in time!",
        variant: "destructive"
      });
    },
    onSessionTerminated: async () => {
      if (sessionId) {
        try {
          await apiRequest("DELETE", `/api/interviews/sessions/${sessionId}/terminate`);
        } catch (error) {
          console.error("Failed to terminate session:", error);
        }
      }
      toast({
        title: "🚨 Session Terminated",
        description: getFullscreenTerminationMessage(),
        variant: "destructive",
        duration: 8000
      });
      setTimeout(() => setLocation("/"), 3000);
    }
  }));

  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [hasStartedFullscreen, setHasStartedFullscreen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Video ref for displaying the camera feed
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Audio recorder ref for programmatic control
  const audioRecorderRef = useRef<AudioRecorderRef | null>(null);

  // Initialize video stream early (before recording starts)
  useEffect(() => {
    const initializeVideo = async () => {
      // Check if MediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('MediaDevices API not available');
        toast({
          title: "Camera Not Supported",
          description: "Your browser doesn't support camera access. Please use a modern browser.",
          variant: "destructive",
        });
        return;
      }

      try {
        console.log('Requesting camera access...');
        
        // First, check if we have permission without requesting it
        let permissionStatus;
        try {
          permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
          console.log('Camera permission status:', permissionStatus.state);
        } catch (permError) {
          console.log('Permission API not available or error:', permError);
        }

        // Check available devices first
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          console.log('Available video devices:', videoDevices.length);
          console.log('Video devices:', videoDevices.map(d => ({
            deviceId: d.deviceId,
            label: d.label,
            kind: d.kind
          })));
        } catch (deviceError) {
          console.log('Could not enumerate devices:', deviceError);
        }

        // Try different camera approaches to fix the issue
        console.log('Trying camera access with multiple fallbacks...');
        
        // Try approach 1: Minimal constraints first
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
          console.log('Camera access successful with minimal constraints');
        } catch (minimalError) {
          console.log('Minimal constraints failed, trying specific constraints...');
          
          // Try approach 2: Specific constraints
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
                facingMode: "user",
                frameRate: { ideal: 30, max: 60 }
              },
              audio: false
            });
            console.log('Camera access successful with specific constraints');
          } catch (specificError) {
            console.log('Specific constraints failed, trying device selection...');
            
            // Try approach 3: Select specific device
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevice = devices.find(device => device.kind === 'videoinput');
            
            if (videoDevice) {
              stream = await navigator.mediaDevices.getUserMedia({
                video: {
                  deviceId: { exact: videoDevice.deviceId },
                  width: { ideal: 1280 },
                  height: { ideal: 720 }
                },
                audio: false
              });
              console.log('Camera access successful with device selection');
            } else {
              throw specificError;
            }
          }
        }
        
        console.log('Basic camera access successful, stream tracks:', stream.getTracks().length);
        console.log('Stream active:', stream.active);
        console.log('Video tracks:', stream.getVideoTracks().map(track => ({
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label
        })));
        
        setVideoStream(stream);
        
      } catch (error) {
        console.error('Error accessing camera:', error);
        console.error('Error name:', (error as any)?.name);
        console.error('Error message:', (error as any)?.message);
        console.error('Error type:', typeof error);
        console.error('Error constructor:', (error as any)?.constructor?.name);
        
        let errorMessage = "Camera access failed. Please check your browser settings.";
        
        if (error instanceof DOMException) {
          console.log('DOMException detected, name:', error.name);
          switch (error.name) {
            case 'NotAllowedError':
              errorMessage = "Camera access was denied. Please click the camera icon in your browser's address bar to allow camera access, then refresh the page.";
              break;
            case 'NotFoundError':
              errorMessage = "No camera found. Please connect a camera and refresh the page.";
              break;
            case 'NotReadableError':
              errorMessage = "Camera detected but cannot start video feed. This is a known limitation in Replit's environment - your microphone will still work perfectly for voice recording. The interview will continue normally without video.";
              break;
            case 'OverconstrainedError':
              errorMessage = "Camera settings not supported. Trying with basic settings...";
              // Try again with more basic constraints
              try {
                const basicStream = await navigator.mediaDevices.getUserMedia({
                  video: { facingMode: "user" },
                  audio: false
                });
                console.log('Camera access granted with basic settings');
                setVideoStream(basicStream);
                return;
              } catch (basicError) {
                console.error('Basic camera access also failed:', basicError);
                errorMessage = "Camera access failed even with basic settings. Please check your camera.";
              }
              break;
            case 'SecurityError':
              errorMessage = "Camera access blocked by security settings. Please ensure you're using HTTPS or localhost.";
              break;
            case 'AbortError':
              errorMessage = "Camera access was aborted. Please try again.";
              break;
            default:
              errorMessage = `Camera error (${error.name}): ${error.message || 'Please check your camera permissions'}`;
          }
        } else if (error instanceof Error) {
          errorMessage = `Camera error: ${error.message}`;
        } else {
          errorMessage = "Unknown camera error. Please check your browser permissions and camera settings.";
        }
        
        // Use setTimeout to prevent React setState during render warning
        setTimeout(() => {
          toast({
            title: "Camera Access Issue",
            description: errorMessage,
            variant: "destructive",
          });
        }, 0);
      }
    };

    // Try a different initialization approach - immediately without delay
    initializeVideo();
    
    // Fallback: Try again after page load if first attempt fails
    const timeoutId = setTimeout(() => {
      if (!videoStream) {
        console.log('Retry camera initialization after delay...');
        initializeVideo();
      }
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Ensure video element shows the stream when both are available
  useEffect(() => {
    if (videoStream && videoRef.current) {
      console.log('Connecting stream to video element...');
      videoRef.current.srcObject = videoStream;
      videoRef.current.muted = true;
      
      // Use a small delay to ensure the video element is ready
      const playVideo = async () => {
        try {
          await videoRef.current?.play();
          console.log('Video playback started successfully');
        } catch (error) {
          console.error('Video play failed:', error);
          // Try to play again after a short delay
          setTimeout(() => {
            if (videoRef.current && videoRef.current.srcObject) {
              videoRef.current.play().catch(err => {
                console.error('Retry video play failed:', err);
              });
            }
          }, 1000);
        }
      };
      
      // Small delay to ensure DOM is ready
      setTimeout(playVideo, 100);
    }
  }, [videoStream]);

  // Clean up video when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      console.log('VoiceInterview component unmounting - cleaning up resources');
      
      // Stop video stream
      if (videoStream) {
        console.log('Stopping video tracks');
        videoStream.getTracks().forEach(track => {
          track.stop();
        });
      }
      
      // Force cleanup of any active recording
      // This ensures recording stops when navigating away
      const cleanupRecording = () => {
        const audioRecorderElement = document.querySelector('[data-testid^="button-"]');
        if (audioRecorderElement) {
          // Dispatch custom cleanup event to AudioRecorder
          const cleanupEvent = new CustomEvent('forceCleanup');
          window.dispatchEvent(cleanupEvent);
        }
      };
      
      cleanupRecording();
    };
  }, [videoStream]);

  // Handle video stream from AudioRecorder
  const handleVideoStream = (stream: MediaStream | null) => {
    // AudioRecorder will handle the full audio/video stream
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  };

  const handleLiveTranscript = (accumulated: string, current: string) => {
    setLiveAccumulatedTranscript(accumulated);
    setLiveCurrentTranscript(current);
  };

  // Get user data for profile preferences
  const { data: userData } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Timer for each question (180 seconds = 3 minutes)
  const { timeLeft, isRunning, start, reset, isWarning } = useTimer(180, () => {
    console.log('⏰ Timer expired!');
    console.log('Recording state:', audioRecorderRef.current?.isRecording);
    console.log('Paused state:', audioRecorderRef.current?.isPaused);
    console.log('Current transcript (ref):', transcriptRef.current);
    console.log('Current transcript (state):', transcript);
    
    // When timer runs out, we need to handle different scenarios:
    
    if (audioRecorderRef.current?.isRecording) {
      // Scenario 1: Still recording - pause first, then finish
      console.log('Scenario 1: Still recording - pausing then finishing');
      audioRecorderRef.current.pauseRecording();
      
      toast({
        title: "⏰ Time's up!",
        description: "Finalizing your recording...",
        variant: "destructive",
      });
      
      // Give it 2 seconds to process, then finish and auto-submit
      setTimeout(() => {
        console.log('Finishing recording after timeout');
        if (audioRecorderRef.current?.isPaused) {
          audioRecorderRef.current.finishRecording();
          
          // Wait for transcript to be set, then auto-submit
          setTimeout(() => {
            const finalTranscript = transcriptRef.current || transcript;
            console.log('Auto-submitting after recording finished, transcript:', finalTranscript);
            if (finalTranscript && finalTranscript.trim()) {
              handleSubmitAnswer();
            } else {
              // No transcript - skip this question
              toast({
                title: "⚠️ No answer recorded",
                description: "Moving to next question...",
                variant: "destructive",
              });
              handleNextQuestion();
            }
          }, 1500); // Wait 1.5 seconds for transcript processing
        }
      }, 2000);
      
    } else if (audioRecorderRef.current?.isPaused) {
      // Scenario 2: Already paused - finish and submit
      console.log('Scenario 2: Already paused - finishing');
      audioRecorderRef.current.finishRecording();
      
      toast({
        title: "⏰ Time's up!",
        description: "Processing your answer...",
        variant: "destructive",
      });
      
      // Wait for transcript to be processed, then submit
      setTimeout(() => {
        const finalTranscript = transcriptRef.current || transcript;
        console.log('Auto-submitting paused recording, transcript:', finalTranscript);
        if (finalTranscript && finalTranscript.trim()) {
          handleSubmitAnswer();
        } else {
          toast({
            title: "⚠️ No answer recorded",
            description: "Moving to next question...",
            variant: "destructive",
          });
          handleNextQuestion();
        }
      }, 1500);
      
    } else if (transcriptRef.current && transcriptRef.current.trim()) {
      // Scenario 3: Recording finished but not submitted yet - auto-submit
      console.log('Scenario 3: Has transcript, auto-submitting');
      toast({
        title: "⏰ Time's up!",
        description: "Submitting your answer...",
        variant: "destructive",
      });
      handleSubmitAnswer();
      
    } else {
      // Scenario 4: No recording at all - skip question
      console.log('Scenario 4: No recording, skipping');
      toast({
        title: "⏰ Time's up!",
        description: "No answer recorded. Moving to next question...",
        variant: "destructive",
      });
      handleNextQuestion();
    }
  });

  // Create interview session
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      // Use user's first target company and role, with fallbacks
      const company = (userData as any)?.targetCompanies?.[0] || "Microsoft";
      const role = (userData as any)?.targetRoles?.[0] || "Software Engineer";
      
      const response = await apiRequest("POST", "/api/interviews", {
        mode: "voice",
        company,
        role,
        totalQuestions: 8,
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
    mutationFn: async (answerData: { questionId: string; voiceTranscript: string; timeSpent: number }) => {
      const response = await apiRequest("POST", `/api/interviews/sessions/${sessionId}/answers`, {
        ...answerData,
        answerType: "voice",
      });
      return response.json();
    },
    onSuccess: () => {
      setShowProcessing(false);
      handleNextQuestion();
    },
    onError: (error) => {
      setShowProcessing(false);
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

  // Show fullscreen prompt when session is ready
  useEffect(() => {
    if (sessionId && !hasStartedFullscreen && !createSessionMutation.isPending && !isLoadingQuestions) {
      setShowFullscreenPrompt(true);
    }
  }, [sessionId, hasStartedFullscreen, createSessionMutation.isPending, isLoadingQuestions]);

  const questions: Question[] = (questionsData as any)?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  const handleStartFullscreen = async () => {
    const success = await fullscreenMonitor.requestFullscreen();
    if (success) {
      setShowFullscreenPrompt(false);
      setHasStartedFullscreen(true);
      fullscreenMonitor.start();
      start(); // Start the timer
    } else {
      toast({
        title: "Fullscreen Required",
        description: "Please allow fullscreen access to continue with the interview",
        variant: "destructive"
      });
    }
  };

  const handleRecordingComplete = (blob: Blob, transcriptText: string) => {
    console.log('Recording complete, transcript length:', transcriptText.length);
    setAudioBlob(blob);
    setTranscript(transcriptText);
    transcriptRef.current = transcriptText; // Update ref immediately
    toast({
      title: "Recording complete",
      description: "Your answer has been recorded successfully.",
    });
  };

  const handleSubmitAnswer = () => {
    if (!transcript || !currentQuestion) return;

    // Clear live transcript immediately when submitting to prevent mixing with next question
    setLiveAccumulatedTranscript("");
    setLiveCurrentTranscript("");
    
    // Also clear the AudioRecorder's internal transcript state
    if (audioRecorderRef.current) {
      audioRecorderRef.current.clearLiveTranscript();
    }

    setShowProcessing(true);
    const timeSpent = 180 - timeLeft;
    
    submitAnswerMutation.mutate({
      questionId: currentQuestion.id,
      voiceTranscript: transcript,
      timeSpent,
    });
  };

  const handleNextQuestion = () => {
    setAudioBlob(null);
    setTranscript("");
    transcriptRef.current = ""; // Clear ref too
    // Clear live transcript to prevent mixing with next question
    setLiveAccumulatedTranscript("");
    setLiveCurrentTranscript("");
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      reset(180);
      start();
    } else {
      // Interview complete
      completeInterviewMutation.mutate();
    }
  };


  const handleExit = async () => {
    fullscreenMonitor.stop();
    // Stop video stream when exiting
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    if (sessionId) {
      try {
        await apiRequest("PATCH", `/api/interviews/sessions/${sessionId}/abandon`);
      } catch (error) {
        console.error("Failed to abandon session:", error);
      }
    }
    setLocation("/");
  };

  if (createSessionMutation.isPending || isLoadingQuestions) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Setting Up Your Voice Interview</h2>
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
              🎤 Voice interview mode uses speech recognition and AI question generation.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Please allow microphone access when prompted
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
    <>
      {/* Fullscreen Prompt Dialog */}
      {showFullscreenPrompt && (
        <AlertDialog open={showFullscreenPrompt}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogTitle className="text-2xl font-bold">
              📢 Fullscreen Mode Required
            </AlertDialogTitle>
            <AlertDialogDescription className="text-lg leading-relaxed space-y-4">
              <p>{getFullscreenInitialMessage()}</p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
                <p className="text-sm text-yellow-900 dark:text-yellow-100">
                  <strong>Important:</strong> If you exit fullscreen 3 times, your interview will be automatically terminated and all progress will be lost.
                </p>
              </div>
            </AlertDialogDescription>
            <div className="flex justify-end space-x-4 mt-6">
              <Button variant="outline" onClick={handleExit}>
                Cancel Interview
              </Button>
              <Button onClick={handleStartFullscreen} className="btn-gradient">
                Start in Fullscreen Mode
              </Button>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Voice Interview Session</h1>
            <p className="text-muted-foreground">
              {(() => {
                const companies = (userData as any)?.targetCompanies || ["Microsoft"];
                const roles = (userData as any)?.targetRoles || ["Software Engineer"];
                
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
              <p className="text-muted-foreground">
                Take your time to think about your answer. You can pause and resume your recording at any time, or restart completely if needed.
              </p>
            </div>

            {/* Video and Recording Controls Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Video Feed - Left Side */}
              <div className="lg:col-span-2">
                <div className="bg-gray-900 rounded-lg w-full h-[50vh] flex items-center justify-center relative overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover rounded-lg"
                    autoPlay
                    playsInline
                    muted
                  />
                  {!videoStream && (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="text-6xl mb-6 opacity-50">🎤</div>
                        <p className="text-xl opacity-75 mb-2">Audio Recording Mode</p>
                        <p className="text-sm opacity-50">Camera initialization in progress...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recording Controls - Right Side */}
              <div className="lg:col-span-1 self-start">
                <div className="bg-card rounded-lg p-4">
                  <AudioRecorder
                    ref={audioRecorderRef}
                    onRecordingComplete={handleRecordingComplete}
                    isDisabled={!isRunning}
                    maxDuration={timeLeft}
                    enableVideo={true}
                    onVideoStream={handleVideoStream}
                    onLiveTranscript={handleLiveTranscript}
                  />
                </div>
              </div>
            </div>

            {/* Full Width Live Transcript Display */}
            {(liveAccumulatedTranscript || liveCurrentTranscript) && (
              <div className="mt-6">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-foreground mb-3 text-base">Live Transcript:</h4>
                    <div className="bg-muted rounded-lg p-4 max-h-32 overflow-y-auto">
                      <div className="text-sm leading-relaxed">
                        <span className="text-muted-foreground">{liveAccumulatedTranscript}</span>
                        <span className="text-foreground font-medium">{liveCurrentTranscript}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex justify-end items-center mt-6">
              <Button
                onClick={handleSubmitAnswer}
                disabled={!transcript || submitAnswerMutation.isPending}
                data-testid="button-submit-answer"
              >
                {submitAnswerMutation.isPending ? "Processing..." : "Submit & Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Full Width Transcript Display - Outside Card for True Full Width */}
        {transcript && (
          <div className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold text-foreground mb-4 text-lg">Your Complete Response:</h4>
                <div className="bg-muted rounded-lg p-6 max-h-60 overflow-y-auto">
                  <p className="text-foreground leading-relaxed" data-testid="transcript-text">{transcript}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Processing Modal */}
        <Dialog open={showProcessing} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Brain className="h-6 w-6 text-primary mr-3 animate-pulse" />
                Processing Your Answer
              </DialogTitle>
            </DialogHeader>
            
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-6">Our AI is analyzing your response...</p>
              
              <div className="space-y-3 text-left">
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                  <span className="text-foreground">Speech-to-text conversion complete</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3"></div>
                  <span className="text-foreground">Evaluating content quality...</span>
                </div>
                <div className="flex items-center text-sm opacity-50">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full mr-3"></div>
                  <span className="text-muted-foreground">Generating feedback</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      </div>
    </>
  );
}