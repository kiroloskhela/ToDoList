# Unit and integration testing specification

Tests assert observable behavior at layer boundaries. Backend service units mock repository/config interfaces; integration tests use real PostgreSQL and real Express routes. Frontend tests use MSW for HTTP and a fresh QueryClient per test; browser tests use a separately launched API and isolated test database.

## Unit matrix

| Module | Happy path | Boundaries/failures |
| --- | --- | --- |
| `packages/contracts/src/index.test.ts` | Runtime configuration, defaults, Unicode, DTOs | Null/undefined/arrays, empty/whitespace title, exact/over limit, NUL, unknown/readonly keys, bad UUID/version, missing/duplicate config IDs |
| `task-service.test.ts` | Create/list/get/replace/delete; dynamic defaults | Missing/stale task, malformed IDs/versions, invalid input, config/repository failures; no persistence on rejected input |
| `task-etag.test.ts` | Exact strong task tag | Missing, weak, wildcard, multiple, wrong UUID, out-of-range version |
| `pg-error-mapper.test.ts` | Known SQLSTATE mappings | Timeout/unavailable/FK/check/overflow; unknown failure propagates |
| `environment.test.ts` | Valid URL/options and infrastructure defaults | Wrong protocol, invalid numeric bounds; credentials not included in validation errors |
| Board cache/drop/dialog/keyboard tests | Immutable affected-task updates, transitions, destination geometry | Empty arrays, invalid/outside/no-op drop, original snapshot preservation |
| `use-task-mutations.test.tsx` | Save/create/delete, versioned request headers | Failed move rollback, same-task overlap lock, independent A/B writes, failed deletion, deferred reconciliation |
| `http-client.test.ts` | Parsed API success/errors | Offline, unreadable/malformed payload, server field errors, canceled requests |
| Board/dialog component tests | Configuration-first load, CRUD controls, filters | Cached data retained after refresh failure, draft retained after rejected save, configured validation, refresh blocked during optimistic writes |

The complete executable core business test file is [task-service.test.ts](../apps/api/src/tasks/task-service.test.ts). It contains concrete injected mock setup and happy/invalid/missing/stale/failure assertions; no sample pseudocode is needed. Shared fixtures define deterministic UUIDs and timestamps while production IDs remain database-generated.

## Integration matrix

`apps/api/test/api.integration.test.ts` uses Supertest and the guarded `task_board_test` PostgreSQL connection. Each test cleans tasks; tests that change config use transaction rollback or restore fixture state. Test files run sequentially.

- Create/read/update/delete and equivalent `/api` aliases; response DTOs, timestamps, versions, ETags, Location, and empty 204.
- Strong preconditions: 428 missing header, 400 invalid tag, 412 stale version, 404 deleted ID, 409 exhausted version.
- 400 malformed JSON/UUID, 413 oversized body, 415 wrong/compressed media, 422 unknown fields/references/query parameters, 405 method/Allow, 429 rate limit, sanitized unexpected error responses.
- Runtime database label/order/default/limit changes affect config and new tasks. App role cannot mutate configuration.
- Real FK/limit checks prevent invalid persistence; injection-shaped text remains data; rollback restores writes.
- Actual parallel UPDATE/UPDATE and UPDATE/DELETE contend on row locks. Lock coordination uses `pg_stat_activity`, not timing guesses. One conditional winner persists; the loser returns stale/missing semantics.
- Task insert versus settings shrink is tested in both lock orderings: shrink rejects an incompatible committed insert, and an oversized insert rejects a committed shrink.
- Real lock timeout and unavailable database return 503; readiness reflects a real database query.

No tokens or third-party APIs are present in this scope; invalid-token/provider-downtime tests become required only when those integrations are added.

## Browser matrix

`apps/web/e2e/board.spec.ts` checks persisted CRUD, search/filtering, pointer drop, keyboard drag, failed-move rollback, modal focus trapping/restoration, dropdown interaction, responsive layouts, and live reduced motion. Reload assertions verify database persistence rather than only optimistic rendering. Use role/label selectors, awaited network/visible state, and isolated API fixtures. Browser tests must not overlap database integration tests.

Playwright stores failures with trace/video/screenshots under `artifacts/`. Success screenshots document populated desktop/mobile layouts and open dropdowns. Animation checks confirm cleanup and visibility, not a claimed guaranteed frame rate.

## Fixtures, mocks, and coverage

- Unit repository mocks return Date-based domain tasks. HTTP/UI fixtures return ISO timestamps and real DTO shapes. Freeze clock only for explicit time assertions.
- Each UI test creates its own QueryClient with test-controlled retries and clears MSW handlers after use. Mock at HTTP or injected repository boundaries rather than mocking the unit under test.
- Hold a deferred request to test overlap/rollback; assert request counts and affected cache contents. Do not restore the entire board snapshot after one failed task.
- Integration tests do not mock `pg`; actual transactions, constraints, and contention verify PostgreSQL behavior. Simulated network failures belong in HTTP boundary tests.
- Coverage requires 85% lines/functions and 80% branches globally, with 95% lines/functions and 90% branches for contracts/service. Add behavior tests for gaps; never weaken thresholds or skip failing cases.
- Execute `npm run test:coverage`, then `npm run test:e2e`, then typecheck/lint/build. CI provisions PostgreSQL 17 and Node 24 with the same commands.
