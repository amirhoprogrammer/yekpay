import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, id, ...props }, ref) => {
    const selectId = id ?? props.name;

    return (
      <div>
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          className={cn(
            "h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900",
            "focus:outline-none focus:ring-2 focus:ring-brand-500",
            error ? "border-red-300" : "border-slate-200",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
