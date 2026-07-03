# sharehouse-backend — Backend / API (for Claude Code)

REST API for **Share House**. NestJS 11 + Mongoose (MongoDB) + JWT auth (passport-jwt). Request DTOs are validated with `class-validator`/`class-transformer`; `zod` validates the environment at boot. Consumed by the sibling frontend `../roomatemanager`.

## Commands

Run from this folder (`sharehouse-backend/`):

- `npm run start:dev` — watch mode, listens on **port 3000** (override via `PORT`)
- `npm run start` / `npm run start:prod` — run (prod runs `dist/main`)
- `npm run build` — `nest build`
- `npm run lint` — ESLint (`--fix`)
- `npm run format` — Prettier over `src/**` and `test/**`
- `npm run test` — Jest unit (`*.spec.ts`); `test:e2e`, `test:cov`, `test:watch`

## Environment

Copy `.env.example` → `.env` and fill in. Env is validated at boot by `src/config/env.validation.ts` (app won't start if invalid).

| Var | Purpose |
| --- | --- |
| `NODE_ENV` | `development` / `production` (affects cookie `secure`/`sameSite`) |
| `PORT` | HTTP port (default 3000) |
| `MONGO_URI` | MongoDB connection string (required) |
| `JWT_SECRET` | JWT signing secret (required) |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `BCRYPT_SALT` | bcrypt salt rounds |
| `FRONTEND_URL` | Allowed CORS origin — for local dev the frontend runs on `http://localhost:8080` |

`MONGO_URI` accepts any MongoDB: a local server (`mongodb://localhost:27017/sharehouse`) or an Atlas SRV string (`mongodb+srv://...`). `.env.example` still shows an Atlas placeholder. The `FRONTEND_URL` default in both `.env.example` and `env.validation.ts` is `http://localhost:8080` (the real frontend dev port), so a fresh `.env` copy works out of the box for local dev.

## Architecture & conventions

Bootstrap (`src/main.ts`) applies globally:
- Global route prefix **`/api`** (every path is `/api/...`).
- `ValidationPipe({ whitelist: true, transform: true })` — unknown DTO fields are stripped, payloads are transformed to DTO types.
- `helmet()` + `cookie-parser`; CORS restricted to `FRONTEND_URL` with `credentials: true`.
- Global rate limiting: `ThrottlerGuard` at 60 requests / 60s (`app.module.ts`).

**Response envelope** — never return these shapes manually; the global interceptor/filter add them:
- Success (`common/interceptors/transform.interceptor.ts`): `{ "success": true, "data": <your returned value> }`
- Error (`common/filters/http-exception.filter.ts`): `{ "success": false, "message", "statusCode", "timestamp", "path" }`

Controllers should just `return` the payload (or throw an `HttpException`); the envelope is applied automatically.

**Auth** — cookie-based, not bearer header:
- `register`/`login` set an **httpOnly cookie `access_token`** (see `modules/auth/auth.controller.ts`); `logout` clears it.
- Protect routes with `@UseGuards(JwtAuthGuard)` (`common/guards/`) and read the user via the `@CurrentUser()` decorator (`common/decorators/`).
- `secure`/`sameSite` cookie flags depend on `NODE_ENV` — cross-site cookies require HTTPS in production.

**Layout:**
- `src/modules/<feature>/` — one folder per feature (`auth`, `expenses`, `household`, `shopping`, `users`), each with `<feature>.controller.ts`, `<feature>.service.ts`, `<feature>.module.ts`, plus `dto/` and `schemas/`.
- `src/common/` — cross-cutting `decorators/`, `filters/`, `guards/`, `interceptors/`.
- `src/config/` — `configuration.ts` (typed config) and `env.validation.ts`.
- `src/main.ts`, `src/app.module.ts` — bootstrap and root wiring.

## Domain model & invariants

Collections (all `timestamps: true`): **User**, **Household**, **Expense**, **ShoppingItem**. `User.householdId` ↔ `Household.members[]` tie users together; `Expense` and `ShoppingItem` carry a `householdId` and a user ref (`paidBy` / `addedBy`). Every data query is scoped to the caller's household.

Invariants to preserve (breaking these silently corrupts data or 400s the client):
- **Money is integer cents.** `Expense.amount` is `@IsInt @Min(1)`; the summary works in `balanceCents` / `amountCents`. Never store decimals.
- **Expense categories** are the fixed enum `EXPENSE_CATEGORIES` = `alimentacao | moradia | transporte | saude | lazer | outros` — must stay in sync with the frontend union.
- **`splitRatio`** is a float in `[0,1]` (default `0.5`) representing the **payer's** share of `amount`: the payer keeps `round(amount * splitRatio)` and the other member owes the remainder (`expenses.service.ts`). Keep this "payer's share" meaning in sync with the frontend — do not reinterpret it as the current user's share.
- **Households hold 1–2 members** (`household.service.ts` starts with 1 and rejects a 3rd join via an atomic guarded update). Expense creation works for a solo household: `create` counts members and, while solo, **forces `paidBy` = self and `splitRatio` = 1** server-side (ignoring client-supplied values); `summary` returns zero balances / no transfer while `members.length < 2`. The balance/transfer math in `expenses.service.ts` assumes 2 members once a partner joins — change both together if you ever support more.
- There are **two "me" endpoints** (`GET /api/auth/me` and `GET /api/users/me`) returning slightly different shapes — keep both intact (the frontend uses each).

## Adding a feature module

Mirror an existing module (e.g. `modules/expenses`): create the `controller`/`service`/`module` trio plus `dto/` (class-validator DTOs) and `schemas/` (Mongoose schema), register the schema with `MongooseModule.forFeature(...)`, and import the module in `app.module.ts`. Guard authenticated routes with `JwtAuthGuard` and return plain payloads (the envelope is automatic).

## Postman

A Postman collection lives in `postman/` for manually exercising the API.
