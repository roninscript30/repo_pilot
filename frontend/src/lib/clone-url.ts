import type { Repository } from "@/domain/models/repository";

/** Provider-appropriate clone URL: HTTPS for public, SSH for private. */
export function cloneUrl(repository: Repository): string {
  if (repository.isPrivate) {
    return `git@github.com:${repository.fullName}.git`;
  }
  return `https://github.com/${repository.fullName}.git`;
}
