import { cn } from "../../lib/cn";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-slate-100", className)}
      aria-hidden="true"
    />
  );
}
