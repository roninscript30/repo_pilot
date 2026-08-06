/** A lightweight tag pointing at a commit. */
export interface Tag {
  readonly name: string;
  readonly commitSha: string;
}
