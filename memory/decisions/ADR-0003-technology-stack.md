# ADR-0003: Technology Stack

Status: Accepted
Date: 2026-08-06

## Context

Repo Pilot (product name: GitOS) is at project initialization. The application stack has not been selected. The product specification requires a desktop-first Repository Operating Platform with a React frontend and a Rust backend.

## Decision

Use Tauri v2 as the desktop shell, Vite + React 18 + TypeScript (strict mode) as the frontend, and Rust as the backend.

Frontend libraries:

- Tailwind CSS for design tokens and utility styling
- TanStack Query for server-state caching and synchronization
- Zustand for local client state
- React Router for navigation
- Vitest for unit tests, Playwright for end-to-end tests

## Rationale

- Tauri v2 provides a small, Rust-powered desktop shell with OS keyring access and local Git integration potential.
- React + TypeScript (strict) satisfies the "strong typing" engineering rule and the project's React skill knowledge.
- TanStack Query keeps provider server state cacheable, stale-while-revalidate, and testable.
- Zustand is lightweight and keeps local UI state separate from server state.
- Tailwind provides a consistent, accessible design token system.
- Vite provides fast iteration and a browser-preview mode that works before native desktop dependencies are installed, unblocking UI development and CI.

## Alternatives Considered

- Electron: larger bundle, Node runtime, heavier memory; the Rust backend requirement makes Tauri a better fit.
- Vue / Svelte: viable, but the project skills and specification reference React.
- Web-only dashboard: rejected because desktop-first and local repository workflows are core to ADR-0002.

## Consequences

- The project gains a first-class browser-preview mode (Vite dev server) for UI development and CI.
- Rust and Tauri native dependencies are required for desktop builds; CI must install them.
- Frontend code must not depend on native capabilities directly; capability seams (CredentialStore, GitRuntime) provide web fallbacks.
- Dependency versions must be pinned in package.json and Cargo.toml for reproducibility.

## Follow-ups

- Pin dependency versions during scaffolding.
- Add a desktop smoke test once Tauri system dependencies are available.
