#!/bin/bash

# One-time setup to convert existing repository to bare repository approach
# This enables multiple isolated worktrees for parallel AI agent development
#
# Usage: ./hack/setup_bare_repository.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Bare Repository Setup for Worktree Development${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Configuration
BARE_REPO="${HOME}/repos/user-story-mapping-tool.bare"
WORKTREE_BASE="${HOME}/code/user-story-mapping-tool"
CURRENT_DIR=$(pwd)
REPO_NAME="user-story-mapping-tool"

# Detect remote URL
REMOTE_URL=$(git config --get remote.origin.url)
if [ -z "$REMOTE_URL" ]; then
  echo -e "${RED}❌ Error: No remote origin found${NC}"
  echo "This script must be run from within a git repository"
  exit 1
fi

echo -e "${BLUE}📋 Configuration:${NC}"
echo "  Remote URL: ${REMOTE_URL}"
echo "  Bare repo location: ${BARE_REPO}"
echo "  Worktrees location: ${WORKTREE_BASE}"
echo ""

# Check if bare repo already exists
if [ -d "$BARE_REPO" ]; then
  echo -e "${YELLOW}⚠️  Bare repository already exists at: ${BARE_REPO}${NC}"
  echo ""
  read -p "Do you want to delete and recreate it? (y/n): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}ℹ️  Setup cancelled${NC}"
    exit 0
  fi
  echo -e "${YELLOW}🗑️  Removing existing bare repository...${NC}"
  rm -rf "$BARE_REPO"
fi

# Create parent directory for bare repo
mkdir -p "$(dirname "$BARE_REPO")"

# Clone as bare repository
echo -e "${BLUE}📥 Cloning as bare repository...${NC}"
git clone --bare "$REMOTE_URL" "$BARE_REPO"

# Configure bare repository
echo -e "${BLUE}⚙️  Configuring bare repository...${NC}"
cd "$BARE_REPO"

# Fix fetch configuration (bare repos don't fetch remote branches by default)
git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"

# Fetch all branches
echo -e "${BLUE}🔄 Fetching all branches...${NC}"
git fetch origin

# Create worktrees directory
echo -e "${BLUE}📁 Creating worktrees directory...${NC}"
mkdir -p "$WORKTREE_BASE"

# Create main worktree
echo -e "${BLUE}🌿 Creating main worktree...${NC}"
MAIN_WORKTREE="${WORKTREE_BASE}/main"

if [ -d "$MAIN_WORKTREE" ]; then
  echo -e "${YELLOW}⚠️  Main worktree already exists, skipping${NC}"
else
  git worktree add "$MAIN_WORKTREE" main
  echo -e "${GREEN}✅ Main worktree created at: ${MAIN_WORKTREE}${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ Bare Repository Setup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}📍 Repository Structure:${NC}"
echo "  Bare repo (git data): ${BARE_REPO}"
echo "  Main worktree: ${MAIN_WORKTREE}"
echo ""
echo -e "${CYAN}🚀 Next Steps:${NC}"
echo "  1. cd ${MAIN_WORKTREE}"
echo "  2. pnpm install"
echo "  3. Create worktrees with: pnpm worktree:create <TICKET_ID> <BRANCH_NAME>"
echo ""
echo -e "${CYAN}💡 Example:${NC}"
echo "  cd ${MAIN_WORKTREE}"
echo "  pnpm worktree:create ENG-123 feature/user-auth"
echo ""
