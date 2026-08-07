import type { CloneInput, ResetMode } from "@/domain/ports/git-runtime";

/**
 * Typed payload builders for `GitRuntime.run()`.
 *
 * Each builder returns a plain object shaped like the Rust `git_run_operation`
 * payload contract. Optional keys are omitted (never `undefined`) to satisfy
 * `exactOptionalPropertyTypes` and the backend's camelCase argument mapping.
 */

export const stagePayload = (paths: readonly string[]): Record<string, unknown> => ({
  paths: [...paths],
});

export const unstagePayload = stagePayload;

export const restorePayload = (files: readonly string[]): Record<string, unknown> => ({
  files: [...files],
});

export interface CommitOptions {
  readonly amend?: boolean;
  readonly empty?: boolean;
  readonly signed?: boolean;
}

export function commitPayload(message: string, options: CommitOptions = {}): Record<string, unknown> {
  const payload: Record<string, unknown> = { message };
  if (options.amend) payload.amend = true;
  if (options.empty) payload.empty = true;
  if (options.signed) payload.signed = true;
  return payload;
}

export function createBranchPayload(
  name: string,
  options: { readonly startPoint?: string } = {},
): Record<string, unknown> {
  const payload: Record<string, unknown> = { name };
  if (options.startPoint) payload.startPoint = options.startPoint;
  return payload;
}

export function deleteBranchPayload(branch: string, force = false): Record<string, unknown> {
  const payload: Record<string, unknown> = { branch };
  if (force) payload.force = true;
  return payload;
}

export function renameBranchPayload(oldName: string, newName: string): Record<string, unknown> {
  return { oldName, newName };
}

export function checkoutPayload(
  branch: string,
  options: { readonly create?: boolean; readonly startPoint?: string } = {},
): Record<string, unknown> {
  const payload: Record<string, unknown> = { branch };
  if (options.create) payload.create = true;
  if (options.startPoint) payload.startPoint = options.startPoint;
  return payload;
}

export function resetPayload(mode: ResetMode, target?: string): Record<string, unknown> {
  const payload: Record<string, unknown> = { mode };
  if (target) payload.target = target;
  return payload;
}

export function createTagPayload(
  tag: string,
  options: { readonly message?: string; readonly target?: string } = {},
): Record<string, unknown> {
  const payload: Record<string, unknown> = { tag };
  if (options.message) payload.message = options.message;
  if (options.target) payload.target = options.target;
  return payload;
}

export function deleteTagPayload(tag: string): Record<string, unknown> {
  return { tag };
}

export type StashAction = "push" | "pop" | "list" | "drop";

export function stashPayload(
  action: StashAction,
  options: { readonly message?: string; readonly stash?: string } = {},
): Record<string, unknown> {
  const payload: Record<string, unknown> = { action };
  if (options.message) payload.message = options.message;
  if (options.stash) payload.stash = options.stash;
  return payload;
}

export function cherryPickPayload(commit: string): Record<string, unknown> {
  return { commit };
}

export function revertPayload(commit: string): Record<string, unknown> {
  return { commit };
}

export function rebasePayload(target: string): Record<string, unknown> {
  return { target };
}

export function mergePayload(branch: string): Record<string, unknown> {
  return { branch };
}

export function squashMergePayload(branch: string): Record<string, unknown> {
  return { branch };
}

export function compareBranchesPayload(branch: string): Record<string, unknown> {
  return { branch };
}

export interface NetworkOptions {
  readonly remote?: string;
  readonly branch?: string;
  readonly setUpstream?: boolean;
  readonly rebase?: boolean;
  readonly accountLogin?: string;
}

export function fetchPayload(
  remote?: string,
  options: Pick<NetworkOptions, "accountLogin"> = {},
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (remote) payload.remote = remote;
  if (options.accountLogin) payload.accountLogin = options.accountLogin;
  return payload;
}

export function pullPayload(
  remote?: string,
  options: Pick<NetworkOptions, "branch" | "rebase" | "accountLogin"> = {},
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (remote) payload.remote = remote;
  if (options.branch) payload.branch = options.branch;
  if (options.rebase) payload.rebase = true;
  if (options.accountLogin) payload.accountLogin = options.accountLogin;
  return payload;
}

export function pushPayload(
  remote?: string,
  options: Pick<NetworkOptions, "branch" | "setUpstream" | "accountLogin"> = {},
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (remote) payload.remote = remote;
  if (options.branch) payload.branch = options.branch;
  if (options.setUpstream) payload.setUpstream = true;
  if (options.accountLogin) payload.accountLogin = options.accountLogin;
  return payload;
}

export interface ClonePayloadOptions {
  readonly depth?: number;
  readonly branch?: string;
  readonly accountLogin?: string;
}

/** Build the `CloneInput` for `GitRuntime.cloneRepository`. */
export function clonePayload(
  url: string,
  targetDir: string,
  operationId: string,
  options: ClonePayloadOptions = {},
): CloneInput {
  return {
    url,
    targetDir,
    operationId,
    ...(options.depth !== undefined ? { depth: options.depth } : {}),
    ...(options.branch !== undefined ? { branch: options.branch } : {}),
    ...(options.accountLogin !== undefined ? { accountLogin: options.accountLogin } : {}),
  };
}
