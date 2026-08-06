import { useLocation } from "react-router-dom";
import { resolveGitRuntime } from "@/services/runtime";
import { useRepositoryOverview } from "@/hooks/use-repositories";
import { useAuthStore } from "@/stores/auth-store";
import { StatusDot } from "@/components/ui/StatusDot";
import { Kbd } from "@/components/ui/Kbd";
import { Icon } from "@/components/ui/Icon";
import { useUiStore } from "@/stores/ui-store";
import { isRepositoryPath, repositoryNameFromPath } from "@/lib/route";

/** Bottom status bar: runtime, sync state, keyboard hints. */
export function StatusBar() {
  const runtime = resolveGitRuntime();
  const account = useAuthStore((state) => state.account);
  const location = useLocation();
  const fullName = repositoryNameFromPath(location.pathname);
  const overview = useRepositoryOverview(fullName, fullName.length > 0);
  const setPaletteOpen = useUiStore((state) => state.setPaletteOpen);
  const setSearchOpen = useUiStore((state) => state.setSearchOpen);

  const isRepoPage = isRepositoryPath(location.pathname);
  const branch = overview.data?.repository.defaultBranch ?? null;
  const isDesktop = runtime.kind === "tauri";

  return (
    <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-surface-200 bg-surface-0 px-3 text-2xs text-surface-500 dark:border-surface-600 dark:text-surface-400">
      <span className="flex items-center gap-1.5 font-medium">
        <StatusDot
          tone={isDesktop ? "success" : "info"}
          pulse={isDesktop}
          label={isDesktop ? "Desktop runtime" : "Browser preview"}
        />
        {isDesktop ? "Desktop runtime" : "Browser preview"}
      </span>

      {isRepoPage ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <Icon name="gitBranch" size={11} />
          <span className="max-w-48 truncate font-mono">{branch ?? "loading…"}</span>
        </span>
      ) : null}

      <span className="flex items-center gap-1.5">
        <StatusDot tone={account ? "success" : "neutral"} label={account ? "Connected" : "Disconnected"} />
        {account ? `Connected as ${account.login}` : "Not connected"}
      </span>

      <div className="ml-auto flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700"
        >
          <Icon name="search" size={11} />
          Search
          <Kbd>⌘P</Kbd>
        </button>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700"
        >
          <Icon name="command" size={11} />
          Commands
          <Kbd>⌘K</Kbd>
        </button>
      </div>
    </footer>
  );
}
