FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY knexfile.js ./
COPY migrations ./migrations
COPY seeds ./seeds

EXPOSE 3000

CMD ["sh", "-c", "npx knex migrate:latest && npx knex seed:run && npm start"]
