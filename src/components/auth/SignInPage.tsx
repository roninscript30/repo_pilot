import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useAuthStore } from "@/stores/auth-store";

export function SignInPage() {
  const [token, setToken] = useState("");
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);
  const isPersistent = useAuthStore((state) => state.isPersistent);
  const credentialKind = useAuthStore((state) => state.credentialKind);
  const signInWithToken = useAuthStore((state) => state.signInWithToken);
  const clearError = useAuthStore((state) => state.clearError);
  const githubProvider = useAuthStore((state) => state.githubProvider);

  const isSigningIn = status === "signing-in";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    clearError();
    if (!token.trim()) {
      return;
    }
    try {
      await signInWithToken(githubProvider(), token.trim());
      setToken("");
    } catch {
      // Error state is rendered from the store.
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <img src="/icon.svg" alt="GitOS" className="h-12 w-12" />
          <h1 className="text-xl font-bold text-surface-900">GitOS</h1>
          <p className="text-sm text-surface-500">
            The repository operating platform
          </p>
        </div>

        <Card>
          <CardHeader title="Sign in with GitHub" />
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
            <TextField
              label="Fine-grained personal access token"
              type="password"
              placeholder="github_pat_..."
              autoComplete="off"
              value={token}
              onChange={(event) => {
                setToken(event.target.value);
                clearError();
              }}
              {...(status === "error" ? { error: error ?? "Sign-in failed." } : {})}
              hint="Create a token at github.com/settings/tokens/fine-grained with repository read permissions."
            />

            {!isPersistent ? (
              <div className="flex items-start gap-2 rounded-md border border-warning-500/30 bg-amber-50 px-3 py-2 text-xs text-warning-600">
                <Badge tone="warning">Preview</Badge>
                <p>
                  Running in browser preview: the token is held in memory only and is never
                  persisted. Everything clears when this tab closes (desktop mode uses the OS
                  keyring).
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-md border border-success-500/30 bg-green-50 px-3 py-2 text-xs text-success-600">
                <Badge tone="success">Secure</Badge>
                <p>
                  Desktop runtime detected: the token will be stored in the OS keyring
                  ({credentialKind}) and never written to disk in plaintext.
                </p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={isSigningIn || token.trim().length === 0}
            >
              {isSigningIn ? <Spinner size="sm" label="Validating token…" /> : "Sign in"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
