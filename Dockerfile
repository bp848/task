# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Viteビルド時に必要な環境変数（anon keyはクライアント公開用のためDockerfileに直接設定）
ARG VITE_SUPABASE_URL="https://rwjhpfghhgstvplmggks.supabase.co"
ARG VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3amhwZmdoaGdzdHZwbG1nZ2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MDgzNDYsImV4cCI6MjA3NDI4NDM0Nn0.RfCRooN6YVTHJ2Mw-xFCWus3wUVMLkJCLSitB8TNiIo"
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY package*.json ./
RUN npm ci

COPY . .

# Viteフロントエンドをビルド（VITE_変数がバンドルに埋め込まれる）
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# ビルド済みフロントエンドをコピー
COPY --from=builder /app/dist ./dist

# サーバーコードをコピー
COPY server.ts ./

# TypeScriptをJSにコンパイルするためtsxを使用
RUN npm install -g tsx

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["tsx", "server.ts"]
