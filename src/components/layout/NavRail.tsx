import { NavLink } from "react-router-dom";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Tooltip } from "@/components/ui/Tooltip";
import { useThemeStore } from "@/stores/theme-store";
import { AccountMenu } from "./AccountMenu";
import { NotificationCenter } from "./NotificationCenter";

const NAV_ITEMS: readonly { to: string; icon: IconName; label: string; end?: boolean }[] = [
  { to: "/dashboard", icon: "dashboard", label: "Dashboard", end: true },
  { to: "/repositories", icon: "repos", label: "Repositories" },
  { to: "/sandbox", icon: "box", label: "Git Sandbox" },
  { to: "/local", icon: "folder", label: "Local Repos" },
];

function RailButton({ to, icon, label, end }: { to: string; icon: IconName; label: string; end?: boolean }) {
  return (
    <Tooltip label={label} placement="right-start">
      <NavLink
        to={to}
        aria-label={label}
        {...(end !== undefined ? { end } : {})}
        className={({ isActive }) =>
          `flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
            isActive
              ? "bg-accent-500/15 text-accent-600 dark:bg-accent-500/20 dark:text-accent-500"
              : "text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-500 dark:hover:bg-surface-700 dark:hover:text-surface-200"
          }`
        }
      >
        <Icon name={icon} size={18} />
      </NavLink>
    </Tooltip>
  );
}

/** Primary icon navigation rail (Linear/Arc style). */
export function NavRail() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    <nav
      aria-label="Global navigation"
      className="flex w-12 shrink-0 flex-col items-center border-r border-surface-200 bg-surface-0 py-2 dark:border-surface-600"
    >
      <Tooltip label="GitOS — Home" placement="right-start">
        <NavLink
          to="/dashboard"
          aria-label="GitOS home"
          className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg"
        >
          <img src="/icon.svg" alt="GitOS" className="h-6 w-6" />
        </NavLink>
      </Tooltip>

      <div className="flex flex-1 flex-col items-center gap-1">
        {NAV_ITEMS.map((item) => (
          <RailButton key={item.to} {...item} />
        ))}
      </div>

      <div className="flex flex-col items-center gap-1 border-t border-surface-100 pt-2 dark:border-surface-700">
        <NotificationCenter />
        <Tooltip label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} placement="right-start">
          <button
            type="button"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:text-surface-500 dark:hover:bg-surface-700 dark:hover:text-surface-200"
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
          </button>
        </Tooltip>
        <AccountMenu />
      </div>
    </nav>
  );
}
