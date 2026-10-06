# Architecture and implementation blueprint

## Pre-flight audit

| Area | Required knowledge | Implementation |
| --- | --- | --- |
| Persistence | PostgreSQL FK/check constraints, row locks, MVCC, conditional writes, migrations, Unicode length | `apps/api/schema/schema.sql`, repository SQL |
| HTTP | REST PUT semantics, strong ETags, `If-Match`, 412/428, request limits | controllers and HTTP middleware |
| State | Query cache cancellation, affected-task rollback, overlapping writes, stale snapshots | TanStack Query hooks |
| Interaction | Pointer/keyboard sensors, droppable geometry, focus restoration, native modal lifecycle | dnd-kit, dialogs |
| Motion | React Strict Mode cleanup, scoped GSAP contexts, live media-query preference | `use-motion.ts` |
| Testing | Boundary fixtures, real SQL locking, MSW, Playwright, coverage gates | test projects and browser suite |

React, Vite, and TypeScript implement the client; Express handles HTTP; `pg` provides pooled, parameterized database access; `node-pg-migrate` tracks schema changes; Zod validates HTTP/config boundaries and shared form rules. TanStack Query owns server state, dnd-kit owns dragging, Radix Select owns dropdown keyboard/focus behavior, GSAP and `@gsap/react` own bounded presentation animation, and Lucide supplies icons. Vitest, Testing Library, MSW, Supertest, and Playwright verify each boundary. All dependencies are in the workspace manifests and lockfile. No third-party API account or external mock service is required.

Node 24, npm, PostgreSQL CLI tools, and Chromium are the local prerequisites. `.env.example` lists connection URLs, host/port, pool size, connection timeout, statement timeout, and lock timeout. `scripts/local-db.mjs` creates isolated runtime/migration/test credentials. Application business seeds live only in migrations. Infrastructure defaults remain code/environment concerns.

## Data model

| Relation | Fields and rules |
| --- | --- |
| `task_statuses` | UUID PK; nonempty text label; text description; six-digit hex color; unique integer display_order; boolean is_complete |
| `task_priorities` | UUID PK; nonempty text label; hex color; unique integer display_order |
| `board_settings` | Singleton boolean PK; nonempty brand/board names; text description; required default status/priority FKs; integer title/description limits; boolean motion flag; bounded duration/stagger and allowlisted easing |
| `tasks` | UUID PK; trimmed nonempty title; required description; restrictive status/priority FKs; positive integer version; created_at/updated_at TIMESTAMPTZ; updated_at >= created_at |

Task indexes cover `(created_at, id)`, `status_id`, and `priority_id`. FK deletion is restrictive. Seed migrations initialize columns/priorities/settings but create no sample tasks. Structural safety bounds allow title limits 1–1000, description limits 0–20000, motion duration 0–1000 ms, and stagger 0–100 ms.

Task triggers enforce current business text limits, acquiring a shared row lock on settings. Settings updates reject a limit shrink incompatible with existing tasks. Real concurrent tests exercise both winner orderings. The trigger that takes the shared lock runs as the migration owner with a fixed search path so the runtime role needs only configuration SELECT and task CRUD privileges.

Versioned UPDATE/DELETE are single atomic SQL statements. No multi-statement write transaction is needed for task CRUD. Integration tests separately verify rollback behavior and actual competing transactions. Detailed HTTP contracts are in [api.md](api.md).

## Layers and frontend tree

```text
HTTP route -> controller -> task service -> TaskRepository -> PostgreSQL
                              |-> BoardConfigRepository

QueryClientProvider
  BoardErrorBoundary
    TaskBoardPage
      BoardIntro
      BoardToolbar -> SelectField
      DndContext
        TaskColumn[]
          TaskCard[] -> SelectField
        DragOverlay
      BoardFeedback
      TaskFormDialog -> SelectField[]
      DeleteTaskDialog
```

This Vite application uses client components. Query cache owns configuration and tasks; tasks load only after configuration succeeds. Search, priority filter, active drag, and dialog selection are local page state. Forms own drafts and field errors. Dialogs snapshot the task/version at open time so stale edits fail explicitly instead of overwriting later writes.

Initial loading/error states block configuration-dependent actions. Background failures retain cached content with Retry. Moves/editing update only the affected cached task optimistically; errors restore only that task. Creation/deletion become visible after persistence. Per-task synchronous locks prevent duplicate writes; different tasks may save concurrently. Refresh is guarded during pending writes; reconciliation runs after locks drain. No write retry is automatic.

Controls expose labels, focus outlines, pending state, live feedback, and keyboard dragging. Radix dropdowns use database-defined labels/colors and remain usable inside native dialogs. dnd-kit transforms the outer card; GSAP transforms an inner presentation wrapper. `useGSAP` cleanup and live reduced-motion media matching keep React in control of membership and focus. Motion does not delay persistence.

## Security and resilience

Strict Zod input schemas reject readonly/unknown keys. SQL is parameterized; React renders descriptions as escaped text. IDs are validated before repository access. Foreign keys and database triggers are final persistence checks. Config responses are runtime-validated and contain no secrets. Helmet sets browser headers. JSON requests are limited to 32 KiB with inflation disabled. Request IDs correlate sanitized errors; unexpected errors become 500 and known database availability failures become 503.

The API pool has bounded connection/statement/lock timeouts. Browser requests time out after six seconds; ambiguous outcomes instruct users to refresh. Health readiness queries PostgreSQL. Server shutdown closes listeners and drains the pool. This task does not require OAuth, token validation, external API retries, or cross-tenant authorization; those must accompany a future authenticated scope rather than fake implementations.

## PR-ready sequence and acceptance

| PR | Exact modules | Implementation and acceptance |
| --- | --- | --- |
| 1: workspace/contracts | `package.json`, `packages/contracts/src/index.ts`, TS/ESLint/Vitest configs | Strict shared DTO/config validation; install reproducibly; contract tests pass |
| 2: PostgreSQL foundation | `apps/api/schema/schema.sql`, `apps/api/migrations/202610060001_create_board.js`, `scripts/local-db.mjs`, `scripts/migrate.mjs` | Relations, FK/indexes, seeds, limit protection, restricted app role; migration and real constraint tests pass |
| 3: HTTP/domain | `apps/api/src/{tasks,board,database,http,errors,config}`, `app.ts`, `server.ts` | Complete CRUD/config/health; conditional writes and error mapping; concurrency, timeout, and HTTP tests pass |
| 4: client/state | `apps/web/src/api`, `apps/web/src/tasks`, `main.tsx` | Config-first queries, per-task locks/rollback, drafts, filters; overlapping mutations and boundary tests pass |
| 5: board/interaction | `apps/web/src/components`, `apps/web/src/motion`, `apps/web/src/styles/board.css` | Database-rendered board, styled dropdowns, responsive dialogs, keyboard/pointer movement, scoped GSAP; browser persistence/accessibility checks pass |
| 6: verification/delivery | `apps/api/test`, `apps/web/e2e`, `docs`, `README.md`, `.github/workflows/ci.yml` | Coverage gates, isolated fixtures, documented clean setup/build/start; lint/typecheck/unit/integration/E2E/build pass |

These are review boundaries for the completed local implementation. No remote repository or published PR is configured.
