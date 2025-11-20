# Docker Maintenance Guide

**Preventing Docker Bloat & Zombie Data**

## 🎯 TL;DR - Quick Commands

```bash
# Weekly maintenance (recommended)
pnpm docker:clean

# Full nuclear cleanup (when you have disk issues)
pnpm docker:clean:full

# Clean test databases only
pnpm docker:clean:test

# Check what's using disk space
pnpm docker:status
```

---

## 🧹 Complete Docker Cleanup

### What Gets Cleaned vs. Preserved

**✅ SAFE TO DELETE (This is Docker data):**
- Docker images (node:20-slim, postgres, etc.)
- Docker containers (backend)
- Docker volumes (anonymous volumes)
- Docker build cache (pnpm cache, layer cache)

**✅ ALWAYS PRESERVED (Not managed by Docker):**
- **Supabase data** - Stored in `~/.supabase` or project directory by Supabase CLI
- **Your source code** - Lives on host machine
- **node_modules** - On host machine (not in Docker during dev)
- **Test database data** - Managed by Supabase CLI, not Docker
- **.env files** - On host machine

### Cleanup Modes

#### 1. Normal Cleanup (Recommended Weekly)

```bash
pnpm docker:clean
```

**What it does:**
- Removes build cache
- Removes old images (older than 72 hours)
- Removes unused volumes
- **Keeps active containers and recent images**

**When to use:**
- Weekly maintenance
- Regular cleanup
- After significant development work

---

#### 2. Nuclear Cleanup (Full Wipe)

```bash
pnpm docker:clean:full
```

**What it does:**
- Stops and removes ALL containers
- Removes ALL volumes (including test DBs)
- Removes ALL images
- Removes ALL build cache

**When to use:**
- Disk space critically low
- Docker build fails with "no space left on device"
- Fresh start needed
- Moving between major versions

**Impact**: Frees 10-40GB of disk space!

---

#### 3. Test Database Cleanup

```bash
pnpm docker:clean:test
```

**What it does:**
- Drops test PostgreSQL databases inside Supabase (test_db_1, test_db_2, etc.)
- Terminates active connections before dropping
- Uses `psql` to drop databases (not Docker volume commands)
- Requires Supabase to be running
- Requires PostgreSQL client tools (psql) installed
- Keeps everything else intact

**Important:** Test databases are PostgreSQL databases INSIDE Supabase's container, not separate Docker volumes.

**Prerequisites:**
- Supabase must be running: `supabase start`
- PostgreSQL client tools must be installed:
  - **macOS:** `brew install postgresql@16`
  - **Linux:** `sudo apt-get install postgresql-client`
- **Default configuration assumed:**
  - PostgreSQL port: `54322` (Supabase default)
  - PostgreSQL password: `postgres` (Supabase default)
  - If you changed these, update the script accordingly

**When to use:**
- After test runs that may have left corrupted data
- Before running `pnpm test:setup` again
- Switching branches with schema changes
- When tests fail due to database conflicts
- Cleaning up test artifacts

**Known Limitations:**
- Uses `PGPASSWORD` environment variable (acceptable for local development only)
- May fail if connections are still active (script attempts to terminate them first)

---

## 🛡️ Preventing Docker Bloat

### 1. ✅ Log Rotation (Already Configured!)

**Your docker-compose.yml already has log rotation:**

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "50m"   # Max size per log file
    max-file: "5"     # Keep 5 rotated files
    # Total cap: 250MB per container
```

**This prevents 80% of disk bloat automatically!**

---

### 2. Monitor Docker Disk Usage

```bash
# Check what's using space
pnpm docker:status

# Or directly:
docker system df
```

**Healthy state:**
```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          8         5         3.2GB     500MB (15%)
Containers      1         1         2MB       0B (0%)
Local Volumes   12        12        500MB     0B (0%)
Build Cache     0         0         0B        0B
```

**Bloated state (needs cleanup):**
```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          45        8         22GB      18GB (82%)      ⚠️
Containers      15        2         45MB      40MB (89%)      ⚠️
Local Volumes   142       12        24GB      23GB (96%)      ⚠️
Build Cache     89        0         5GB       5GB (100%)      ⚠️
```

---

### 3. Orphaned Test Databases

**Problem:** Running `pnpm test:e2e` uses test databases (test_db_1-8). If tests are interrupted or schema changes occur, databases may have stale/corrupted data.

**Important:** Test databases are PostgreSQL databases INSIDE Supabase's container, not Docker volumes!

**Solution:**
```bash
# Requires Supabase to be running
supabase start

# Drop all test databases
pnpm docker:clean:test

# Recreate them
pnpm test:setup
```

---

### 4. Zombie Volumes from Interrupted Builds

**Problem:** Stopping Docker during `docker compose up` can leave orphaned volumes.

**Solution:**
```bash
# Always use 'down' instead of just stopping containers
pnpm docker:down

# Remove volumes explicitly
docker compose down -v
```

---

## 🚀 Development Workflow Best Practices

### Daily Development

```bash
# Start services
pnpm docker:up

# View logs
pnpm docker:logs

# Restart after code changes
pnpm docker:restart

# Stop services
pnpm docker:down
```

### After Major Changes

```bash
# Rebuild containers after dependency changes
pnpm docker:build
pnpm docker:up
```

### Before Running Tests

```bash
# Ensure clean test databases
pnpm docker:clean:test
pnpm test:setup
```

---

## 🔍 Troubleshooting Common Issues

### Issue #1: "No space left on device" during build

**Cause:** Docker disk usage exceeded (usually build cache or old images)

**Solution:**
```bash
# Check disk usage
pnpm docker:status

# Nuclear cleanup
pnpm docker:clean:full

# Rebuild
pnpm docker:build && pnpm docker:up
```

---

### Issue #2: "Port already in use"

**Cause:** Container still running from previous session

**Solution:**
```bash
# Stop all containers
pnpm docker:down

# Or check what's using the port
lsof -i :3000
```

---

### Issue #3: Test databases are corrupted

**Cause:** Tests interrupted or crashed, leaving data in inconsistent state

**Solution:**
```bash
# Ensure Supabase is running
supabase start

# Stop any running tests first (important!)
# Then clean test databases
pnpm docker:clean:test

# If some drops failed due to active connections:
# - Stop all tests and connections
# - Run the cleanup command again
# - Repeat until all databases are dropped

# Once all databases are successfully dropped, recreate them
pnpm test:setup

# Run tests again
cd ..
pnpm test:e2e
```

---

### Issue #6: "psql: command not found"

**Cause:** PostgreSQL client tools not installed

**Solution:**
```bash
# macOS
brew install postgresql@16

# Linux (Debian/Ubuntu)
sudo apt-get install postgresql-client

# Verify installation
which psql
```

---

### Issue #7: "Could not connect to PostgreSQL!"

**Cause:** PostgreSQL connection failed (wrong port, wrong password, or network issue)

**Solution:**
```bash
# Check your Supabase configuration
supabase status

# Verify the port (should be 54322 by default)
# If you changed the port or password, update the script:
# Edit scripts/docker-cleanup.js
# - Change: -p 54322 to your custom port
# - Change: PGPASSWORD=postgres to your custom password

# Test connection manually
PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT 1"
```

---

### Issue #4: "Cannot connect to Docker daemon"

**Cause:** Docker Desktop is not running

**Solution:**
1. Open Docker Desktop
2. Wait for it to fully start (check status bar)
3. Try your command again

---

### Issue #5: Volumes won't delete ("volume is in use")

**Cause:** Container is still running or crashed

**Solution:**
```bash
# Force stop and remove all containers
docker compose down -v

# Force remove specific volume
docker volume rm <volume-name> --force

# Or nuclear option
docker system prune -af --volumes
```

---

## 📊 Docker Resource Limits (macOS/Windows)

Configure in **Docker Desktop > Settings > Resources:**

**Recommended settings for this project:**
- **CPUs**: 4-6 cores (for parallel tests)
- **Memory**: 6-8GB
- **Disk**: 60-100GB (with auto-prune enabled)
- **Swap**: 1-2GB

**Enable auto-prune:**
- Docker Desktop > Settings > General
- Check "Remove unused images and containers"

---

## 🔄 Automated Maintenance (Optional)

### Weekly Cleanup Cron Job

Create a weekly cleanup script:

```bash
#!/bin/bash
# save as ~/bin/docker-weekly-cleanup.sh

echo "🧹 Running weekly Docker cleanup..."
cd ~/code/work/user-story-mapping-tool
docker compose down
docker system prune -af --volumes
echo "✅ Docker cleanup complete!"
docker system df
```

Make it executable:
```bash
chmod +x ~/bin/docker-weekly-cleanup.sh
```

Add to crontab (macOS/Linux):
```bash
# Run every Sunday at 3am
crontab -e

# Add this line:
0 3 * * 0 ~/bin/docker-weekly-cleanup.sh >> /tmp/docker-cleanup.log 2>&1
```

---

## 📚 Understanding Parallel Test Database Cleanup

This project uses **isolated test databases** for parallel testing (number varies by CPU cores):
- `test_db_1` (Worker 1)
- `test_db_2` (Worker 2)
- `test_db_3` (Worker 3)
- `test_db_4` (Worker 4)
- ... up to `test_db_8` (if needed)

**CRITICAL: These are PostgreSQL databases INSIDE Supabase, not Docker volumes!**

They are created using `psql` commands and must be dropped using `psql`, not `docker volume rm`.

**Normal workflow**: These databases persist between test runs for speed.

**When to clean them:**
1. Tests are failing unexpectedly (schema mismatch)
2. Switching branches with schema changes
3. After modifying Prisma schema
4. Before recreating with different worker count
5. Weekly maintenance

**How to clean:**
```bash
# Ensure Supabase is running first!
supabase start

# Drop test databases
pnpm docker:clean:test

# Recreate them
pnpm test:setup
```

---

## 🎯 Quick Reference

| Command | What It Does | When to Use |
|---------|--------------|-------------|
| `pnpm docker:clean` | Surgical cleanup | Weekly maintenance |
| `pnpm docker:clean:full` | Nuclear cleanup | Disk critically low |
| `pnpm docker:clean:test` | Clean test DBs | Before test runs |
| `pnpm docker:status` | Check disk usage | Monitor health |
| `pnpm docker:down` | Stop containers | End of work day |
| `pnpm docker:restart` | Fast restart | After code changes |

---

## ✅ Prevention Checklist

- [x] Log rotation configured (250MB cap per container)
- [x] Cleanup scripts created (`scripts/docker-cleanup.js`)
- [x] Package.json scripts added (`docker:clean`, etc.)
- [ ] Weekly cleanup scheduled (optional - see automation section)
- [ ] Docker Desktop resource limits configured
- [ ] Auto-prune enabled in Docker Desktop settings

---

## 🚨 Emergency Cleanup

If Docker is completely broken or disk is full:

```bash
# 1. Stop everything
docker compose down -v

# 2. Nuclear cleanup
docker system prune -af --volumes

# 3. Restart Docker Desktop
# (Sometimes needed after nuclear cleanup)

# 4. Verify Supabase data is safe
supabase status

# 5. Recreate test databases
pnpm test:setup

# 6. Start fresh
pnpm docker:up
```

---

## 📖 Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker System Prune](https://docs.docker.com/config/pruning/)
- [Parallel Testing Implementation Plan](./DOCKER_TESTING_IMPLEMENTATION_PLAN.md)

---

**Remember:** Your Supabase data is always safe. Clean Docker aggressively!
