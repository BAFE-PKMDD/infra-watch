<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## INFRA Watch interface rules

For UI, dashboard, chart, table, and user-facing copy changes, follow `docs/06-ui-ux-design.md` as the canonical design contract.

Apply the Anti-Slop constraints during implementation and review:

- use precise operational language instead of generic dashboard or AI marketing copy
- preserve data semantics and show explicit unavailable, unknown, stale, and cannot-be-assessed states
- do not use ornamental gradients, generic sparkle or magic-wand AI imagery, excessive rounded cards, or tiny meaningful text
- provide approximately 44 by 44 pixel interactive targets, visible keyboard focus, WCAG AA contrast, and responsive table affordances
- keep ANIA visually supporting; generated analysis must retain its verification notice and authorized-data scope
- verify dashboard changes with focused tests, TypeScript, ESLint, `git diff --check`, and browser review when a runtime is available
