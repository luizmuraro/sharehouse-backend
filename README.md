# Share House — Backend

REST API for **Share House**, a mobile-first app for managing shared-household finances (expenses, splitting, shopping lists, receipts, settle-ups). It serves the frontend in the sibling repo [`roomatemanager`](../roomatemanager).

## Tech stack

- **NestJS 11** (TypeScript)
- **MongoDB** via **Mongoose**
- **JWT auth** with passport-jwt, delivered as an httpOnly cookie
- **class-validator** / **class-transformer** for request validation
- **helmet**, **cookie-parser**, throttling, global response envelope
- **Jest** for tests

## Getting started

Prerequisites: Node.js 20+ and a MongoDB connection string (e.g. MongoDB Atlas).

```bash
npm install
cp .env.example .env   # then edit values (see below)
npm run start:dev      # http://localhost:3000/api
```

### Environment variables

Defined in `.env` and validated at startup (`src/config/env.validation.ts`).

| Var | Description |
| --- | --- |
| `NODE_ENV` | `development` or `production` |
| `PORT` | HTTP port (default `3000`) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `BCRYPT_SALT` | bcrypt salt rounds (e.g. `10`) |
| `FRONTEND_URL` | Allowed CORS origin, e.g. `http://localhost:5173` |

## API conventions

- All routes are served under the **`/api`** prefix (e.g. `POST /api/auth/login`).
- **Authentication** is cookie-based: `register`/`login` set an httpOnly `access_token` cookie; send credentials with requests (`credentials: 'include'` on the frontend). `logout` clears it.
- **Success responses** are wrapped as `{ "success": true, "data": ... }`.
- **Error responses** are wrapped as `{ "success": false, "message", "statusCode", "timestamp", "path" }`.
- Global rate limit: 60 requests per 60 seconds per client.

## Project structure

```
src/
  main.ts              # bootstrap: global prefix, pipes, helmet, CORS, cookies
  app.module.ts        # root module wiring (Mongo, throttler, feature modules)
  config/              # typed configuration + env validation
  common/              # decorators, guards, filters, interceptors
  modules/
    auth/              # register / login / logout / me (JWT cookie)
    users/
    household/
    expenses/
    shopping/
```

Each feature module follows the same shape: `*.controller.ts`, `*.service.ts`, `*.module.ts`, plus `dto/` and `schemas/`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run start:dev` | Start in watch mode |
| `npm run start:prod` | Run the compiled build (`dist/main`) |
| `npm run build` | Compile with `nest build` |
| `npm run lint` | ESLint (auto-fix) |
| `npm run format` | Prettier |
| `npm run test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |
| `npm run test:cov` | Coverage |

## Manual testing

A Postman collection is available in [`postman/`](./postman).
