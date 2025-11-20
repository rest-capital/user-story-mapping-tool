#!/bin/bash
#
# Create Worktree Script
# Creates a new git worktree with environment setup
#
# Usage: ./scripts/create-worktree.sh <branch-name>
# Example: ./scripts/create-worktree.sh feature/user-auth

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if branch name provided
if [ -z "$1" ]; then
  echo -e "${RED}❌ Error: Branch name required${NC}"
  echo "Usage: $0 <branch-name>"
  echo "Example: $0 feature/user-auth"
  exit 1
fi

BRANCH_NAME="$1"
WORKTREE_BASE="$(pwd)/.worktrees"
WORKTREE_PATH="$WORKTREE_BASE/$BRANCH_NAME"

echo -e "${BLUE}🌳 Creating worktree for branch: ${BRANCH_NAME}${NC}"

# Create worktrees directory if it doesn't exist
mkdir -p "$WORKTREE_BASE"

# Check if worktree already exists
if [ -d "$WORKTREE_PATH" ]; then
  echo -e "${YELLOW}⚠️  Worktree already exists at: ${WORKTREE_PATH}${NC}"
  read -p "Remove and recreate? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🗑️  Removing existing worktree...${NC}"
    git worktree remove "$WORKTREE_PATH" --force
  else
    echo -e "${GREEN}✅ Using existing worktree${NC}"
    exit 0
  fi
fi

# Check if branch exists remotely
if git ls-remote --heads origin "$BRANCH_NAME" | grep -q "$BRANCH_NAME"; then
  echo -e "${BLUE}📥 Branch exists remotely, checking out...${NC}"
  git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
# Check if branch exists locally
elif git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
  echo -e "${BLUE}📂 Branch exists locally, checking out...${NC}"
  git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
else
  echo -e "${BLUE}🆕 Creating new branch...${NC}"
  git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH"
fi

echo -e "${GREEN}✅ Worktree created at: ${WORKTREE_PATH}${NC}"

# Setup environment file from template
if [ -f ".env.example" ]; then
  echo -e "${BLUE}📝 Setting up environment file...${NC}"

  cd "$WORKTREE_PATH"

  if [ ! -f ".env" ]; then
    cp .env.example .env

    # Generate unique ports (avoid conflicts with main and other worktrees)
    # Use a hash of the branch name to generate consistent port numbers
    # BUG 94 FIX: macOS uses 'md5 -q', Linux uses 'md5sum'
    if command -v md5sum >/dev/null 2>&1; then
      HASH=$(echo -n "$BRANCH_NAME" | md5sum | head -c 4)
    else
      HASH=$(echo -n "$BRANCH_NAME" | md5 -q | head -c 4)
    fi
    PORT_OFFSET=$((0x$HASH % 9000 + 1000))  # Port range: 1000-9999
    BACKEND_PORT=$((3000 + PORT_OFFSET))

    # Update .env with branch-specific values
    # BUG 92 FIX: BRANCH_NAME must use actual branch name (with slashes) for Docker labels
    ESCAPED_BRANCH_NAME=$(echo "$BRANCH_NAME" | sed 's/[&/\]/\\&/g')
    SANITIZED_BRANCH=$(echo "$BRANCH_NAME" | sed 's/\//-/g' | sed 's/[&/\]/\\&/g')

    sed -i.bak "s/COMPOSE_PROJECT_NAME=.*/COMPOSE_PROJECT_NAME=user-story-mapping-${SANITIZED_BRANCH}/" .env
    sed -i.bak "s/BRANCH_NAME=.*/BRANCH_NAME=${ESCAPED_BRANCH_NAME}/" .env
    sed -i.bak "s/BACKEND_PORT=.*/BACKEND_PORT=${BACKEND_PORT}/" .env

    rm -f .env.bak

    echo -e "${GREEN}✅ Environment configured${NC}"
    echo -e "   COMPOSE_PROJECT_NAME: user-story-mapping-${BRANCH_NAME//\//-}"
    echo -e "   BRANCH_NAME: ${BRANCH_NAME}"
    echo -e "   BACKEND_PORT: ${BACKEND_PORT}"
  else
    echo -e "${YELLOW}⚠️  .env already exists, skipping${NC}"
  fi

  cd - > /dev/null
fi

echo ""
echo -e "${GREEN}🎉 Worktree setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  cd $WORKTREE_PATH"
echo "  pnpm install  # Install dependencies"
echo "  docker compose up -d  # Start Docker services"
echo ""
