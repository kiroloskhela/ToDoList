# UI skills and GSAP motion plan

This document extends the accepted architecture plan. It records skills and implementation requirements; it does not indicate that the application or database has been built.

## Skills added

| Skill | Source | Project use |
| --- | --- | --- |
| `frontend-design` | Existing local skill | Intentional task-board hierarchy, responsive layouts, card density, typography, forms, and dialogs |
| `react-ui-patterns` | Existing local skill | Initial/background loading, empty columns, form errors, pending mutations, and recoverable failures |
| `vercel-react-best-practices` | Existing local skill | Client-side React rendering, derived state, event handlers, subscriptions, and dependency cost |
| `web-design-guidelines` | Existing local skill | Keyboard operation, focus, labels, contrast, target sizes, and responsive interface review |
| `playwright-e2e-builder` | Existing local skill | Browser checks for CRUD, dragging, responsive behavior, reduced motion, and failure recovery |
| `gsap-web` | Community: `iart-ai/web-animation-skills` | Timelines and scoped motion; Flip only when needed and verified |
| `accessible-animation` | Same community repository | Normal/reduced-motion paths and live preference changes |
| `60fps-animation` | Same community repository | Animation property costs, batched reads/writes, cleanup, and browser profiling |

The community skills are pinned to commit `b6dba3eb759726845a44163ff0bad70dd9e7fbb6`. Their MIT license and referenced repository helper scripts are bundled. Helper scripts have not been executed. Local skill copies retain their bundled resources. Full provenance is recorded in `.agents/skills-manifest.json`.

The curated OpenAI skill catalog was searched; it did not contain a GSAP-specific skill. The selected UI skills already existed locally and were copied into this project's `.agents/skills` directory.

## GSAP dependencies: planned, not installed

- `gsap@3.15.0`: animation engine. Import only the features used by the board.
- `@gsap/react@2.1.2`: scoped `useGSAP`, context cleanup, and context-safe event callbacks.
- Keep `@dnd-kit/core` for drag interaction. GSAP supplies visual transitions, not drag persistence.

Versions and peer requirements were checked against the npm registry during preparation. Commit an application lockfile when implementation begins. There is no application `package.json` or installed npm dependency tree yet.

## PostgreSQL configuration ownership

The earlier fixed status/priority enums and hardcoded validation limits are superseded by the user's database-driven requirement.

- `task_statuses`: ID, label, display order, and color.
- `task_priorities`: ID, label, display order, and color.
- `board_settings`: default status/priority references, title/description limits, and a validated motion configuration.
- `tasks`: references status and priority IDs through foreign keys.
- `GET /board-config`: returns the public business configuration used by both task forms and board rendering.

The proposed motion configuration contains `enabled`, `durationMs`, `staggerMs`, and `easing`. Initial values live in database seed migrations. React and Express do not duplicate those business defaults.

Validate duration and stagger as finite, nonnegative numbers within an implementation safety ceiling. Validate easing against supported GSAP easing names. Safety ceilings and supported API syntax are structural code rules, not user-editable business values. Never accept executable JavaScript or selectors from configuration.

The OS `prefers-reduced-motion` setting overrides configuration. If configuration is unavailable at first load, show a configuration error with Retry and keep configuration-dependent writes disabled. If a refresh fails, preserve the last successful configuration and task data with stale-state feedback. Do not fabricate local columns, priorities, or defaults.

## Motion behavior

| Interaction | Planned behavior | Reduced-motion behavior |
| --- | --- | --- |
| Initial board display | Short, bounded column/card entrance using configured duration and stagger; cap total sequence length structurally | Immediate visibility or a brief opacity transition |
| Create success | Introduce the persisted card and highlight it briefly | Immediate insertion with perceivable success feedback |
| Form dialog | Short opacity/position transition after native dialog state changes | Immediate visibility or opacity-only transition; preserve focus |
| Column hover during drag | Highlight the droppable target without changing its measured geometry | Same visible target indication |
| Cross-column drop | dnd-kit performs the drag; GSAP may settle a separate wrapper after state commits | Immediate placement with an accessible movement announcement |
| Failed optimistic move | Restore the affected task through React state, then use a bounded visual cue | Immediate restoration and explicit error feedback |
| Confirmed deletion | Remove the task only after persistence succeeds; optional exit treatment must not delay the write | Immediate removal and correct focus restoration |

Task status, success, and failure are communicated through text and accessible announcements as well as visual feedback. No effect may be the only indication that a write succeeded or failed.

The board does not need scroll pinning, parallax, smooth-scroll replacement, SplitText, or continuous decorative motion. Adding the GSAP skill does not require importing every plugin.

## Planned files and PR changes

These paths describe future implementation files.

**PR 1: contracts and setup**

- `packages/contracts/src/board-config-contracts.ts`: board configuration response and motion settings validation.
- `apps/web/package.json`: add GSAP and the React adapter.
- `apps/web/src/api/board-config-api.ts`: fetch and validate configuration.
- `apps/web/src/tasks/use-board-config.ts`: cache configuration independently from tasks.

**PR 2: PostgreSQL**

- Add status, priority, and settings schema plus initial seed migrations.
- Replace fixed task status/priority checks with foreign keys.
- Use text fields and database enforcement that consults configured validation limits, rather than a fixed title length declaration.
- Define how settings changes interact with existing tasks; reject a limit reduction that would make existing data invalid unless a separate migration resolves that data first.
- Implement settings/status/priority repositories and public configuration serialization.

**PR 4: board and CRUD UI**

- `apps/web/src/motion/gsap-registration.ts`: register the React adapter once; register Flip only if used.
- `apps/web/src/motion/use-board-motion.ts`: scoped initial board entrance.
- `apps/web/src/motion/use-dialog-motion.ts`: dialog presentation without interfering with native focus management.
- `apps/web/src/motion/use-task-feedback-motion.ts`: create/save/failure visual feedback.
- `apps/web/src/components/TaskBoardPage.tsx`: render columns from configuration, not a static array.
- `apps/web/src/components/TaskFormDialog.tsx`: populate status/priority options and limits from configuration.
- `apps/web/src/components/TaskCard.tsx`: separate drag and presentation wrappers.

**PR 5: dragging**

- Resolve destination IDs from registered column metadata.
- Preserve per-task locks, conditional writes, task-specific rollback, and deferred reconciliation.
- Keep GSAP transforms isolated from dnd-kit's active drag transforms.
- Evaluate Flip only if post-commit cross-column movement needs it. React remains responsible for DOM membership; do not manually append cards to another column.

**PR 6: verification**

- `apps/web/src/motion/motion-preference.test.tsx`: preference changes, disabled motion, and cleanup.
- `apps/web/src/tasks/use-board-config.test.tsx`: configuration loading, cache retention, validation, and failures.
- `apps/web/e2e/task-board-motion.spec.ts`: actual motion, Strict Mode lifecycle behavior, dragging, keyboard interaction, and reduced-motion checks.
- Add integration coverage proving new database labels/order/priorities appear without frontend code changes.

## Acceptance checks

1. Columns, priority options, business limits, and motion values come from PostgreSQL configuration.
2. A changed seeded label/order is reflected by the application without a code change.
3. React Strict Mode does not duplicate timelines, handlers, or media-query listeners.
4. Unmount and dependency changes revert component-scoped animations and inline styles.
5. Switching reduced motion on during use stops spatial motion and leaves controls usable.
6. GSAP never writes the transform controlled by dnd-kit during an active drag.
7. Persistence starts independently of animation completion; API errors preserve the previously specified rollback behavior.
8. Rapid changes, interrupted animation, and failed mutations do not leave hidden cards or unusable dialogs.
9. Keyboard and touch interaction work with motion enabled and disabled.
10. Browser profiling checks frame timing and layout/paint work on a populated board; performance is reported from measurements rather than asserted as a guaranteed 60 fps.

## Sources

- [Community GSAP skill and related motion skills](https://github.com/iart-ai/web-animation-skills/tree/b6dba3eb759726845a44163ff0bad70dd9e7fbb6/skills)
- [Official GSAP React integration](https://gsap.com/resources/React/)
- [Official GSAP matchMedia documentation](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/)

Project requirements and official version-specific documentation take precedence over community examples that assume standalone HTML, blanket CSS resets, or guaranteed compositor behavior.
