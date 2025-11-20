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
