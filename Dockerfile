# 1) deps — ставим все зависимости
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 2) build — собираем TS в JS, используя уже установленные deps
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3) runner — запускаем собранный код + переносим node_modules
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# переносим зависимости (можно оставить с dev, либо потом отрезать)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/server.js"]