import { Navigate, useNavigate } from "react-router-dom";
import { LoginForm } from "../features/auth/components/LoginForm";
import { useAuthStore } from "../stores/authStore";

export function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/exchange" replace />;
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-10">
      <LoginForm onSuccess={() => navigate("/exchange", { replace: true })} />
    </div>
  );
}
