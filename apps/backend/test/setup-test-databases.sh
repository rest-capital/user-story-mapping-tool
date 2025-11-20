#!/bin/bash
# Setup Test Databases for Parallel E2E Testing
# Creates isolated databases for Jest workers (based on CPU cores)

set -e

echo "🗄️  Setting up parallel test databases..."
echo ""

# Configuration
POSTGRES_HOST="localhost"
POSTGRES_PORT="54322"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres"
POSTGRES_DB="postgres"  # Connect to default database to create others

# Calculate number of workers (50% of CPU cores, matching Jest config)
# Allow override via argument: ./setup-test-databases.sh 4
if [ -n "$1" ]; then
  NUM_WORKERS=$1
else
  # Detect CPU cores (works on macOS and Linux)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    CPU_CORES=$(sysctl -n hw.ncpu)
  else
    CPU_CORES=$(nproc)
  fi
  # Calculate 50% of cores (minimum 1, maximum 8 for safety)
  NUM_WORKERS=$((CPU_CORES / 2))
  NUM_WORKERS=$((NUM_WORKERS < 1 ? 1 : NUM_WORKERS))
  NUM_WORKERS=$((NUM_WORKERS > 8 ? 8 : NUM_WORKERS))
fi

echo "📋 Configuration:"
echo "   Host: $POSTGRES_HOST:$POSTGRES_PORT"
echo "   CPU Cores: ${CPU_CORES:-N/A (manual override)}"
echo "   Workers: $NUM_WORKERS (50% of cores or manual override)"
echo "   Databases: test_db_1 through test_db_$NUM_WORKERS"
echo ""

# Function to create a database
create_database() {
  local db_name=$1
  echo "🔨 Creating database: $db_name"

  # Drop if exists, then create
  PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB <<EOF
DROP DATABASE IF EXISTS $db_name;
CREATE DATABASE $db_name;
EOF

  if [ $? -eq 0 ]; then
    echo "   ✅ Created: $db_name"
  else
    echo "   ❌ Failed to create: $db_name"
    exit 1
  fi
}

# Function to apply Prisma migrations to a database
apply_migrations() {
  local db_name=$1
  echo "📦 Applying migrations to: $db_name"

  # Set DATABASE_URL for this specific database
  export DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$db_name"
  export DIRECT_URL="$DATABASE_URL"

  # Apply migrations
  npx prisma migrate deploy --schema=./prisma/schema.prisma

  if [ $? -eq 0 ]; then
    echo "   ✅ Migrations applied: $db_name"
  else
    echo "   ❌ Failed to apply migrations: $db_name"
    exit 1
  fi
}

# Step 1: Create all databases
echo "Step 1: Creating databases..."
echo ""
for i in $(seq 1 $NUM_WORKERS); do
  create_database "test_db_$i"
done

echo ""
echo "Step 2: Applying Prisma migrations..."
echo ""

# Step 2: Apply migrations to all databases
for i in $(seq 1 $NUM_WORKERS); do
  apply_migrations "test_db_$i"
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test databases setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Created databases:"
for i in $(seq 1 $NUM_WORKERS); do
  echo "   • test_db_$i"
done
echo ""
echo "You can now run parallel E2E tests:"
echo "   cd apps/backend"
echo "   pnpm test:e2e"
echo ""
echo "Jest will automatically distribute tests across $NUM_WORKERS workers,"
echo "each using its own isolated database."
echo ""
echo "💡 Tips:"
echo "   - To create different number of databases: ./setup-test-databases.sh <num>"
echo "   - Example: ./setup-test-databases.sh 8 (for 8 workers)"
echo "   - Current Jest config uses maxWorkers: \"50%\" (adapts to system)"
echo ""
