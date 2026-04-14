FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package-lock.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

RUN npm ci
RUN npm ci --prefix apps/backend
RUN npm install --prefix apps/frontend

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
