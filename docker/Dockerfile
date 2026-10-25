FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY core ./core
COPY agents ./agents
COPY apps ./apps
COPY scripts ./scripts
# Non-root, no secrets baked in, audit log lives on a mounted volume.
RUN mkdir -p /app/storage/audit && chown -R node:node /app/storage
USER node
ENV FPW_HOST=0.0.0.0 FPW_PORT=3000 FPW_ALLOW_NON_LOOPBACK=true
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "apps/workspace/server.js"]
