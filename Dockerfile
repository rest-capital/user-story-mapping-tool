# User Story Mapping Tool - Backend Dockerfile (FIXED VERSION)
# Multi-stage build for NestJS backend with hot reload support

# ==============================================================================
# Base Stage - Node.js with pnpm
# ==============================================================================
FROM node:20-slim AS base

# Setup pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Set working directory
WORKDIR /app

# ==============================================================================
# Development Stage - Hot Reload Support
# ==============================================================================
FROM base AS development

# Install procps and curl for hot reload and healthcheck support
# - procps: provides 'ps' command needed by nodemon
# - curl: needed for healthcheck in docker-compose.yml
RUN apt-get update && apt-get install -y procps curl && rm -rf /var/lib/apt/lists/*

# Copy workspace configuration files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all workspace packages
# Note: This project uses pnpm workspaces with apps/ directory
COPY apps ./apps
COPY libs ./libs

# Install dependencies with cache mount for faster rebuilds
# The cache mount persists the pnpm store between builds
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Generate Prisma client
# This is required before TypeScript can use it
RUN pnpm --filter @user-story-mapping/backend exec prisma generate

# Skip pre-build in development - use ts-node for hot reload
# Build will happen on-demand by NestJS dev server

# Expose backend port
EXPOSE 3000

# Health check is defined in docker-compose.yml for easier customization

# Start in development mode
# Note: This project uses 'tsc --watch & nodemon' pattern, not 'nest start --watch'
# The volumes in docker-compose.yml will map the source code for hot reload
CMD ["pnpm", "--filter", "@user-story-mapping/backend", "dev"]
