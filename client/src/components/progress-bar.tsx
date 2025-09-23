import { Progress } from "@/components/ui/progress";

interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

export function ProgressBar({ current, total, className }: ProgressBarProps) {
  const progress = (current / total) * 100;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-muted-foreground">
          Question <span className="font-semibold text-foreground">{current}</span> of{" "}
          <span className="text-foreground">{total}</span>
        </div>
      </div>
      <Progress value={progress} className="h-2" data-testid="progress-bar" />
    </div>
  );
}
