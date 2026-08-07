import { useEffect } from "react";
import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/features/workspace/components/AppShell";
import { Onboarding } from "@/features/auth/Onboarding";
import { SignInPage } from "@/features/auth/SignInPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { RepositoryBrowserPage } from "@/features/repositories/RepositoryBrowserPage";
import { RepositoryWorkspace } from "@/features/repo/components/RepositoryWorkspace";
import { SandboxPage } from "@/features/sandbox/SandboxPage";
import { LocalReposPage } from "@/features/local/LocalReposPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
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
      <Route element={<AppShell />}>
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
          path="/repo/:owner/:name"
          element={
            <RequireAuth>
              <RepositoryWorkspace />
            </RequireAuth>
          }
        />
        <Route
          path="/repo/:owner/:name/:activity"
          element={
            <RequireAuth>
              <RepositoryWorkspace />
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
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
