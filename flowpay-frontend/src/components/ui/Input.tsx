import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  suffix?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, suffix, id, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <div>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-11 w-full rounded-xl border px-3.5 text-sm text-slate-900 placeholder:text-slate-400",
              "focus:outline-none focus:ring-2 focus:ring-brand-500",
              error ? "border-red-300" : "border-slate-200",
              suffix ? "pr-14" : "",
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
              {suffix}
            </span>
          )}
        </div>

        {error ? (
          <p className="mt-1.5 text-xs text-red-600">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
