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

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

function execCommand(command, errorMessage) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    if (errorMessage) {
      log(`❌ ${errorMessage}`, 'red');
      if (error.stdout) log(error.stdout.trim(), 'red');
      if (error.stderr) log(error.stderr.trim(), 'red');
    }
    return null;
  }
}

function checkCommand(command, name) {
  const result = execCommand(`which ${command}`, null);
  if (result) {
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

  log('\n✅ All prerequisites met!', 'bright');
}

async function installDependencies() {
  logHeader('Step 2/7: Installing Dependencies');

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

  // Extract keys from status output
  const anonKeyMatch = status.match(/anon key: (.+)/);
  const serviceKeyMatch = status.match(/service_role key: (.+)/);
  const apiUrlMatch = status.match(/API URL: (.+)/);
  const dbUrlMatch = status.match(/DB URL: (.+)/);

  if (!anonKeyMatch || !serviceKeyMatch) {
    log('❌ Failed to extract Supabase keys', 'red');
    log('Please run: supabase status', 'yellow');
    process.exit(1);
  }

  const keys = {
    anonKey: anonKeyMatch[1].trim(),
    serviceKey: serviceKeyMatch[1].trim(),
    apiUrl: apiUrlMatch ? apiUrlMatch[1].trim() : 'http://localhost:54321',
    dbUrl: dbUrlMatch ? dbUrlMatch[1].trim() : 'postgresql://postgres:postgres@localhost:54322/postgres',
  };

  log('✅ Supabase keys extracted', 'green');
  return keys;
}

async function createEnvFiles(keys) {
  logHeader('Step 4/7: Creating Environment Files');

  const backendEnvLocal = path.join(process.cwd(), 'apps/backend/.env.local');
  const backendEnvTest = path.join(process.cwd(), 'apps/backend/.env.test');

  // Create .env.local
  if (fs.existsSync(backendEnvLocal)) {
    const answer = await askQuestion('.env.local already exists. Overwrite? (y/n):');
    if (answer !== 'y' && answer !== 'yes') {
      log('⏭️  Skipping .env.local creation', 'yellow');
      return;
    }
  }

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

  // Update .env.test keys (keep existing if has demo keys)
  if (fs.existsSync(backendEnvTest)) {
    const existingEnvTest = fs.readFileSync(backendEnvTest, 'utf8');

    // Only update if using demo keys (not custom keys)
    if (existingEnvTest.includes('supabase-demo')) {
      const updatedEnvTest = existingEnvTest
        .replace(/SUPABASE_ANON_KEY=.+/, `SUPABASE_ANON_KEY="${keys.anonKey}"`)
        .replace(/SUPABASE_SERVICE_ROLE_KEY=.+/, `SUPABASE_SERVICE_ROLE_KEY="${keys.serviceKey}"`);

      fs.writeFileSync(backendEnvTest, updatedEnvTest);
      log('✅ Updated apps/backend/.env.test with Supabase keys', 'green');
    } else {
      log('ℹ️  .env.test already has custom keys, skipping update', 'cyan');
    }
  }
}

async function runPrismaMigrations() {
  logHeader('Step 5/7: Running Database Migrations');

  log('Applying Prisma migrations...', 'cyan');

  // Set DATABASE_URL for migrations
  const dbUrl = 'postgresql://postgres:postgres@localhost:54322/postgres';
  const result = execCommand(
    `cd apps/backend && DATABASE_URL="${dbUrl}" npx prisma migrate deploy`,
    'Failed to apply migrations'
  );

  if (!result) {
    log('\nTip: If migrations fail, try:', 'yellow');
    log('  1. Run: cd apps/backend && npx prisma migrate dev', 'yellow');
    log('  2. Or: cd apps/backend && npx prisma db push', 'yellow');
    process.exit(1);
  }

  log('✅ Migrations applied', 'green');

  log('\nGenerating Prisma client...', 'cyan');
  const generateResult = execCommand(
    'cd apps/backend && npx prisma generate',
    'Failed to generate Prisma client'
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
    log('\nStarting services...', 'cyan');
    log('Backend will be available at: http://localhost:3000', 'yellow');
    log('API docs will be available at: http://localhost:3000/api/docs', 'yellow');
    log('\nPress Ctrl+C to stop services\n', 'yellow');

    // Use spawn to show live output
    const child = spawnSync('pnpm', ['local:start'], {
      stdio: 'inherit',
      shell: true,
    });

    if (child.status !== 0) {
      log('\n⚠️  Services failed to start. Try manually with: pnpm local:start', 'yellow');
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
    console.clear();
    log('🚀 User Story Mapping Tool - First-Time Setup', 'bright');
    log('This script will set up your development environment\n', 'cyan');

    await checkPrerequisites();
    await installDependencies();
    const keys = await setupSupabase();
    await createEnvFiles(keys);
    await runPrismaMigrations();
    await setupTestDatabases();
    await startServices();
    await displaySummary();

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
