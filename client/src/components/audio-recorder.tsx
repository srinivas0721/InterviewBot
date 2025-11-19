import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mic, Square, Play, StopCircle, Pause, RotateCcw } from "lucide-react";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, transcript: string) => void;
  isDisabled?: boolean;
  maxDuration?: number; // in seconds
  enableVideo?: boolean; // New prop to enable video
  onVideoStream?: (stream: MediaStream | null) => void; // Callback for video stream
  onLiveTranscript?: (accumulated: string, current: string) => void; // Callback for live transcript
}

export interface AudioRecorderRef {
  pauseRecording: () => void;
  finishRecording: () => void;
  clearLiveTranscript: () => void;
  isRecording: boolean;
  isPaused: boolean;
}

export const AudioRecorder = forwardRef<AudioRecorderRef, AudioRecorderProps>(({ 
  onRecordingComplete, 
  isDisabled = false, 
  maxDuration = 180,
  enableVideo = false,
  onVideoStream,
  onLiveTranscript
}, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [accumulatedTranscript, setAccumulatedTranscript] = useState<string>('');
  const [currentSegmentTranscript, setCurrentSegmentTranscript] = useState<string>('');
  const [audioSegments, setAudioSegments] = useState<Blob[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true; // Changed to true for live transcription
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;
      console.log('Speech recognition initialized successfully');
    } else {
      console.warn('Speech recognition not supported in this browser');
      toast({
        title: "Speech Recognition Not Available",
        description: "Live transcription will not be available. Your recordings will still work.",
        variant: "default",
      });
    }

    // Listen for force cleanup event (when user navigates away)
    const handleForceCleanup = () => {
      console.log('AudioRecorder: Force cleanup triggered');
      forceStopAllRecording();
    };
    
    window.addEventListener('forceCleanup', handleForceCleanup);
    
    // Also listen for beforeunload to catch page refresh/close
    const handleBeforeUnload = () => {
      console.log('AudioRecorder: Page unloading - stopping recording');
      forceStopAllRecording();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      // Clean up video stream
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Clean up current stream
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Stop any ongoing speech recognition
      if (recognitionRef.current && recognitionRef.current.state === 'listening') {
        recognitionRef.current.stop();
      }
      
      // Remove event listeners
      window.removeEventListener('forceCleanup', handleForceCleanup);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      // If resuming from pause, use existing stream
      if (isPaused && currentStreamRef.current) {
        resumeRecording();
        return;
      }

      // Only request audio for recording - video is handled separately
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      currentStreamRef.current = stream;

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      chunksRef.current = [];
      
      // Only reset time if this is a fresh start (not resuming)
      if (!isPaused) {
        setRecordingTime(0);
      }

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // Add this segment to our collection
        setAudioSegments(prev => [...prev, blob]);
        
        // If this is a pause (not final stop), start transcribing this segment
        if (isPaused) {
          transcribeSegment(blob);
        }
      };

      // Note: Video stream is managed separately by the parent component

      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
      setIsPaused(false);

      // Start speech recognition for live transcript
      console.log('Starting speech recognition...');
      startSpeechRecognition();

      toast({
        title: "Recording Started",
        description: "Speak clearly into your microphone. Live transcription is active.",
      });

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            finishRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Unable to access microphone. Please check your permissions.",
        variant: "destructive",
      });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); // This will trigger ondataavailable and onstop
      setIsRecording(false);
      setIsPaused(true);

      // Stop speech recognition for this segment and save current transcript
      if (recognitionRef.current && recognitionRef.current.state === 'listening') {
        recognitionRef.current.stop();
      }
      
      // Save current segment transcript to accumulated transcript (clean version only)
      if (currentSegmentTranscript.trim()) {
        const cleanTranscript = currentSegmentTranscript.trim().replace(/\s+/g, ' '); // Remove extra spaces
        setAccumulatedTranscript(prev => {
          const newAccumulated = prev ? prev + ' ' + cleanTranscript : cleanTranscript;
          // Notify parent component of live transcript update
          if (onLiveTranscript) {
            onLiveTranscript(newAccumulated, '');
          }
          return newAccumulated;
        });
        setCurrentSegmentTranscript('');
      }

      // Pause timer but don't reset it
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      toast({
        title: "Recording Paused",
        description: "Click the microphone to resume or finish your answer.",
      });
    }
  };

  const resumeRecording = async () => {
    if (!currentStreamRef.current) {
      // If we lost the stream, start fresh
      setIsPaused(false);
      startRecording();
      return;
    }

    try {
      mediaRecorderRef.current = new MediaRecorder(currentStreamRef.current, {
        mimeType: 'audio/webm;codecs=opus'
      });

      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioSegments(prev => [...prev, blob]);
        
        // If this is a pause (not final stop), transcribe this segment
        if (isPaused) {
          transcribeSegment(blob);
        }
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setIsPaused(false);

      // Resume speech recognition
      startSpeechRecognition();

      // Resume timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            finishRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Error resuming recording:', error);
      toast({
        title: "Resume Error",
        description: "Unable to resume recording. Please try starting again.",
        variant: "destructive",
      });
    }
  };

  // Force stop all recording activity - used when navigating away
  const forceStopAllRecording = () => {
    console.log('AudioRecorder: Stopping all recording activity');
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Stop speech recognition
    if (recognitionRef.current && recognitionRef.current.state === 'listening') {
      recognitionRef.current.stop();
    }
    
    // Stop timer
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    // Stop all media tracks
    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
    }
    
    // Reset states
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
  };

  const finishRecording = () => {
    if (mediaRecorderRef.current && (isRecording || isPaused)) {
      if (isRecording) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setIsPaused(false);

      if (recognitionRef.current && recognitionRef.current.state === 'listening') {
        recognitionRef.current.stop();
      }

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      // Stop all tracks
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach(track => track.stop());
        currentStreamRef.current = null;
      }

      // Combine all audio segments and transcripts
      setTimeout(() => {
        combineAllSegments();
      }, 500);
    }
  };

  const restartRecording = () => {
    // Stop current recording if active
    if (mediaRecorderRef.current && (isRecording || isPaused)) {
      if (isRecording) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setIsPaused(false);

      if (recognitionRef.current && recognitionRef.current.state === 'listening') {
        recognitionRef.current.stop();
      }

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      // Stop all tracks
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach(track => track.stop());
        currentStreamRef.current = null;
      }
    }

    // Clear all accumulated data
    setRecordingTime(0);
    setAccumulatedTranscript('');
    setCurrentSegmentTranscript('');
    setAudioSegments([]);
    setAudioBlob(null);
    setAudioUrl(null);
    chunksRef.current = [];

    toast({
      title: "Recording Reset",
      description: "Previous recording cleared. You can start fresh.",
    });
  };

  const clearLiveTranscript = () => {
    setAccumulatedTranscript('');
    setCurrentSegmentTranscript('');
    
    // Notify parent component to clear live transcript
    if (onLiveTranscript) {
      onLiveTranscript('', '');
    }
  };

  // Expose pause, finish, and clear functions to parent component
  useImperativeHandle(ref, () => ({
    pauseRecording,
    finishRecording,
    clearLiveTranscript,
    isRecording,
    isPaused,
  }));

  const startSpeechRecognition = () => {
    if (!recognitionRef.current) {
      console.warn('Speech recognition not initialized');
      return;
    }

    try {
      // Stop any existing recognition first
      if (recognitionRef.current.state === 'listening') {
        console.log('Stopping existing recognition before starting new one');
        recognitionRef.current.stop();
      }
    } catch (error) {
      console.log('Error stopping previous recognition:', error);
    }
    
    // Set up fresh recognition with clean state for optimal performance
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.maxAlternatives = 1;
    
    let segmentFinalTranscript = '';
    
    recognitionRef.current.onstart = () => {
      console.log('Speech recognition started and listening...');
    };
    
    recognitionRef.current.onresult = (event: any) => {
      console.log('Speech recognition result received', event);
      let interimTranscript = '';
      let newFinalText = '';
      
      // Process only new results since last update
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        console.log(`Result ${i}: ${transcript} (final: ${event.results[i].isFinal})`);
        
        if (event.results[i].isFinal) {
          newFinalText += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Add new final text to segment transcript
      if (newFinalText.trim()) {
        segmentFinalTranscript += newFinalText;
        console.log('Updated segment transcript:', segmentFinalTranscript);
      }
      
      // Display: accumulated final text + current interim text (in gray)
      const displayText = (segmentFinalTranscript + interimTranscript).trim();
      setCurrentSegmentTranscript(displayText);
      
      // Notify parent component of live transcript update with debouncing for performance
      if (onLiveTranscript) {
        // Use requestAnimationFrame for smooth UI updates
        requestAnimationFrame(() => {
          onLiveTranscript(accumulatedTranscript, displayText);
        });
      }
    };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          console.log('Speech recognition will continue despite error');
        }
      };

      recognitionRef.current.onend = () => {
        // Auto-restart recognition if we're still recording with minimal delay
        if (isRecording && !isPaused) {
          setTimeout(() => {
            if (isRecording && !isPaused && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (error) {
                console.log('Auto-restart recognition failed:', error);
              }
            }
          }, 50); // Reduced delay from 100ms to 50ms for faster restarts
        }
      };

    try {
      recognitionRef.current.start();
      console.log('Speech recognition start() called successfully');
    } catch (error) {
      console.error('Recognition start error:', error);
      toast({
        title: "Speech Recognition Error",
        description: "Could not start live transcription. Recording will still work.",
        variant: "default",
      });
    }
  };

  const transcribeSegment = async (segmentBlob: Blob) => {
    // This function is called when a segment is completed
    // The transcript accumulation is now handled in pauseRecording
    console.log('Segment transcribed and added to collection');
  };

  const combineAllSegments = async () => {
    try {
      // Combine all audio segments
      if (audioSegments.length > 0) {
        const combinedBlob = new Blob(audioSegments, { type: 'audio/webm' });
        setAudioBlob(combinedBlob);
        setAudioUrl(URL.createObjectURL(combinedBlob));
        
        // Add any remaining current segment transcript and clean it
        let finalTranscript = accumulatedTranscript;
        if (currentSegmentTranscript.trim()) {
          const cleanCurrentTranscript = currentSegmentTranscript.trim().replace(/\s+/g, ' ');
          finalTranscript = finalTranscript ? 
            finalTranscript + ' ' + cleanCurrentTranscript : 
            cleanCurrentTranscript;
        }
        
        // Final cleanup: remove any duplicate phrases and normalize spaces
        const cleanedFinalTranscript = finalTranscript
          .replace(/\s+/g, ' ') // normalize whitespace
          .trim();
        
        // Call the completion callback with combined results
        if (cleanedFinalTranscript) {
          onRecordingComplete(combinedBlob, cleanedFinalTranscript);
        } else {
          toast({
            title: "No Speech Detected",
            description: "Please try recording your answer again.",
            variant: "destructive",
          });
          restartRecording();
        }
      }
    } catch (error) {
      console.error('Error combining segments:', error);
      toast({
        title: "Processing Error",
        description: "Unable to process recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    
    try {
      // Use Web Speech API for transcription
      if (recognitionRef.current && 'webkitSpeechRecognition' in window) {
        let transcript = '';
        let finalTranscript = '';
        
        // Configure recognition for continuous speech
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        // Set a timeout to prevent infinite processing
        const timeoutId = setTimeout(() => {
          console.log('Speech recognition timeout');
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
          setIsTranscribing(false);
          if (finalTranscript.trim()) {
            onRecordingComplete(blob, finalTranscript.trim());
          } else {
            // Show error and allow re-recording
            toast({
              title: "Speech Recognition Failed",
              description: "No speech detected. Please try recording again.",
              variant: "destructive",
            });
            setAudioBlob(null);
            setAudioUrl("");
          }
        }, 15000); // 15 second timeout
        
        recognitionRef.current.onresult = (event: any) => {
          transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            } else {
              transcript += event.results[i][0].transcript;
            }
          }
        };

        recognitionRef.current.onend = () => {
          clearTimeout(timeoutId);
          setIsTranscribing(false);
          const final = (finalTranscript + transcript).trim();
          if (final) {
            onRecordingComplete(blob, final);
          } else {
            // Show error and allow re-recording
            toast({
              title: "No Speech Detected",
              description: "Please try recording your answer again.",
              variant: "destructive",
            });
            setAudioBlob(null);
            setAudioUrl("");
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          clearTimeout(timeoutId);
          setIsTranscribing(false);
          
          // Show error and allow re-recording based on error type
          let title = "Speech Recognition Error";
          let description = "Please try recording again.";
          
          switch(event.error) {
            case 'no-speech':
              title = "No Speech Detected";
              description = "Please speak clearly and try recording again.";
              break;
            case 'network':
              title = "Network Error";
              description = "Check your internet connection and try again.";
              break;
            case 'not-allowed':
              title = "Microphone Access Denied";
              description = "Please allow microphone access and try again.";
              break;
            case 'aborted':
              // Don't show error for aborted (user stopped)
              return;
          }
          
          toast({
            title,
            description,
            variant: "destructive",
          });
          
          // Reset recording state to allow re-recording
          setAudioBlob(null);
          setAudioUrl("");
        };

        // Only start if not already running
        if (recognitionRef.current.state !== 'listening') {
          recognitionRef.current.start();
        }
      } else {
        // No speech recognition support
        setIsTranscribing(false);
        toast({
          title: "Speech Recognition Not Supported",
          description: "Please type your answer in the text field instead.",
          variant: "destructive",
        });
        setAudioBlob(null);
        setAudioUrl("");
      }
    } catch (error: any) {
      console.error('Transcription error:', error);
      setIsTranscribing(false);
      
      // Only start new recognition if this one isn't already running
      if (error.message?.includes('already started')) {
        return; // Recognition is already running, let it continue
      }
      
      toast({
        title: "Transcription Failed",
        description: "Please try recording your answer again.",
        variant: "destructive",
      });
      setAudioBlob(null);
      setAudioUrl("");
    }
  };

  const playRecording = () => {
    if (audioUrl && !isPlaying) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.play();
      setIsPlaying(true);
    } else if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Recording Status */}
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Recording Status</h3>
        <div className="text-muted-foreground">
          {isRecording && (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-medium text-red-600">Recording in progress...</span>
            </div>
          )}
          {isPaused && (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="font-medium text-yellow-600">Recording paused</span>
            </div>
          )}
          {isTranscribing && (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-spin"></div>
              <span className="font-medium text-blue-600">Processing your answer...</span>
            </div>
          )}
          {!isRecording && !isPaused && !isTranscribing && (audioBlob || audioSegments.length > 0) && (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-medium text-green-600">Recording complete</span>
            </div>
          )}
          {!isRecording && !isPaused && !isTranscribing && !audioBlob && audioSegments.length === 0 && (
            <span>Ready to record</span>
          )}
        </div>
      </div>

      {/* Audio Visualizer - Only show when recording */}
      {isRecording && (
        <div className="bg-muted rounded-lg p-2 h-16 flex items-center justify-center">
          <div className="flex items-end space-x-1 h-12">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 bg-primary rounded-full animate-pulse`}
                style={{
                  height: `${30 + (i * 8)}%`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: `${1 + (i * 0.1)}s`
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recording Timer */}
      {(isRecording || recordingTime > 0) && (
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">
            {formatTime(recordingTime)}
          </div>
          <div className="text-sm text-muted-foreground">
            Max: {formatTime(maxDuration)}
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex flex-col items-center space-y-4">
        {/* Main recording controls */}
        <div className="flex justify-center space-x-4">
          {!isRecording && !isPaused && (
            <Button
              size="lg"
              variant="default"
              onClick={startRecording}
              disabled={isDisabled || isTranscribing}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-start-recording"
            >
              <Mic className="h-6 w-6" />
            </Button>
          )}

          {isRecording && (
            <Button
              size="lg"
              variant="outline"
              onClick={pauseRecording}
              disabled={isDisabled || isTranscribing}
              className="w-16 h-16 rounded-full border-2 border-yellow-500 hover:bg-yellow-50"
              data-testid="button-pause-recording"
            >
              <Pause className="h-6 w-6 text-yellow-600" />
            </Button>
          )}

          {isPaused && (
            <>
              <Button
                size="lg"
                variant="default"
                onClick={startRecording}
                disabled={isDisabled || isTranscribing}
                className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-resume-recording"
              >
                <Mic className="h-6 w-6" />
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={finishRecording}
                disabled={isDisabled || isTranscribing}
                className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700"
                data-testid="button-finish-recording"
              >
                <Square className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>
        
        {/* Secondary controls */}
        {isPaused && (
          <div className="flex justify-center">
            <Button
              size="sm"
              variant="outline"
              onClick={restartRecording}
              disabled={isDisabled || isTranscribing}
              className="px-4 py-2 text-sm border-gray-300 hover:bg-gray-50"
              data-testid="button-restart-recording"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
          </div>
        )}
        
        {/* Button labels */}
        <div className="text-center text-sm text-muted-foreground">
          {!isRecording && !isPaused && "Click red button to start"}
          {isRecording && "Yellow = Pause recording"}
          {isPaused && "Blue = Resume, Green = Finish"}
        </div>
      </div>


      {/* Compact Instructions for Right Panel */}
      <div className="mt-1 text-center text-xs text-muted-foreground">
        {!isRecording && !isPaused && (
          <p className="font-medium">Click red to start</p>
        )}
        {isPaused && (
          <p className="text-yellow-600 font-medium">⏸️ Paused</p>
        )}
        {isTranscribing && (
          <p className="text-primary font-medium animate-pulse">Processing...</p>
        )}
      </div>
    </div>
  );
});
