#!/usr/bin/env node

/**
 * Test Database Setup Script
 *
 * Interactive script to set up parallel test databases for E2E testing.
 *
 * What it does:
 * 1. Checks prerequisites (Supabase running, psql installed)
 * 2. Detects existing test databases
 * 3. Asks for confirmation if recreating
 * 4. Creates isolated databases for parallel Jest workers
 * 5. Applies Prisma migrations to each database
 */

const { execSync } = require('child_process');
const readline = require('readline');
const os = require('os');
const path = require('path');

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

/**
 * Ask a yes/no question with validation
 * Only accepts: y, yes, n, no (case-insensitive)
 * Loops until valid input is received
 */
async function askYesNo(query, defaultYes = true) {
  while (true) {
    const answer = await question(query);
    const normalized = answer.trim().toLowerCase();

    // Accept empty input as default
    if (normalized === '') {
      return defaultYes;
    }

    // Accept valid yes/no responses
    if (normalized === 'y' || normalized === 'yes') {
      return true;
    }
    if (normalized === 'n' || normalized === 'no') {
      return false;
    }

    // Reject invalid input and ask again
    log.warn('Invalid input. Please enter y, yes, n, or no.');
  }
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

// Configuration
const PG_HOST = 'localhost';
const PG_PORT = '54322';
const PG_USER = 'postgres';
const PG_PASSWORD = 'postgres';
const PG_DB = 'postgres';

/**
 * Calculate number of workers based on CPU cores
 * Formula: 50% of cores, min 1
 * No maximum cap - scales with available hardware
 */
function calculateWorkers() {
  const cpuCores = os.cpus().length;
  let workers = Math.floor(cpuCores / 2);
  workers = Math.max(1, workers); // Minimum 1
  return { cpuCores, workers };
}

/**
 * Check if Supabase is running
 */
function checkSupabase() {
  log.step('Checking if Supabase is running...');
  const result = execCommand('supabase status', { silent: true, ignoreError: true });

  if (!result || result.includes('not running') || result.includes('stopped')) {
    log.error('Supabase is not running!');
    log.info('Start Supabase first: supabase start');
    return false;
  }

  log.success('Supabase is running');
  return true;
}

/**
 * Check if psql is installed
 */
function checkPsql() {
  log.step('Checking if psql is installed...');
  const result = execCommand('which psql', { silent: true, ignoreError: true });

  if (!result || !result.trim()) {
    log.error('psql is not installed!');
    log.info('Install PostgreSQL client tools:');
    log.info('  macOS: brew install postgresql@16');
    log.info('  Linux: sudo apt-get install postgresql-client');
    return false;
  }

  log.success('psql is installed');
  return true;
}

/**
 * Test PostgreSQL connection
 */
function testConnection() {
  log.step('Testing PostgreSQL connection...');
  const testCmd = `PGPASSWORD=${PG_PASSWORD} psql -h ${PG_HOST} -p ${PG_PORT} -U ${PG_USER} -d ${PG_DB} -tAc "SELECT 1"`;
  const result = execCommand(testCmd, { silent: true, ignoreError: true });

  if (!result || !result.trim()) {
    log.error('Could not connect to PostgreSQL!');
    log.info('Make sure Supabase is running on the default port (54322)');
    return false;
  }

  log.success('PostgreSQL connection successful');
  return true;
}

/**
 * Check which test databases already exist
 */
function checkExistingDatabases(numWorkers) {
  log.step('Checking for existing test databases...');

  const existing = [];
  for (let i = 1; i <= numWorkers; i++) {
    const dbName = `test_db_${i}`;
    const checkCmd = `PGPASSWORD=${PG_PASSWORD} psql -h ${PG_HOST} -p ${PG_PORT} -U ${PG_USER} -d ${PG_DB} -tAc "SELECT 1 FROM pg_database WHERE datname='${dbName}'"`;
    const result = execCommand(checkCmd, { silent: true, ignoreError: true });

    if (result && result.trim() === '1') {
      existing.push(dbName);
    }
  }

  if (existing.length > 0) {
    log.info(`Found ${existing.length} existing test database(s): ${existing.join(', ')}`);
  } else {
    log.info('No existing test databases found');
  }

  return existing;
}

/**
 * Create or recreate a database
 */
function createDatabase(dbName, isRecreate) {
  const action = isRecreate ? 'Recreating' : 'Creating';
  log.step(`${action} database: ${dbName}`);

  // Drop if exists (for recreate), then create
  const sql = `
    DROP DATABASE IF EXISTS ${dbName};
    CREATE DATABASE ${dbName};
  `;

  const createCmd = `PGPASSWORD=${PG_PASSWORD} psql -h ${PG_HOST} -p ${PG_PORT} -U ${PG_USER} -d ${PG_DB} -c "${sql}"`;
  const result = execCommand(createCmd, { silent: true, ignoreError: true });

  if (result === null) {
    log.error(`Failed to create ${dbName}`);
    throw new Error(`Database creation failed for ${dbName}`);
  }

  log.success(`Created: ${dbName}`);
}

/**
 * Apply Prisma migrations to a database
 */
function applyMigrations(dbName) {
  log.step(`Applying migrations to: ${dbName}`);

  // Set DATABASE_URL for this specific database
  const databaseUrl = `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${dbName}`;
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
  };

  // Navigate to backend directory and run migrations
  const backendDir = path.join(__dirname, '../apps/backend');
  const migrateCmd = `cd "${backendDir}" && npx prisma migrate deploy`;

  try {
    execCommand(migrateCmd, { env, silent: true });
    log.success(`Migrations applied: ${dbName}`);
  } catch (error) {
    log.error(`Failed to apply migrations to ${dbName}`);
    throw error;
  }
}

/**
 * Main setup flow
 */
async function main() {
  log.header('🗄️  Test Database Setup');

  // Step 1: Check prerequisites
  if (!checkSupabase()) {
    rl.close();
    process.exit(1);
  }

  if (!checkPsql()) {
    rl.close();
    process.exit(1);
  }

  if (!testConnection()) {
    rl.close();
    process.exit(1);
  }

  console.log(''); // Blank line

  // Step 2: Calculate workers
  const { cpuCores, workers } = calculateWorkers();
  log.info(`Detected ${cpuCores} CPU cores`);
  log.info(`Will create ${workers} test databases (50% of cores)`);
  log.info(`Databases: test_db_1 through test_db_${workers}`);

  console.log(''); // Blank line

  // Step 3: Check existing databases
  const existing = checkExistingDatabases(workers);

  // Step 4: Ask for confirmation if recreating
  if (existing.length > 0) {
    console.log(''); // Blank line
    log.warn('⚠️  This will DELETE all data in existing test databases!');
    const shouldContinue = await askYesNo('Do you want to recreate them? (y/N): ', false);

    if (!shouldContinue) {
      log.info('Setup cancelled');
      rl.close();
      return;
    }
  } else {
    console.log(''); // Blank line
    const shouldContinue = await askYesNo('Continue with setup? (Y/n): ', true);

    if (!shouldContinue) {
      log.info('Setup cancelled');
      rl.close();
      return;
    }
  }

  console.log(''); // Blank line

  // Step 5: Create databases
  log.header('Creating Databases');

  const databases = [];
  for (let i = 1; i <= workers; i++) {
    const dbName = `test_db_${i}`;
    const isRecreate = existing.includes(dbName);

    try {
      createDatabase(dbName, isRecreate);
      databases.push(dbName);
    } catch (error) {
      log.error(`Setup failed: ${error.message}`);
      rl.close();
      process.exit(1);
    }
  }

  console.log(''); // Blank line

  // Step 6: Apply migrations
  log.header('Applying Migrations');

  for (const dbName of databases) {
    try {
      applyMigrations(dbName);
    } catch (error) {
      log.error(`Setup failed: ${error.message}`);
      rl.close();
      process.exit(1);
    }
  }

  // Success!
  console.log(''); // Blank line
  log.header('✅ Test Databases Ready!');
  log.info(`Created ${workers} isolated databases for parallel testing`);
  log.info('Each Jest worker will use its own database for complete isolation');
  console.log(''); // Blank line
  log.success('You can now run tests:');
  console.log(`  ${colors.cyan}pnpm test:e2e${colors.reset}`);
  console.log(''); // Blank line

  rl.close();
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    log.error(`Setup failed: ${error.message}`);
    rl.close();
    process.exit(1);
  });
}

module.exports = { main };
