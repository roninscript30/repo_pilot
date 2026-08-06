import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CommandDialog } from "@/components/ui/CommandDialog";
import { useUiStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useRepositories, useRepositoryOverview } from "@/hooks/use-repositories";
import { buildCommands } from "@/services/commands";
import { useToast } from "@/components/ui/toast-context";
import { repositoryNameFromPath } from "@/lib/route";

/**
 * Global command palette (⌘K). All actions come from the command
 * registry; repository-scoped commands appear contextually.
 */
export function CommandPalette() {
  const open = useUiStore((state) => state.paletteOpen);
  const setOpen = useUiStore((state) => state.setPaletteOpen);
  const account = useAuthStore((state) => state.account);
  const repositories = useRepositories(account !== null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  const fullName = repositoryNameFromPath(location.pathname);
  const overview = useRepositoryOverview(fullName, fullName.length > 0);

  const items = useMemo(
    () =>
      buildCommands({
        navigate,
        repositories: repositories.data ?? [],
        currentRepository: overview.data?.repository ?? null,
        copyText: async (text) => {
          try {
            await navigator.clipboard.writeText(text);
            toast({ title: "Copied to clipboard", tone: "success" });
          } catch {
            toast({ title: "Could not copy", description: "Clipboard access was denied.", tone: "error" });
          }
        },
        openExternal: (url) => {
          window.open(url, "_blank", "noopener,noreferrer");
        },
        startNewIssue: () => {
          if (fullName) navigate(`/repositories/${fullName}/issues?new=1`);
        },
        startSandbox: () => navigate("/sandbox"),
      }),
    [navigate, repositories.data, overview.data, fullName, toast],
  );

  return (
    <CommandDialog
      open={open}
      onClose={() => setOpen(false)}
      title="Command palette"
      placeholder="Type a command or search…"
      items={items}
    />
  );
}
