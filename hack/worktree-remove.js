#!/usr/bin/env node

/**
 * Worktree Remove Script (Basic - Bare Repository Version)
 *
 * NOT RECOMMENDED: Removes worktree without Docker cleanup
 *
 * This script ONLY removes the worktree directory and git references.
 * It does NOT clean up Docker containers or volumes, which will become orphaned.
 *
 * Use worktree:cleanup instead for proper cleanup.
 *
 * Works with bare repository structure at ~/repos/user-story-mapping-tool.bare
 *
 * Usage: pnpm worktree:remove <worktree-path>
 * Example: pnpm worktree:remove ~/code/user-story-mapping-tool/ENG-123
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}▸${colors.reset} ${msg}`),
};

const BARE_REPO = path.join(os.homedir(), 'repos', 'user-story-mapping-tool.bare');

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

function main() {
  const worktreePath = process.argv[2];

  if (!worktreePath) {
    log.error('Please provide a worktree path');
    console.log('\nUsage: pnpm worktree:remove <worktree-path>');
    console.log('Example: pnpm worktree:remove ~/code/user-story-mapping-tool/ENG-123');
    console.log('\n⚠️  WARNING: This command does NOT clean up Docker resources!');
    console.log('Recommended: Use `pnpm worktree:cleanup <ticket-id>` instead');
    process.exit(1);
  }

  // Resolve to absolute path
  const absolutePath = path.resolve(worktreePath);

  // Check if worktree exists
  if (!fs.existsSync(absolutePath)) {
    log.error(`Worktree not found: ${absolutePath}`);
    process.exit(1);
  }

  console.log('\n⚠️  WARNING: This will NOT clean up Docker containers or volumes!');
  console.log('Docker resources will become orphaned and must be cleaned manually.');
  console.log('');
  console.log('Recommended: Cancel this and use `pnpm worktree:cleanup <ticket-id>` instead');
  console.log('');

  try {
    log.step('Removing git worktree...');

    // Try normal remove first
    const result = execCommand(`git -C "${BARE_REPO}" worktree remove "${absolutePath}"`, {
      ignoreError: true,
      silent: true
    });

    // Force remove if still exists
    if (fs.existsSync(absolutePath)) {
      execCommand(`git -C "${BARE_REPO}" worktree remove --force "${absolutePath}"`, {
        ignoreError: true,
        silent: true
      });
    }

    // If directory still exists, remove it manually
    if (fs.existsSync(absolutePath)) {
      fs.rmSync(absolutePath, { recursive: true, force: true });
    }

    log.success('Worktree removed');

    // Prune references
    log.step('Pruning worktree references...');
    execCommand(`git -C "${BARE_REPO}" worktree prune`, { silent: true });
    log.success('Worktree references pruned');

    console.log('');
    log.warn('Docker resources (containers, volumes) were NOT cleaned up!');
    log.info('Run `pnpm worktree:cleanup-all` to find and remove orphaned resources');
    console.log('');

  } catch (error) {
    log.error(`\nRemoval failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
