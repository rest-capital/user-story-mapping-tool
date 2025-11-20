#!/usr/bin/env node

/**
 * Worktree Remove Script
 *
 * Properly removes a worktree including:
 * - Stopping Docker containers
 * - Removing Docker volumes
 * - Removing worktree directory
 * - Deleting git branch (optional)
 * - Pruning git worktree references
 *
 * Usage: pnpm worktree:remove <branch-name>
 * Example: pnpm worktree:remove feature/user-auth
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
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
  header: (msg) => console.log(`\n${colors.bright}${msg}${colors.reset}\n`),
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
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

function getWorktreePath(branchName) {
  const worktreeBase = path.join(process.cwd(), '.worktrees');
  return path.join(worktreeBase, branchName);
}

function getComposeProjectName(branchName) {
  // Sanitize branch name (replace slashes with hyphens)
  const sanitized = branchName.replace(/\//g, '-');
  return `user-story-mapping-${sanitized}`;
}

function verifyWorktreeExists(worktreePath) {
  if (!fs.existsSync(worktreePath)) {
    log.error(`Worktree not found: ${worktreePath}`);
    log.info('Available worktrees:');

    const worktreeBase = path.join(process.cwd(), '.worktrees');
    if (fs.existsSync(worktreeBase)) {
      const worktrees = fs.readdirSync(worktreeBase);
      if (worktrees.length > 0) {
        worktrees.forEach(wt => log.info(`  - ${wt}`));
      } else {
        log.info('  (none)');
      }
    } else {
      log.info('  (none)');
    }

    return false;
  }
  return true;
}

async function confirmRemoval(branchName, worktreePath) {
  log.header('🗑️  Worktree Removal');

  console.log('This will remove:');
  log.info(`  Branch: ${branchName}`);
  log.info(`  Worktree: ${worktreePath}`);
  log.info(`  Docker containers and volumes`);
  console.log('');

  const answer = await question('Continue with removal? (y/n): ');
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

function stopDockerServices(worktreePath, projectName) {
  log.step('Stopping Docker services...');

  try {
    // Try to stop using docker compose from worktree
    if (fs.existsSync(worktreePath)) {
      const result = execCommand('docker compose down -v', {
        cwd: worktreePath,
        ignoreError: true,
        silent: true
      });

      if (result !== null) {
        log.success('Docker services stopped');
        return;
      }
    }

    // Also try using project name directly (in case worktree is already modified)
    // BUG 96 FIX: Quote project name to handle special characters
    execCommand(`docker compose -p "${projectName}" down -v`, {
      ignoreError: true,
      silent: true
    });

    log.success('Docker services stopped');
  } catch (error) {
    log.warn('Could not stop some Docker services (they may not exist)');
  }
}

function removeDockerVolumes(projectName) {
  log.step('Removing Docker volumes...');

  try {
    // Get all volumes for this project
    // BUG 96 FIX: Quote project name
    const volumes = execCommand(`docker volume ls -q --filter name="${projectName}"`, {
      silent: true,
      ignoreError: true
    });

    if (volumes && volumes.trim()) {
      const volumeList = volumes.trim().split('\n');
      let removedCount = 0;

      volumeList.forEach(volume => {
        try {
          // BUG 96 FIX: Quote volume name
          execCommand(`docker volume rm "${volume}"`, {
            silent: true,
            ignoreError: true
          });
          removedCount++;
        } catch (error) {
          // Ignore errors for individual volumes
        }
      });

      if (removedCount > 0) {
        log.success(`Removed ${removedCount} Docker volume(s)`);
      } else {
        log.info('No Docker volumes to remove');
      }
    } else {
      log.info('No Docker volumes found');
    }
  } catch (error) {
    log.warn('Could not remove some Docker volumes');
  }
}

function removeDockerContainers(projectName) {
  log.step('Removing Docker containers...');

  try {
    // Get all containers for this project
    const containers = execCommand(
      `docker ps -a --filter name=${projectName} --format "{{.Names}}"`,
      { silent: true, ignoreError: true }
    );

    if (containers && containers.trim()) {
      const containerList = containers.trim().split('\n');
      let removedCount = 0;

      containerList.forEach(container => {
        try {
          // BUG 96 FIX: Quote container name
          execCommand(`docker rm -f "${container}"`, {
            silent: true,
            ignoreError: true
          });
          removedCount++;
        } catch (error) {
          // Ignore errors for individual containers
        }
      });

      if (removedCount > 0) {
        log.success(`Removed ${removedCount} Docker container(s)`);
      } else {
        log.info('No Docker containers to remove');
      }
    } else {
      log.info('No Docker containers found');
    }
  } catch (error) {
    log.warn('Could not remove some Docker containers');
  }
}

function removeWorktree(branchName, worktreePath) {
  log.step('Removing git worktree...');

  try {
    // Remove worktree using git
    const result = execCommand(`git worktree remove "${worktreePath}"`, {
      ignoreError: true,
      silent: true
    });

    // Force remove if still exists
    if (fs.existsSync(worktreePath)) {
      execCommand(`git worktree remove --force "${worktreePath}"`, {
        ignoreError: true,
        silent: true
      });
    }

    // If directory still exists, remove it manually
    if (fs.existsSync(worktreePath)) {
      fs.rmSync(worktreePath, { recursive: true, force: true });
    }

    log.success('Worktree removed');
  } catch (error) {
    log.error('Failed to remove worktree: ' + error.message);
    throw error;
  }
}

async function deleteBranch(branchName) {
  const answer = await question(`Delete branch '${branchName}'? (y/n): `);

  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    log.step(`Deleting branch ${branchName}...`);

    try {
      // Try normal delete first
      // BUG 95 FIX: Quote branch name to handle spaces and special characters
      const result = execCommand(`git branch -d "${branchName}"`, {
        ignoreError: true,
        silent: true
      });

      if (result !== null) {
        log.success('Branch deleted');
        return;
      }

      // If that fails, ask about force delete
      const forceAnswer = await question('Branch not fully merged. Force delete? (y/n): ');
      if (forceAnswer.toLowerCase() === 'y' || forceAnswer.toLowerCase() === 'yes') {
        execCommand(`git branch -D "${branchName}"`, { silent: true });
        log.success('Branch force deleted');
      } else {
        log.info('Branch kept');
      }
    } catch (error) {
      log.warn('Could not delete branch: ' + error.message);
    }
  } else {
    log.info('Branch kept');
  }
}

function pruneWorktrees() {
  log.step('Pruning worktree references...');
  execCommand('git worktree prune', { silent: true });
  log.success('Worktree references pruned');
}

async function main() {
  const branchName = process.argv[2];

  if (!branchName) {
    log.error('Please provide a branch name');
    console.log('\nUsage: pnpm worktree:remove <branch-name>');
    console.log('Example: pnpm worktree:remove feature/user-auth');
    process.exit(1);
  }

  const worktreePath = getWorktreePath(branchName);
  const projectName = getComposeProjectName(branchName);

  // Verify worktree exists
  if (!verifyWorktreeExists(worktreePath)) {
    process.exit(1);
  }

  // Confirm removal
  const confirmed = await confirmRemoval(branchName, worktreePath);
  if (!confirmed) {
    log.info('Removal cancelled');
    process.exit(0);
  }

  try {
    // Step 1: Stop Docker services
    stopDockerServices(worktreePath, projectName);

    // Step 2: Remove Docker containers (in case down didn't work)
    removeDockerContainers(projectName);

    // Step 3: Remove Docker volumes
    removeDockerVolumes(projectName);

    // Step 4: Remove worktree
    removeWorktree(branchName, worktreePath);

    // Step 5: Optionally delete branch
    await deleteBranch(branchName);

    // Step 6: Prune worktree references
    pruneWorktrees();

    log.header('✅ Worktree removal complete!');
    console.log('');

  } catch (error) {
    log.error(`\nRemoval failed: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
