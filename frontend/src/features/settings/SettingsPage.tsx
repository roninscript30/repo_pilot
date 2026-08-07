import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useAuthStore } from "@/stores/auth-store";
import { useThemeStore, type ThemePreference } from "@/stores/theme-store";
import { useWorkspaceStore } from "@/features/workspace/store";
import { useLocalReposStore } from "@/features/local/store";
import { resolveGitRuntime } from "@/services/runtime";

/**
 * Application settings: connected account, appearance, the local Git
 * engine state, and preference maintenance.
 */
export function SettingsPage() {
  const account = useAuthStore((state) => state.account);
  const signOut = useAuthStore((state) => state.signOut);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const navigate = useNavigate();

  const runtime = resolveGitRuntime();

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-6 py-6">
      <div>
        <h1 className="text-lg font-bold text-surface-900 dark:text-surface-100">Settings</h1>
        <p className="text-xs text-surface-500">Application preferences and runtime state.</p>
      </div>

      <Card>
        <CardHeader title="Account" subtitle="Signed-in provider identity" />
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={account?.login ?? "?"} src={account?.avatarUrl ?? null} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
                {account?.displayName ?? account?.login ?? "No account"}
              </p>
              {account ? (
                <p className="flex items-center gap-1.5 text-2xs text-surface-400">
                  <Icon name="org" size={11} />
                  {account.login}
                </p>
              ) : null}
            </div>
          </div>
          {account ? (
            <Button size="sm" variant="secondary" onClick={() => setSignOutOpen(true)}>
              Sign out
            </Button>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader title="Appearance" subtitle="Theme preference" />
        <div className="p-4">
          <SegmentedControl<ThemePreference>
            value={theme}
            options={[
              { value: "light", label: "Light", icon: "sun" },
              { value: "dark", label: "Dark", icon: "moon" },
            ]}
            onChange={setTheme}
            ariaLabel="Theme"
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Local Git engine" subtitle="Runtime powering Git operations" />
        <div className="flex flex-wrap items-center gap-2 p-4">
          <Badge tone={runtime.kind === "tauri" ? "success" : "warning"}>{runtime.kind}</Badge>
          {runtime.kind === "tauri" ? (
            <p className="text-xs text-surface-500">
              The desktop runtime executes real gitoxide-backed Git operations.
            </p>
          ) : (
            <p className="text-xs text-surface-500">
              Browser preview: Git operations are not executed; the UI never fakes
              repository state (ADR-0006).
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Workspace" subtitle="Open tabs and tracked local repos" />
        <div className="flex flex-wrap gap-2 p-4">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              useWorkspaceStore.getState().closeAll();
              navigate("/dashboard");
            }}
          >
            <Icon name="x" size={13} />
            Close all tabs
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              useLocalReposStore.getState().repositories.forEach((entry) =>
                useLocalReposStore.getState().remove(entry.path),
              );
            }}
          >
            <Icon name="trash" size={13} />
            Forget local repos
          </Button>
        </div>
      </Card>

      <Dialog
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        title="Sign out"
        description={`Sign out of ${account?.login ?? "your account"}? Remote data stays cached until removed.`}
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSignOutOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setSignOutOpen(false);
                if (account) void signOut(account.login);
              }}
            >
              Sign out
            </Button>
          </div>
        }
      >
        <p className="text-sm text-surface-600 dark:text-surface-300">
          You can sign back in with your token at any time.
        </p>
      </Dialog>
    </div>
  );
}
