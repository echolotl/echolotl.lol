FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY packages ./packages
RUN bun install --frozen-lockfile --filter app --production

COPY backend ./backend
WORKDIR /app/backend

ENV NODE_ENV=production
ENV DB_PATH=/data/main.db
ENV PICROSS_DIR=/data/picross

EXPOSE 3000

CMD ["bun", "run", "start"]
