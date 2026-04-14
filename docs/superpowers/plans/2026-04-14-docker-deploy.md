# Docker And Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Подготовить приложение к production-запуску в одном Docker-контейнере, который автоматически стартует и слушает порт из `PORT`.

**Architecture:** Production-контейнер собирает frontend через Vite, собирает backend в `dist/`, а затем запускает Fastify-сервер как единый entrypoint. Backend получает ответственность не только за API, но и за раздачу собранного frontend, чтобы Render и автоматическая проверка могли поднять одно приложение на одном порту.

**Tech Stack:** Node.js, npm workspaces через `npm --prefix`, Vite, React, Fastify, Docker, Render

---

## File Map

- Create: `Dockerfile`
- Create: `.dockerignore`
- Optional create: `render.yaml`
- Modify: `apps/backend/package.json`
- Modify: `apps/backend/src/app.ts`
- Modify: `apps/backend/src/server.ts` only if понадобится логирование/health-check
- Modify: `README.md`

### Task 1: Make backend runnable in production

**Files:**
- Modify: `apps/backend/package.json`
- Optional modify: `apps/backend/tsconfig.json`

- [ ] **Step 1: Change backend build from type-check only to real emit**

Сейчас `build` делает только `tsc --noEmit`, а production-контейнеру нужен исполняемый JS.

Изменить `apps/backend/package.json` так, чтобы:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "test": "vitest",
    "start": "node dist/server.js"
  }
}
```

- [ ] **Step 2: Verify local backend build**

Run: `npm run backend:build`

Expected: команда завершается без ошибок и появляется `apps/backend/dist/server.js`.

### Task 2: Serve frontend build from backend

**Files:**
- Modify: `apps/backend/src/app.ts`
- Optional modify: `apps/backend/package.json`

- [ ] **Step 1: Add static file serving dependency**

Если в `apps/backend/package.json` еще нет плагина, добавить зависимость:

```json
{
  "dependencies": {
    "@fastify/static": "^8.0.0",
    "fastify": "^5.2.1"
  }
}
```

Потом установить зависимости:

Run: `npm install --prefix apps/backend`

- [ ] **Step 2: Register frontend static assets in Fastify**

В `apps/backend/src/app.ts` добавить раздачу `apps/frontend/dist` и SPA fallback на `index.html`.

Нужна логика такого вида:

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistDir = path.resolve(__dirname, "../../../frontend/dist");

export function createApp() {
  const app = Fastify({ logger: false });

  app.register(fastifyStatic, {
    root: frontendDistDir,
    prefix: "/",
  });

  app.get("/", async (_, reply) => {
    return reply.sendFile("index.html");
  });

  app.get("/*", async (request, reply) => {
    if (
      request.url.startsWith("/schedule") ||
      request.url.startsWith("/event-types") ||
      request.url.startsWith("/bookings") ||
      request.url.startsWith("/owner/event-types")
    ) {
      return;
    }

    return reply.sendFile("index.html");
  });

  return app;
}
```

Смысл:
- API-маршруты остаются backend API
- любые frontend-роуты SPA отдают `index.html`
- контейнер поднимает одно приложение на одном порту

- [ ] **Step 3: Build frontend and verify backend can serve it**

Run: `npm run frontend:build`

Run: `npm run backend:build`

Run: `PORT=4173 npm --prefix apps/backend run start`

Expected:
- `http://localhost:4173/` открывает frontend
- `http://localhost:4173/bookings` отвечает API

### Task 3: Add Docker image build

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Create multi-stage Dockerfile**

`Dockerfile` должен:
- использовать Node base image
- ставить зависимости root, frontend и backend
- собирать frontend
- собирать backend
- запускать backend через `node apps/backend/dist/server.js` или рабочий `npm --prefix apps/backend run start`

Базовый вариант:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package-lock.json ./apps/backend/
COPY apps/frontend/package.json apps/frontend/package-lock.json ./apps/frontend/

RUN npm ci
RUN npm --prefix apps/backend ci
RUN npm --prefix apps/frontend ci

COPY . .

RUN npm run frontend:build
RUN npm run backend:build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/frontend/dist ./apps/frontend/dist

EXPOSE 3000

CMD ["node", "apps/backend/dist/server.js"]
```

Если root `package-lock.json` не покрывает все подпроекты, допустимо упростить Dockerfile и поставить зависимости после `COPY . .`, но без лишних production-слоев.

- [ ] **Step 2: Add .dockerignore**

В `.dockerignore` исключить:

```dockerignore
node_modules
apps/*/node_modules
apps/*/dist
.git
coverage
playwright-report
test-results
```

- [ ] **Step 3: Validate container locally**

Run: `docker build -t callplanner .`

Run: `docker run --rm -e PORT=3000 -p 3000:3000 callplanner`

Expected:
- контейнер стартует без ручных команд
- приложение отвечает на `http://localhost:3000`
- root route отдает frontend

### Task 4: Configure deployment on Render

**Files:**
- Optional create: `render.yaml`
- Modify: `README.md`

- [ ] **Step 1: Choose deployment mode**

Есть два рабочих варианта:

1. Через UI Render:
   - New Web Service
   - Connect repository
   - Environment: `Docker`
   - Render сам соберет образ по `Dockerfile`

2. Через `render.yaml`:

```yaml
services:
  - type: web
    name: callplanner
    runtime: docker
    plan: free
    autoDeploy: true
```

Для учебного проекта `render.yaml` полезен, потому что конфигурация живет в репозитории.

- [ ] **Step 2: Ensure Render uses PORT automatically**

Ничего хардкодить в Dockerfile не нужно. Render сам передаст `PORT`, а backend уже читает:

```ts
const port = Number(process.env.PORT ?? 3001);
```

Проверить нужно только то, что команда запуска в контейнере не переопределяет `PORT`.

- [ ] **Step 3: Deploy and verify public URL**

После первого deploy:
- открыть публичный URL
- проверить загрузку главной страницы
- проверить хотя бы один API endpoint, например `/bookings`

### Task 5: Document delivery requirements

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add deployment section**

В `README.md` добавить:
- как собрать Docker image локально
- как запустить контейнер локально с `PORT`
- публичную ссылку на Render-приложение

Минимальный блок:

```md
## Docker

```bash
docker build -t callplanner .
docker run --rm -e PORT=3000 -p 3000:3000 callplanner
```

## Production

Public URL: `https://<your-render-service>.onrender.com`
```

- [ ] **Step 2: Final verification**

Run:
- `npm run frontend:test -- --run`
- `npm run backend:test -- --run`
- `docker build -t callplanner .`
- `docker run --rm -e PORT=3000 -p 3000:3000 callplanner`

Expected:
- тесты проходят
- контейнер стартует
- приложение открывается в браузере

## Notes

- Спецификацию `spec/` на этом шаге менять не нужно, потому что Docker/deploy не меняют API-контракт.
- Для автоматической проверки самый безопасный путь: один контейнер, один процесс, один публичный порт.
- Если хотите упростить production-режим, можно вместо отдельного backend compile оставить `tsx` в runtime-контейнере, но это хуже по размеру образа и менее production-friendly.
