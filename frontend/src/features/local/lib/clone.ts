/**
 * Derive a directory name from a clone URL.
 * `https://github.com/octocat/hello-world.git` → `hello-world`.
 */
export function repoNameFromUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  const segment = trimmed.split("/").filter(Boolean).pop() ?? "repository";
  return segment.replace(/\.git$/i, "");
}

/**
 * Derive the GitHub full name (`owner/repo`) from a clone URL, or null when
 * the URL is not a GitHub HTTPS/SSH URL.
 */
export function repoFullNameFromUrl(url: string): string | null {
  const match = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) return null;
  return `${match[1]}/${match[2]}`;
}
