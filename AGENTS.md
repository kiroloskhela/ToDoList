# Task Management Board: project instructions

## Current scope and accepted requirements

- The user has authorized execution of the accepted plan. Implement and verify the complete application while preserving the requirements below.
- Use React with TypeScript and Vite, Node.js with Express, and PostgreSQL.
- The user's PostgreSQL instruction overrides the attached PDF's MongoDB requirement.
- Keep controller, service, repository, and database responsibilities separate. Keep frontend components, hooks/state, and API access separate.
- Persist tasks and configurable business values in PostgreSQL. Columns/statuses, priority labels and colors, display order, business defaults, validation limits, and motion settings must come from `GET /board-config`.
- Use foreign-key IDs in task requests. Do not maintain separate hardcoded status or priority enums in the frontend or backend. Seed initial business values through migrations.
- Application structure, protocols, accessibility behavior, and infrastructure settings remain code/environment concerns. Do not expose secrets through board configuration.
- Preserve the shared-board scope. Do not add authentication, multi-tenancy, or external services merely because a skill uses them in examples.

## Project skill catalog

Load the relevant skill when doing its work; do not load every skill for every change.

| Work | Skill |
| --- | --- |
| Visual hierarchy, typography, spacing, responsive board and forms | `.agents/skills/frontend-design/SKILL.md` |
| Loading, empty, error, pending, and optimistic UI states | `.agents/skills/react-ui-patterns/SKILL.md` |
| React rendering, subscriptions, and bundle review | `.agents/skills/vercel-react-best-practices/SKILL.md` |
| Accessibility and interface review | `.agents/skills/web-design-guidelines/SKILL.md` |
| Browser interaction, regression coverage, traces | `.agents/skills/playwright-e2e-builder/SKILL.md` |
| GSAP timelines, React lifecycle cleanup, optional Flip transitions | `.agents/skills/gsap-web/SKILL.md` |
| Reduced-motion behavior | `.agents/skills/accessible-animation/SKILL.md` |
| Animation property costs and profiling | `.agents/skills/60fps-animation/SKILL.md` |

Installation provenance, pinned external revisions, and entry-file hashes are in `.agents/skills-manifest.json`. Project motion decisions are in `docs/ui-skills-and-motion-plan.md`.

## Applying skills to this project

- User requirements take precedence over skill examples and defaults.
- Apply the Vite/React portions of React performance guidance. Keep the planned TanStack Query state layer; do not introduce Next.js, SWR, or Server Components.
- Keep cached task data visible after background request failures, with explicit stale-data feedback. A skill example that replaces usable data with an error screen does not override this requirement.
- Use the GSAP skills inside the React application. Their standalone HTML/CDN delivery examples apply only to a separately requested standalone demo.
- Verify GSAP APIs against the installed version and official GSAP documentation. Community statements about licensing history, rendering guarantees, or browser compatibility are not authoritative.
- Use `@gsap/react`'s `useGSAP` with scoped refs, cleanup, and context-safe delayed/event callbacks. Keep setup safe under React Strict Mode.
- Respect the live OS reduced-motion preference. It overrides database motion settings. Avoid blanket near-zero-duration CSS resets; essential controls and feedback must remain usable with motion disabled.
- dnd-kit owns the drag wrapper's transform. GSAP may animate a separate inner wrapper or a tested post-drag transition, never compete for the same transform during dragging.
- React owns task state and DOM membership. Never use animation code to manually reparent React-managed cards or delay API persistence until an animation finishes.
- Prefer transforms and opacity, batch layout measurements, and profile actual browser behavior. Do not claim a guaranteed frame rate or compositor-only rendering without measurements.
- Browser tests use the existing shared-board scope, isolated PostgreSQL fixtures, role/label selectors, and condition-based waits. Auth setup, large sharding matrices, and page-object hierarchies are added only if needed.
