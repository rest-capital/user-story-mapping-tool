#!/bin/bash

# Create worktree with standardized naming for bare repository setup
# Usage: ./hack/create_worktree.sh ENG-123 feature/my-feature

set -e

TICKET_ID=$1
BRANCH_NAME=$2

# BUG 83 FIX: Trim whitespace from arguments (bash [ -z "  " ] is false!)
TICKET_ID=$(echo "$TICKET_ID" | xargs)
BRANCH_NAME=$(echo "$BRANCH_NAME" | xargs)

# Bare repository location
BARE_REPO="${HOME}/repos/user-story-mapping-tool.bare"
# Worktrees location
WORKTREE_BASE="${HOME}/code/user-story-mapping-tool"

if [ -z "$TICKET_ID" ] || [ -z "$BRANCH_NAME" ]; then
  echo "Usage: ./hack/create_worktree.sh TICKET_ID BRANCH_NAME"
  echo "Example: ./hack/create_worktree.sh ENG-123 feature/my-feature"
  exit 1
fi

# Sanitize ticket ID for directory name
WORKTREE_DIR="${WORKTREE_BASE}/${TICKET_ID}"

echo "📁 Creating worktree at: ${WORKTREE_DIR}"

# Check if worktree already exists
if [ -d "$WORKTREE_DIR" ]; then
  echo "❌ Error: Worktree already exists at ${WORKTREE_DIR}"
  # BUG 85 FIX: Quote variable in command suggestion
  echo "Remove it first with: git worktree remove \"${WORKTREE_DIR}\""
  exit 1
fi

# Create parent directory if needed
mkdir -p "$WORKTREE_BASE"

# BUG 84 FIX: Validate bare repository exists before using it
if [ ! -d "$BARE_REPO" ]; then
  echo "❌ Error: Bare repository not found at ${BARE_REPO}"
  echo "💡 Run setup script first: ./hack/setup_bare_repository.sh"
  exit 1
fi

# Create git worktree from bare repository
echo "🌿 Creating git worktree for branch: ${BRANCH_NAME}"

# Change to bare repository directory
cd "$BARE_REPO"

# Try simple approach first - git will auto-track if branch exists on exactly one remote
if git worktree add "$WORKTREE_DIR" "$BRANCH_NAME" 2>/dev/null; then
  echo "   ✅ Checked out existing branch (with auto-tracking if remote)"
else
  # Simple add failed - branch doesn't exist locally or remotely
  # Create new branch from current main
  echo "   Creating new branch from main..."
  git worktree add -b "$BRANCH_NAME" "$WORKTREE_DIR" main
fi

# Generate .env file with unique ports
echo "🌱 Generating .env configuration..."
cd "$WORKTREE_DIR"

# Generate random ports (40000-60000 range)
generate_port() {
  echo $(( 40000 + RANDOM % 20000 ))
}

# Create .env from .env.example template
if [ -f ".env.example" ]; then
  cp .env.example .env

  # Replace template variables with actual values
  # Template syntax: {{ branch() }} and {{ auto_port() }}
  SANITIZED_BRANCH=$(echo "$BRANCH_NAME" | sed 's/\//-/g')
  # BUG 88 FIX: Escape special sed characters (&, \, /) in replacement string
  # Otherwise branch names like "feature&test" break sed replacement
  SANITIZED_BRANCH=$(echo "$SANITIZED_BRANCH" | sed 's/[&/\]/\\&/g')

  # BUG 92 FIX: Escape BRANCH_NAME for sed (needs actual branch with slashes for Docker labels!)
  ESCAPED_BRANCH_NAME=$(echo "$BRANCH_NAME" | sed 's/[&/\]/\\&/g')

  PORT1=$(generate_port)
  PORT2=$(generate_port)
  PORT3=$(generate_port)
  PORT4=$(generate_port)

  # Perform replacements (basic implementation)
  sed -i.bak "s/{{ branch() }}/${SANITIZED_BRANCH}/g" .env
  # BUG 92 FIX: Replace BRANCH_NAME separately with ACTUAL branch name (not sanitized)
  # This ensures Docker labels have the correct branch name with slashes
  sed -i.bak "s/BRANCH_NAME={{ branch() }}/BRANCH_NAME=${ESCAPED_BRANCH_NAME}/" .env
  sed -i.bak "s/{{ auto_port() }}/${PORT1}/" .env  # First occurrence
  sed -i.bak "s/{{ auto_port() }}/${PORT2}/" .env  # Second occurrence
  sed -i.bak "s/{{ auto_port() }}/${PORT3}/" .env  # Third occurrence
  sed -i.bak "s/{{ auto_port() }}/${PORT4}/" .env  # Fourth occurrence
  rm .env.bak

  echo "✅ Generated .env with unique ports"
else
  echo "⚠️  No .env.example found - skipping .env generation"
fi

# Copy any local settings from main worktree
MAIN_WORKTREE="${WORKTREE_BASE}/main"

if [ -f "${MAIN_WORKTREE}/.claude/settings.local.json" ]; then
  echo "📋 Copying Claude settings from main worktree..."
  mkdir -p .claude
  cp "${MAIN_WORKTREE}/.claude/settings.local.json" .claude/
fi

# Initialize backend environment
if [ -f "apps/backend/.env.example" ]; then
  echo "🔧 Setting up backend environment..."
  cp apps/backend/.env.example apps/backend/.env.local
  echo "⚠️  Remember to update apps/backend/.env.local with your Supabase credentials"
fi

# Show generated configuration
echo ""
echo "✅ Worktree created successfully!"
echo ""
echo "📊 Generated configuration:"
cat .env
echo ""
echo "📍 Location: ${WORKTREE_DIR}"
echo "🌿 Branch: ${BRANCH_NAME}"
echo ""
echo "Next steps:"
echo "1. cd ${WORKTREE_DIR}"
echo "2. Update apps/backend/.env.local with Supabase credentials"
echo "3. pnpm install (if needed)"
echo "4. pnpm local:start"
echo ""
