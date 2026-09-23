# postN

India-first social scheduler for founders and D2C brands. LinkedIn + X, INR later via Razorpay.

## Phase 0

Monorepo, Postgres + Redis, Prisma, NestJS Google login, Next.js dashboard shell.

## Setup

Local Postgres/Redis are mapped to **5433** and **6381** so they do not collide with other stacks on this machine.

```bash
pnpm install
docker compose up -d
cp apps/api/.env.example apps/api/.env   # add GOOGLE_CLIENT_ID / SECRET
pnpm db:migrate
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000
- Google callback: `http://localhost:4000/auth/google/callback`

`_reference/` is a gitignored Postiz clone for pattern study only. Do not copy it.
