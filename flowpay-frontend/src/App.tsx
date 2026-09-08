import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ExchangePage } from "./pages/ExchangePage";
import { DashboardPage } from "./pages/DashboardPage";
import { WalletDetailPage } from "./pages/WalletDetailPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { TransactionDetailPage } from "./pages/TransactionDetailPage";
import { AppLayout } from "./components/AppLayout";
import { useAuthStore } from "./stores/authStore";

function FullScreenSpinner() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrating = useAuthStore((s) => s.isHydrating);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // تا وقتی مشخص نشده Token واقعاً معتبره یا نه، هیچ صفحه‌ای (نه Login نه Exchange)
  // را Render/Redirect نمی‌کنیم — از پرش (Flash) نادرست بین صفحات جلوگیری می‌کند.
  if (isHydrating) {
    return <FullScreenSpinner />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/exchange" element={<ExchangePage />} />
          <Route path="/wallets/:id" element={<WalletDetailPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/transactions/:id" element={<TransactionDetailPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster position="top-center" richColors closeButton />
    </BrowserRouter>
  );
}

export default App;
