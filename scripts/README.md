# Automation Scripts

**Node.js scripts for project automation covering setup, Docker management, local development, and testing.**

## Purpose

This directory contains **Node.js scripts** that automate:
- First-time environment setup
- Docker resource management
- Local development server lifecycle
- Test database provisioning
- Worktree cleanup operations

## Why Node.js in `scripts/`?

- **Cross-platform** - Works on Windows, macOS, and Linux
- **Better error handling** - Structured error handling vs bash
- **npm ecosystem** - Integration with JavaScript tooling
- **Complex logic** - JSON parsing, API calls, interactive prompts

## Contents

### Setup & Configuration
| Script | Purpose | Usage |
|--------|---------|-------|
| `setup.js` | **Automated first-time setup** - Prerequisites check, Supabase start, env configuration, migrations | `pnpm setup` |
| `setup-test-databases.js` | Create isolated E2E test databases | `pnpm test:setup` |

### Docker Management
| Script | Purpose | Usage |
|--------|---------|-------|
| `docker-cleanup.js` | Clean Docker resources (containers, volumes, images) with safety levels | `pnpm docker:clean` |
| | Normal cleanup (unused resources) | `pnpm docker:clean` |
| | Full cleanup (all project resources) | `pnpm docker:clean:full` |
| | Test database cleanup only | `pnpm docker:clean:test` |

### Local Development
| Script | Purpose | Usage |
|--------|---------|-------|
| `smart-start.js` | Start backend services intelligently | `pnpm local:start` |
| `smart-stop.js` | Stop backend services | `pnpm local:stop` |
| `smart-restart.js` | Restart backend services | `pnpm local:restart` |

### Worktree Management (Node.js)
| Script | Purpose | Usage |
|--------|---------|-------|
| `worktree-workflow.js` | **Interactive wizard** for guided worktree creation | `pnpm worktree:wizard` |
| `worktree-remove.js` | Remove worktree with validation | `pnpm worktree:remove` |
| `worktree-cleanup.js` | Clean up single worktree (Docker, env, etc.) | `pnpm worktree:cleanup` |
| `worktree-cleanup-all.js` | Clean up all worktrees | `pnpm worktree:cleanup-all` |

## Usage

**Via package.json scripts (recommended):**
```bash
pnpm setup                    # First-time setup
pnpm local:start              # Start development server
pnpm docker:clean             # Clean Docker resources
pnpm worktree:wizard          # Interactive worktree creation
```

**Direct execution:**
```bash
node scripts/<script-name>.js [arguments]
```

## Highlights

### 🎯 `setup.js` - Production-Grade Setup
Our most sophisticated script with **44 bugs fixed** across 8 iterations:
- ✅ Cross-platform compatibility (Windows, macOS, Linux)
- ✅ Comprehensive validation (JWT, URL format, empty strings)
- ✅ Intelligent error handling with recovery tips
- ✅ Optimized execution (no redundant commands)
- ✅ Process management (no zombies, proper cleanup)

**Features:**
- Prerequisites checking (Node.js, pnpm, Docker, Supabase CLI)
- Automatic Supabase initialization
- Environment file generation with validation
- Database migration execution
- Test database setup (optional)
- Service startup (optional)

### 🧙 `worktree-workflow.js` - Interactive Wizard
Guides users through worktree creation with:
- Interactive prompts for branch name
- Automatic ticket ID extraction from branch names
- Confirmation before creation
- Delegates to `hack/create_worktree.sh` for actual setup

## Architecture

### Why Split Worktree Scripts?

**Bash scripts** (`hack/`) - **Creation & Setup**
- Direct git integration
- Environment configuration
- Repository structure manipulation

**Node.js scripts** (`scripts/`) - **Cleanup & Management**
- Cross-platform Docker cleanup
- JSON configuration parsing
- Interactive workflows
- Better error handling for cleanup operations

This separation follows best practices:
- Use the **right tool for the job**
- Bash for git operations, Node.js for complex logic
- Aligns with industry conventions

## Related

- **`hack/`** - Bash shell scripts for git worktree operations and developer tooling
- See `hack/README.md` for Kubernetes-style developer scripts

## Development Guidelines

When adding new scripts:
1. **Use Node.js** for cross-platform needs, complex logic, or npm integration
2. **Use Bash** (in `hack/`) for direct git/system operations
3. **Add to package.json** with descriptive command name
4. **Include error handling** with helpful messages
5. **Document in this README** with purpose and usage
