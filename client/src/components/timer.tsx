import { cn } from "@/lib/utils";

interface TimerProps {
  timeLeft: number;
  isWarning?: boolean;
  className?: string;
}

export function Timer({ timeLeft, isWarning = false, className }: TimerProps) {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={cn(
        "text-2xl font-bold transition-colors",
        isWarning ? "text-destructive animate-pulse" : "text-primary",
        className
      )}
      data-testid="timer-display"
    >
      {formatTime(timeLeft)}
    </div>
  );
}
