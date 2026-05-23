# Flock Log

Mobile-first PWA for poultry breeding and farming: incubator clutches with flexible milestone days, per-egg development and hatching logs, chick registration, and flock management (including birds added without a hatch).

## Prerequisites (Windows)

1. **Node.js LTS** (includes npm)
2. **Docker Desktop** (for PostgreSQL)

```powershell
winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
winget install Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
```

Open a **new terminal** after installing, then verify:

```powershell
node -v
npm -v
docker compose version
```

## First-time setup

```powershell
git clone https://github.com/def-notacoder/flocktrack.git
cd flocktrack
copy .env.example .env
docker compose up -d
npm install
npx prisma migrate dev --name init
npx prisma db seed
```

## Development

```powershell
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:3001/api/health

## Production build

```powershell
npm run build
npm run start
```

Serves the built client from the API on port 3001.

## Features

- **Flexible incubation**: set incubation days and lockdown day per clutch (chicken, duck, goose presets)
- **Per-egg tracking**: candling logs, hatching logs, register chick with health + tag/name/colour
- **Direct add bird**: purchased hens/roosters without an incubator batch
- **Lifecycle timeline**: egg history + health from hatch (or acquired) through end of life
- **Laying records** and **health logs** from the Log tab

## Windows ARM note

On ARM64 Windows, Prisma uses the JavaScript engine with `@prisma/adapter-pg` (configured in `prisma/schema.prisma` as `engineType = "client"`). No extra setup needed after `npm install`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Docker not running | Start Docker Desktop, run `docker ps` |
| Port 5432 in use | Change host port in `docker-compose.yml` and `DATABASE_URL` |
| `npm` not found | Reopen terminal after Node install; use `C:\Program Files\nodejs\npm.cmd` |
| Prisma migrate fails | Ensure Postgres container is healthy: `docker compose ps` |
| Prisma engine / DLL error on ARM | Ensure `engineType = "client"` in `schema.prisma`, then `npx prisma generate` |
