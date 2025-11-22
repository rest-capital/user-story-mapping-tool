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
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}  ⚠️  WARNING: Bare repository already exists!${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "${RED}Deleting the bare repository will PERMANENTLY DELETE:${NC}"
  echo -e "${RED}  - Any unpushed commits in worktrees${NC}"
  echo -e "${RED}  - Any uncommitted changes${NC}"
  echo -e "${RED}  - Any stashes${NC}"
  echo ""
  echo -e "${YELLOW}Existing worktrees:${NC}"
  cd "$BARE_REPO"
  git worktree list || echo "  (could not list worktrees)"
  echo ""
  echo -e "${YELLOW}Please verify all work is pushed to remote!${NC}"
  echo ""
  read -p "Type 'DELETE' to confirm deletion (anything else cancels): " answer
  if [ "$answer" != "DELETE" ]; then
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

# Detect default branch (BUG 99 FIX: don't hardcode "main")
echo -e "${BLUE}🔍 Detecting default branch...${NC}"
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
if [ -z "$DEFAULT_BRANCH" ]; then
  # Fallback: try main, then master
  if git show-ref --verify --quiet refs/remotes/origin/main; then
    DEFAULT_BRANCH="main"
  elif git show-ref --verify --quiet refs/remotes/origin/master; then
    DEFAULT_BRANCH="master"
  else
    echo -e "${RED}❌ Error: Could not detect default branch${NC}"
    exit 1
  fi
fi
echo -e "${GREEN}   Default branch: ${DEFAULT_BRANCH}${NC}"

# Create main worktree
echo -e "${BLUE}🌿 Creating main worktree...${NC}"
MAIN_WORKTREE="${WORKTREE_BASE}/main"

if [ -d "$MAIN_WORKTREE" ]; then
  echo -e "${YELLOW}⚠️  Main worktree already exists, skipping${NC}"
else
  git worktree add "$MAIN_WORKTREE" "$DEFAULT_BRANCH"
  echo -e "${GREEN}✅ Main worktree created at: ${MAIN_WORKTREE}${NC}"
fi

# Create symlink to shared thoughts directory in main worktree
THOUGHTS_TARGET="${HOME}/thoughts/repos/user-story-mapping-tool"
echo ""
echo -e "${BLUE}📚 Setting up shared thoughts directory...${NC}"

if [ -d "$THOUGHTS_TARGET" ]; then
  cd "$MAIN_WORKTREE"
  if [ -L "thoughts" ]; then
    echo -e "${YELLOW}⚠️  Thoughts symlink already exists${NC}"
  elif [ -d "thoughts" ]; then
    echo -e "${YELLOW}⚠️  thoughts/ directory exists (not a symlink)${NC}"
    echo -e "${YELLOW}   You may want to backup and remove it manually${NC}"
  else
    ln -s "$THOUGHTS_TARGET" thoughts
    echo -e "${GREEN}✅ Thoughts symlink created in main worktree${NC}"
  fi
  cd "$BARE_REPO"
else
  echo -e "${YELLOW}⚠️  HumanLayer thoughts directory not found at:${NC}"
  echo -e "${YELLOW}   ${THOUGHTS_TARGET}${NC}"
  echo -e "${YELLOW}   Run 'humanlayer thoughts sync' to initialize${NC}"
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
