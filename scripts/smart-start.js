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
