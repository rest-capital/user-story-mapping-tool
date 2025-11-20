#!/usr/bin/env node

/**
 * Worktree Cleanup All Script (Bare Repository Version)
 *
 * Cleans up Docker resources from ALL removed worktrees:
 * - Orphaned containers (using Docker labels for accurate detection)
 * - Orphaned volumes
 * - Pruning git worktree references
 *
 * Works with bare repository structure at ~/repos/user-story-mapping-tool.bare
 *
 * Features:
 * - Docker label-based detection (BUG 80 FIX: resolves container naming ambiguity)
 * - Backwards compatibility with old containers without labels
 * - Safe deletion with confirmation prompts
 *
 * Usage: pnpm worktree:cleanup-all
 */

const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
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

const BARE_REPO = path.join(os.homedir(), 'repos', 'user-story-mapping-tool.bare');

/**
 * Get active worktrees from bare repository
 * BUG 81 FIX: Handle git command failure gracefully
 * BUG 82 FIX: Trim path and branch names
 */
function getActiveWorktrees() {
  try {
    // Call from bare repository
    const output = execCommand(`git -C "${BARE_REPO}" worktree list --porcelain`, { silent: true });
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
    log.warn('⚠️  Could not get active worktrees: ' + error.message);
    return [];
  }
}

/**
 * Find orphaned Docker containers
 * ENHANCED: Uses Docker labels for perfect branch matching (BUG 80 FIX)
 * CRITICAL FIXES:
 * - BUG 90: Use ||| delimiter to handle pipes in branch names
 * - BUG 91: Use name filter instead of label filter for backwards compatibility
 * - BUG 92: Labels use actual branch names (with slashes) not sanitized names
 * - BUG 93: Trim whitespace from parsed values
 */
function findOrphanedContainers() {
  log.step('Scanning for orphaned Docker containers...');

  // ENHANCED: Get containers with branch labels (BUG 80 FIX)
  // Format: "container_name|||branch_label" (BUG 90 FIX: use ||| delimiter to avoid conflicts with branch names)
  // BUG 91 FIX: Use name filter (not label filter) to include old containers without labels
  const allContainers = execCommand(
    'docker ps -a --filter name=user-story-mapping --format "{{.Names}}|||{{.Label \\"worktree.branch\\"}}"',
    { silent: true, ignoreError: true }
  );

  if (!allContainers || !allContainers.trim()) {
    log.info('No project containers found');
    return [];
  }

  const containerList = allContainers.trim().split('\n');
  const activeWorktrees = getActiveWorktrees();
  const orphanedContainers = [];

  for (const entry of containerList) {
    // BUG 90 FIX: Use ||| delimiter (pipe is valid in branch names though rare)
    const delimiterIndex = entry.indexOf('|||');
    if (delimiterIndex === -1) {
      log.warn(`⚠️  Unexpected format: ${entry}`);
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

/**
 * Find orphaned Docker volumes
 */
function findOrphanedVolumes() {
  log.step('Scanning for orphaned Docker volumes...');

  const allVolumes = execCommand('docker volume ls -q --filter name=user-story-mapping', {
    silent: true,
    ignoreError: true
  });

  if (!allVolumes || !allVolumes.trim()) {
    log.info('No project volumes found');
    return [];
  }

  const volumeList = allVolumes.trim().split('\n');
  const activeWorktrees = getActiveWorktrees();
  const orphanedVolumes = [];

  for (const volumeName of volumeList) {
    // Volume format: user-story-mapping-<branch>_<service>
    // Example: user-story-mapping-feature-auth_postgres_data
    const afterPrefix = volumeName.replace('user-story-mapping-', '');

    // Check if this volume belongs to an active worktree
    const isOrphaned = !activeWorktrees.some(wt => {
      if (!wt.branch) return false;
      const branchSanitized = wt.branch.replace(/\//g, '-');
      return afterPrefix.startsWith(branchSanitized + '_');
    });

    if (isOrphaned) {
      orphanedVolumes.push(volumeName);
    }
  }

  return orphanedVolumes;
}

/**
 * Remove orphaned containers
 */
async function removeOrphanedContainers(containers) {
  if (containers.length === 0) {
    log.info('No orphaned containers to remove');
    return;
  }

  log.header('Orphaned Containers Found:');
  containers.forEach(c => console.log(`  - ${c}`));
  console.log('');

  const answer = await question(`Remove ${containers.length} container(s)? (y/n): `);
  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    log.info('Skipping container cleanup');
    return;
  }

  log.step('Removing orphaned containers...');
  for (const container of containers) {
    try {
      // BUG 97 FIX: Quote container name to handle special characters
      execCommand(`docker rm -f "${container}"`, { silent: true });
      log.success(`Removed: ${container}`);
    } catch (error) {
      log.error(`Failed to remove: ${container}`);
    }
  }
}

/**
 * Remove orphaned volumes
 */
async function removeOrphanedVolumes(volumes) {
  if (volumes.length === 0) {
    log.info('No orphaned volumes to remove');
    return;
  }

  log.header('Orphaned Volumes Found:');
  volumes.forEach(v => console.log(`  - ${v}`));
  console.log('');

  const answer = await question(`Remove ${volumes.length} volume(s)? (y/n): `);
  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    log.info('Skipping volume cleanup');
    return;
  }

  log.step('Removing orphaned volumes...');
  for (const volume of volumes) {
    try {
      // BUG 97 FIX: Quote volume name to handle special characters
      execCommand(`docker volume rm "${volume}"`, { silent: true });
      log.success(`Removed: ${volume}`);
    } catch (error) {
      log.error(`Failed to remove: ${volume}`);
    }
  }
}

/**
 * Prune git worktree references
 */
function pruneWorktrees() {
  log.step('Pruning git worktree references...');
  execCommand(`git -C "${BARE_REPO}" worktree prune`, { silent: true, ignoreError: true });
  log.success('Worktree references pruned');
}

/**
 * Main cleanup function
 */
async function main() {
  log.header('🧹 Worktree Docker Cleanup (All Orphaned Resources)');

  try {
    // Find orphaned resources
    const orphanedContainers = findOrphanedContainers();
    const orphanedVolumes = findOrphanedVolumes();

    // Clean up containers
    await removeOrphanedContainers(orphanedContainers);
    console.log('');

    // Clean up volumes
    await removeOrphanedVolumes(orphanedVolumes);
    console.log('');

    // Prune worktree references
    pruneWorktrees();

    log.header('✅ Cleanup Complete!');
  } catch (error) {
    log.error(`Cleanup failed: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
  getActiveWorktrees,
  findOrphanedContainers,
  findOrphanedVolumes
};
