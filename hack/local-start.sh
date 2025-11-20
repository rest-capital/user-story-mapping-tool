#!/bin/bash

# Start local development environment (Docker + Backend)
# Usage: ./hack/local-start.sh or pnpm local:start

set -e

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Starting Local Development Environment${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo -e "${RED}❌ .env file not found!${NC}"
  echo "Create one from .env.example:"
  echo "  cp .env.example .env"
  exit 1
fi

# Check if backend .env.local exists
if [ ! -f apps/backend/.env.local ] && [ ! -f apps/backend/.env ]; then
  echo -e "${YELLOW}⚠️  Backend .env.local not found${NC}"
  echo "Creating from template..."
  if [ -f apps/backend/.env.example ]; then
    cp apps/backend/.env.example apps/backend/.env.local
    echo -e "${GREEN}   ✓ Created apps/backend/.env.local${NC}"
    echo -e "${YELLOW}   Remember to update Supabase credentials!${NC}"
  fi
fi

# Start Docker Compose services
echo -e "${CYAN}🐳 Starting Docker services...${NC}"
docker compose up -d

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to start Docker services${NC}"
  exit 1
fi

echo -e "${GREEN}   ✓ Docker services started${NC}"
echo ""

# Wait for services to be healthy (optional - can be customized)
echo -e "${CYAN}⏳ Waiting for services to be ready...${NC}"
sleep 3
echo -e "${GREEN}   ✓ Services ready${NC}"
echo ""

# Show running containers
echo -e "${CYAN}📊 Running containers:${NC}"
docker compose ps
echo ""

# Get ports from .env
if [ -f .env ]; then
  source .env
  echo -e "${CYAN}📍 Service URLs:${NC}"
  [ -n "$BACKEND_PORT" ] && echo -e "   ${GREEN}Backend:${NC} http://localhost:${BACKEND_PORT}"
  [ -n "$WEB_PORT" ] && echo -e "   ${GREEN}Frontend:${NC} http://localhost:${WEB_PORT}"
  echo ""
fi

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ Local environment started!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}💡 Next steps:${NC}"
echo "  1. Start backend: cd apps/backend && pnpm dev"
echo "  2. View logs: docker compose logs -f"
echo "  3. Stop services: docker compose down"
echo ""
