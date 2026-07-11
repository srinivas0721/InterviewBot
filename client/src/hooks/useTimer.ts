import { useState, useEffect, useCallback, useRef } from "react";

export function useTimer(initialTime: number, onTimeUp?: () => void) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);

  // Keep the latest callback in a ref so the ticking effect doesn't need to
  // re-subscribe (and restart its interval) whenever onTimeUp changes.
  const onTimeUpRef = useRef(onTimeUp);
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback((newTime?: number) => {
    setTimeLeft(newTime ?? initialTime);
    setIsRunning(false);
  }, [initialTime]);

  // Single interval driven only by isRunning. It ticks once per second and
  // fires onTimeUp exactly when the countdown reaches zero.
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          onTimeUpRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    timeLeft,
    isRunning,
    start,
    stop,
    reset,
    formatTime: formatTime(timeLeft),
    isWarning: timeLeft <= 30,
  };
}
