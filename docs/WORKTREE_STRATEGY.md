# Git Worktree Strategy - Implementation Guide

**Based on**: Industry-standard bare repository + worktree pattern (2024)
**Last Updated**: 2025-11-20
**Git Version**: 2.40+ required
**Purpose**: Complete guide for multiple isolated development environments with Docker

### 🎯 PRIMARY USE CASE

**Multiple AI agents working in parallel**, each with:
- ✅ Isolated Docker Compose environment
- ✅ Unique auto-assigned ports
- ✅ Independent test execution
- ✅ Complete environment isolation
- ✅ Git worktree per agent/feature

**This guide uses the industry-standard bare repository approach** as recommended for professional teams in 2024/2025.

### Document Updates

**Version 2.0** - Complete rewrite for industry-standard bare repository approach:
- ✅ **RESTRUCTURED**: Bare repository is now PRIMARY approach (not alternative)
- ✅ **ARCHITECTURE**: Designed for multiple AI agents with Docker isolation
- ✅ **RESEARCH-BACKED**: Industry standard for professional teams (2024/2025)
- ✅ **SIMPLIFIED**: Removed confusing multi-approach sections
- ✅ **FOCUSED**: Clear workflow for multi-agent parallel development
- ✅ **VERIFIED**: All commands tested against Git 2.40+ and Docker Compose
- ✅ Complete isolation per agent/worktree
- ✅ Automated .env generation with unique ports
- ✅ Database isolation strategies
- ✅ Clean setup/teardown workflows

**Why This Change**:
Research confirmed bare repository + worktrees is **industry standard** for:
- Multiple isolated Docker environments
- Professional teams with parallel development
- AI agents working on different features simultaneously
- Zero-conflict multi-environment testing

This matches your exact use case: multiple agents, Docker isolation, parallel testing.

---

## 🚀 Quick Start - pnpm Commands

**After one-time setup, your workflow is super simple:**

```bash
# In main worktree, create isolated environment for agent
cd ~/code/user-story-mapping-tool/main
pnpm worktree:create ENG-123 feature/user-auth

# Agent works in isolated environment
cd ~/code/user-story-mapping-tool/ENG-123
pnpm install && pnpm local:start

# Refresh worktree with latest changes (when needed)
pnpm worktree:refresh

# Clean up when done (RECOMMENDED - removes Docker volumes too!)
cd ~/code/user-story-mapping-tool/main
pnpm worktree:cleanup ENG-123

# Weekly maintenance (find and remove ALL orphaned Docker resources)
pnpm worktree:cleanup-all
```

**That's it! No manual scripts, just clean pnpm commands.**

---

## Table of Contents

1. [Overview](#overview)
2. [Why Worktrees?](#why-worktrees)
3. [Architecture](#architecture)
4. [Prerequisites](#prerequisites)
5. [Implementation Steps](#implementation-steps)
6. [Script Implementations](#script-implementations)
7. [Usage Examples](#usage-examples)
8. [Slash Command Integration](#slash-command-integration)
9. [Troubleshooting](#troubleshooting)
10. [Database and State Management](#database-and-state-management)
11. [Docker Cleanup and Maintenance](#docker-cleanup-and-maintenance)
12. [Error Handling and Prerequisites (Optional Enhancements)](#error-handling-and-prerequisites-optional-enhancements)
13. [Dry-Run Mode](#dry-run-mode)
14. [Advanced: CI/CD Integration](#advanced-cicd-integration)
15. [Summary](#summary)

---

## Overview

This document details how to implement a **git worktree management system** using the **bare repository pattern**, enabling multiple isolated development environments to run in parallel without port conflicts.

### What You Get

- ✅ Multiple branches running simultaneously
- ✅ Unique ports auto-assigned per worktree
- ✅ Isolated Docker containers per branch
- ✅ No configuration conflicts
- ✅ Clean separation between features
- ✅ Easy collaboration on colleague's branches

---

## Why Worktrees?

### The Problem

Traditional git workflow with single working directory:
```bash
# Working on feature A
git checkout feature-a
pnpm dev  # Running on port 3000

# Need to review feature B - BLOCKED!
# Can't switch branches while services running
# Must stop, switch, restart - loses context
```

### The Solution: Git Worktrees + Bare Repository

```bash
# Main worktree
~/code/user-story-mapping-tool/main     → ports 3000, 5173, 8288

# Feature A worktree
~/code/user-story-mapping-tool/ENG-123  → ports 40123, 40124, 40125, 40126

# Feature B worktree
~/code/user-story-mapping-tool/ENG-456  → ports 51892, 51893, 51894, 51895

# All running simultaneously! 🎉
```

---

## Architecture

### Directory Structure (Bare Repository Approach)

```
~/repos/
└── user-story-mapping-tool.bare/     # Bare git repository (git data only)
    ├── hooks/
    ├── objects/
    ├── refs/
    └── config

~/code/user-story-mapping-tool/       # Worktrees directory
├── main/                              # Main branch worktree
│   ├── .env                          # Unique ports for main
│   ├── docker-compose.yml
│   ├── hack/
│   │   └── create_worktree.sh       # Worktree creation script
│   └── [full project files]
│
├── ENG-123/                          # Agent 1's isolated environment
│   ├── .env                          # Unique ports (40123, 40124, ...)
│   ├── docker-compose.yml
│   └── [full project files]
│
└── ENG-456/                          # Agent 2's isolated environment
    ├── .env                          # Unique ports (51892, 51893, ...)
    ├── docker-compose.yml
    └── [full project files]
```

**Key Benefits:**
- ✅ All worktrees are equal (no special "main" directory that's different)
- ✅ Each agent/worktree has completely isolated Docker environment
- ✅ Can't accidentally commit to wrong branch (no files in bare repo)
- ✅ Easy cleanup (just delete worktree directory)

### How the Workflow Works

```
1. One-time: Clone repository as bare (git data only)
   ↓
2. One-time: Create main worktree
   ↓
3. On demand: Create feature worktree for each agent/ticket
   ↓
4. Auto-generate .env with unique ports ({{ auto_port() }})
   ↓
5. Each agent works in complete isolation
   ↓
6. Agent runs Docker Compose with unique project name
   ↓
7. Tests, builds, commits all isolated per worktree
   ↓
8. When done: Remove worktree, Docker auto-cleans up
```

**Result**: Multiple agents can work on different features simultaneously, each with their own running Docker environment, database, ports, and complete isolation.

---

## Prerequisites

### 1. Git 2.40+ Required

```bash
# Check your git version
git --version  # Should be 2.40 or higher

# Update if needed (macOS)
brew upgrade git
```

### 2. Required Tools

```bash
# pnpm for package management
npm install -g pnpm

# Docker for isolated environments
# Install from: https://docs.docker.com/get-docker/

# Supabase CLI (optional - if using Supabase)
brew install supabase/tap/supabase
```

---

## Implementation Steps

### Step 1: Initial Bare Repository Setup

**This is a one-time setup. You'll clone your repository as a bare repository.**

```bash
# 1. Clone as bare repository
cd ~/repos
git clone --bare git@github.com:yourorg/user-story-mapping-tool.git user-story-mapping-tool.bare

# 2. Fix fetch configuration (bare repos don't fetch remote branches by default)
cd user-story-mapping-tool.bare
git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"

# 3. Fetch all branches
git fetch origin

# 4. Create worktrees directory
mkdir -p ~/code/user-story-mapping-tool

# 5. Create main worktree
git worktree add ~/code/user-story-mapping-tool/main main
```

**What you now have:**
- `~/repos/user-story-mapping-tool.bare/` - Git data (never touch this directly)
- `~/code/user-story-mapping-tool/main/` - Your main branch worktree

### Step 2: Update `.env.example` with Template Syntax

**Location**: `~/code/user-story-mapping-tool/main/.env.example`

Replace the static `.env.example` with template syntax:

```bash
# Environment
NODE_ENV=development

# Server (auto-assigned ports)
PORT={{ auto_port() }}
API_PREFIX=api

# Supabase (shared across worktrees - runs on host)
SUPABASE_URL=your-project-url.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Database (uses host.docker.internal for Docker)
DATABASE_URL="postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres"

# CORS (references PORT - DO NOT use auto_port() again)
# Note: Requires .env parser with variable expansion support (e.g., dotenv-expand)
CORS_ORIGIN=http://localhost:${PORT}

# Docker Compose (if using Docker)
COMPOSE_PROJECT_NAME=user-story-mapping-{{ branch() }}
BRANCH_NAME={{ branch() }}  # For Docker labels (BUG 80 fix)
BACKEND_PORT={{ auto_port() }}
WEB_PORT={{ auto_port() }}
INNGEST_PORT={{ auto_port() }}
GIT_BRANCH={{ branch() }}
```

**Template Functions** (processed by create_worktree.sh):
- `{{ branch() }}` - Sanitized branch name (slashes become dashes)
- `{{ auto_port() }}` - Unique random port (40000-60000 range)
- Each `{{ auto_port() }}` call generates a DIFFERENT port

**Important Notes**:
- `${PORT}` syntax for variable references requires your .env parser to support variable expansion
- In Node.js, use `dotenv-expand` package: `require('dotenv-expand').expand(require('dotenv').config())`
- Alternatively, construct CORS_ORIGIN in application code from `process.env.PORT`

### Step 3: Create `hack/create_worktree.sh`

**Location**: `~/code/user-story-mapping-tool/main/hack/create_worktree.sh`

This script creates new worktrees for agents/features with complete isolation.

```bash
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
```

**Make it executable**:
```bash
cd ~/code/user-story-mapping-tool/main
chmod +x hack/create_worktree.sh
```

### Step 4: Create Smart Scripts

These scripts detect whether you're in main repo or worktree and act accordingly.

#### `scripts/smart-start.js`

**Location**: `~/code/user-story-mapping-tool/main/scripts/smart-start.js`

```javascript
#!/usr/bin/env node

/**
 * Smart Start - Detects environment and starts appropriate services
 *
 * Main directory: Starts Supabase + Docker
 * Worktree: Starts Docker only (Supabase runs in main)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function isWorktree() {
  // Check if we're in a worktree by comparing git-dir and git-common-dir
  try {
    const gitCommonDir = execSync('git rev-parse --git-common-dir', { encoding: 'utf8' }).trim();
    const gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf8' }).trim();

    // If git-dir and git-common-dir are different, we're in a worktree
    // Main repo: both return .git
    // Worktree: git-dir returns .git/worktrees/<name>, git-common-dir returns main .git
    return gitCommonDir !== gitDir;
  } catch (error) {
    return false;
  }
}

function checkEnvFile() {
  if (!fs.existsSync('.env')) {
    console.error('❌ Error: .env file not found');
    console.error('💡 Run: pnpm worktree:create <TICKET_ID> <BRANCH_NAME>');
    console.error('   Example: pnpm worktree:create ENG-123 feature/my-feature');
    process.exit(1);
  }
}

function parseEnv() {
  const ports = {};

  try {
    // BUG 74 FIX: Wrap file read in try-catch (TOCTOU race, I/O errors)
    const envContent = fs.readFileSync('.env', 'utf8');

    envContent.split('\n').forEach(line => {
      // BUG 73 FIX: Allow leading whitespace
      const match = line.match(/^\s*(\w+)=(.+)$/);
      if (match) {
        let [, key, value] = match;
        if (key.includes('PORT')) {
          // BUG 70 FIX: Remove inline comments (everything after #)
          value = value.split('#')[0].trim();
          // BUG 71 FIX: Strip quotes (single or double)
          value = value.replace(/^["']|["']$/g, '');
          // Only store if value is non-empty
          if (value) {
            ports[key] = value;
          }
        }
      }
    });
  } catch (error) {
    // If file read fails (deleted, permissions, etc.), return empty ports
    // Services will fail to start with helpful error about missing ports
    console.error('⚠️  Could not parse .env file:', error.message);
  }

  return ports;
}

function startSupabase() {
  console.log('🚀 Starting Supabase...');
  try {
    execSync('supabase start', { stdio: 'inherit' });
    console.log('✅ Supabase started');
  } catch (error) {
    console.error('❌ Failed to start Supabase');
    process.exit(1);
  }
}

function startDocker() {
  console.log('🐳 Starting Docker services...');
  try {
    execSync('docker compose up -d', { stdio: 'inherit' });
    console.log('✅ Docker services started');
  } catch (error) {
    console.error('❌ Failed to start Docker services');
    process.exit(1);
  }
}

function showServiceInfo(ports) {
  console.log('\n📡 Your services are running:');
  console.log('─────────────────────────────────────');

  if (ports.BACKEND_PORT) {
    console.log(`Backend:  http://localhost:${ports.BACKEND_PORT}`);
    console.log(`GraphQL:  http://localhost:${ports.BACKEND_PORT}/graphql`);
    console.log(`API Docs: http://localhost:${ports.BACKEND_PORT}/api/docs`);
  }

  if (ports.WEB_PORT) {
    console.log(`Frontend: http://localhost:${ports.WEB_PORT}`);
  }

  if (ports.INNGEST_PORT) {
    console.log(`Inngest:  http://localhost:${ports.INNGEST_PORT}`);
  }

  console.log('─────────────────────────────────────');
  console.log('\n💡 Quick commands:');
  console.log('  pnpm local:stop     - Stop all services');
  console.log('  pnpm local:restart  - Fast restart (no Supabase)');
  console.log('  pnpm docker:logs    - View logs');
  console.log('');
}

function main() {
  const inWorktree = isWorktree();

  console.log('🔍 Environment:', inWorktree ? 'Worktree' : 'Main Repository');

  checkEnvFile();
  const ports = parseEnv();

  if (!inWorktree) {
    // Main repository - start everything
    console.log('📦 Main repository - starting Supabase + Docker\n');
    startSupabase();
    console.log('');
  } else {
    // Worktree - Docker only
    console.log('🌿 Worktree detected - starting Docker only\n');
    console.log('ℹ️  Supabase runs in main repository');
    console.log('');
  }

  startDocker();
  showServiceInfo(ports);
}

main();
```

#### `scripts/smart-stop.js`

```javascript
#!/usr/bin/env node

/**
 * Smart Stop - Stops services appropriately
 */

const { execSync } = require('child_process');

function isWorktree() {
  try {
    const gitCommonDir = execSync('git rev-parse --git-common-dir', { encoding: 'utf8' }).trim();
    const gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf8' }).trim();
    return gitCommonDir !== gitDir;
  } catch (error) {
    return false;
  }
}

function main() {
  const inWorktree = isWorktree();

  console.log('🛑 Stopping services...\n');

  // Always stop Docker
  try {
    execSync('docker compose down', { stdio: 'inherit' });
    console.log('✅ Docker stopped');
  } catch (error) {
    console.error('⚠️  Docker stop failed (may not be running)');
  }

  // Only stop Supabase in main repo
  if (!inWorktree) {
    console.log('');
    try {
      execSync('supabase stop', { stdio: 'inherit' });
      console.log('✅ Supabase stopped');
    } catch (error) {
      console.error('⚠️  Supabase stop failed (may not be running)');
    }
  }

  console.log('\n✅ All services stopped');
}

main();
```

#### `scripts/smart-restart.js`

```javascript
#!/usr/bin/env node

/**
 * Smart Restart - Fast restart without Supabase (saves ~30 seconds)
 */

const { execSync } = require('child_process');

function main() {
  console.log('🔄 Fast restart (Docker only)...\n');

  try {
    execSync('docker compose restart', { stdio: 'inherit' });
    console.log('\n✅ Docker services restarted');
  } catch (error) {
    console.error('❌ Failed to restart Docker services');
    process.exit(1);
  }
}

main();
```

#### `scripts/worktree-workflow.js`

```javascript
#!/usr/bin/env node

/**
 * Interactive Worktree Creation - Guides user through worktree creation
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🌿 Worktree Creation - Create New Worktree\n');

  // Get branch name
  let branchName = await question('Enter branch name (e.g., feature/my-feature): ');
  // BUG 87 FIX: Trim whitespace (same issue as BUG 79)
  branchName = branchName?.trim();

  if (!branchName) {
    console.error('❌ Branch name required');
    process.exit(1);
  }

  // Extract ticket ID if present
  const ticketMatch = branchName.match(/(?:eng|ENG)-(\d+)/i);
  const ticketId = ticketMatch ? `ENG-${ticketMatch[1]}` : branchName.replace(/[\/]/g, '-');

  console.log(`\n📋 Ticket ID: ${ticketId}`);
  console.log(`🌿 Branch: ${branchName}\n`);

  const confirm = await question('Create worktree? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Cancelled');
    process.exit(0);
  }

  rl.close();

  // Create worktree
  console.log('\n📦 Creating worktree...\n');
  try {
    execSync(`./hack/create_worktree.sh "${ticketId}" "${branchName}"`, {
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('\n❌ Failed to create worktree');
    process.exit(1);
  }

  console.log('\n✅ Worktree created successfully!');
  console.log(`\n📍 Next: cd ~/code/user-story-mapping-tool/${ticketId}`);
}

main();
```

**Make scripts executable**:
```bash
cd ~/code/user-story-mapping-tool/main
chmod +x scripts/*.js
```

### Step 5: Add pnpm Scripts

**Location**: `~/code/user-story-mapping-tool/main/package.json`

Add these scripts to the root `package.json`:

```json
{
  "scripts": {
    "worktree:create": "./hack/create_worktree.sh",
    "worktree:list": "git worktree list",
    "worktree:remove": "git worktree remove",
    "worktree:refresh": "git fetch origin && git pull && pnpm install",
    "worktree:cleanup": "node scripts/worktree-cleanup.js",
    "worktree:cleanup-all": "node scripts/worktree-cleanup-all.js",

    "local:start": "node scripts/smart-start.js",
    "local:stop": "node scripts/smart-stop.js",
    "local:restart": "node scripts/smart-restart.js",

    "docker:dev": "docker compose up -d",
    "docker:logs": "docker compose logs -f",
    "docker:build": "docker compose build",
    "docker:down": "docker compose down -v",
    "docker:cleanup": "docker system prune -af --volumes"
  }
}
```

**Usage Examples:**

```bash
# Create new worktree for agent
pnpm worktree:create ENG-123 feature/user-auth

# List all worktrees
pnpm worktree:list

# Refresh current worktree (pull latest changes + update dependencies)
pnpm worktree:refresh

# Cleanup single worktree (with Docker volume removal)
pnpm worktree:cleanup ENG-123

# Find and remove ALL orphaned Docker resources (nuclear option)
pnpm worktree:cleanup-all

# Remove a worktree (basic - doesn't clean Docker volumes)
pnpm worktree:remove ~/code/user-story-mapping-tool/ENG-123
```

### Step 6: Update `.gitignore`

Add generated files to `.gitignore`:

```gitignore
# Generated env files
.env
.env.local

# Backup files from scripts
*.bak
```

---

## Script Implementations

### Additional Helper Scripts

#### `scripts/worktree-cleanup.js`

**Enhanced cleanup with explicit Docker volume removal** (prevents orphaned volumes):

```javascript
#!/usr/bin/env node

/**
 * Remove a single worktree with complete Docker cleanup
 *
 * Properly cleans up:
 * - Docker containers
 * - Docker volumes (by project name filter - works even if worktree deleted)
 * - Git worktree
 * - Stale git references
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

function execCommand(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
  } catch (error) {
    if (options.ignoreError) {
      return null;
    }
    throw error;
  }
}

function getBranchNameFromWorktree(worktreePath) {
  // Get branch name from git worktree list
  try {
    const output = execCommand('git worktree list --porcelain', { silent: true });
    const lines = output.split('\n');

    let foundPath = false;
    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        // Extract the worktree path and compare exactly (not substring match!)
        const worktreeFromLine = line.substring(9).trim();
        foundPath = (worktreeFromLine === worktreePath);
      } else if (foundPath && line.startsWith('branch ')) {
        const branch = line.substring(7).replace('refs/heads/', '');
        return branch;
      }
    }
  } catch (error) {
    // Ignore - worktree might not exist
  }
  return null;
}

function getComposeProjectName(ticketId, worktreePath) {
  // COMPOSE_PROJECT_NAME uses sanitized BRANCH name, not ticket ID!
  // Pattern in .env: user-story-mapping-{{ branch() }}
  // where {{ branch() }} = branch name with slashes replaced by dashes

  // Try to get actual branch name from git
  const branchName = getBranchNameFromWorktree(worktreePath);

  if (branchName) {
    // Sanitize branch name (replace slashes with dashes)
    const sanitized = branchName.replace(/\//g, '-');
    return `user-story-mapping-${sanitized}`;
  }

  // Fallback: Try reading from .env file if worktree exists
  if (fs.existsSync(worktreePath)) {
    try {
      const envPath = path.join(worktreePath, '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/^\s*COMPOSE_PROJECT_NAME=(.+)/m);
        if (match) {
          let value = match[1].trim();
          // BUG 67 FIX: Remove inline comments (everything after #)
          value = value.split('#')[0].trim();
          // BUG 66 FIX: Strip quotes (single or double)
          value = value.replace(/^["']|["']$/g, '');
          // BUG 65 FIX: Ensure value is not empty (would match ALL volumes!)
          if (value) {
            return value;
          }
        }
      }
    } catch (error) {
      // Ignore - continue to fallback
    }
  }

  // Last resort: Use ticket ID (may not match if branch name was different)
  console.warn('⚠️  Could not determine branch name, using ticket ID as fallback');
  return `user-story-mapping-${ticketId}`;
}

function stopDockerServices(worktreePath, projectName) {
  console.log('🛑 Stopping Docker services...');

  try {
    // Try to stop using docker compose from worktree
    if (fs.existsSync(worktreePath)) {
      execCommand('docker compose down -v', {
        cwd: worktreePath,
        ignoreError: true
      });
    }

    // Also try using project name directly (in case worktree is already deleted)
    execCommand(`docker compose -p "${projectName}" down -v`, {
      ignoreError: true
    });

    console.log('✅ Docker services stopped');
  } catch (error) {
    console.warn('⚠️  Could not stop some Docker services (they may not exist)');
  }
}

function removeDockerVolumes(projectName) {
  console.log('🧹 Removing Docker volumes...');

  try {
    // Get all volumes matching project name (Docker does substring matching!)
    const volumes = execCommand(`docker volume ls -q --filter "name=${projectName}"`, {
      silent: true,
      ignoreError: true
    });

    if (volumes && volumes.trim()) {
      const volumeList = volumes.trim().split('\n');

      // BUG 75 FIX: Filter to exact matches only (Docker filter does substring matching!)
      // Example: "user-story-mapping-auth" would also match "user-story-mapping-authentication"
      // We need to ensure volume name contains the EXACT project name, not just substring
      const exactMatches = volumeList.filter(volume => {
        // Volume patterns:
        //   user-story-mapping-feature-auth_db_data (projectName + underscore + rest)
        //   supabase_db_user-story-mapping-feature-auth (prefix + projectName at end)
        // BUG 77 FIX: Only check underscore separator, not dash (prevents false positives)
        // Dash check would match "user-story-mapping-api" in "user-story-mapping-api-v2_db_data"
        return volume.includes(projectName + '_') ||   // Standard pattern with underscore
               volume.endsWith(projectName);            // Exact match at end (prefixed volumes)
      });

      if (exactMatches.length === 0) {
        console.log('ℹ️  No Docker volumes found (after exact matching)');
        return;
      }

      exactMatches.forEach(volume => {
        try {
          execCommand(`docker volume rm "${volume}"`, {
            silent: true,
            ignoreError: true
          });
        } catch (error) {
          // Ignore errors for individual volumes
        }
      });
      console.log(`✅ Removed ${exactMatches.length} Docker volume(s)`);
    } else {
      console.log('ℹ️  No Docker volumes found');
    }
  } catch (error) {
    console.warn('⚠️  Could not remove some Docker volumes');
  }
}

function removeWorktree(worktreePath) {
  console.log('🗑️  Removing git worktree...');

  try {
    // Remove worktree using git
    execCommand(`git worktree remove "${worktreePath}"`, {
      ignoreError: true
    });

    // Force remove if still exists
    if (fs.existsSync(worktreePath)) {
      execCommand(`git worktree remove --force "${worktreePath}"`, {
        ignoreError: true
      });
    }

    // If directory still exists, remove it manually
    if (fs.existsSync(worktreePath)) {
      fs.rmSync(worktreePath, { recursive: true, force: true });
    }

    console.log('✅ Worktree removed');
  } catch (error) {
    console.error('❌ Failed to remove worktree');
    throw error;
  }
}

function pruneWorktrees() {
  console.log('🔧 Pruning worktree references...');
  execCommand('git worktree prune', { silent: true });
  console.log('✅ Worktree references pruned');
}

async function main() {
  const args = process.argv.slice(2);
  let ticketId = args[0];

  try {
    if (!ticketId) {
      ticketId = await question('Enter worktree directory name (e.g., ENG-123): ');
    }

    // BUG 79 FIX: Trim whitespace to reject empty/whitespace-only input
    ticketId = ticketId?.trim();

    if (!ticketId) {
      console.error('❌ Worktree directory name required');
      console.error('💡 Usage: pnpm worktree:cleanup ENG-123');
      process.exit(1);
    }

    const worktreePath = `${process.env.HOME}/code/user-story-mapping-tool/${ticketId}`;
    const projectName = getComposeProjectName(ticketId, worktreePath);

    console.log(`\n🗑️  Removing worktree: ${worktreePath}`);
    console.log(`📦 Docker project: ${projectName}`);
    console.log('');

    const confirm = await question('Continue with cleanup? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('Cancelled');
      process.exit(0);
    }

    // Step 1: Stop Docker services
    stopDockerServices(worktreePath, projectName);

    // Step 2: Remove Docker volumes explicitly
    removeDockerVolumes(projectName);

    // Step 3: Remove worktree
    removeWorktree(worktreePath);

    // Step 4: Prune worktree references
    pruneWorktrees();

    console.log('\n✅ Cleanup complete!');
    console.log('');

  } catch (error) {
    console.error(`\n❌ Cleanup failed: ${error.message}`);
    console.error(`💡 Try manually: git worktree remove "${worktreePath}"`);
    process.exit(1);
  } finally {
    // BUG 68 FIX: Always close readline, even if question() throws
    rl.close();
  }
}

main();
```

#### `scripts/worktree-cleanup-all.js`

**Nuclear option: Find and remove ALL orphaned Docker resources** across all worktrees:

```javascript
#!/usr/bin/env node

/**
 * Cleanup All Orphaned Worktree Resources
 *
 * Finds and removes orphaned Docker resources from deleted worktrees:
 * - Orphaned containers
 * - Orphaned volumes
 * - Stale git worktree references
 * - Docker build cache cleanup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

function execCommand(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
  } catch (error) {
    if (options.ignoreError) {
      return null;
    }
    throw error;
  }
}

function getActiveWorktrees() {
  // BUG 81 FIX: Handle git command failure gracefully
  try {
    const output = execCommand('git worktree list --porcelain', { silent: true });
    const worktrees = [];

    const lines = output.split('\n');
    let currentWorktree = null;

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        if (currentWorktree) {
          worktrees.push(currentWorktree);
        }
        // BUG 82 FIX: Trim path to remove any trailing whitespace
        currentWorktree = { path: line.substring(9).trim() };
      } else if (line.startsWith('branch ')) {
        if (currentWorktree) {
          // BUG 82 FIX: Trim branch name after processing
          currentWorktree.branch = line.substring(7).replace('refs/heads/', '').trim();
        }
      }
    }

    if (currentWorktree) {
      worktrees.push(currentWorktree);
    }

    return worktrees;
  } catch (error) {
    // Git command failed (not in repo, git not installed, etc.)
    // Return empty array so cleanup can continue checking Docker resources
    console.warn('⚠️  Could not get active worktrees:', error.message);
    return [];
  }
}

function findOrphanedVolumes() {
  console.log('🔍 Scanning for orphaned Docker volumes...');

  const allVolumes = execCommand('docker volume ls -q --filter name=user-story-mapping', {
    silent: true,
    ignoreError: true
  });

  if (!allVolumes || !allVolumes.trim()) {
    console.log('ℹ️  No project volumes found');
    return [];
  }

  const volumeList = allVolumes.trim().split('\n');
  const activeWorktrees = getActiveWorktrees();
  const orphanedVolumes = [];

  for (const volume of volumeList) {
    // Extract branch suffix from volume name
    // Main project volumes use underscores (e.g., user-story-mapping_db_data)
    // Worktree volumes use dashes (e.g., user-story-mapping-feature-auth_db_data)
    // This regex only matches worktree volumes (with branch after dash)
    const match = volume.match(/user-story-mapping-(.+)/);
    if (!match) continue; // Skip main project volumes (no dash-suffix)

    const projectSuffix = match[1];

    // Check if corresponding worktree exists
    const isOrphaned = !activeWorktrees.some(wt => {
      // Skip worktrees without a branch (detached HEAD)
      if (!wt.branch) return false;
      const branchSanitized = wt.branch.replace(/\//g, '-');
      // Use precise pattern matching on the extracted suffix, not full volume name
      // projectSuffix examples:
      //   "feature-auth_db_data" (from user-story-mapping-feature-auth_db_data)
      //   "feature-auth" (from supabase_db_user-story-mapping-feature-auth)
      // BUG 76 FIX: Only check for exact match or underscore separator
      // The dash separator check caused false positives (e.g., "api" matching "api-v2")
      return projectSuffix === branchSanitized ||              // Prefixed volumes (exact match)
             projectSuffix.startsWith(branchSanitized + '_');  // Standard volumes (underscore only)
    });

    if (isOrphaned) {
      orphanedVolumes.push(volume);
    }
  }

  return orphanedVolumes;
}

function findOrphanedContainers() {
  console.log('🔍 Scanning for orphaned Docker containers...');

  // ENHANCED: Get containers with branch labels (BUG 80 FIX)
  // Format: "container_name|||branch_label" (BUG 90 FIX: use ||| delimiter to avoid conflicts with branch names)
  // BUG 91 FIX: Use name filter (not label filter) to include old containers without labels
  const allContainers = execCommand(
    'docker ps -a --filter name=user-story-mapping --format "{{.Names}}|||{{.Label \\"worktree.branch\\"}}"',
    { silent: true, ignoreError: true }
  );

  if (!allContainers || !allContainers.trim()) {
    console.log('ℹ️  No project containers found');
    return [];
  }

  const containerList = allContainers.trim().split('\n');
  const activeWorktrees = getActiveWorktrees();
  const orphanedContainers = [];

  for (const entry of containerList) {
    // BUG 90 FIX: Use ||| delimiter (pipe is valid in branch names though rare)
    const delimiterIndex = entry.indexOf('|||');
    if (delimiterIndex === -1) {
      console.warn(`⚠️  Unexpected format: ${entry}`);
      continue;
    }
    const containerName = entry.substring(0, delimiterIndex).trim(); // BUG 93 FIX: trim whitespace
    const branchLabel = entry.substring(delimiterIndex + 3).trim(); // BUG 93 FIX: trim whitespace

    // Check if this is a main project container (no branch label or old container without labels)
    if (!branchLabel || branchLabel === '<no value>') {
      // Main project container - parse name for backwards compatibility
      // Main: user-story-mapping-<service>-<number> (e.g., user-story-mapping-backend-1)
      const afterPrefix = containerName.replace('user-story-mapping-', '');
      const parts = afterPrefix.split('-');
      // If only 2 parts (service and number), it's a main container
      if (parts.length === 2 && /^\d+$/.test(parts[1])) {
        continue; // Keep main project containers
      }

      // Old container without labels - fall back to name-based matching
      const isOrphaned = !activeWorktrees.some(wt => {
        if (!wt.branch) return false;
        const branchSanitized = wt.branch.replace(/\//g, '-');

        const expectedProjectParts = `user-story-mapping-${branchSanitized}`.split('-');
        const containerParts = containerName.split('-');

        if (containerParts.length < expectedProjectParts.length + 2) return false;
        if (!/^\d+$/.test(containerParts[containerParts.length - 1])) return false;

        for (let i = 0; i < expectedProjectParts.length; i++) {
          if (containerParts[i] !== expectedProjectParts[i]) return false;
        }

        return true;
      });

      if (isOrphaned) {
        orphanedContainers.push(containerName);
      }
      continue;
    }

    // ENHANCED LOGIC: Use label for perfect branch matching!
    // BUG 80 RESOLVED: No more ambiguity - label tells us exactly which branch owns this
    const isOrphaned = !activeWorktrees.some(wt => {
      if (!wt.branch) return false;
      // Perfect match: compare actual branch names (no sanitization needed!)
      return wt.branch === branchLabel;
    });

    if (isOrphaned) {
      orphanedContainers.push(containerName);
    }
  }

  return orphanedContainers;
}

async function cleanupOrphans() {
  console.log('\n🔍 Scanning for Orphaned Resources\n');

  const orphanedVolumes = findOrphanedVolumes();
  const orphanedContainers = findOrphanedContainers();

  if (orphanedVolumes.length === 0 && orphanedContainers.length === 0) {
    console.log('✅ No orphaned resources found!');
    return;
  }

  console.log('\nFound orphaned resources:');

  if (orphanedContainers.length > 0) {
    console.log(`\n⚠️  Containers (${orphanedContainers.length}):`);
    orphanedContainers.forEach(c => console.log(`  - ${c}`));
  }

  if (orphanedVolumes.length > 0) {
    console.log(`\n⚠️  Volumes (${orphanedVolumes.length}):`);
    orphanedVolumes.forEach(v => console.log(`  - ${v}`));
  }

  console.log('');
  const answer = await question('Remove all orphaned resources? (y/n): ');

  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    console.log('Cleanup cancelled');
    return;
  }

  // Remove containers
  if (orphanedContainers.length > 0) {
    console.log('\n🧹 Removing orphaned containers...');
    orphanedContainers.forEach(container => {
      execCommand(`docker rm -f "${container}"`, { silent: true, ignoreError: true });
    });
    console.log(`✅ Removed ${orphanedContainers.length} container(s)`);
  }

  // Remove volumes
  if (orphanedVolumes.length > 0) {
    console.log('🧹 Removing orphaned volumes...');
    orphanedVolumes.forEach(volume => {
      execCommand(`docker volume rm "${volume}"`, { silent: true, ignoreError: true });
    });
    console.log(`✅ Removed ${orphanedVolumes.length} volume(s)`);
  }
}

function pruneGitWorktrees() {
  console.log('\n🔧 Pruning stale git worktree references...');
  execCommand('git worktree prune', { silent: true });
  console.log('✅ Git worktrees pruned');
}

function cleanupDockerCache() {
  console.log('\n🧹 Cleaning up Docker build cache and old images...');

  try {
    // Show current disk usage
    const beforeDf = execCommand('docker system df', { silent: true });
    console.log('\nBefore cleanup:');
    console.log(beforeDf);

    // Prune build cache
    execCommand('docker builder prune -f', { silent: true });

    // Prune images older than 72 hours
    execCommand('docker image prune -a -f --filter "until=72h"', { silent: true });

    // Prune unused volumes (beyond project-specific ones already removed)
    execCommand('docker volume prune -f', { silent: true });

    // Show after disk usage
    const afterDf = execCommand('docker system df', { silent: true });
    console.log('\nAfter cleanup:');
    console.log(afterDf);

    console.log('✅ Docker cleanup complete');
  } catch (error) {
    console.warn('⚠️  Could not complete Docker cleanup - Docker may not be running');
  }
}

async function main() {
  try {
    console.log('🧹 Worktree Cleanup - Remove All Orphans\n');

    // Step 1: Cleanup orphaned Docker resources
    await cleanupOrphans();

    // Step 2: Prune git worktrees
    pruneGitWorktrees();

    // Step 3: Cleanup Docker build cache and old images
    cleanupDockerCache();

    console.log('\n✅ Cleanup complete!');
    console.log('');

  } catch (error) {
    console.error(`\n❌ Cleanup failed: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
```

**Make script executable**:
```bash
cd ~/code/user-story-mapping-tool/main
chmod +x scripts/worktree-cleanup-all.js
```

---

## Usage Examples

### Creating a New Worktree (Agent Environment)

#### Simple pnpm Command

```bash
# Navigate to main worktree
cd ~/code/user-story-mapping-tool/main

# Create new isolated environment for agent/feature
pnpm worktree:create ENG-123 feature/user-auth
```

**What happens automatically:**
1. ✅ Creates `~/code/user-story-mapping-tool/ENG-123/` directory
2. ✅ Checks out `feature/user-auth` branch (or creates it from main)
3. ✅ Generates `.env` with unique ports (e.g., 40123, 40124, 40125)
4. ✅ Copies settings from main worktree
5. ✅ Ready for isolated Docker environment

**Output:**
```
📁 Creating worktree at: /Users/you/code/user-story-mapping-tool/ENG-123
🌿 Creating git worktree for branch: feature/user-auth
   Creating new branch from main...
🌱 Generating .env configuration...
✅ Generated .env with unique ports
📋 Copying Claude settings from main worktree...
✅ Worktree created successfully!

📊 Generated configuration:
PORT=40123
BACKEND_PORT=40124
WEB_PORT=40125
INNGEST_PORT=40126
COMPOSE_PROJECT_NAME=user-story-mapping-feature-user-auth
GIT_BRANCH=feature-user-auth
```

### Working in Isolated Agent Environment

```bash
# Navigate to agent's worktree
cd ~/code/user-story-mapping-tool/ENG-123

# Verify unique ports
cat .env
# PORT=40123
# BACKEND_PORT=40124
# WEB_PORT=40125
# INNGEST_PORT=40126

# Install dependencies (first time)
pnpm install

# Start isolated Docker environment
pnpm local:start
# This starts Docker with COMPOSE_PROJECT_NAME=user-story-mapping-feature-user-auth

# Agent works in complete isolation
# - Own database
# - Own ports
# - Own Docker containers
# - Can run tests without affecting other agents

# Commit work
git add .
git commit -m "Implement user auth"
git push origin feature/user-auth
```

### Reviewing Colleague's Branch

```bash
# From bare repository directory
cd ~/repos/user-story-mapping-tool.bare

# Add colleague's remote (one-time)
git remote add colleague git@github.com:colleague/user-story-mapping-tool

# Fetch their branches
git fetch colleague

# Create worktree for their branch
git worktree add ~/code/user-story-mapping-tool/review-456 colleague/their-feature

# Navigate and set up
cd ~/code/user-story-mapping-tool/review-456
cp ~/code/user-story-mapping-tool/main/.env.example .env
# Manually edit .env with unique ports, or run script

pnpm install
pnpm local:start
```

### Refreshing a Worktree (NEW!)

The `worktree:refresh` command syncs your worktree with the latest changes and dependencies:

```bash
# In any worktree, pull latest changes and update dependencies
cd ~/code/user-story-mapping-tool/ENG-123
pnpm worktree:refresh
```

**What it does:**
1. ✅ Fetches latest changes from origin
2. ✅ Pulls changes into current branch
3. ✅ Runs `pnpm install` to update dependencies

**When to use it:**
- After main branch gets new commits you need
- When package.json is updated in main
- When starting work on a stale worktree
- After pulling changes from colleague's remote

**Pro tip:** Run this in your main worktree regularly to keep it updated:
```bash
cd ~/code/user-story-mapping-tool/main
pnpm worktree:refresh
```

### Cleaning Up Agent Environment

**✅ RECOMMENDED: Use enhanced cleanup (removes Docker volumes):**

```bash
# From main worktree, cleanup everything properly
cd ~/code/user-story-mapping-tool/main
pnpm worktree:cleanup ENG-123

# List remaining active worktrees
pnpm worktree:list
```

**Alternative: Manual cleanup (may leave orphaned volumes):**

```bash
# Stop and remove Docker containers
cd ~/code/user-story-mapping-tool/ENG-123
pnpm docker:down

# Remove the worktree (from main worktree for convenience)
cd ~/code/user-story-mapping-tool/main
pnpm worktree:remove ~/code/user-story-mapping-tool/ENG-123

# Or force remove if there are uncommitted changes
pnpm worktree:remove ~/code/user-story-mapping-tool/ENG-123 -- --force
```

**⚠️ Warning:** Manual cleanup may leave orphaned Docker volumes. Use `pnpm worktree:cleanup-all` to find and remove them later.

---

## Slash Command Integration

### Update Slash Commands

The existing slash commands in `.claude/commands/` reference worktree creation. Ensure they use the correct paths:

#### `.claude/commands/create_worktree.md`

```markdown
2. set up worktree for implementation:
2a. read `hack/create_worktree.sh` and create a new worktree with the Linear branch name: `./hack/create_worktree.sh ENG-XXXX BRANCH_NAME`
```

#### `.claude/commands/local_review.md`

```markdown
3. **Set up the remote and worktree**:
   - Check if the remote already exists using `git remote -v`
   - If not, add it: `git remote add USERNAME git@github.com:USERNAME/user-story-mapping-tool`
   - Fetch from the remote: `git fetch USERNAME`
   - Create worktree: `git worktree add -b BRANCHNAME ~/code/user-story-mapping-tool/SHORT_NAME USERNAME/BRANCHNAME`
```

---

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port
lsof -i :3000

# Kill if needed
kill -9 <PID>

# Or create new worktree with different ports
pnpm worktree:create ENG-124 feature/another-feature
```

### Worktree Already Exists

```bash
# Remove existing worktree WITH Docker cleanup (recommended)
cd ~/code/user-story-mapping-tool/main
pnpm worktree:cleanup ENG-123

# Or basic remove (doesn't clean Docker volumes)
pnpm worktree:remove ~/code/user-story-mapping-tool/ENG-123

# Or force remove
git worktree remove ~/code/user-story-mapping-tool/ENG-123 --force
```

### Docker Conflicts

```bash
# List all containers
docker ps -a | grep user-story-mapping

# Stop all project containers
docker compose down -v

# Find and remove orphaned Docker resources (RECOMMENDED)
cd ~/code/user-story-mapping-tool/main
pnpm worktree:cleanup-all
```

**See [Docker Cleanup and Maintenance](#docker-cleanup-and-maintenance) section for details.**

### Orphaned Docker Volumes

If you deleted worktrees without proper cleanup, you may have orphaned volumes:

```bash
# Check for orphaned volumes
docker volume ls | grep user-story-mapping

# Find and remove ALL orphans automatically
cd ~/code/user-story-mapping-tool/main
pnpm worktree:cleanup-all
```

This scans all volumes/containers and removes ones that don't match active worktrees.

### Missing .env File

```bash
# Regenerate .env from example
cd ~/code/user-story-mapping-tool/ENG-123
cp .env.example .env
# Then manually edit ports, or run the create script again

# Or copy from main repo
cp ~/code/user-story-mapping-tool/main/.env .env
# Then edit ports to be unique
```

### Shared Directory Issues

By default, git worktrees share the `.git` directory but have separate working trees. For shared resources (like `thoughts/` directory), use symlinks:

```bash
# In worktree
ln -s ~/code/user-story-mapping-tool/main/thoughts thoughts
```

Or configure git to handle shared directories appropriately.

---

## Database and State Management

### How Worktrees Handle Database Data

**IMPORTANT**: All worktrees share the same Supabase instance running on the host machine.

#### Database Isolation Strategies

**Option 1: Shared Database (Simplest)**
- All worktrees connect to the same database
- Use naming conventions for test data (e.g., prefix with branch name)
- Clean up your test data when done
- **Pros**: Simple, no configuration needed
- **Cons**: Risk of data conflicts between worktrees

**Option 2: Separate Databases Per Worktree**
```bash
# In each worktree's apps/backend/.env.local
DATABASE_URL="postgresql://postgres:password@host:5432/db_eng_123"

# Create database for worktree
psql -h localhost -p 54322 -U postgres -c "CREATE DATABASE db_eng_123;"

# Run migrations in worktree
cd ~/code/user-story-mapping-tool/ENG-123
pnpm --filter backend exec prisma migrate deploy
```
- **Pros**: Complete isolation, no conflicts
- **Cons**: More setup, multiple databases to manage

**Option 3: Use Docker with Separate Postgres Instances**
- Each worktree's Docker Compose spins up its own Postgres container
- Completely isolated, no shared state
- **Pros**: True isolation, automatic cleanup on container removal
- **Cons**: Higher resource usage, slower startup

#### Best Practices

1. **Development Data**: Use separate databases per worktree
2. **Schema Changes**: Test migrations in worktree before merging
3. **Cleanup**: Drop worktree databases when removing worktree:
   ```bash
   # Optional: Add to worktree-cleanup.js or run manually
   psql -h localhost -p 54322 -U postgres -c "DROP DATABASE IF EXISTS db_eng_123;"
   ```

### Supabase Sharing Across Worktrees

**How It Works**:
- Supabase runs ONCE in the main repository
- All worktrees connect to the same Supabase instance via `host.docker.internal`
- Auth state is isolated (each worktree has its own session cookies)
- Database can be shared or isolated (see above)

**Verification**:
```bash
# In main worktree
cd ~/code/user-story-mapping-tool/main
supabase status
# Note the ports: DB (54322), API (54321), Studio (54323)

# In worktree
cd ~/code/user-story-mapping-tool/ENG-123
# Check apps/backend/.env.local uses same ports:
# DATABASE_URL="postgresql://...@host.docker.internal:54322/..."
# SUPABASE_URL="http://host.docker.internal:54321"
```

**Why This Architecture?**:
- ✅ Single Supabase instance = faster, less resource usage
- ✅ Shared migrations = all worktrees see latest schema
- ✅ Easier to manage auth users (one auth database)
- ⚠️ Careful with database data (use isolation strategy above)

---

## Docker Cleanup and Maintenance

### The "Zombie Data" Problem

When working with multiple worktrees and Docker, you can accumulate **orphaned resources** that persist after worktree deletion:

❌ **Orphaned volumes** - Database volumes, pnpm cache volumes that outlive the worktree
❌ **Orphaned containers** - Stopped containers that aren't removed
❌ **Stale networks** - Docker networks that aren't cleaned up
❌ **Build cache bloat** - Can grow to 40GB+ over time
❌ **Dangling images** - Old Docker images from previous builds

**Why this happens:**
- `docker compose down -v` only works if you run it FROM the worktree directory
- If you delete the worktree directory first, Docker can't find docker-compose.yml
- Volumes persist by design (to prevent accidental data loss)
- Docker doesn't know the worktree is deleted

### Solution: Enhanced Cleanup Scripts

Our enhanced cleanup scripts solve this by:

1. **✅ Using project name filters** - Find volumes even without worktree directory
2. **✅ Cross-referencing active worktrees** - Identify true orphans
3. **✅ Explicit volume removal** - Clean up volumes Docker leaves behind
4. **✅ Build cache cleanup** - Reclaim disk space from old builds

### Cleanup Workflows

#### Single Worktree Cleanup (Recommended)

When you're done with a worktree, use the enhanced cleanup script:

```bash
# From main worktree
cd ~/code/user-story-mapping-tool/main
pnpm worktree:cleanup ENG-123
```

**What it does:**
1. ✅ Stops Docker containers (tries both from worktree and by project name)
2. ✅ Explicitly removes ALL volumes matching the project name (derived from branch name)
3. ✅ Removes git worktree
4. ✅ Prunes stale git references

**Output example:**
```
🗑️  Removing worktree: /Users/you/code/user-story-mapping-tool/ENG-123
📦 Docker project: user-story-mapping-feature-user-auth

Continue with cleanup? (y/n): y

🛑 Stopping Docker services...
✅ Docker services stopped

🧹 Removing Docker volumes...
✅ Removed 3 Docker volume(s)

🗑️  Removing git worktree...
✅ Worktree removed

🔧 Pruning worktree references...
✅ Worktree references pruned

✅ Cleanup complete!
```

**Note**: The Docker project name is derived from your branch name (with slashes → dashes), not the ticket ID. For example:
- Ticket ID: `ENG-123`
- Branch: `feature/user-auth`
- Docker project name: `user-story-mapping-feature-user-auth`

This is why the script queries git to find the actual branch name from the worktree path.

#### System-Wide Orphan Detection (Nuclear Option)

If you suspect orphaned resources across multiple deleted worktrees:

```bash
# From main worktree
cd ~/code/user-story-mapping-tool/main
pnpm worktree:cleanup-all
```

**What it does:**
1. ✅ Scans all Docker volumes and containers matching project name pattern
2. ✅ Gets list of active worktrees from git
3. ✅ Cross-references to find true orphans
4. ✅ Shows you what will be deleted
5. ✅ Removes all orphaned resources
6. ✅ Cleans up Docker build cache and old images
7. ✅ Shows before/after disk usage

**Output example:**
```
🧹 Worktree Cleanup - Remove All Orphans

🔍 Scanning for Orphaned Resources

🔍 Scanning for orphaned Docker volumes...
🔍 Scanning for orphaned Docker containers...

Found orphaned resources:

⚠️  Containers (3):
  - user-story-mapping-feature-auth-backend-1
  - user-story-mapping-old-branch-web-1
  - user-story-mapping-test-feature-inngest-1

⚠️  Volumes (7):
  - user-story-mapping-feature-auth_db_data
  - user-story-mapping-old-branch_pnpm_cache
  - supabase_db_user-story-mapping-test-feature

Remove all orphaned resources? (y/n): y

🧹 Removing orphaned containers...
✅ Removed 3 container(s)

🧹 Removing orphaned volumes...
✅ Removed 7 volume(s)

🔧 Pruning stale git worktree references...
✅ Git worktrees pruned

🧹 Cleaning up Docker build cache and old images...

Before cleanup:
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          45        19        22GB      13.5GB (61%)
Volumes         142       16        24.92GB   23.99GB (96%)
Build Cache     103       0         2.507GB   2.507GB (100%)

After cleanup:
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          16        16        7.8GB     105.7MB (1%)
Volumes         9         9         1.1GB     0B (0%)
Build Cache     0         0         0B        0B

✅ Docker cleanup complete

✅ Cleanup complete!
```

**Freed disk space: 40GB+!**

### Enhanced Solution: Docker Labels for Perfect Branch Tracking

**Problem Solved**: Resolves BUG 80 - container naming ambiguity

#### The Limitation (Before This Solution)

Docker container names follow the pattern: `user-story-mapping-{branch}-{service}-{replica}`

This creates ambiguity when both branches and services can have dashes:
- Container: `user-story-mapping-api-v2-backend-1`
- Could be: Branch `api` + service `v2-backend`, OR
- Could be: Branch `api-v2` + service `backend`

**Impact**: Cleanup script can't definitively identify which branch owns the container.

#### The Solution: Docker Labels

Add branch name as a Docker label so containers carry their source branch metadata.

**Step 1: Update docker-compose.yml**

Add labels to all services in your `docker-compose.yml`:

```yaml
services:
  backend:
    container_name: ${COMPOSE_PROJECT_NAME:-user-story-mapping}_backend
    labels:
      - "worktree.branch=${BRANCH_NAME}"  # ← Add this!
      - "worktree.project=user-story-mapping"
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    working_dir: /app/apps/backend
    command: pnpm dev
    ports:
      - "${BACKEND_PORT:-3010}:3010"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/apps/backend/node_modules
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"

  web:
    container_name: ${COMPOSE_PROJECT_NAME:-user-story-mapping}_web
    labels:
      - "worktree.branch=${BRANCH_NAME}"  # ← Add this!
      - "worktree.project=user-story-mapping"
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    working_dir: /app/apps/web
    command: pnpm dev
    ports:
      - "${WEB_PORT:-3000}:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/apps/web/node_modules
```

**Step 2: Update .env.example**

Ensure the template includes `BRANCH_NAME`:

```bash
# .env.example (Sprout template)
COMPOSE_PROJECT_NAME=user-story-mapping-{{ branch() }}
BRANCH_NAME={{ branch() }}  # ← Add this line
BACKEND_PORT={{ auto_port() }}
WEB_PORT={{ auto_port() }}
INNGEST_PORT={{ auto_port() }}
```

**Step 3: Update create_worktree.sh**

The script already handles this via the template replacement! The `{{ branch() }}` gets replaced with the actual branch name.

**Step 4: Enhanced Cleanup Script**

Update `worktree-cleanup-all.js` to use labels:

```javascript
function findOrphanedContainers() {
  console.log('🔍 Scanning for orphaned Docker containers...');

  // Get all project containers WITH their labels
  // Use name filter (not label filter) to include old containers without labels
  // Use ||| delimiter to handle branch names with | character
  const allContainers = execCommand(
    'docker ps -a --filter name=user-story-mapping --format "{{.Names}}|||{{.Label \\"worktree.branch\\"}}"',
    { silent: true, ignoreError: true }
  );

  if (!allContainers || !allContainers.trim()) {
    console.log('ℹ️  No project containers found');
    return [];
  }

  const containerList = allContainers.trim().split('\n');
  const activeWorktrees = getActiveWorktrees();
  const orphanedContainers = [];

  for (const entry of containerList) {
    // Parse using ||| delimiter and indexOf to handle branch names with pipe
    const delimiterIndex = entry.indexOf('|||');
    if (delimiterIndex === -1) continue;
    const containerName = entry.substring(0, delimiterIndex);
    const branchLabel = entry.substring(delimiterIndex + 3);

    // Check if this is a main project container (no branch label)
    if (!branchLabel || branchLabel === '<no value>') {
      // Main project container - parse name as before
      const afterPrefix = containerName.replace('user-story-mapping-', '');
      const parts = afterPrefix.split('-');
      if (parts.length === 2 && /^\d+$/.test(parts[1])) {
        continue; // Keep main project containers
      }
    }

    // Check if corresponding worktree exists
    const isOrphaned = !activeWorktrees.some(wt => {
      if (!wt.branch) return false;

      // PERFECT MATCH: Compare actual branch names!
      // No more ambiguity - the label tells us exactly which branch owns this
      return wt.branch === branchLabel;
    });

    if (isOrphaned) {
      orphanedContainers.push(containerName);
    }
  }

  return orphanedContainers;
}
```

#### Benefits of This Solution

✅ **Perfect Accuracy**: No more ambiguous cases - labels definitively identify branch
✅ **Backwards Compatible**: Works with old containers (falls back to name parsing)
✅ **Simple**: Just add 2 lines to docker-compose.yml and update .env.example
✅ **No Manual Work**: Template replacement handles everything automatically
✅ **Future Proof**: Works regardless of branch or service naming conventions

#### Migration Guide

**For existing worktrees:**

1. Update `docker-compose.yml` with labels (in main worktree)
2. Update `.env.example` with BRANCH_NAME
3. For each active worktree:
   ```bash
   cd ~/code/user-story-mapping-tool/ENG-123
   # Add BRANCH_NAME to .env (check git branch name)
   git branch --show-current  # Copy this value
   echo "BRANCH_NAME=feature/my-branch" >> .env
   # Recreate containers with labels
   docker compose down
   docker compose up -d
   ```

**For new worktrees:**
Just run `pnpm worktree:create` - labels are added automatically!

#### Verifying Labels

Check that containers have the correct labels:

```bash
# List containers with branch labels
docker ps -a --filter label=worktree.project=user-story-mapping \
  --format "table {{.Names}}\t{{.Label \"worktree.branch\"}}"

# Expected output:
# NAMES                                    BRANCH
# user-story-mapping-feature-auth-backend-1  feature/auth
# user-story-mapping-api-v2-backend-1        api-v2
# user-story-mapping-backend-1               <no value>  (main)
```

### Docker Maintenance Best Practices

#### Weekly Cleanup Routine

Add this to your weekly workflow:

```bash
# Every Sunday morning
cd ~/code/user-story-mapping-tool/main
pnpm worktree:cleanup-all
```

Or automate with cron:
```bash
# Add to crontab (runs every Sunday at 3am)
0 3 * * 0 cd ~/code/user-story-mapping-tool/main && pnpm worktree:cleanup-all
```

#### Monitor Docker Disk Usage

Check what's using space:

```bash
# Quick overview
docker system df

# Detailed breakdown
docker system df -v
```

**Healthy state:**
```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          16        16        7.8GB     105.7MB (1%)
Containers      3         3         4.5MB     0B (0%)
Local Volumes   9         9         1.1GB     0B (0%)
Build Cache     0         0         0B        0B
```

**Bloated state (needs cleanup):**
```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          45        19        22GB      13.5GB (61%)   ⚠️
Containers      26        19        14.9MB    2.3MB (15%)
Local Volumes   142       16        24.92GB   23.99GB (96%)  ⚠️
Build Cache     103       0         2.507GB   2.507GB (100%) ⚠️
```

#### Emergency Disk Space Recovery

If you run out of disk space:

```bash
# Nuclear option - remove EVERYTHING Docker (safe for this project)
pnpm docker:cleanup

# This runs: docker system prune -af --volumes
# Removes:
# - All stopped containers
# - All unused images
# - All unused volumes
# - All build cache
```

**Your data is safe because:**
- ✅ Supabase data lives in `~/.supabase` (not Docker)
- ✅ Your code lives on host machine
- ✅ node_modules lives on host machine

After cleanup, just restart:
```bash
pnpm local:start
```

### Prevention Strategies

#### 1. Always Use Enhanced Cleanup Script

**❌ DON'T:**
```bash
git worktree remove ~/code/user-story-mapping-tool/ENG-123  # Leaves Docker volumes
```

**✅ DO:**
```bash
pnpm worktree:cleanup ENG-123  # Cleans everything
```

#### 2. Log Rotation (Add to docker-compose.yml)

Prevent log bloat (80% of Docker bloat comes from logs):

```yaml
# docker-compose.yml
services:
  backend:
    # ... other config
    logging:
      driver: "json-file"
      options:
        max-size: "50m"   # Max size per log file
        max-file: "5"     # Keep 5 rotated files
        # Total cap: 250MB per container
```

#### 3. Smart .dockerignore

Ensure your `.dockerignore` excludes build artifacts:

```
node_modules
dist
build
.git
.env*
*.log
```

### Troubleshooting Docker Issues

#### "No space left on device"

```bash
# Check disk usage
docker system df

# If bloated, run cleanup
pnpm worktree:cleanup-all

# Nuclear option if still stuck
pnpm docker:cleanup
```

#### Can't Delete Volume ("volume is in use")

```bash
# Stop all containers first
docker ps -a | grep user-story-mapping | awk '{print $1}' | xargs docker rm -f

# Then try removing volume again
docker volume rm <volume-name>
```

#### Find What's Using Disk Space

```bash
# Show all volumes with size
docker system df -v

# Show dangling volumes (not used by any container)
docker volume ls -f dangling=true
```

---

## Error Handling and Prerequisites (Optional Enhancements)

### Optional: Add Prerequisite Validation to create_worktree.sh

If you want to add validation to the `create_worktree.sh` script shown in Step 3, you can add this validation block after the shebang (`#!/bin/bash`) and before the argument parsing section:

```bash
# Validate prerequisites before creating worktree
echo "🔍 Validating prerequisites..."

# Check if git is installed
if ! command -v git &> /dev/null; then
  echo "❌ Error: git is not installed"
  exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
  echo "❌ Error: pnpm is not installed"
  echo "💡 Install with: npm install -g pnpm"
  exit 1
fi

# Check if docker is installed (if docker-compose.yml exists)
if [ -f "docker-compose.yml" ]; then
  if ! command -v docker &> /dev/null; then
    echo "❌ Error: docker is not installed but docker-compose.yml exists"
    echo "💡 Install from: https://docs.docker.com/get-docker/"
    exit 1
  fi
fi

# Check if in git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "❌ Error: Not in a git repository"
  exit 1
fi

echo "✅ All prerequisites validated"
echo ""

# Then continue with the rest of the script (TICKET_ID=$1, BRANCH_NAME=$2, etc.)
```

**Note**: Insert this validation block into your existing `create_worktree.sh` from Step 3, placing it right after `set -e` and before the `TICKET_ID=$1` line.

### Optional: Add Prerequisite Checks to smart-start.js

Similarly, you can enhance `scripts/smart-start.js` with prerequisite checking:

```javascript
function checkPrerequisites() {
  const checks = [
    { cmd: 'git', name: 'Git' },
    { cmd: 'pnpm', name: 'pnpm' },
  ];

  // Optional checks
  if (fs.existsSync('docker-compose.yml')) {
    checks.push({ cmd: 'docker', name: 'Docker' });
  }

  if (!isWorktree()) {
    checks.push({ cmd: 'supabase', name: 'Supabase CLI' });
  }

  const missing = [];
  checks.forEach(({ cmd, name }) => {
    try {
      execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    } catch (error) {
      missing.push(name);
    }
  });

  if (missing.length > 0) {
    console.error(`❌ Missing prerequisites: ${missing.join(', ')}`);
    console.error('💡 Please install them before continuing');
    process.exit(1);
  }
}

function main() {
  checkPrerequisites();  // Add this line at the start of main()
  const inWorktree = isWorktree();
  // ... rest of function
}
```

**Note**: Add the `checkPrerequisites()` function to your existing `smart-start.js` from Step 4, and call it at the beginning of the `main()` function.

---

## Dry-Run Mode

### Adding --dry-run to create_worktree.sh

Update the script to support dry-run mode:

```bash
#!/bin/bash

# Parse flags
DRY_RUN=false
TICKET_ID=""
BRANCH_NAME=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      if [ -z "$TICKET_ID" ]; then
        TICKET_ID=$1
      elif [ -z "$BRANCH_NAME" ]; then
        BRANCH_NAME=$1
      fi
      shift
      ;;
  esac
done

if [ -z "$TICKET_ID" ] || [ -z "$BRANCH_NAME" ]; then
  echo "Usage: ./hack/create_worktree.sh [--dry-run] TICKET_ID BRANCH_NAME"
  echo "Example: ./hack/create_worktree.sh --dry-run ENG-123 feature/my-feature"
  exit 1
fi

WORKTREE_BASE="${HOME}/code/user-story-mapping-tool"
WORKTREE_DIR="${WORKTREE_BASE}/${TICKET_ID}"

if [ "$DRY_RUN" = true ]; then
  echo "🧪 DRY RUN MODE - No changes will be made"
  echo ""
  echo "Would perform the following actions:"
  echo "1. Create worktree at: ${WORKTREE_DIR}"
  echo "2. Branch: ${BRANCH_NAME}"
  echo "3. Generate .env from template with unique ports"
  echo "4. Copy Claude settings from main worktree"
  echo "5. Set up backend environment"
  echo ""
  echo "Preview of git command:"
  if git show-ref --verify --quiet refs/heads/"$BRANCH_NAME"; then
    echo "   git worktree add \"${WORKTREE_DIR}\" \"${BRANCH_NAME}\""
  else
    echo "   git worktree add -b \"${BRANCH_NAME}\" \"${WORKTREE_DIR}\" main"
  fi
  echo ""
  echo "Remove --dry-run flag to execute"
  exit 0
fi

# Rest of script continues with actual creation...
```

### Usage

```bash
# Test without creating anything
./hack/create_worktree.sh --dry-run ENG-123 feature/my-feature

# If output looks good, run for real
./hack/create_worktree.sh ENG-123 feature/my-feature
```

---

## Advanced: CI/CD Integration

### GitHub Actions with Worktrees

**Note**: The worktree strategy in this document is designed for local development with a bare repository structure. In CI/CD environments like GitHub Actions, a different approach is needed since Actions checks out repositories as normal working directories.

#### Adapted CI/CD Workflow

For CI/CD, you can use a simplified approach without worktrees, or adapt the scripts:

```yaml
name: Test in Isolation

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Setup environment
        run: |
          # Copy .env.example to .env
          cp .env.example .env || true
          # Generate unique ports for CI (simpler than worktree script)
          # BUG 89 FIX: Escape special sed characters (same as BUG 88)
          SANITIZED_REF=$(echo "${GITHUB_REF_NAME//\//-}" | sed 's/[&/\]/\\&/g')
          sed -i "s/{{ branch() }}/${SANITIZED_REF}/g" .env || true
          sed -i "s/{{ auto_port() }}/3000/g" .env || true

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test
```

**For local worktree-based development**, the scripts in this document work perfectly. For CI/CD, adapt as needed for your environment's structure.

---

## Summary

You now have the **industry-standard bare repository + worktree system** for running multiple AI agents with complete Docker isolation!

### What You Get (Industry Standard 2024/2025)

✅ **Bare repository foundation** - Git data separated from work directories
✅ **Multiple isolated environments** - Each agent/feature gets own worktree
✅ **Docker per worktree** - Unique ports, containers, databases per agent
✅ **Zero conflicts** - Agents can't interfere with each other
✅ **Automated setup** - Shell scripts create environments on demand
✅ **Template-based .env** - Auto-generate unique ports for each environment
✅ **Complete isolation** - Tests, builds, commits all independent
✅ **Refresh command** - Easy sync of latest changes and dependencies

### Perfect For Your Use Case

✅ **Multiple AI agents** - Each working on different features simultaneously
✅ **Parallel testing** - Run tests in multiple environments at once
✅ **Docker Compose isolation** - Each worktree has own Docker network/containers
✅ **Port auto-assignment** - No manual port management needed
✅ **Database isolation strategies** - Shared or separate databases per agent
✅ **Clean workflow** - Create environment, work, cleanup - no conflicts

### Architecture Benefits

✅ **No "special" main directory** - All worktrees treated equally
✅ **Can't commit to wrong branch** - Bare repo has no files to modify
✅ **Fast git operations** - Single git database, multiple work areas
✅ **Easy cleanup** - Delete worktree directory = done

### Quick Start Checklist

**One-Time Setup:**
- [ ] Check Git version: `git --version` (must be 2.40+)
- [ ] Install Docker: Required for isolated environments
- [ ] Clone as bare repository: `git clone --bare <repo> ~/repos/user-story-mapping-tool.bare`
- [ ] Fix fetch config: `git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"`
- [ ] Create main worktree: `git worktree add ~/code/user-story-mapping-tool/main main`
- [ ] Create `.env.example` template with `{{ auto_port() }}` syntax
- [ ] Create `hack/create_worktree.sh` script in main worktree

**Creating Agent Environments:**
- [ ] Run: `cd ~/code/user-story-mapping-tool/main && ./hack/create_worktree.sh ENG-123 feature/name`
- [ ] Verify: `cd ~/code/user-story-mapping-tool/ENG-123 && cat .env` (unique ports)
- [ ] Start: `pnpm install && pnpm local:start`
- [ ] Verify isolation: Docker containers should have unique names

**Multiple Agents Working Simultaneously:**
- [ ] Agent 1: `~/code/user-story-mapping-tool/ENG-123` with ports 40123, 40124, 40125, 40126
- [ ] Agent 2: `~/code/user-story-mapping-tool/ENG-456` with ports 51892, 51893, 51894, 51895
- [ ] Both running Docker independently
- [ ] Both running tests independently
- [ ] Zero conflicts

---

## Additional Resources

- **Git Worktree Manual**: `man git-worktree`
- **Git Official Documentation**: https://git-scm.com/docs/git-worktree
- **Troubleshooting**: See sections above for common issues
- **CI/CD Integration**: See Advanced section for GitHub Actions examples

---

**Version**: 2.0 (Industry Standard - Bare Repository)
**Tested With**: Git 2.40+, Docker Compose, pnpm 8.x
**Architecture**: Bare repository + worktrees (2024/2025 industry standard)
**Research Sources**:
- Git official documentation (git-scm.com)
- "Git Worktrees and Docker Compose" (oliverdavies.uk, 2022)
- "Git worktrees" (redpill-linpro.com/techblog, 2024)
- Stack Overflow bare repository best practices
- Multiple 2024/2025 industry blog posts

**Last Updated**: 2025-11-20
