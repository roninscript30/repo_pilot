/** Remote name implied by a tracking branch (e.g. "origin/main" → "origin"). */
export function remoteNameFor(trackingBranch: string | null): string | null {
  if (!trackingBranch) return null;
  const [remote] = trackingBranch.split("/");
  return remote || null;
}
