# Known Constraints

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-06

## Current Constraints

- Desktop builds require Tauri system dependencies: libwebkit2gtk-4.1-dev, libayatana-appindicator3-dev, librsvg2-dev, patchelf, libssl-dev, libxdo-dev (installed on the development machine; CI installs them per workflow).
- The local Git engine (gitoxide) is authored but full compilation depends on the Tauri shell build.
- Browser preview mode (Vite dev server) has no OS keyring access; credentials are in-memory only and sessions are not persisted.
- Fine-grained PAT flow is implemented first; OAuth device flow is deferred until the auth session model stabilizes.
- Plugin runtime model is not yet designed.
- Release pipeline and desktop packaging are not yet set up.
- Git provider token scopes must be validated before an account session is stored.

## Environment Notes

- Development machine: Ubuntu-based (resolute), Node 22.22.1, Rust 1.97.1, Docker 29.1.3.
- The system has non-essential third-party apt repositories (Spotify, etc.) with signature warnings; they do not affect GitOS build dependencies.
