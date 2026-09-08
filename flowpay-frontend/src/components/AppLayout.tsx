import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, ArrowRightLeft, List, LogOut } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { cn } from "../lib/cn";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/exchange", label: "Exchange", icon: ArrowRightLeft },
  { to: "/transactions", label: "Transactions", icon: List },
];

export function AppLayout() {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-svh bg-slate-50">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
              F
            </div>
            <span className="text-sm font-semibold text-slate-900">
              FlowPay
            </span>
          </div>

          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden text-xs text-slate-400 sm:block">
                {user.email}
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <nav className="flex sm:hidden border-t border-slate-100">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors",
                  isActive ? "text-brand-700" : "text-slate-500"
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
