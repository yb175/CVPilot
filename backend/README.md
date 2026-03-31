# Backend — CVPilot

This document describes the production-grade backend for the CVPilot monorepo.

Stack: Node.js + TypeScript + Prisma + PostgreSQL

---

## 📁 Folder Structure Explanation

This section explains the purpose of each top-level folder and the expected contents.

- `config/`
  - What goes inside: environment-aware configuration modules, constants, typed config loaders, feature flags, CORS settings.
  - What should NOT go inside: request handlers or business logic that perform database calls.
  - Example responsibilities: `getConfig()`, environment validation, CORS/origins list.

- `controller/`
  - What goes inside: thin HTTP handlers that adapt requests to services and send responses.
  - What should NOT go inside: business rules or direct DB access.
  - Example responsibilities: parse params, call `UserService.create()`, set response status codes.

- `service/`
  - What goes inside: business logic, orchestration, domain rules, transactions.
  - What should NOT go inside: HTTP request/response handling.
  - Example responsibilities: signup flow, multi-model orchestration, transactional updates.

- `route/`
  - What goes inside: route definitions and wiring (Express/Fastify routers, route-level middleware hookup).
  - What should NOT go inside: business logic beyond minimal route concerns.

- `middleware/`
  - What goes inside: auth, validation, rate-limiting, parsing, centralized error-handler.
  - What should NOT go inside: domain logic or DB queries.

- `lib/`
  - What goes inside: shared utilities and low-level singletons (Prisma client wrapper, logger factory, helpers).
  - What should NOT go inside: per-domain logic or route wiring.
  - Example responsibilities: export a singleton Prisma client, provide a configured logger.

- `prisma/`
  - What goes inside: `schema.prisma`, `migrations/`, seeds and Prisma-specific config.
  - What should NOT go inside: application business logic.

- `scripts/`
  - What goes inside: developer and automation scripts (CI helpers, migration helpers, one-off utilities).
  - What should NOT go inside: runtime code used by the server for requests.

- `server.ts`
  - What it is: app entry point — wires config, middleware, routes and starts the HTTP server.
  - What should NOT go inside: business logic; delegate to `service` layer.

---

## 🧠 Architecture Guidelines

- Separation of concerns
  - Controllers: HTTP adapters (validation, response formatting).
  - Services: domain/business logic and orchestration.
  - DB (Prisma): data access, invoked from services or thin repositories.

- Request flow
  - `route` → middleware (auth/validation) → `controller` → `service` → `lib/prisma` → `service` → `controller` → response

- Error handling strategy
  - Use typed `HttpError` (or similar) with `statusCode` and metadata.
  - Services throw domain errors; centralized error middleware converts to HTTP responses.
  - Do not expose stack traces in production responses; log full details with correlation IDs.

- Logging best practices
  - Avoid `console.log`; use structured logger (e.g., `pino` or `winston`).
  - Include context: request id, user id, route, duration, and error metadata.
  - Log levels: `debug`/`info`/`warn`/`error` appropriately.

- Environment variable handling
  - Fail-fast on missing required env vars (validate at startup).
  - Keep `.env.sample` in repo, never commit `.env`.
  - Use secret managers in production (Vault, cloud secrets).

---

## ⚙️ Setup Instructions

1. Enter backend folder:

```bash
cd backend
```

2. Install dependencies:

```bash
pnpm install
```

3. Environment variables

```bash
cp .env.sample .env
# fill DATABASE_URL, PORT, NODE_ENV, JWT_SECRET, etc.
```

4. Database
  - Ensure PostgreSQL is running and `DATABASE_URL` points to it. Locally, use Docker or a local Postgres instance.

5. Prisma

```bash
pnpm prisma generate
pnpm prisma migrate dev --name init  # first setup in dev
```

---

## 🗄️ Prisma Commands (VERY IMPORTANT)

- Generate client

```bash
pnpm prisma generate
```

When to use: after editing `schema.prisma`, before TypeScript build, and in CI before running migrations or build steps.

- Create migration (development)

```bash
pnpm prisma migrate dev --name <migration_name>
```

When to use: local development when you change the schema and want to create a migration and update the client.

- Apply migrations in production

```bash
pnpm prisma migrate deploy
```

When to use: in CI/CD production/staging deployment pipelines to apply pending migrations non-interactively.

- Reset database (dev only)

```bash
pnpm prisma migrate reset
```

When to use: destructive local reset (drops all data), useful for dev or integration test setups — DO NOT RUN IN PRODUCTION.

- Open Prisma Studio

```bash
pnpm prisma studio
```

When to use: inspect and edit data locally or on staging for debugging.

Notes:
- Commit `prisma/migrations/*` to version control.
- Avoid running destructive commands in production.

---

## 🚀 Running the Backend

### Development mode

1. Generate client:

```bash
pnpm prisma generate
```

2. Start with hot reload (examples):

```bash
# using tsx
npx tsx watch server.ts

# or using ts-node-dev
npx ts-node-dev --respawn --transpile-only server.ts

# or if project has a script
pnpm run dev
```

Use `tsx watch`, `ts-node-dev`, or `nodemon` for automatic reload when files change.

### Production mode

1. Generate client and build:

```bash
pnpm prisma generate
pnpm tsc
```

2. Run the compiled app:

```bash
node dist/server.js
```

Notes:
- Ensure `NODE_ENV=production` and production env variables are set.
- Use a process manager (PM2/systemd) or container orchestrator to keep the process running.

---

## 🔐 Production Best Practices

- Do not use `console.log`; use a structured logger.
- Centralize error handling and validation.
- Never commit `.env` or secrets to source control.
- Validate all inputs (use `zod`/`joi`/`yup`).
- Avoid raw SQL; prefer Prisma queries unless a raw query is essential.
- Give the DB user least privilege necessary.
- Monitor and alert on errors/latency (Sentry, Prometheus + Grafana).

---

## 🧪 Optional (Bonus)

- Testing
  - Suggested: `vitest` (fast) or `jest`.
  - Unit tests for `service` layer; integration tests against ephemeral DB for routes.

- Linting & formatting
  - ESLint + TypeScript, Prettier, `lint-staged` + `husky` for pre-commit checks.

- CI/CD basics
  - Pipeline: install → build → test → `pnpm prisma migrate deploy` → deploy
  - Apply migrations in pipeline with `pnpm prisma migrate deploy` before starting the app.

---

## 🌐 Frontend Quick Commands

These commands are for the `frontend` package in the repo root.

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
```

---

If you'd like, I can also:
- commit per-folder README files under `backend/config`, `backend/service`, etc.,
- add example `errorHandler.ts` and `logger.ts` implementations,
- or open a PR with these changes applied.
