#!/usr/bin/env node
/**
 * First-Time Setup Script
 *
 * Automates the entire development environment setup:
 * - Checks prerequisites
 * - Installs dependencies
 * - Starts Supabase
 * - Configures environment files
 * - Runs database migrations
 * - Sets up test databases
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const net = require('net');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('\n' + '═'.repeat(60));
  log(message, 'bright');
  console.log('═'.repeat(60) + '\n');
}

function execCommand(command, errorMessage, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe', ...options });
  } catch (error) {
    if (errorMessage) {
      log(`❌ ${errorMessage}`, 'red');
      if (error.stdout) log(error.stdout.trim(), 'red');
      if (error.stderr) log(error.stderr.trim(), 'red');
    }
    return null;
  }
}

function commandExists(command) {
  try {
    // Cross-platform command checking
    const testCommand = process.platform === 'win32'
      ? `where ${command}`
      : `which ${command}`;
    execSync(testCommand, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkCommand(command, name) {
  if (commandExists(command)) {
    log(`✅ ${name} is installed`, 'green');
    return true;
  } else {
    log(`❌ ${name} is not installed`, 'red');
    return false;
  }
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(`${colors.cyan}${question}${colors.reset} `, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

function isProcessRunning(pid) {
  try {
    // Platform-specific check
    if (process.platform === 'win32') {
      // Windows: Use tasklist
      const result = execSync(`tasklist /FI "PID eq ${pid}"`, { encoding: 'utf8' });
      return result.includes(String(pid));
    } else {
      // Unix/Mac: Use kill with signal 0
      process.kill(pid, 0);
      return true;
    }
  } catch {
    return false;
  }
}

function isInWorktree() {
  try {
    const gitCommonDir = execSync('git rev-parse --git-common-dir', { encoding: 'utf8' }).trim();
    const gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf8' }).trim();
    return gitCommonDir !== gitDir;
  } catch {
    return false;
  }
}

function validateJwtKey(key) {
  // JWT format: header.payload.signature (base64 encoded parts separated by dots)
  if (!key || typeof key !== 'string') return false;

  const parts = key.split('.');
  if (parts.length !== 3) return false;

  // Each part should be base64-like (alphanumeric, -, _)
  const base64Regex = /^[A-Za-z0-9_-]+$/;
  return parts.every(part => part.length > 0 && base64Regex.test(part));
}

async function checkProjectRoot() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const backendPath = path.join(process.cwd(), 'apps/backend');

  if (!fs.existsSync(packageJsonPath)) {
    log('❌ package.json not found. Are you in the project root?', 'red');
    log('   Please cd to the project root and run this script again.', 'yellow');
    process.exit(1);
  }

  if (!fs.existsSync(backendPath)) {
    log('❌ apps/backend directory not found.', 'red');
    log('   This script must be run from the monorepo root.', 'yellow');
    process.exit(1);
  }

  // Check if in git worktree
  if (isInWorktree()) {
    log('⚠️  Warning: Running in a git worktree', 'yellow');
    log('   This script is designed for the main repository.', 'yellow');
    log('   Worktrees share Supabase but have separate Docker containers.', 'yellow');
    const answer = await askQuestion('Continue anyway? (y/n):');
    if (answer !== 'y' && answer !== 'yes') {
      process.exit(0);
    }
  }

  // Check if package.json has the right name
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (packageJson.name !== 'user-story-mapping-tool') {
    log('⚠️  Warning: package.json name doesn\'t match expected project', 'yellow');
    const answer = await askQuestion('Continue anyway? (y/n):');
    if (answer !== 'y' && answer !== 'yes') {
      process.exit(0);
    }
  }
}

async function checkPrerequisites() {
  logHeader('Step 1/7: Checking Prerequisites');

  const checks = [
    { cmd: 'node', name: 'Node.js', install: 'Install from https://nodejs.org or use nvm' },
    { cmd: 'pnpm', name: 'pnpm', install: 'Run: npm install -g pnpm' },
    { cmd: 'docker', name: 'Docker', install: 'Install Docker Desktop from https://docker.com' },
    { cmd: 'supabase', name: 'Supabase CLI', install: 'Run: brew install supabase/tap/supabase' },
  ];

  let allPresent = true;

  for (const check of checks) {
    if (!checkCommand(check.cmd, check.name)) {
      log(`   Install: ${check.install}`, 'yellow');
      allPresent = false;
    }
  }

  if (!allPresent) {
    log('\n❌ Missing prerequisites. Please install them and run this script again.', 'red');
    process.exit(1);
  }

  // Check Docker is running
  const dockerRunning = execCommand('docker ps', null);
  if (!dockerRunning) {
    log('❌ Docker is not running. Please start Docker Desktop.', 'red');
    process.exit(1);
  }
  log('✅ Docker is running', 'green');

  // Check if port 3000 is available
  const portAvailable = await isPortAvailable(3000);
  if (!portAvailable) {
    log('⚠️  Warning: Port 3000 is already in use', 'yellow');
    log('   The backend may fail to start if another service is using this port.', 'yellow');
    const answer = await askQuestion('Continue anyway? (y/n):');
    if (answer !== 'y' && answer !== 'yes') {
      log('\nTip: Stop the service using port 3000, or configure a different PORT in .env', 'cyan');
      process.exit(0);
    }
  } else {
    log('✅ Port 3000 is available', 'green');
  }

  log('\n✅ All prerequisites met!', 'bright');
}

async function installDependencies() {
  logHeader('Step 2/7: Installing Dependencies');

  // Check if node_modules exists
  if (fs.existsSync('node_modules')) {
    log('ℹ️  node_modules already exists', 'cyan');
    const answer = await askQuestion('Reinstall dependencies? (y/n):');
    if (answer !== 'y' && answer !== 'yes') {
      log('⏭️  Skipping dependency installation', 'yellow');
      return;
    }
  }

  log('Running: pnpm install', 'cyan');
  const result = execCommand('pnpm install', 'Failed to install dependencies');
  if (!result) {
    process.exit(1);
  }
  log('✅ Dependencies installed', 'green');
}

async function setupSupabase() {
  logHeader('Step 3/7: Setting Up Supabase');

  // Check if Supabase is already running
  const status = execCommand('supabase status 2>&1', null);

  if (status && status.includes('supabase_db_')) {
    log('✅ Supabase is already running', 'green');
    return extractSupabaseKeys();
  }

  log('Starting Supabase...', 'cyan');
  log('(This may take 1-2 minutes on first run)', 'yellow');

  const result = execCommand('supabase start', 'Failed to start Supabase');
  if (!result) {
    log('\nTip: If Supabase fails to start, try:', 'yellow');
    log('  1. Ensure Docker has enough resources (4GB+ RAM)', 'yellow');
    log('  2. Run: supabase stop && supabase start', 'yellow');
    process.exit(1);
  }

  log('✅ Supabase started successfully', 'green');
  return extractSupabaseKeys();
}

function extractSupabaseKeys() {
  log('\nExtracting Supabase keys...', 'cyan');

  const status = execCommand('supabase status', 'Failed to get Supabase status');
  if (!status) {
    process.exit(1);
  }

  // Extract keys from status output with better error handling
  const anonKeyMatch = status.match(/anon key: (.+)/);
  const serviceKeyMatch = status.match(/service_role key: (.+)/);
  const apiUrlMatch = status.match(/API URL: (.+)/);
  const dbUrlMatch = status.match(/DB URL: (.+)/);

  if (!anonKeyMatch || !serviceKeyMatch) {
    log('❌ Failed to extract Supabase keys from output', 'red');
    log('\nSupabase status output:', 'yellow');
    console.log(status);
    log('\nPlease run: supabase status', 'yellow');
    log('And verify the output contains "anon key" and "service_role key"', 'yellow');
    process.exit(1);
  }

  const keys = {
    anonKey: anonKeyMatch[1].trim(),
    serviceKey: serviceKeyMatch[1].trim(),
    apiUrl: apiUrlMatch ? apiUrlMatch[1].trim() : 'http://localhost:54321',
    dbUrl: dbUrlMatch ? dbUrlMatch[1].trim() : 'postgresql://postgres:postgres@localhost:54322/postgres',
  };

  // Validate extracted keys
  if (!validateJwtKey(keys.anonKey)) {
    log('❌ Extracted anon key does not appear to be a valid JWT', 'red');
    log(`   Key: ${keys.anonKey.substring(0, 50)}...`, 'red');
    process.exit(1);
  }

  if (!validateJwtKey(keys.serviceKey)) {
    log('❌ Extracted service_role key does not appear to be a valid JWT', 'red');
    log(`   Key: ${keys.serviceKey.substring(0, 50)}...`, 'red');
    process.exit(1);
  }

  log('✅ Supabase keys extracted and validated', 'green');
  return keys;
}

async function createEnvFiles(keys) {
  logHeader('Step 4/7: Creating Environment Files');

  const backendEnvLocal = path.join(process.cwd(), 'apps/backend/.env.local');
  const backendEnvTest = path.join(process.cwd(), 'apps/backend/.env.test');

  let skipEnvLocal = false;

  // Create .env.local
  if (fs.existsSync(backendEnvLocal)) {
    const answer = await askQuestion('.env.local already exists. Overwrite? (y/n):');
    if (answer !== 'y' && answer !== 'yes') {
      log('⏭️  Skipping .env.local creation', 'yellow');
      log('⚠️  Warning: Migrations may fail without correct .env.local', 'yellow');

      const continueAnswer = await askQuestion('Continue anyway? (y/n):');
      if (continueAnswer !== 'y' && continueAnswer !== 'yes') {
        log('\n❌ Setup cancelled. Run again to overwrite .env.local', 'red');
        process.exit(0);
      }
      skipEnvLocal = true;
    }
  }

  if (!skipEnvLocal) {
    const envLocalContent = `# Local Development Environment
# Auto-generated by pnpm setup on ${new Date().toISOString()}

# Database Connection (Local Supabase PostgreSQL)
DATABASE_URL="${keys.dbUrl}"
DIRECT_URL="${keys.dbUrl}"

# Supabase Configuration (Local)
SUPABASE_URL="${keys.apiUrl}"
SUPABASE_ANON_KEY="${keys.anonKey}"
SUPABASE_SERVICE_ROLE_KEY="${keys.serviceKey}"

# Server Configuration
NODE_ENV=development
PORT=3000
API_PREFIX=api
`;

    fs.writeFileSync(backendEnvLocal, envLocalContent);
    log('✅ Created apps/backend/.env.local', 'green');
  }

  // Update .env.test keys (regardless of .env.local skip)
  if (fs.existsSync(backendEnvTest)) {
    const existingEnvTest = fs.readFileSync(backendEnvTest, 'utf8');

    // Check if keys look like demo keys (JWT format check)
    const currentAnonMatch = existingEnvTest.match(/SUPABASE_ANON_KEY="?(.+?)"?$/m);
    const currentServiceMatch = existingEnvTest.match(/SUPABASE_SERVICE_ROLE_KEY="?(.+?)"?$/m);

    const shouldUpdate =
      existingEnvTest.includes('supabase-demo') ||
      (currentAnonMatch && !validateJwtKey(currentAnonMatch[1])) ||
      (currentServiceMatch && !validateJwtKey(currentServiceMatch[1]));

    if (shouldUpdate) {
      const updatedEnvTest = existingEnvTest
        .replace(/SUPABASE_ANON_KEY=.+/, `SUPABASE_ANON_KEY="${keys.anonKey}"`)
        .replace(/SUPABASE_SERVICE_ROLE_KEY=.+/, `SUPABASE_SERVICE_ROLE_KEY="${keys.serviceKey}"`);

      fs.writeFileSync(backendEnvTest, updatedEnvTest);
      log('✅ Updated apps/backend/.env.test with Supabase keys', 'green');
    } else {
      log('ℹ️  .env.test already has valid keys, skipping update', 'cyan');
    }
  }
}

async function runPrismaMigrations(keys) {
  logHeader('Step 5/7: Running Database Migrations');

  // Check if migrations directory exists
  const migrationsDir = path.join(process.cwd(), 'apps/backend/prisma/migrations');
  if (!fs.existsSync(migrationsDir)) {
    log('⚠️  No Prisma migrations directory found', 'yellow');
    log('   Expected: apps/backend/prisma/migrations', 'yellow');
    log('   Skipping migration step. Run "npx prisma migrate dev" to create migrations.', 'yellow');

    // Still generate Prisma client
    log('\nGenerating Prisma client...', 'cyan');
    const generateResult = execCommand(
      'npx prisma generate',
      'Failed to generate Prisma client',
      { cwd: path.join(process.cwd(), 'apps/backend') }
    );

    if (generateResult) {
      log('✅ Prisma client generated', 'green');
    }
    return;
  }

  log('Applying Prisma migrations...', 'cyan');

  // Validate keys.dbUrl exists (don't use fallback)
  if (!keys.dbUrl) {
    log('❌ Database URL is missing from extracted keys', 'red');
    log('   This indicates a bug in key extraction.', 'red');
    log('   Please report this issue.', 'yellow');
    process.exit(1);
  }

  // Use cwd option instead of cd command (handles spaces in paths)
  const result = execCommand(
    `DATABASE_URL="${keys.dbUrl}" npx prisma migrate deploy`,
    'Failed to apply migrations',
    { cwd: path.join(process.cwd(), 'apps/backend') }
  );

  if (!result) {
    log('\nTip: If migrations fail, try:', 'yellow');
    log('  1. Run: cd apps/backend && npx prisma migrate dev', 'yellow');
    log('  2. Or: cd apps/backend && npx prisma db push', 'yellow');
    log('  3. Check that Supabase is running: supabase status', 'yellow');
    process.exit(1);
  }

  log('✅ Migrations applied', 'green');

  log('\nGenerating Prisma client...', 'cyan');
  const generateResult = execCommand(
    'npx prisma generate',
    'Failed to generate Prisma client',
    { cwd: path.join(process.cwd(), 'apps/backend') }
  );

  if (!generateResult) {
    process.exit(1);
  }

  log('✅ Prisma client generated', 'green');
}

async function setupTestDatabases() {
  logHeader('Step 6/7: Setting Up Test Databases');

  const answer = await askQuestion('Set up test databases for E2E testing? (y/n):');

  if (answer === 'y' || answer === 'yes') {
    log('Setting up test databases...', 'cyan');
    log('(This will create test_db_1, test_db_2, etc.)', 'yellow');

    // Check if script exists
    const scriptPath = path.join(process.cwd(), 'scripts/setup-test-databases.js');
    if (!fs.existsSync(scriptPath)) {
      log('⚠️  Test database setup script not found', 'yellow');
      log('   Expected: scripts/setup-test-databases.js', 'yellow');
      return;
    }

    const result = execCommand(
      'node scripts/setup-test-databases.js',
      'Failed to set up test databases'
    );

    if (!result) {
      log('\nYou can run this manually later with: pnpm test:setup', 'yellow');
    } else {
      log('✅ Test databases created', 'green');
    }
  } else {
    log('⏭️  Skipping test database setup', 'yellow');
    log('   Run later with: pnpm test:setup', 'cyan');
  }
}

async function startServices() {
  logHeader('Step 7/7: Starting Services');

  const answer = await askQuestion('Start backend services now? (y/n):');

  if (answer === 'y' || answer === 'yes') {
    log('\n✅ Starting services in background...', 'cyan');
    log('Backend will be available at: http://localhost:3000', 'yellow');
    log('API docs will be available at: http://localhost:3000/api/docs', 'yellow');
    log('Supabase Studio: http://localhost:54323\n', 'yellow');

    // Use spawn (async) with proper stdio handling for detached process
    const child = spawn('pnpm', ['local:start'], {
      detached: true,
      stdio: 'ignore',  // FIX: Use 'ignore' instead of 'inherit' for detached processes
      shell: true,
    });

    // Don't wait for child process
    child.unref();

    // Give it a moment to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if process is still running (platform-specific)
    if (isProcessRunning(child.pid)) {
      log('✅ Services starting... Use "pnpm local:stop" to stop them', 'green');
    } else {
      log('⚠️  Services may have failed to start. Try manually with: pnpm local:start', 'yellow');
    }
  } else {
    log('\n⏭️  Skipping service startup', 'yellow');
    log('   Start later with: pnpm local:start', 'cyan');
  }
}

async function displaySummary() {
  logHeader('✅ Setup Complete!');

  log('Your development environment is ready. Here\'s what was set up:\n', 'green');

  console.log('  ✓ Dependencies installed');
  console.log('  ✓ Supabase running on localhost:54321');
  console.log('  ✓ PostgreSQL running on localhost:54322');
  console.log('  ✓ Supabase Studio running on localhost:54323');
  console.log('  ✓ Environment files created');
  console.log('  ✓ Database migrations applied');
  console.log('  ✓ Prisma client generated\n');

  log('Next steps:', 'bright');
  console.log('  1. Start services:     pnpm local:start');
  console.log('  2. View API docs:      http://localhost:3000/api/docs');
  console.log('  3. View Supabase UI:   http://localhost:54323');
  console.log('  4. Run tests:          cd apps/backend && pnpm test:e2e');
  console.log('  5. Stop services:      pnpm local:stop\n');

  log('Documentation:', 'bright');
  console.log('  - README.md           (main guide)');
  console.log('  - CLAUDE.md           (backend development guide)');
  console.log('  - docs/E2E_TESTING_STRATEGY.md  (testing patterns)\n');
}

async function main() {
  try {
    // Clear console if supported
    if (process.stdout.isTTY) {
      console.clear();
    }

    log('🚀 User Story Mapping Tool - First-Time Setup', 'bright');
    log('This script will set up your development environment\n', 'cyan');

    await checkProjectRoot();
    await checkPrerequisites();
    await installDependencies();
    const keys = await setupSupabase();
    await createEnvFiles(keys);
    await runPrismaMigrations(keys);
    await setupTestDatabases();
    await startServices();
    await displaySummary();

    // Close readline and let process exit naturally
    rl.close();
  } catch (error) {
    log('\n❌ Setup failed with error:', 'red');
    console.error(error);
    log('\nPlease check the error message above and try again.', 'yellow');
    log('If the problem persists, refer to README.md for manual setup.', 'yellow');
    rl.close();
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\n\n⚠️  Setup interrupted. You can run this script again with: pnpm setup', 'yellow');
  rl.close();
  process.exit(0);
});

main();
