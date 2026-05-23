FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/server/dist ./server/dist

RUN mkdir -p /app/server/uploads

EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node server/dist/index.js"]
