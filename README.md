# Repo Pilot

Repo Pilot is an open-source, desktop-first Repository Operating Platform for modern software engineering teams.

It is not intended to be another Git client or GitHub Desktop replacement. Git is one part of a broader platform for repository management, collaboration workflows, engineering operations, repository intelligence, and developer productivity.

## Layout

- `frontend/` - React + TypeScript app (Vite, Tailwind, TanStack Query, Zustand); its own npm workspace
- `src-tauri/` - Tauri v2 desktop shell (Rust, gitoxide Git engine)
- `e2e/` - Playwright end-to-end tests (browser preview)
- `memory/` - long-term project knowledge base and AI memory system
- `package.json` - root npm-workspaces orchestrator (`npm run dev/build/test` at the repo root)

## Knowledge Base

This repository uses `memory/` as its long-term project knowledge base and AI memory system.

Start here:

- `memory/index.md` - central knowledge-base navigation
- `AGENTS.md` - mandatory rules for AI contributors
- `memory/rules.md` - engineering rules and documentation responsibilities
- `memory/project-memory/active-context.md` - current project context

Every meaningful contribution should keep source code and project knowledge synchronized.
