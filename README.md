# Tasks Manager API

Task Management REST API with Node.js, Express, TypeScript, Prisma (PostgreSQL), JWT auth, Zod validation, bcrypt, Jest + Supertest, and Docker. Ready for Render deployment.

## Stack
- Node.js 20+, Express, TypeScript
- Prisma (PostgreSQL) + migrations/seed
- JWT (1d exp), bcrypt
- Zod validation
- Jest + Supertest
- Dockerfile (multi-stage) + docker-compose (API + Postgres)
- ESLint + Prettier

## Env Vars
Copy and edit `.env.example`:
```
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tasks_manager?schema=public
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/tasks_manager_test?schema=public
JWT_SECRET=change-me
BCRYPT_SALT_ROUNDS=10
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=admin123
SEED_ADMIN_NAME=Admin
```

## Local Development
```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed   # optional admin seeder
npm run dev    # ts-node-dev
```
Health check: `GET /health` → `{ "status": "ok" }`

## Tests
Use a clean DB (set `DATABASE_URL_TEST`). Migrations must be applied beforehand.
```bash
npx prisma migrate deploy
npm test
```
Tests truncate tables between cases via `tests/setup.ts`.

## Docker
```bash
docker-compose up --build
```
- API: http://localhost:3000
- Postgres: postgres://postgres:postgres@localhost:5432/tasks_manager
Compose adds DB healthcheck; API waits via `depends_on`.

## Render
- Build: `npm ci && npx prisma generate && npm run build`
- Start: `npx prisma migrate deploy && node dist/server.js`
- Vars: `DATABASE_URL`, `JWT_SECRET`, `BCRYPT_SALT_ROUNDS`, `PORT` (Render sets `PORT`)

## Scripts
- `npm run dev` — dev server
- `npm run build` — compile TS
- `npm start` — run compiled
- `npm test` / `npm run test:watch`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:deploy`
- `npm run seed`
- `npm run lint`

## API Notes
- Base path: `/api`
- Success: `{ data, meta? }`
- Errors: `{ error: { code, message, details? } }`
- Status labels (API): `Pendente | Em progresso | Concluído` → DB: `pending | in_progress | completed`
- Priority labels (API): `Alta | Média | Baixa` → DB: `high | medium | low`

### Auth
- `POST /api/auth/register` — body `{ name, email, password }` (role defaults to `member`)
- `POST /api/auth/login` — body `{ email, password }`
- `GET /api/auth/me` — JWT required

### Users (admin)
- `GET /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id` (name, role)
- `DELETE /api/users/:id`

### Teams
- `POST /api/teams` (admin)
- `GET /api/teams` (admin: all, member: only own)
- `GET /api/teams/:id` (admin or member of team)
- `PATCH /api/teams/:id` (admin)
- `DELETE /api/teams/:id` (admin)
- `POST /api/teams/:id/members` (admin) body `{ userId }`
- `DELETE /api/teams/:id/members/:userId` (admin)

### Tasks
- `POST /api/tasks` — body `{ title, description?, status?, priority?, teamId, assignedTo }`
  - member: must belong to team and `assignedTo` must be self; defaults: status `pending`, priority `medium`
- `GET /api/tasks` — filters: `teamId, assignedTo, status, priority, search, page, pageSize`
  - admin: all; member: only teams they belong to
- `GET /api/tasks/:id` — admin or team member
- `PUT /api/tasks/:id` — admin: all fields; member: only if assignee, cannot change `assignedTo`/`teamId`
- `PATCH /api/tasks/:id/status` — admin or assignee; records history on change
- `DELETE /api/tasks/:id` — admin or assignee member
- `GET /api/tasks/:id/history` — admin or team member

### Curl Samples
```bash
# register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"User","email":"user@example.com","password":"Password123!"}'

# login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123!"}' | jq -r '.data.token')

# create team (admin)
curl -X POST http://localhost:3000/api/teams \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Team A","description":"Example"}'

# create task
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Task 1","teamId":1,"assignedTo":1,"priority":"Média"}'
```

## Database
- Prisma schema in `prisma/schema.prisma` with enums (`UserRole`, `TaskStatus`, `TaskPriority`) and relations.
- Unique constraint on team membership (user_id, team_id).
- Status changes recorded in `tasks_history`.

## Testing Coverage (integration)
- Auth: register/login/me
- Admin vs member permissions (teams, tasks)
- Membership rules for task creation/listing
- Task status changes + history recording
