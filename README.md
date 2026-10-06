# ToDoList — Dayboard

React/TypeScript task board backed by Express and PostgreSQL. Create, edit, delete, search, filter, and move tasks using pointer dragging, keyboard dragging, or each card's column menu.

Tasks, columns, priority definitions, display order, branding, business defaults, validation limits, and motion settings reside in PostgreSQL. The shared board has no authentication or tenancy.

## Run locally

Use Node.js 24 LTS and npm. Install PostgreSQL CLI tools (`initdb`, `pg_ctl`) and add their directory to `PATH`. CI is configured for PostgreSQL 17.

```sh
git clone https://github.com/kiroloskhela/ToDoList.git
cd ToDoList
npm ci
npm run db:setup
npm run db:migrate
npm run dev
```

Open http://127.0.0.1:5173. The API listens on http://127.0.0.1:3001. Both ports must be free.

`db:setup` creates a project-specific PostgreSQL cluster on loopback port 5433 in `.local-postgres`, generates credentials, and writes an ignored `.env` only when one does not exist. It creates separate app, migration, and test roles and separate development/test databases. It leaves an existing database on port 5432 alone. Stop this cluster with `npm run db:stop`; restart with `npm run db:setup`. Configuration seeds are idempotently tracked migrations; tasks are initially empty.

For an existing PostgreSQL installation, provision databases and roles yourself and copy `.env.example` to `.env`, replacing its example URLs. `DATABASE_URL` is the runtime connection; `MIGRATION_DATABASE_URL` owns schema changes. Tests require `TEST_DATABASE_URL` to reference the dedicated `task_board_test` database. The integration and browser suites delete tasks there; never point them at production.

## Verify

```sh
npm run typecheck
npm run lint
npm run test:coverage
npx playwright install chromium
npm run test:e2e
npm run build
npm audit
```

Run database integration tests and browser tests sequentially because they share the isolated test database. Browser tests launch their own API on 3002 and Vite on 5174. Failure traces, videos, screenshots, and the HTML report are under ignored `artifacts/`.

Coverage gates: 85% lines, 85% functions, and 80% branches across authored contracts, API, and UI; the task service and contracts require 95% lines/functions and 90% branches. Process bootstrap files and test fixtures are excluded. See [testing specification](docs/testing.md).

## Production build

```sh
npm run build
NODE_ENV=production npm start
```

Express serves the built UI and `/api` routes on port 3001. Apply migrations before starting the API. `/health/live` checks the process and `/health/ready` checks a real database query. The API uses parameterized SQL, bounded pool/query/lock timeouts, request IDs, Helmet headers, write rate limits, and conditional versioned updates.

This shared, unauthenticated application is intended for the task's scope. Config changes are privileged SQL operations through the migration role; there is no configuration editor or public configuration-write endpoint. Large-board pagination and authentication are separate scope changes.

## Technical references

- [Architecture, prerequisites, schema, and implementation sequence](docs/architecture.md)
- [HTTP API contract](docs/api.md)
- [Testing specification and executable tests](docs/testing.md)
- [UI skills and motion implementation](docs/ui-skills-and-motion-plan.md)
- [Project instructions](AGENTS.md)

Dependencies are pinned in `package-lock.json`. Project skills and their provenance are recorded in `.agents/skills-manifest.json`.
