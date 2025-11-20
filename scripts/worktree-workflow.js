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

function findRepoRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error('❌ Not in a git repository');
    process.exit(1);
  }
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

  // BUG 102 FIX: Find repo root to handle running from any directory
  const repoRoot = findRepoRoot();

  // Create worktree
  console.log('\n📦 Creating worktree...\n');
  try {
    execSync(`bash "${repoRoot}/hack/create_worktree.sh" "${ticketId}" "${branchName}"`, {
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
