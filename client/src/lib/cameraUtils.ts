// Camera Utility Helper
// Place this in: client/src/lib/cameraUtils.ts

export interface CameraPermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

export interface CameraInitResult {
  success: boolean;
  stream: MediaStream | null;
  error: string | null;
  audioOnly: boolean;
}

/**
 * Check camera permission status without requesting it
 */
export async function checkCameraPermission(): Promise<CameraPermissionStatus> {
  try {
    const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
    return {
      granted: result.state === 'granted',
      denied: result.state === 'denied',
      prompt: result.state === 'prompt'
    };
  } catch (error) {
    console.warn('Permission API not supported:', error);
    return { granted: false, denied: false, prompt: true };
  }
}

/**
 * Initialize camera with multiple fallback strategies
 */
export async function initializeCamera(audioOnly = false): Promise<CameraInitResult> {
  // Check if MediaDevices API is available
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      success: false,
      stream: null,
      error: 'Camera API not supported in this browser',
      audioOnly: true
    };
  }

  // If audio-only mode requested, skip camera
  if (audioOnly) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      
      return {
        success: true,
        stream,
        error: null,
        audioOnly: true
      };
    } catch (error) {
      return {
        success: false,
        stream: null,
        error: `Audio initialization failed: ${(error as Error).message}`,
        audioOnly: true
      };
    }
  }

  // Try camera + audio with multiple fallback strategies
  const strategies = [
    // Strategy 1: Full quality
    {
      name: 'High Quality',
      constraints: {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        }
      }
    },
    // Strategy 2: Medium quality
    {
      name: 'Medium Quality',
      constraints: {
        audio: true,
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      }
    },
    // Strategy 3: Minimal constraints
    {
      name: 'Basic',
      constraints: {
        audio: true,
        video: true
      }
    },
    // Strategy 4: Audio only fallback
    {
      name: 'Audio Only',
      constraints: {
        audio: true,
        video: false
      }
    }
  ];

  for (const strategy of strategies) {
    try {
      console.log(`Trying camera initialization: ${strategy.name}`);
      const stream = await navigator.mediaDevices.getUserMedia(strategy.constraints);
      
      const hasVideo = stream.getVideoTracks().length > 0;
      console.log(`Camera initialization successful: ${strategy.name}, Has Video: ${hasVideo}`);
      
      return {
        success: true,
        stream,
        error: null,
        audioOnly: !hasVideo
      };
    } catch (error) {
      console.warn(`Camera strategy ${strategy.name} failed:`, error);
      
      // If this is the last strategy, return the error
      if (strategy === strategies[strategies.length - 1]) {
        return {
          success: false,
          stream: null,
          error: `Camera initialization failed: ${(error as Error).message}`,
          audioOnly: true
        };
      }
      // Otherwise, continue to next strategy
      continue;
    }
  }

  // Should never reach here, but just in case
  return {
    success: false,
    stream: null,
    error: 'All camera initialization strategies failed',
    audioOnly: true
  };
}

/**
 * Stop all tracks in a media stream
 */
export function stopMediaStream(stream: MediaStream | null) {
  if (!stream) return;
  
  stream.getTracks().forEach(track => {
    track.stop();
    console.log(`Stopped ${track.kind} track:`, track.label);
  });
}

/**
 * Get user-friendly error message
 */
export function getCameraErrorMessage(error: DOMException | Error): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
        return 'Camera access denied. Please allow camera access in your browser settings.';
      case 'NotFoundError':
        return 'No camera detected. Please connect a camera or continue in audio-only mode.';
      case 'NotReadableError':
        return 'Camera is in use by another application. Please close other apps using the camera.';
      case 'OverconstrainedError':
        return 'Camera settings not supported. Trying with basic settings...';
      case 'SecurityError':
        return 'Camera access blocked by security settings. Please ensure you\'re using HTTPS.';
      case 'AbortError':
        return 'Camera access was interrupted. Please try again.';
      default:
        return `Camera error: ${error.message || 'Unknown error occurred'}`;
    }
  }
  return `Camera error: ${error.message}`;
}

/**
 * Check if stream is active and has video
 */
export function isStreamActive(stream: MediaStream | null): boolean {
  if (!stream) return false;
  
  const videoTracks = stream.getVideoTracks();
  if (videoTracks.length === 0) return false;
  
  return videoTracks.some(track => track.readyState === 'live' && track.enabled);
}

/**
 * Retry camera initialization with exponential backoff
 */
export async function retryCameraInit(
  maxRetries = 3,
  initialDelay = 1000
): Promise<CameraInitResult> {
  let lastError: string | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    console.log(`Camera initialization attempt ${attempt + 1}/${maxRetries}`);
    
    const result = await initializeCamera();
    
    if (result.success) {
      return result;
    }
    
    lastError = result.error;
    
    // Don't retry on permission denied
    if (result.error?.includes('denied') || result.error?.includes('NotAllowedError')) {
      break;
    }
    
    // Wait before retrying (exponential backoff)
    if (attempt < maxRetries - 1) {
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return {
    success: false,
    stream: null,
    error: lastError || 'Camera initialization failed after multiple attempts',
    audioOnly: true
  };
}
