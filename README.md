# Tasks Manager API

Task Management REST API built with Node.js, Express, TypeScript, Prisma (PostgreSQL), Zod validation, JWT auth, bcrypt password hashing, Jest + Supertest tests, and Docker/Docker Compose. Ready for deployment on Render.

## Stack
- Node.js 20+, Express, TypeScript
- Prisma ORM (PostgreSQL)
- JWT auth, bcrypt
- Zod request validation
- Jest + Supertest for tests
- Dockerfile + docker-compose (API + Postgres)

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your env file from the template:
   ```bash
   cp .env.example .env
   ```
   Set `DATABASE_URL`, `JWT_SECRET`, and `BCRYPT_SALT_ROUNDS`.
3. Generate Prisma client and run the first migration:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```
4. Seed an initial admin (email/password are configurable in `.env`):
   ```bash
   npm run seed
   ```
5. Start the API:
   ```bash
   npm run dev        # development (ts-node-dev)
   npm run build && npm start  # production build + run
   ```

Health check: `GET /health` returns `{ "status": "ok" }`.

## Tests
Tests use your configured `DATABASE_URL` (ensure the DB exists and migrations are applied):
```bash
npx prisma migrate deploy   # or migrate dev for a local DB
npm test
```

## Docker
Build and run API + Postgres:
```bash
docker-compose up --build
```
- API: http://localhost:3000
- DB: postgres://postgres:postgres@localhost:5432/tasks_manager

## Render Deployment Notes
- Set env vars: `DATABASE_URL`, `JWT_SECRET`, `BCRYPT_SALT_ROUNDS`, `PORT` (Render sets `PORT` automatically).
- Build command: `npm install && npx prisma generate && npm run build`
- Start command: `npx prisma migrate deploy && npm run start`
- If using Render PostgreSQL, plug its connection string into `DATABASE_URL`.

## Available Scripts
- `npm run dev` – start with ts-node-dev
- `npm run build` – compile TypeScript
- `npm start` – run compiled server
- `npm test` / `npm run test:watch` – run Jest + Supertest
- `npm run prisma:generate` – generate Prisma client
- `npm run prisma:migrate` – create a new migration (dev)
- `npm run prisma:deploy` – apply migrations in production
- `npm run seed` – seed default admin user

## API Overview (key endpoints)
- `POST /auth/register` – register member
- `POST /auth/login` – login, returns JWT
- `GET /auth/me` – current user profile (auth)
- `GET /users` – list users (admin)
- `POST /teams` – create team (admin)
- `GET /teams` – list teams (admin = all, member = own)
- `GET /teams/:teamId` – team details (member/admin)
- `POST /teams/:teamId/members` – add member (admin)
- `POST /tasks` – create task (team members/admin)
- `GET /tasks` – list tasks (admin = all, member = team tasks)
- `GET /tasks/:id` – task details
- `PUT /tasks/:id` – edit task (admin or assignee)
- `PATCH /tasks/:id/status` – update status (admin or assignee)
- `DELETE /tasks/:id` – delete task (admin)

Roles: `admin` manages users/teams/tasks; `member` can see team tasks and edit only tasks assigned to them.
