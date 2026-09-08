import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export function EmptyState({
  title = "Nothing here yet",
  description,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Inbox className="h-8 w-8 text-slate-300" />
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {description && (
        <p className="text-xs text-slate-400">{description}</p>
      )}
    </div>
  );
}
