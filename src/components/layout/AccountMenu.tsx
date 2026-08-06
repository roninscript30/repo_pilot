import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/ui/Avatar";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Icon } from "@/components/ui/Icon";
import { useAuthStore } from "@/stores/auth-store";
import { useOrganizations } from "@/hooks/use-account";

/** Avatar menu with account details, organizations, and sign-out. */
export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const account = useAuthStore((state) => state.account);
  const signOut = useAuthStore((state) => state.signOut);
  const credentialKind = useAuthStore((state) => state.credentialKind);
  const isPersistent = useAuthStore((state) => state.isPersistent);
  const organizations = useOrganizations(open && account !== null);
  const navigate = useNavigate();

  if (!account) return null;

  const requiredScopes = ["repo", "read:org"];
  const granted = new Set(account.scopes);
  const missingScopes = requiredScopes.filter((scope) => !granted.has(scope) && granted.size > 0);

  return (
    <DropdownMenu
      ariaLabel="Account menu"
      open={open}
      onOpenChange={setOpen}
      trigger={
        <span className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-surface-100 dark:hover:bg-surface-700">
          <Avatar name={account.displayName} src={account.avatarUrl} size="md" />
        </span>
      }
      minWidth={280}
    >
      <div className="px-3 py-2">
        <div className="flex items-center gap-2.5">
          <Avatar name={account.displayName} src={account.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-surface-900 dark:text-surface-100">
              {account.displayName}
            </p>
            <p className="truncate text-xs text-surface-500">@{account.login}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2 py-0.5 text-2xs font-medium text-surface-600 dark:bg-surface-700 dark:text-surface-300">
            <Icon name="shield" size={10} />
            {isPersistent ? `Keyring · ${credentialKind}` : "Session only"}
          </span>
          <span className="rounded-full bg-accent-50 px-2 py-0.5 text-2xs font-medium text-accent-700 dark:bg-accent-500/15 dark:text-accent-500">
            GitHub
          </span>
        </div>
        {missingScopes.length > 0 ? (
          <p className="mt-2 rounded-md border border-warning-500/30 bg-warning-50 px-2 py-1.5 text-2xs text-warning-700 dark:bg-warning-500/10 dark:text-warning-500">
            Missing scopes: {missingScopes.join(", ")}
          </p>
        ) : null}
        {organizations.data && organizations.data.length > 0 ? (
          <div className="mt-2.5">
            <p className="text-2xs font-semibold tracking-wide text-surface-400 uppercase">Organizations</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {organizations.data.slice(0, 8).map((org) => (
                <span key={org.login} className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-1.5 py-0.5 text-2xs text-surface-600 dark:bg-surface-700 dark:text-surface-300">
                  <Avatar name={org.login} src={org.avatarUrl} size="sm" />
                  {org.login}
                </span>
              ))}
              {organizations.data.length > 8 ? (
                <span className="text-2xs text-surface-400">+{organizations.data.length - 8} more</span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-surface-700 transition-colors hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-700"
      >
        <Icon name="dashboard" size={15} />
        My dashboard
      </button>
      <button
        type="button"
        onClick={() => void signOut(account.login)}
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-danger-600 transition-colors hover:bg-danger-50 dark:text-danger-500 dark:hover:bg-danger-500/10"
      >
        <Icon name="x" size={15} />
        Sign out
      </button>
    </DropdownMenu>
  );
}
