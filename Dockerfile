### Multi-stage Dockerfile for Automacao_Vaccinar
# - Builds frontend (esbuild) and server (tsc) in a builder stage
# - Produces a lean runtime image with only production dependencies

FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies (including dev deps for build)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy build outputs and static assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/app.js ./app.js
COPY --from=builder /app/index.html ./index.html
COPY --from=builder /app/style.css ./style.css
COPY --from=builder /app/README.md ./README.md

EXPOSE 3000

CMD ["node", "dist/server.js"]
