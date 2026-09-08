import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { useAuthStore } from "../../../stores/authStore";
import type { ApiError } from "../../../types/api";

interface RegisterFormProps {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Name is required";
    if (!email.trim()) errors.email = "Email is required";
    if (!password) errors.password = "Password is required";
    else if (password.length < 8)
      errors.password = "Password must be at least 8 characters";
    if (password !== passwordConfirmation)
      errors.password_confirmation = "Passwords do not match";

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    try {
      await register(name.trim(), email.trim(), password, passwordConfirmation);
      toast.success("Account created");
      onSuccess?.();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors) {
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(apiErr.errors)) {
          mapped[key] = messages[0] ?? apiErr.message;
        }
        setFieldErrors(mapped);
      }
      setFormError(apiErr.message || "Registration failed");
    }
  };

  return (
    <Card className="w-full max-w-md overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
            F
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Create account
            </h1>
            <p className="text-sm text-slate-500">Start with FlowPay wallets</p>
          </div>
        </div>
      </CardHeader>

      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Full name"
            name="name"
            autoComplete="name"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name}
            disabled={isLoading}
          />

          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            disabled={isLoading}
          />

          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            disabled={isLoading}
          />

          <Input
            label="Confirm password"
            type="password"
            name="password_confirmation"
            autoComplete="new-password"
            placeholder="Repeat password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            error={fieldErrors.password_confirmation}
            disabled={isLoading}
          />

          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={isLoading}
          >
            Create account
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
