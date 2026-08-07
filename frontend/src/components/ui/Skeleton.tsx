interface SkeletonProps {
  readonly className?: string;
}

/** Shimmer-free skeleton block used for loading placeholders. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-surface-200/70 ${className}`}
    />
  );
}

/** Skeleton for a line of text (widths as tailwind fraction classes). */
export function SkeletonText({ className = "w-2/3 h-3.5" }: SkeletonProps) {
  return <Skeleton className={className} />;
}

const SKELETON_WIDTHS = ["w-2/3", "w-1/2", "w-3/4", "w-1/3"] as const;

/** Vertical stack of skeleton lines, the standard list loading state. */
export function SkeletonList({ rows = 4, className = "" }: { rows?: number; className?: string }) {
  return (
    <div aria-label="Loading" className={`space-y-2.5 p-4 ${className}`}>
      {Array.from({ length: rows }, (_, index) => (
        <SkeletonText key={index} className={`h-4 ${SKELETON_WIDTHS[index % SKELETON_WIDTHS.length]}`} />
      ))}
    </div>
  );
}
