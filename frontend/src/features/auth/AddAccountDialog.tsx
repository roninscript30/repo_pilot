import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { TextField } from "@/components/ui/TextField";
import { GithubDeviceFlowView } from "./GithubDeviceFlowView";
import { useAuthStore } from "@/stores/auth-store";

interface AddAccountDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

type Mode = "choose" | "device" | "pat";

/**
 * Add another GitHub account: Device Flow (recommended) or a personal
 * access token. Used from Settings and the account menu.
 */
export function AddAccountDialog({ open, onClose }: AddAccountDialogProps) {
  const [mode, setMode] = useState<Mode>("choose");
  const [token, setToken] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signInWithToken = useAuthStore((state) => state.signInWithToken);
  const githubProvider = useAuthStore((state) => state.githubProvider);

  function reset() {
    setMode("choose");
    setToken("");
    setError(null);
    setSigningIn(false);
  }

  function close() {
    reset();
    onClose();
  }

  async function addWithToken(value: string) {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithToken(githubProvider(), value.trim());
      setToken("");
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed.");
      setSigningIn(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add a GitHub account"
      description="Connect another account to switch between them from the account menu."
    >
      <div className="flex flex-col gap-4 p-4">
        {mode === "choose" ? (
          <div className="flex flex-col gap-2">
            <Button variant="primary" onClick={() => setMode("device")}>
              <Icon name="gitBranch" size={15} />
              Continue with GitHub
            </Button>
            <Button variant="secondary" onClick={() => setMode("pat")}>
              <Icon name="lock" size={15} />
              Use a personal access token
            </Button>
          </div>
        ) : null}

        {mode === "device" ? (
          <GithubDeviceFlowView
            onSuccess={(accessToken) => void addWithToken(accessToken)}
            onCancel={() => setMode("choose")}
          />
        ) : null}

        {mode === "pat" ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (token.trim().length > 0) {
                void addWithToken(token);
              }
            }}
            className="flex flex-col gap-3"
          >
            <TextField
              label="Fine-grained personal access token"
              type="password"
              placeholder="github_pat_..."
              autoComplete="off"
              value={token}
              onChange={(event) => {
                setToken(event.target.value);
                setError(null);
              }}
              {...(error ? { error } : {})}
              hint="Create a token at github.com/settings/tokens/fine-grained."
            />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="sm" disabled={signingIn || token.trim().length === 0}>
                {signingIn ? <Spinner label="Adding…" size="sm" /> : "Add account"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setMode("choose")}>
                Back
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </Dialog>
  );
}
