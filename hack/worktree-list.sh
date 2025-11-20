#!/bin/bash

# List all worktrees with nice formatting
# Usage: ./hack/worktree-list.sh

set -e

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Bare repository location
BARE_REPO="${HOME}/repos/user-story-mapping-tool.bare"

# Check if bare repo exists
if [ ! -d "$BARE_REPO" ]; then
  echo -e "${YELLOW}⚠️  Bare repository not found at ${BARE_REPO}${NC}"
  echo "Run: pnpm worktree:setup"
  exit 1
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Git Worktrees${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get worktree list
cd "$BARE_REPO"
worktree_output=$(git worktree list --porcelain)

# Parse and display worktrees
current_worktree=""
current_branch=""
count=0

while IFS= read -r line; do
  if [[ $line == worktree* ]]; then
    # New worktree entry
    if [ -n "$current_worktree" ]; then
      # Display previous worktree
      count=$((count + 1))

      # Extract ticket ID from path (last directory component)
      ticket_id=$(basename "$current_worktree")

      # Check if it's the main worktree
      if [ "$ticket_id" = "main" ]; then
        echo -e "${GREEN}📌 ${ticket_id}${NC}"
        echo -e "   ${BLUE}Branch:${NC} ${current_branch}"
        echo -e "   ${BLUE}Path:${NC}   ${current_worktree}"
      else
        echo -e "${YELLOW}🌿 ${ticket_id}${NC}"
        echo -e "   ${BLUE}Branch:${NC} ${current_branch}"
        echo -e "   ${BLUE}Path:${NC}   ${current_worktree}"
      fi
      echo ""
    fi

    # Extract worktree path
    current_worktree="${line#worktree }"
    current_branch=""

  elif [[ $line == branch* ]]; then
    # Extract branch name
    current_branch="${line#branch refs/heads/}"
  elif [[ $line == detached ]]; then
    current_branch="(detached HEAD)"
  fi
done <<< "$worktree_output"

# Display last worktree
if [ -n "$current_worktree" ]; then
  count=$((count + 1))
  ticket_id=$(basename "$current_worktree")

  if [ "$ticket_id" = "main" ]; then
    echo -e "${GREEN}📌 ${ticket_id}${NC}"
    echo -e "   ${BLUE}Branch:${NC} ${current_branch}"
    echo -e "   ${BLUE}Path:${NC}   ${current_worktree}"
  else
    echo -e "${YELLOW}🌿 ${ticket_id}${NC}"
    echo -e "   ${BLUE}Branch:${NC} ${current_branch}"
    echo -e "   ${BLUE}Path:${NC}   ${current_worktree}"
  fi
  echo ""
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Total: ${count} worktree(s)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
