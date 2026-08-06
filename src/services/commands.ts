import type { CommandItem } from "@/components/ui/CommandDialog";
import { useThemeStore } from "@/stores/theme-store";
import type { Repository } from "@/domain/models/repository";

export interface CommandContext {
  readonly navigate: (to: string) => void;
  readonly repositories: readonly Repository[];
  readonly currentRepository: Repository | null;
  readonly copyText: (text: string) => Promise<void>;
  readonly openExternal: (url: string) => void;
  readonly startNewIssue: () => void;
  readonly startSandbox: () => void;
}

/**
 * Build the command palette registry. Availability-aware: repository
 * actions only appear when a repository is in context.
 */
export function buildCommands(context: CommandContext): readonly CommandItem[] {
  const { navigate, repositories, currentRepository, copyText, openExternal, startNewIssue, startSandbox } = context;
  const toggleTheme = useThemeStore.getState().toggleTheme;
  const repo = currentRepository;

  const items: CommandItem[] = [
    {
      id: "nav-dashboard",
      label: "Open Dashboard",
      description: "Engineering control center",
      icon: "dashboard",
      group: "Navigate",
      keywords: ["home", "overview"],
      onSelect: () => navigate("/dashboard"),
    },
    {
      id: "nav-repositories",
      label: "Open Repositories",
      description: "Browse all repositories",
      icon: "repos",
      group: "Navigate",
      keywords: ["browser", "list"],
      onSelect: () => navigate("/repositories"),
    },
    {
      id: "nav-sandbox",
      label: "Open Git Sandbox",
      description: "Experiment safely with Git",
      icon: "box",
      group: "Navigate",
      keywords: ["simulate", "experiment"],
      onSelect: () => navigate("/sandbox"),
    },
    {
      id: "nav-local",
      label: "Open Local Repositories",
      description: "Work with local working trees",
      icon: "folder",
      group: "Navigate",
      keywords: ["local", "disk", "path"],
      onSelect: () => navigate("/local"),
    },
    {
      id: "search-repositories",
      label: "Search Repositories",
      description: "Jump to any repository",
      icon: "search",
      group: "Search",
      keywords: ["find", "goto"],
      onSelect: () => navigate("/repositories"),
    },
    {
      id: "toggle-theme",
      label: "Toggle Theme",
      description: "Switch between light and dark",
      icon: "moon",
      group: "Preferences",
      keywords: ["dark", "light", "appearance"],
      onSelect: () => toggleTheme(),
    },
    ...(repo
      ? ([
          {
            id: "repo-overview",
            label: `Open ${repo.name}`,
            description: `${repo.fullName} workspace`,
            icon: "repo",
            group: "Current repository",
            keywords: ["workspace", repo.fullName],
            onSelect: () => navigate(`/repositories/${repo.fullName}`),
          },
          {
            id: "repo-branches",
            label: "View Branches",
            description: "Branch list and comparisons",
            icon: "gitBranch",
            group: "Current repository",
            keywords: ["branch", "switch"],
            onSelect: () => navigate(`/repositories/${repo.fullName}/branches`),
          },
          {
            id: "repo-commits",
            label: "View Commit History",
            description: "Commit timeline and graph",
            icon: "gitCommit",
            group: "Current repository",
            keywords: ["history", "log", "graph"],
            onSelect: () => navigate(`/repositories/${repo.fullName}/commits`),
          },
          {
            id: "repo-pull-requests",
            label: "View Pull Requests",
            description: "Open and merged pull requests",
            icon: "gitMerge",
            group: "Current repository",
            keywords: ["pr", "reviews"],
            onSelect: () => navigate(`/repositories/${repo.fullName}/pulls`),
          },
          {
            id: "repo-issues",
            label: "View Issues",
            description: "Issue tracker for this repository",
            icon: "issue",
            group: "Current repository",
            keywords: ["bugs", "tickets"],
            onSelect: () => navigate(`/repositories/${repo.fullName}/issues`),
          },
          {
            id: "repo-releases",
            label: "View Releases",
            description: "Release history and tags",
            icon: "rocket",
            group: "Current repository",
            keywords: ["versions", "tags"],
            onSelect: () => navigate(`/repositories/${repo.fullName}/releases`),
          },
          {
            id: "repo-new-issue",
            label: "Create Issue",
            description: "Start a new issue in this repository",
            icon: "plus",
            group: "Current repository",
            keywords: ["new", "create", "bug"],
            onSelect: () => startNewIssue(),
          },
          {
            id: "repo-copy-clone",
            label: "Copy Clone URL",
            description: "git clone URL for this repository",
            icon: "copy",
            group: "Current repository",
            keywords: ["clone", "copy", "url"],
            onSelect: () => void copyText(repo.url),
          },
          {
            id: "repo-open-github",
            label: "Open on GitHub",
            description: "Open this repository in the browser",
            icon: "external",
            group: "Current repository",
            keywords: ["browser", "web"],
            onSelect: () => openExternal(repo.url),
          },
        ] satisfies readonly CommandItem[])
      : []),
    ...(repositories.length > 0
      ? (repositories.slice(0, 10).map((repository) => ({
          id: `jump-${repository.fullName}`,
          label: repository.name,
          description: repository.fullName,
          icon: repository.isPrivate ? ("lock" as const) : ("globe" as const),
          keywords: [repository.fullName, repository.owner.login, repository.language ?? ""],
          onSelect: () => navigate(`/repositories/${repository.fullName}`),
        })) satisfies readonly CommandItem[])
      : []),
    {
      id: "sandbox-experiment",
      label: "Experiment in Sandbox",
      description: "Simulate merges, rebases, and conflicts safely",
      icon: "terminal",
      group: "Advanced",
      keywords: ["simulate", "merge", "rebase", "conflict"],
      onSelect: () => startSandbox(),
    },
  ];

  return items;
}
