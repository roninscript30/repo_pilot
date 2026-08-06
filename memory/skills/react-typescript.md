# Skill: React And TypeScript

Status: Active
Owner: Project Maintainers
Last Updated: 2026-08-06
Related: `../rules.md`, `frontend-ui.md`

## Principles

- Use TypeScript for clear contracts and safer refactoring.
- Keep components focused on presentation when possible.
- Keep business logic outside deeply nested UI components.
- Prefer explicit data models over loosely shaped objects.
- Model async states intentionally: idle, loading, success, empty, error.
- Keep naming consistent across API, domain, state, and UI layers.

## React Guidance

- Prefer simple component composition.
- Avoid premature memoization.
- Introduce state management only when local state and props are no longer sufficient.
- Keep side effects understandable and isolated.
- Make accessibility part of component design.

## TypeScript Guidance

- Prefer precise types for domain entities.
- Avoid `any` unless there is a documented reason.
- Use discriminated unions for state machines and provider variants.
- Keep provider-specific types from leaking into provider-neutral domain code.

## Reference Sources

- React documentation: https://react.dev/
- TypeScript handbook: https://www.typescriptlang.org/docs/handbook/intro.html
- TypeScript ESLint: https://typescript-eslint.io/
