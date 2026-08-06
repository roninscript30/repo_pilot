import { Icon } from "./Icon";

interface AvatarProps {
  readonly name: string;
  readonly src?: string | null;
  readonly size?: "xs" | "sm" | "md" | "lg" | "xl";
  readonly className?: string;
}

const SIZE_CLASSES = {
  xs: "h-5 w-5 text-2xs",
  sm: "h-6 w-6 text-2xs",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
  xl: "h-14 w-14 text-base",
} as const;

/** Avatar with graceful initials fallback. */
export function Avatar({ name, src, size = "md", className = "" }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover ${SIZE_CLASSES[size]} ${className}`}
      />
    );
  }

  return (
    <span
      aria-label={name}
      role="img"
      className={`inline-flex items-center justify-center rounded-full bg-accent-100 font-semibold text-accent-700 dark:bg-accent-100/20 dark:text-accent-300 ${SIZE_CLASSES[size]} ${className}`}
    >
      {initials || <Icon name="user" size={size === "sm" || size === "xs" ? 12 : 16} />}
    </span>
  );
}
