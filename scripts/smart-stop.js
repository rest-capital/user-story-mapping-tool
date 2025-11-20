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
