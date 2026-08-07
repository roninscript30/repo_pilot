import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import {
  DEFAULT_GITHUB_CLIENT_ID,
  GitHubDeviceFlowClient,
  githubClientId,
  type DeviceFlowStart,
} from "@/providers/github/device-flow";
import { openExternal } from "@/services/open-external";

interface GithubDeviceFlowViewProps {
  readonly onSuccess: (accessToken: string) => void;
  readonly onCancel: () => void;
}

type FlowState = "requesting" | "waiting" | "error";

/**
 * GitHub OAuth Device Flow.
 *
 * Requests a device code, shows the user code + verification URI, opens
 * the browser (with a copy affordance as fallback), and polls until the
 * user authorizes. The access token is handed to `onSuccess`; the caller
 * is responsible for persisting it via the auth store.
 */
export function GithubDeviceFlowView({ onSuccess, onCancel }: GithubDeviceFlowViewProps) {
  const [state, setState] = useState<FlowState>("requesting");
  const [flow, setFlow] = useState<DeviceFlowStart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState(false);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const client = useRef(new GitHubDeviceFlowClient()).current;
  const isDemoClient = githubClientId() === DEFAULT_GITHUB_CLIENT_ID;

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];

    function schedule(deviceCode: string, delayMs: number) {
      timers.push(
        window.setTimeout(() => {
          void pollOnce(deviceCode, delayMs);
        }, delayMs),
      );
    }

    async function pollOnce(deviceCode: string, delayMs: number) {
      if (cancelled) {
        return;
      }
      try {
        const result = await client.pollOnce(deviceCode);
        if (cancelled) {
          return;
        }
        if (result.state === "success") {
          onSuccessRef.current(result.accessToken);
          return;
        }
        if (result.state === "authorization_pending") {
          schedule(deviceCode, delayMs);
          return;
        }
        if (result.state === "slow_down") {
          schedule(deviceCode, result.retryInMs);
          return;
        }
        setState("error");
        setError(
          result.state === "expired"
            ? "This sign-in code expired. Start over."
            : "Sign-in was denied in the browser.",
        );
      } catch (cause) {
        if (!cancelled) {
          setState("error");
          setError(
            cause instanceof Error ? cause.message : "Sign-in could not contact GitHub.",
          );
        }
      }
    }

    async function start() {
      try {
        const started = await client.start();
        if (cancelled) {
          return;
        }
        setFlow(started);
        setState("waiting");
        setOpenError(null);
        try {
          await openExternal(started.verificationUri);
        } catch (cause) {
          setOpenError(cause instanceof Error ? cause.message : "Could not open the browser.");
        }
        schedule(started.deviceCode, started.interval * 1000);
      } catch (cause) {
        if (!cancelled) {
          setState("error");
          setError(cause instanceof Error ? cause.message : "Could not start sign-in.");
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [client, attempt]);

  async function copyCode() {
    if (!flow) {
      return;
    }
    try {
      await navigator.clipboard.writeText(flow.userCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable; the code is selectable text.
    }
  }

  async function reopenBrowser() {
    if (!flow) {
      return;
    }
    try {
      await openExternal(flow.verificationUri);
      setOpenError(null);
    } catch (cause) {
      setOpenError(cause instanceof Error ? cause.message : "Could not open the browser.");
    }
  }

  return (
    <Card>
      <CardHeader title="Continue with GitHub" />
      <div className="flex flex-col gap-4 p-4">
        {isDemoClient ? (
          <p className="rounded-md border border-warning-500/30 bg-warning-50 px-2.5 py-2 text-2xs text-warning-700 dark:bg-warning-500/10 dark:text-warning-500">
            This build uses the demo client id. Set <code>VITE_GITHUB_CLIENT_ID</code> to a
            registered GitHub OAuth App id, or use a personal access token below.
          </p>
        ) : null}

        {state === "requesting" ? (
          <Spinner label="Starting GitHub sign-in…" size="sm" />
        ) : null}

        {state === "waiting" && flow ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800/40">
              <Icon name="shield" className="mt-0.5 text-accent-600" size={18} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-surface-800 dark:text-surface-200">
                  Enter this code at <span className="text-accent-600">{flow.verificationUri}</span>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="rounded-md border border-surface-300 bg-surface-100 px-2.5 py-1 font-mono text-base tracking-[0.25em] text-surface-900 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-100">
                    {flow.userCode}
                  </code>
                  <Button variant="secondary" size="sm" onClick={() => void copyCode()}>
                    <Icon name="copy" size={13} />
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => void reopenBrowser()}>
                    <Icon name="external" size={13} />
                    Open browser
                  </Button>
                </div>
                {openError ? (
                  <p className="mt-2 text-2xs text-warning-600 dark:text-warning-500">
                    {openError} You can open the link above manually.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-surface-500">
              <Spinner label="Waiting for you to authorize…" size="sm" />
            </div>
          </div>
        ) : null}

        {state === "error" ? (
          <div className="flex flex-col gap-3">
            <p className="rounded-md border border-danger-500/30 bg-danger-50 px-2.5 py-2 text-sm text-danger-700 dark:bg-danger-500/10 dark:text-danger-500">
              {error ?? "GitHub sign-in failed."}
            </p>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={() => setAttempt((value) => value + 1)}>
                Try again
              </Button>
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {state !== "error" ? (
          <Button variant="ghost" size="sm" className="self-start" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
