ARG BASE_IMAGE=nousresearch/hermes-agent:latest

# ==========================================
# Stage 1: Build stage
# ==========================================
FROM ${BASE_IMAGE} AS builder

USER root

# 安装构建依赖与系统编译工具
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    make \
    g++ \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

ENV NODE_OPTIONS=--max-old-space-size=4096 \
    npm_config_loglevel=error \
    npm_config_fund=false \
    npm_config_audit=false \
    npm_config_update_notifier=false

# 安装依赖并编译原生模块
RUN npm ci --ignore-scripts && npm rebuild node-pty

# 复制源码并构建产物，移除开发依赖与验证 Sharp
COPY . .
RUN npm run build && npm prune --omit=dev
RUN npm run verify:sharp-runtime

# 清理 node_modules 和 dist 中不必要的文档、测试、SourceMap 文件以缩小体积
RUN find node_modules -type f \( -name "*.map" -o -name "*.d.ts" -o -name "*.md" -o -name "LICENSE*" \) -delete \
    && find node_modules -type d \( -name "test" -o -name "tests" -o -name "docs" -o -name "examples" -o -name ".cache" \) -exec rm -rf {} + 2>/dev/null || true \
    && find dist -type f -name "*.map" -delete

# ==========================================
# Stage 2: Production stage (极致精简运行时)
# ==========================================
FROM ${BASE_IMAGE} AS production

USER root

# 仅安装运行时必要的系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 全局安装 Claude Code 与 Codex CLI 并清理 npm 缓存
RUN npm install -g --no-audit --no-fund @anthropic-ai/claude-code @openai/codex \
    && claude --version \
    && codex --version \
    && npm cache clean --force

WORKDIR /app

# 从 builder 仅复制生产环境必须的应用产物
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/bin ./bin

ENV NODE_ENV=production \
    HOME=/home/agent \
    HERMES_HOME=/home/agent/.hermes \
    HERMES_WEB_UI_MANAGED_GATEWAY=1 \
    PATH=/opt/hermes/.venv/bin:/usr/local/bin:$PATH

EXPOSE 6060

ENTRYPOINT ["node", "dist/server/index.js"]
CMD []