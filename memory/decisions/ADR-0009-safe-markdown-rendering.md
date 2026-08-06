# ADR-0009: Safe Markdown Rendering for Remote Content

Status: Accepted
Date: 2026-08-06

## Context

The workspace renders untrusted, remote-authored content: repository READMEs,
release notes, and issue/PR bodies. Markdown commonly contains raw HTML, and
injecting it into the DOM is an XSS vector for an app that navigates arbitrary
repositories. Fenced code blocks should get syntax highlighting. The existing
stack (React 18, Tailwind, Vitest) should drive the choice of dependencies.

## Decision

- Render markdown with `marked` and highlight fenced code with `highlight.js`
  in a single `MarkdownView` component (`src/components/markdown/MarkdownView.tsx`).
- Sanitize by escaping raw HTML (outside fenced code) before parsing: the HTML
  is shown literally instead of being executed. Fenced code content is passed
  to highlight.js as text.
- Restrict link/image `href`/`src` to `http`, `https`, and `mailto` protocols.
- Custom renderer behavior is installed via `marked.use({ renderer })`
  (module-level): `MarkedOptions.renderer` requires a full `_Renderer`
  instance, while a `RendererObject` is only accepted through `marked.use`.
- Style rendering with `.markdown-body` rules in `index.css` and import the
  `github-dark` highlight.js theme.

## Rationale

Escape-based sanitization keeps content faithful (text shows as-is rather than
being stripped like DOMPurify) while eliminating script execution. Two small,
well-maintained dependencies cover parsing and highlighting. Tailwind classes
for dynamic statuses remain static maps to satisfy the no-dynamic-class rule.

## Alternatives Considered

- DOMPurify to strip unsafe HTML: removes content the author wrote and adds a
  third dependency.
- `react-markdown` (remark/rehype): heavier AST pipeline, larger dependency
  tree for the same output.
- `marked` without sanitization: rejected, direct XSS from remote READMEs.
- `github-markdown-css`: rejected, conflicts with the Tailwind design system.

## Consequences

- Embedded HTML in markdown is displayed as literal text, not rendered.
- Sanitization happens before highlighting, so code blocks keep their raw
  content verbatim.
- Any future interactive markdown (task lists, collapsible sections) needs a
  deliberate, security-reviewed expansion.

## Follow-ups

- Revisit if GFM features (tables are supported today; task lists, strikethrough)
  require renderer extensions.
