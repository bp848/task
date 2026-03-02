# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# git required for github: dependencies (gws-supabase-kit)
RUN apk add --no-cache git

# 環境変数はVercelダッシュボードで設定（ソースコードにハードコードしない）
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_REDIRECT_URI
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
