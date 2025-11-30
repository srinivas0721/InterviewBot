// Fullscreen Monitor Utility
// client/src/lib/fullscreenMonitor.ts

export interface FullscreenMonitorConfig {
  maxExits: number;
  warningTimeout: number; // in milliseconds
  onWarning: (exitsRemaining: number) => void;
  onTimeout: () => void;
  onSessionTerminated: () => void;
}

export class FullscreenMonitor {
  private exitCount: number = 0;
  private config: FullscreenMonitorConfig;
  private warningTimer: NodeJS.Timeout | null = null;
  private isActive: boolean = false;
  private hasRequestedFullscreen: boolean = false;

  constructor(config: FullscreenMonitorConfig) {
    this.config = config;
  }

  /**
   * Request fullscreen access from user
   */
  async requestFullscreen(): Promise<boolean> {
    try {
      if (!document.fullscreenEnabled) {
        console.warn('Fullscreen not supported');
        return false;
      }

      await document.documentElement.requestFullscreen();
      this.hasRequestedFullscreen = true;
      return true;
    } catch (error) {
      console.error('Fullscreen request failed:', error);
      return false;
    }
  }

  /**
   * Start monitoring fullscreen exits
   */
  start() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.exitCount = 0;
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    console.log('Fullscreen monitoring started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    this.clearWarningTimer();
    
    // Exit fullscreen if still in it
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    }
    
    console.log('Fullscreen monitoring stopped');
  }

  /**
   * Handle fullscreen change event
   */
  private handleFullscreenChange = () => {
    if (!this.isActive) return;

    // User exited fullscreen
    if (!document.fullscreenElement && this.hasRequestedFullscreen) {
      this.exitCount++;
      console.log(`Fullscreen exit #${this.exitCount}/${this.config.maxExits}`);

      if (this.exitCount >= this.config.maxExits) {
        // Max exits reached - terminate session
        this.terminateSession();
      } else {
        // Show warning and start timer
        const exitsRemaining = this.config.maxExits - this.exitCount;
        this.config.onWarning(exitsRemaining);
        this.startWarningTimer();
      }
    } else if (document.fullscreenElement) {
      // User returned to fullscreen - clear warning timer
      this.clearWarningTimer();
    }
  };

  /**
   * Start warning timer
   */
  private startWarningTimer() {
    this.clearWarningTimer();
    
    this.warningTimer = setTimeout(() => {
      console.log('Warning timeout - terminating session');
      this.config.onTimeout();
      this.terminateSession();
    }, this.config.warningTimeout);
  }

  /**
   * Clear warning timer
   */
  private clearWarningTimer() {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  /**
   * Terminate the session
   */
  private terminateSession() {
    this.config.onSessionTerminated();
    this.stop();
  }

  /**
   * Get current exit count
   */
  getExitCount(): number {
    return this.exitCount;
  }

  /**
   * Check if in fullscreen
   */
  isFullscreen(): boolean {
    return !!document.fullscreenElement;
  }

  /**
   * Get exits remaining
   */
  getExitsRemaining(): number {
    return Math.max(0, this.config.maxExits - this.exitCount);
  }
}

/**
 * Fullscreen Warning Dialog Component Helper
 */
export function getFullscreenWarningMessage(exitsRemaining: number, timeoutSeconds: number): string {
  if (exitsRemaining === 3) {
    return `⚠️ You've exited fullscreen mode. You have ${exitsRemaining} warnings left. Please return to fullscreen within ${timeoutSeconds} seconds or your session will be terminated.`;
  } else if (exitsRemaining === 2) {
    return `⚠️ WARNING: You've exited fullscreen again! Only ${exitsRemaining} warnings remaining. Return to fullscreen within ${timeoutSeconds} seconds!`;
  } else if (exitsRemaining === 1) {
    return `🚨 FINAL WARNING: This is your last chance! ${exitsRemaining} warning left. Return to fullscreen within ${timeoutSeconds} seconds or your interview will be terminated!`;
  }
  return `⚠️ Please return to fullscreen mode within ${timeoutSeconds} seconds.`;
}

export function getFullscreenTerminationMessage(): string {
  return `🚨 Session Terminated: You exceeded the maximum number of fullscreen exits. Your interview has been ended and all data has been deleted. Please start a new session and stay in fullscreen mode.`;
}

export function getFullscreenInitialMessage(): string {
  return `📢 Important: This interview requires fullscreen mode. You have 3 chances to exit fullscreen. Each time you exit, you must return within 30 seconds or your session will be terminated. After 3 exits, your session will be permanently ended.`;
}
