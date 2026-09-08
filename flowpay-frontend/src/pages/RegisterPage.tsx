import { Navigate, useNavigate } from "react-router-dom";
import { RegisterForm } from "../features/auth/components/RegisterForm";
import { useAuthStore } from "../stores/authStore";

export function RegisterPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-10">
      <RegisterForm
        onSuccess={() => navigate("/dashboard", { replace: true })}
      />
    </div>
  );
}
