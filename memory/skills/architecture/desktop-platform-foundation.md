# Skill: Desktop Platform Foundation

## Purpose

Guide future selection and design of the desktop application foundation for a modern repository operating workspace.

## Use When

- Choosing a desktop framework or runtime.
- Designing navigation, workspace layout, local state, persistence, or background synchronization.
- Creating the first application source structure.
- Reviewing architectural impact of desktop platform decisions.

## Workflow

1. Clarify target platforms and distribution goals.
2. Evaluate desktop framework choices against maintainability, developer experience, performance, security, and ecosystem maturity.
3. Keep UI, domain, provider integration, and persistence concerns separated.
4. Design authentication and token storage with security as a first-class requirement.
5. Decide how background fetching, caching, offline reads, and long-running repository operations will be handled.
6. Record framework and runtime choices as ADRs before implementation hardens around them.

## Foundation Concerns

- Application shell and navigation.
- Secure credential storage.
- Provider authentication flow.
- Local cache and persistence.
- Background synchronization.
- Error handling and user feedback.
- Cross-platform packaging.
- Testability of UI and provider workflows.

## Quality Bar

- The desktop architecture supports a cohesive engineering workspace.
- Security and maintainability are considered before convenience.
- Foundation decisions are documented with rationale.

## Related

- [Platform Architecture Direction](../../architecture/platform-direction.md)
- [Project Philosophy](../../project/philosophy.md)
- [Test Strategy Foundation](../engineering/test-strategy-foundation.md)
