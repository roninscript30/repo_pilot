/** Extract the repository full name from a pathname, or "" when none. */
export function repositoryNameFromPath(pathname: string): string {
  const parts = pathname.split("/");
  if (parts[1] === "repositories" && parts[2]) {
    try {
      return decodeURIComponent(parts[2]);
    } catch {
      return parts[2];
    }
  }
  return "";
}

/** Whether the pathname points into a repository workspace. */
export function isRepositoryPath(pathname: string): boolean {
  return pathname.startsWith("/repositories/");
}
