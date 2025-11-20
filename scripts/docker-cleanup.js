#!/usr/bin/env node

/**
 * Docker Cleanup Script
 *
 * Cleans up Docker resources to prevent disk bloat:
 * - Orphaned containers
 * - Orphaned volumes
 * - Unused images
 * - Build cache
 * - Test databases (PostgreSQL databases inside Supabase, optional)
 */

const { execSync } = require('child_process');
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
    const errorOutput = error.stderr ? error.stderr.toString() : '';
    if (errorOutput.includes('Cannot connect to the Docker daemon')) {
      log.error('Docker is not running!');
      log.info('Please start Docker Desktop and try again');
      process.exit(1);
    }
    throw error;
  }
}

function showDiskUsage() {
  log.step('Current Docker disk usage:');
  const usage = execCommand('docker system df', { silent: true });
  console.log(usage);
}

async function cleanup(mode = 'normal') {
  log.header('🧹 Docker Cleanup');

  showDiskUsage();

  if (mode === 'nuclear') {
    log.warn('NUCLEAR MODE: This will remove ALL Docker data (containers, images, volumes, cache)');
    log.warn('Supabase data is safe (stored outside Docker)');
    console.log('');
    const answer = await question('Are you sure? Type "yes" to continue: ');

    if (answer !== 'yes') {
      log.info('Cleanup cancelled');
      return;
    }

    log.step('Stopping and removing all containers, volumes, images, and cache...');
    execCommand('docker compose down -v', { ignoreError: true });
    execCommand('docker system prune -af --volumes');
    log.success('Nuclear cleanup complete!');

  } else if (mode === 'test-db') {
    log.info('Cleaning up test databases only (test_db_1, test_db_2, etc.)');
    log.info('These are PostgreSQL databases inside Supabase, not Docker volumes');
    console.log('');
    const answer = await question('Continue? (y/n): ');

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      log.info('Cleanup cancelled');
      return;
    }

    // Check if Supabase is running
    const supabaseStatus = execCommand('supabase status', { silent: true, ignoreError: true });
    if (!supabaseStatus || supabaseStatus.includes('not running') || supabaseStatus.includes('stopped')) {
      log.error('Supabase is not running!');
      log.info('Start Supabase first: supabase start');
      return;
    }

    // Check if psql is available
    const psqlCheck = execCommand('which psql', { silent: true, ignoreError: true });
    if (!psqlCheck || !psqlCheck.trim()) {
      log.error('psql is not installed!');
      log.info('Install PostgreSQL client tools:');
      log.info('  macOS: brew install postgresql@16');
      log.info('  Linux: sudo apt-get install postgresql-client');
      log.info('');
      log.warn('Alternative: Run pnpm test:setup which handles this');
      return;
    }

    // Test PostgreSQL connection before proceeding
    log.step('Testing PostgreSQL connection...');
    const testConn = execCommand('PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -tAc "SELECT 1"', { silent: true, ignoreError: true });
    if (!testConn || !testConn.trim()) {
      log.error('Could not connect to PostgreSQL!');
      log.info('Possible causes:');
      log.info('  - Supabase is using a non-default port (not 54322)');
      log.info('  - PostgreSQL password was changed (not default "postgres")');
      log.info('  - Network or firewall blocking connection');
      log.info('');
      log.info('Check your Supabase configuration and update the script if needed');
      return;
    }

    log.step('Terminating connections and dropping test databases...');

    // Detect number of test databases (try up to 32 - covers machines up to 64 cores)
    let droppedCount = 0;
    let failedCount = 0;
    for (let i = 1; i <= 32; i++) {
      const dbName = `test_db_${i}`;
      try {
        // Check if database exists
        const checkCmd = `PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${dbName}'"`;
        const exists = execCommand(checkCmd, { silent: true, ignoreError: true });

        if (exists && exists.trim() === '1') {
          // Terminate active connections first (PostgreSQL 9.2+)
          const terminateCmd = `PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -tAc "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${dbName}' AND pid <> pg_backend_pid()"`;
          execCommand(terminateCmd, { silent: true, ignoreError: true });

          // Small delay to ensure connections are terminated
          execSync('sleep 0.5', { stdio: 'ignore' });

          // Drop the database
          const dropCmd = `PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c "DROP DATABASE IF EXISTS ${dbName}"`;
          const dropResult = execCommand(dropCmd, { silent: true, ignoreError: true });

          if (dropResult !== null) {
            log.info(`  Dropped: ${dbName}`);
            droppedCount++;
          } else {
            log.warn(`  Failed to drop: ${dbName} (may still be in use)`);
            failedCount++;
          }
        }
      } catch (error) {
        // Database doesn't exist or couldn't be dropped, that's okay
      }
    }

    if (droppedCount > 0) {
      log.success(`Dropped ${droppedCount} test database(s)!`);
      if (failedCount > 0) {
        log.warn(`Failed to drop ${failedCount} database(s) - they may have active connections`);
        log.info('Stop running tests, then run this command again to retry');
      } else {
        log.info('Run pnpm test:setup to recreate them');
      }
    } else if (failedCount > 0) {
      log.error(`Could not drop any databases (${failedCount} failed)`);
      log.info('Make sure no tests are running and try again');
    } else {
      log.info('No test databases found');
    }

  } else {
    // Normal mode - surgical cleanup
    log.info('Normal cleanup mode (removes unused resources, keeps active data)');
    console.log('');
    const answer = await question('Continue? (y/n): ');

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      log.info('Cleanup cancelled');
      return;
    }

    log.step('Removing build cache...');
    execCommand('docker builder prune -f', { silent: true });

    log.step('Removing old images (older than 72 hours)...');
    execCommand('docker image prune -a -f --filter "until=72h"', { silent: true });

    log.step('Removing unused volumes...');
    execCommand('docker volume prune -f', { silent: true });

    log.success('Cleanup complete!');
  }

  console.log('');
  showDiskUsage();
}

async function main() {
  const mode = process.argv[2] || 'normal';

  const validModes = ['normal', 'nuclear', 'test-db'];
  if (!validModes.includes(mode)) {
    log.error(`Invalid mode: ${mode}`);
    console.log('\nUsage: node scripts/docker-cleanup.js [mode]');
    console.log('\nModes:');
    console.log('  normal   - Surgical cleanup (removes unused resources)');
    console.log('  nuclear  - Full cleanup (removes ALL Docker data)');
    console.log('  test-db  - Cleanup test databases only (PostgreSQL DBs in Supabase)');
    console.log('\nExamples:');
    console.log('  pnpm docker:clean');
    console.log('  pnpm docker:clean:full');
    console.log('  pnpm docker:clean:test');
    process.exit(1);
  }

  try {
    await cleanup(mode);
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

module.exports = { main };
