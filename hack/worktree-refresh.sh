#!/bin/bash

# Refresh worktree with latest changes and dependencies
# Usage: ./hack/worktree-refresh.sh

set -e

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Refreshing Worktree${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get current worktree info
CURRENT_DIR=$(pwd)
CURRENT_BRANCH=$(git branch --show-current)

echo -e "${CYAN}📍 Current worktree:${NC} ${CURRENT_DIR}"
echo -e "${CYAN}🌿 Current branch:${NC} ${CURRENT_BRANCH}"
echo ""

# Check if we're in a worktree
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Not in a git repository${NC}"
  exit 1
fi

# Stash any uncommitted changes
echo -e "${CYAN}💾 Checking for uncommitted changes...${NC}"
if ! git diff-index --quiet HEAD --; then
  echo -e "${YELLOW}   Found uncommitted changes, stashing...${NC}"
  git stash push -m "worktree-refresh: $(date '+%Y-%m-%d %H:%M:%S')"
  STASHED=true
else
  echo -e "${GREEN}   ✓ No uncommitted changes${NC}"
  STASHED=false
fi

# Pull latest changes
echo ""
echo -e "${CYAN}🔄 Pulling latest changes...${NC}"
if git pull --rebase; then
  echo -e "${GREEN}   ✓ Successfully pulled latest changes${NC}"
else
  echo -e "${YELLOW}⚠️  Pull failed - you may need to resolve conflicts${NC}"
  if [ "$STASHED" = true ]; then
    echo -e "${YELLOW}   Your changes are stashed - use 'git stash pop' to restore them${NC}"
  fi
  exit 1
fi

# Restore stashed changes
if [ "$STASHED" = true ]; then
  echo ""
  echo -e "${CYAN}📦 Restoring stashed changes...${NC}"
  if git stash pop; then
    echo -e "${GREEN}   ✓ Successfully restored changes${NC}"
  else
    echo -e "${YELLOW}⚠️  Could not restore stashed changes - you may need to resolve conflicts${NC}"
    echo -e "${YELLOW}   Your changes are still in the stash - use 'git stash list' to see them${NC}"
  fi
fi

# Update dependencies
echo ""
echo -e "${CYAN}📦 Updating dependencies...${NC}"
if command -v pnpm >/dev/null 2>&1; then
  if pnpm install; then
    echo -e "${GREEN}   ✓ Dependencies updated${NC}"
  else
    echo -e "${YELLOW}⚠️  Dependency update failed${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠️  pnpm not found - skipping dependency update${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ Worktree refresh complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
