# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# git required for github: dependencies (gws-supabase-kit)
RUN apk add --no-cache git

# Viteビルド時に必要な環境変数
ARG VITE_SUPABASE_URL="https://rwjhpfghhgstvplmggks.supabase.co"
ARG VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3amhwZmdoaGdzdHZwbG1nZ2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MDgzNDYsImV4cCI6MjA3NDI4NDM0Nn0.RfCRooN6YVTHJ2Mw-xFCWus3wUVMLkJCLSitB8TNiIo"
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_GOOGLE_REDIRECT_URI=""
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_REDIRECT_URI=$VITE_GOOGLE_REDIRECT_URI

COPY package*.json ./
RUN npm ci

COPY . .

# Viteフロントエンドをビルド（VITE_変数がバンドルに埋め込まれる）
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache git

COPY package*.json ./
RUN npm ci --omit=dev

# ビルド済みフロントエンドをコピー
COPY --from=builder /app/dist ./dist

# サーバーコードをコピー
COPY server.ts ./
COPY tsconfig.json ./

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["npx", "tsx", "server.ts"]
