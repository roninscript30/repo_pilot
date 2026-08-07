import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAuthStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useRepositories } from "@/features/repositories/hooks";
import { useOrganizations } from "@/hooks/use-account";

type Step = "welcome" | "intro" | "provider" | "auth" | "permissions" | "account" | "sync" | "ready";

const REQUIRED_SCOPES: readonly { readonly scope: string; readonly label: string }[] = [
  { scope: "repo", label: "Read repositories and worktrees" },
  { scope: "read:org", label: "Read organizations" },
];

const PROVIDERS: readonly { readonly id: string; readonly name: string; readonly description: string; readonly available: boolean; readonly icon: IconName }[] = [
  { id: "github", name: "GitHub", description: "Repositories, pull requests, issues, Actions", available: true, icon: "repo" },
  { id: "gitlab", name: "GitLab", description: "Coming in a future release", available: false, icon: "gitMerge" },
  { id: "gitea", name: "Gitea", description: "Coming in a future release", available: false, icon: "gitBranch" },
  { id: "forgejo", name: "Forgejo", description: "Coming in a future release", available: false, icon: "gitFork" },
];

const INTRO_FEATURES: readonly { readonly icon: IconName; readonly title: string; readonly description: string }[] = [
  { icon: "gitBranch", title: "Understand history visually", description: "Commit graphs, branch relationships, and diffs that explain themselves." },
  { icon: "shield", title: "Operate Git safely", description: "Every operation is explained before it runs. The sandbox keeps experiments isolated." },
  { icon: "users", title: "Collaborate everywhere", description: "Pull requests, issues, releases, and reviews in one engineering workspace." },
];

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div aria-hidden="true" className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            index === current ? "w-5 bg-accent-500" : index < current ? "w-1.5 bg-accent-300 dark:bg-accent-700" : "w-1.5 bg-surface-200 dark:bg-surface-600"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * First-run onboarding: welcome -> intro -> provider -> auth ->
 * permissions -> account -> sync -> ready. Users connect to the
 * platform, not a login form.
 */
export function Onboarding() {
  const [step, setStep] = useState<Step>("welcome");
  const [token, setToken] = useState("");
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);
  const account = useAuthStore((state) => state.account);
  const isPersistent = useAuthStore((state) => state.isPersistent);
  const credentialKind = useAuthStore((state) => state.credentialKind);
  const signInWithToken = useAuthStore((state) => state.signInWithToken);
  const clearError = useAuthStore((state) => state.clearError);
  const githubProvider = useAuthStore((state) => state.githubProvider);
  const complete = useOnboardingStore((state) => state.complete);
  const navigate = useNavigate();

  const repositories = useRepositories(step === "sync" && account !== null);
  const organizations = useOrganizations(step === "account" && account !== null);

  const isSigningIn = status === "signing-in";
  const currentStepIndex = ["welcome", "intro", "provider", "auth", "permissions", "account", "sync", "ready"].indexOf(step);

  // Advance from sync once repositories arrive.
  useEffect(() => {
    if (step === "sync" && repositories.isSuccess) {
      const timer = window.setTimeout(() => setStep("ready"), 600);
      return () => window.clearTimeout(timer);
    }
  }, [step, repositories.isSuccess]);

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    clearError();
    if (!token.trim()) return;
    try {
      await signInWithToken(githubProvider(), token.trim());
      setToken("");
      setStep("permissions");
    } catch {
      // Error state is rendered from the store.
    }
  }

  function finish() {
    complete();
    navigate("/dashboard", { replace: true });
  }

  const grantedScopes = new Set(account?.scopes ?? []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4 dark:bg-surface-0">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/icon.svg" alt="Repo Pilot" className="h-8 w-8" />
            <span className="text-sm font-bold text-surface-900 dark:text-surface-100">Repo Pilot</span>
          </div>
          <StepDots current={currentStepIndex} total={8} />
        </div>

        {step === "welcome" ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-surface-200 bg-surface-0 p-10 text-center shadow-card dark:border-surface-600 dark:bg-surface-50">
            <img src="/icon.svg" alt="" className="h-16 w-16" />
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Welcome to Repo Pilot</h1>
            <p className="max-w-sm text-sm text-surface-500">
              The repository operating platform. Understand, operate, and collaborate on
              software repositories from one engineering workspace.
            </p>
            <Button variant="primary" size="md" className="mt-2 min-w-40" onClick={() => setStep("intro")}>
              Get started
            </Button>
            <p className="text-2xs text-surface-400">Open source · Desktop-first · Keyboard-first</p>
          </div>
        ) : null}

        {step === "intro" ? (
          <div className="rounded-2xl border border-surface-200 bg-surface-0 p-8 shadow-card dark:border-surface-600 dark:bg-surface-50">
            <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">One workspace for every repository</h2>
            <div className="mt-5 space-y-3">
              {INTRO_FEATURES.map((feature) => (
                <div key={feature.title} className="flex items-start gap-3 rounded-lg border border-surface-100 bg-surface-50 p-3.5 dark:border-surface-700 dark:bg-surface-100/30">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-500">
                    <Icon name={feature.icon} size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">{feature.title}</p>
                    <p className="mt-0.5 text-xs text-surface-500">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => setStep("welcome")}>Back</Button>
              <Button variant="primary" onClick={() => setStep("provider")}>Continue</Button>
            </div>
          </div>
        ) : null}

        {step === "provider" ? (
          <div className="rounded-2xl border border-surface-200 bg-surface-0 p-8 shadow-card dark:border-surface-600 dark:bg-surface-50">
            <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">Connect a provider</h2>
            <p className="mt-1 text-sm text-surface-500">Where do your repositories live?</p>
            <div className="mt-5 space-y-2.5">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  disabled={!provider.available}
                  onClick={() => setStep("auth")}
                  className="flex w-full items-center gap-3 rounded-lg border border-surface-200 bg-surface-50 px-4 py-3 text-left transition-colors hover:border-accent-300 hover:bg-accent-50/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-700 dark:bg-surface-100/30 dark:hover:border-accent-700 dark:hover:bg-accent-500/10"
                >
                  <Icon name={provider.icon} size={20} className="text-surface-500 dark:text-surface-400" />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-surface-800 dark:text-surface-200">{provider.name}</span>
                    <span className="block text-xs text-surface-500">{provider.description}</span>
                  </span>
                  {provider.available ? <Icon name="chevronRight" size={15} className="text-surface-400" /> : <Badge>Soon</Badge>}
                </button>
              ))}
            </div>
            <div className="mt-6">
              <Button variant="ghost" onClick={() => setStep("intro")}>Back</Button>
            </div>
          </div>
        ) : null}

        {step === "auth" ? (
          <div className="rounded-2xl border border-surface-200 bg-surface-0 p-8 shadow-card dark:border-surface-600 dark:bg-surface-50">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-200">
                <Icon name="repo" size={18} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">Connect GitHub</h2>
                <p className="text-xs text-surface-500">Fine-grained personal access token</p>
              </div>
            </div>

            <form onSubmit={(event) => void handleSignIn(event)} className="mt-5 flex flex-col gap-4">
              <TextField
                label="Personal access token"
                type="password"
                placeholder="github_pat_..."
                autoComplete="off"
                autoFocus
                value={token}
                onChange={(event) => {
                  setToken(event.target.value);
                  clearError();
                }}
                {...(status === "error" ? { error: error ?? "Sign-in failed." } : {})}
                hint="Create a token at github.com/settings/tokens/fine-grained with repository read access."
              />

              <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
                isPersistent
                  ? "border-success-500/30 bg-green-50 text-success-700 dark:bg-success-500/10 dark:text-success-600"
                  : "border-warning-500/30 bg-amber-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-600"
              }`}>
                <Badge tone={isPersistent ? "success" : "warning"}>{isPersistent ? "Secure" : "Preview"}</Badge>
                <p>
                  {isPersistent
                    ? `Desktop runtime detected: credentials are encrypted in the OS keyring (${credentialKind}).`
                    : "Browser preview: the token is held in memory only and never persisted."}
                </p>
              </div>

              <Button type="submit" variant="primary" disabled={isSigningIn || token.trim().length === 0}>
                {isSigningIn ? <Spinner size="sm" label="Validating token…" /> : "Validate and connect"}
              </Button>
            </form>

            <div className="mt-4">
              <Button variant="ghost" onClick={() => setStep("provider")}>Back</Button>
            </div>
          </div>
        ) : null}

        {step === "permissions" && account ? (
          <div className="rounded-2xl border border-surface-200 bg-surface-0 p-8 shadow-card dark:border-surface-600 dark:bg-surface-50">
            <div className="flex items-center gap-3">
              <Avatar name={account.displayName} src={account.avatarUrl} size="lg" />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-surface-900 dark:text-surface-100">{account.displayName}</h2>
                <p className="truncate text-xs text-surface-500">@{account.login}</p>
              </div>
            </div>

            <h3 className="mt-6 text-sm font-semibold text-surface-800 dark:text-surface-200">Permission check</h3>
            <div className="mt-2.5 space-y-2">
              {REQUIRED_SCOPES.map(({ scope, label }) => {
                const granted = grantedScopes.has(scope);
                return (
                  <div key={scope} className={`flex items-center gap-2.5 rounded-md border px-3 py-2 text-xs ${
                    granted
                      ? "border-success-500/30 bg-green-50 text-success-700 dark:bg-success-500/10 dark:text-success-600"
                      : "border-warning-500/30 bg-amber-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-600"
                  }`}>
                    <Icon name={granted ? "checkCircle" : "alertCircle"} size={14} />
                    <span className="flex-1 font-medium">{label}</span>
                    <code className="font-mono text-2xs">{scope}</code>
                  </div>
                );
              })}
            </div>

            {grantedScopes.size > 0 ? (
              <div className="mt-4">
                <p className="text-2xs font-semibold tracking-wide text-surface-400 uppercase">Granted scopes</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {[...grantedScopes].map((scope) => (
                    <span key={scope} className="rounded-full bg-surface-100 px-2 py-0.5 font-mono text-2xs text-surface-600 dark:bg-surface-700 dark:text-surface-300">
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => setStep("provider")}>Back</Button>
              <Button variant="primary" onClick={() => setStep("account")}>Continue</Button>
            </div>
          </div>
        ) : null}

        {step === "account" && account ? (
          <div className="rounded-2xl border border-surface-200 bg-surface-0 p-8 shadow-card dark:border-surface-600 dark:bg-surface-50">
            <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">Your workspace</h2>
            <p className="mt-1 text-sm text-surface-500">
              Repo Pilot indexes repositories you can access — yours and your organization's.
            </p>

            <div className="mt-5">
              <p className="text-2xs font-semibold tracking-wide text-surface-400 uppercase">Organizations</p>
              {organizations.isLoading ? (
                <div className="mt-2"><Spinner size="sm" label="Loading organizations…" /></div>
              ) : organizations.data && organizations.data.length > 0 ? (
                <ul className="mt-2 grid grid-cols-2 gap-2">
                  {organizations.data.map((org) => (
                    <li key={org.login} className="flex items-center gap-2 rounded-md border border-surface-100 bg-surface-50 px-2.5 py-2 dark:border-surface-700 dark:bg-surface-100/30">
                      <Avatar name={org.login} src={org.avatarUrl} size="sm" />
                      <span className="truncate text-xs font-medium text-surface-700 dark:text-surface-300">{org.login}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-surface-500">No organization access with this token.</p>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => setStep("permissions")}>Back</Button>
              <Button variant="primary" onClick={() => setStep("sync")}>Sync repositories</Button>
            </div>
          </div>
        ) : null}

        {step === "sync" ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-surface-200 bg-surface-0 p-10 text-center shadow-card dark:border-surface-600 dark:bg-surface-50">
            <Icon name="refresh" size={28} className="animate-spin text-accent-500" />
            <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">Building your workspace</h2>
            <p className="max-w-sm text-sm text-surface-500">
              {repositories.isLoading
                ? "Fetching repositories from GitHub…"
                : repositories.data
                  ? `Found ${repositories.data.length} repositories. Preparing your workspace…`
                  : "Syncing…"}
            </p>
            <ProgressBar className="w-full max-w-xs" value={repositories.isSuccess ? 100 : 35} />
          </div>
        ) : null}

        {step === "ready" ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-surface-200 bg-surface-0 p-10 text-center shadow-card dark:border-surface-600 dark:bg-surface-50">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-100 text-success-600 dark:bg-success-500/15 dark:text-success-500">
              <Icon name="check" size={28} />
            </span>
            <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100">Your workspace is ready</h2>
            <p className="max-w-sm text-sm text-surface-500">
              Repositories are indexed. Open the dashboard to see your engineering overview,
              or jump straight to a repository.
            </p>
            <Button variant="primary" className="mt-2 min-w-44" onClick={finish}>
              Open dashboard
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
