import { useEffect } from "react";
import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Onboarding } from "@/components/auth/Onboarding";
import { SignInPage } from "@/components/auth/SignInPage";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { RepositoryBrowserPage } from "@/components/repositories/RepositoryBrowserPage";
import { RepositoryDetailPage } from "@/components/repositories/RepositoryDetailPage";
import { SandboxPage } from "@/components/sandbox/SandboxPage";
import { LocalReposPage } from "@/components/local/LocalReposPage";
import { Spinner } from "@/components/ui/Spinner";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";

function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  if (status === "signing-in" || status === "unauthenticated" || status === "error") {
    return <SignInPage />;
  }
  return <>{children}</>;
}

export default function App() {
  const status = useAuthStore((state) => state.status);
  const loadStoredSessions = useAuthStore((state) => state.loadStoredSessions);
  const onboardingCompleted = useOnboardingStore((state) => state.completed);

  useEffect(() => {
    void loadStoredSessions();
  }, [loadStoredSessions]);

  // First run: guide through onboarding regardless of auth state.
  if (!onboardingCompleted) {
    return <Onboarding />;
  }

  if (status === "unauthenticated" || status === "error") {
    return <SignInPage />;
  }

  if (status === "signing-in") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50 dark:bg-surface-0">
        <Spinner label="Restoring session…" />
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/repositories"
          element={
            <RequireAuth>
              <RepositoryBrowserPage />
            </RequireAuth>
          }
        />
        <Route
          path="/repositories/:fullName/*"
          element={
            <RequireAuth>
              <RepositoryDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/sandbox"
          element={
            <RequireAuth>
              <SandboxPage />
            </RequireAuth>
          }
        />
        <Route
          path="/local"
          element={
            <RequireAuth>
              <LocalReposPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
