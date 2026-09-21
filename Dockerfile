# ==========================================
# MISSÃO CIRCUITOS ELÉTRICOS 2.0 — DOCKERFILE
# Runtime: Node.js 22 (LTS) com suporte nativo ao node:sqlite
# ==========================================

# Etapa 1: Build da aplicação (Frontend SPA + Backend CJS)
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Instalação das dependências
COPY package.json package-lock.json* ./
RUN npm ci

# Cópia do código-fonte e configurações
COPY tsconfig.json vite.config.ts index.html ./
COPY src/ ./src/
COPY server/ ./server/
COPY server.ts ./
COPY public/ ./public/

# Compilação completa (Vite dist + esbuild server.cjs)
RUN npm run build

# Etapa 2: Imagem final de execução em produção
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
# Porta padrão utilizada por containers e Cloud Run (injetada via PORT)
ENV PORT=8080

# Dependências estritamente de produção para pacotes externalizados
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Cópia dos artefatos compilados
COPY --from=builder /app/dist ./dist

# Diretório para persistência do banco SQLite
RUN mkdir -p /app/data

# Exposição da porta de rede
EXPOSE 8080

# Inicialização do backend Express autoritativo
CMD ["node", "dist/server.cjs"]
