# Skill: Testing And Quality

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-06
Related: `../rules.md`

## Principles

- Test behavior, not implementation details.
- Add tests around domain logic, provider adapters, command boundaries, and risky UI states.
- Use automated checks to protect architecture and quality.
- Keep tests readable and maintainable.
- Prefer deterministic tests over broad, flaky integration tests.

## Quality Gates To Add As The Project Matures

- Type checking
- Linting
- Formatting
- Unit tests
- Integration tests
- Accessibility checks
- Security checks for secrets and dependency risks
- CI workflow validation

## Reference Sources

- Testing Library: https://testing-library.com/
- Playwright: https://playwright.dev/
- Vitest: https://vitest.dev/
- Rust testing: https://doc.rust-lang.org/book/ch11-00-testing.html
