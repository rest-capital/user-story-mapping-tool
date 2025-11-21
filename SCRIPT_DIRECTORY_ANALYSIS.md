# Script Directory Analysis: `hack/` vs `scripts/`

**Date**: 2025-11-21
**Issue**: Overlapping functionality and unclear organization between `hack/` and `scripts/` directories

---

## Current State

### `hack/` Directory (5 files)
**Purpose**: Bash shell scripts for git worktree operations

| File | Used In | Purpose |
|------|---------|---------|
| `create_worktree.sh` | `worktree:create` | Create new git worktree |
| `setup_bare_repository.sh` | `worktree:setup` | Convert repo to bare for worktrees |
| `spec_metadata.sh` | Claude settings | Generate API spec metadata |
| `worktree-list.sh` | `worktree:list` | List all worktrees |
| `worktree-refresh.sh` | `worktree:refresh` | Refresh worktree environment |

### `scripts/` Directory (11 files)
**Purpose**: Node.js scripts for setup, Docker, local dev, and worktrees

| File | Used In | Purpose |
|------|---------|---------|
| `setup.js` | `setup` | **NEW** Automated first-time setup |
| `setup-test-databases.js` | `test:setup` | Set up E2E test databases |
| `docker-cleanup.js` | `docker:clean*` | Clean Docker resources |
| `smart-start.js` | `local:start` | Start backend services |
| `smart-stop.js` | `local:stop` | Stop backend services |
| `smart-restart.js` | `local:restart` | Restart backend services |
| `worktree-remove.js` | `worktree:remove` | Remove worktree |
| `worktree-cleanup.js` | `worktree:cleanup` | Clean up single worktree |
| `worktree-cleanup-all.js` | `worktree:cleanup-all` | Clean up all worktrees |
| `worktree-workflow.js` | ❌ **NOT USED** | Interactive worktree creation |
| `create-worktree.sh` | ❌ **NOT USED** | Duplicate worktree creation |

---

## Issues Identified

### 🔴 Critical Issues

1. **Duplicate Script**: `scripts/create-worktree.sh` duplicates `hack/create_worktree.sh`
   - `hack/create_worktree.sh`: 175 lines, **USED** in `worktree:create`
   - `scripts/create-worktree.sh`: 113 lines, **NOT USED**
   - **Action**: Delete `scripts/create-worktree.sh`

2. **Broken Reference**: `.claude/commands/create_handoff.md` references non-existent `scripts/spec_metadata.sh`
   - Should reference `hack/spec_metadata.sh` instead
   - **Action**: Fix reference in `.claude/commands/create_handoff.md`

3. **Unused Script**: `scripts/worktree-workflow.js` is not referenced in `package.json`
   - Interactive worktree creation (58 lines)
   - **Action**: Either add to `package.json` or delete

### 🟡 Organizational Issues

4. **Unclear Separation**: Both directories contain worktree scripts
   - `hack/`: Create, setup, list, refresh (bash)
   - `scripts/`: Remove, cleanup (Node.js)
   - **Confusing**: Why are worktree scripts split across two directories?

5. **Naming Inconsistency**:
   - `hack/`: Uses underscores (`create_worktree.sh`, `setup_bare_repository.sh`)
   - `scripts/`: Uses hyphens (`worktree-remove.js`, `smart-start.js`)
   - **Action**: Standardize on one naming convention

---

## Proposed Organization

### Option 1: Consolidate Everything in `scripts/`
**Rationale**: Modern, unified location for all automation

```
scripts/
├── setup/
│   ├── setup.js                    # First-time setup
│   └── setup-test-databases.js     # E2E test setup
├── docker/
│   └── cleanup.js                  # Docker cleanup
├── local/
│   ├── start.js                    # Start services
│   ├── stop.js                     # Stop services
│   └── restart.js                  # Restart services
└── worktree/
    ├── setup.sh                    # Convert to bare repo
    ├── create.sh                   # Create worktree
    ├── remove.js                   # Remove worktree
    ├── cleanup.js                  # Clean single worktree
    ├── cleanup-all.js              # Clean all worktrees
    ├── list.sh                     # List worktrees
    └── refresh.sh                  # Refresh worktree env
```

**Pros**:
- ✅ Single source of truth
- ✅ Clear categorization
- ✅ Easy to discover scripts

**Cons**:
- ❌ Breaks "hack" convention (used by Kubernetes, etc.)
- ❌ Requires updating all package.json references

---

### Option 2: Keep `hack/` for Bash, `scripts/` for Node.js
**Rationale**: Clear technology separation

```
hack/                           # Bash shell scripts
├── spec_metadata.sh           # Spec metadata generation
└── worktree/
    ├── setup.sh               # Setup bare repository
    ├── create.sh              # Create worktree
    ├── list.sh                # List worktrees
    └── refresh.sh             # Refresh worktree

scripts/                        # Node.js scripts
├── setup.js                   # First-time setup
├── setup-test-databases.js    # E2E test setup
├── docker-cleanup.js          # Docker cleanup
├── smart-start.js             # Start services
├── smart-stop.js              # Stop services
├── smart-restart.js           # Restart services
└── worktree/
    ├── remove.js              # Remove worktree
    ├── cleanup.js             # Clean single worktree
    └── cleanup-all.js         # Clean all worktrees
```

**Pros**:
- ✅ Preserves "hack" convention
- ✅ Clear technology boundary (bash vs Node.js)
- ✅ Minimal changes to package.json

**Cons**:
- ❌ Worktree scripts still split across two directories
- ❌ Less intuitive ("why is worktree in two places?")

---

### Option 3: Keep Current Structure, Fix Issues ⭐ **RECOMMENDED**
**Rationale**: Minimal disruption, addresses critical issues only

**Changes**:
1. ✅ Delete `scripts/create-worktree.sh` (duplicate)
2. ✅ Delete or integrate `scripts/worktree-workflow.js` (unused)
3. ✅ Fix broken reference in `.claude/commands/create_handoff.md`
4. ✅ Add comments to both directories explaining their purpose

**Keep**:
- `hack/` for bash-based worktree operations (follows Kubernetes convention)
- `scripts/` for Node.js automation (setup, Docker, local dev, worktree cleanup)

**Add Documentation**:

```bash
# hack/README.md
# Bash Shell Scripts

This directory contains bash shell scripts following the "hack" convention
(popularized by Kubernetes). These scripts are for:

- Git worktree operations (create, setup, list, refresh)
- API specification metadata generation

All worktree creation and setup scripts live here because they require
bash-specific features and integrate with git more directly.
```

```bash
# scripts/README.md
# Node.js Automation Scripts

This directory contains Node.js scripts for project automation:

- **setup.js**: Automated first-time environment setup
- **setup-test-databases.js**: E2E test database setup
- **docker-cleanup.js**: Docker resource cleanup
- **smart-*.js**: Local development server management
- **worktree-*.js**: Worktree cleanup operations (removal, cleanup)

Cleanup operations are in Node.js for better error handling and
cross-platform compatibility.
```

**Pros**:
- ✅ Minimal changes
- ✅ Fixes all critical issues
- ✅ Preserves working setup
- ✅ Documents intent

**Cons**:
- ❌ Still have worktree scripts in two places (but now documented why)

---

## Immediate Actions Required

### 1. Delete Duplicate Script
```bash
rm scripts/create-worktree.sh
```

### 2. Fix Broken Reference
Edit `.claude/commands/create_handoff.md`:
```diff
-    - Run the `scripts/spec_metadata.sh` script to generate all relevant metadata
+    - Run the `hack/spec_metadata.sh` script to generate all relevant metadata
```

### 3. Handle Unused Script
Either:
- **Option A**: Delete `scripts/worktree-workflow.js` (if not needed)
- **Option B**: Add to `package.json` as `worktree:wizard`

### 4. Add Documentation
Create `hack/README.md` and `scripts/README.md` as shown above

---

## Decision Needed

**Which option do you prefer?**

1. **Option 1**: Consolidate everything in `scripts/` (major refactor)
2. **Option 2**: Keep separation, organize better (moderate refactor)
3. **Option 3**: Fix critical issues, document intent (minimal change) ⭐

---

## Summary

- **Total Scripts**: 16 files across 2 directories
- **Duplicates Found**: 1 (`create-worktree.sh`)
- **Unused Scripts**: 1 (`worktree-workflow.js`)
- **Broken References**: 1 (`.claude/commands/create_handoff.md`)
- **Organization Issues**: Worktree scripts split across directories

**Recommendation**: Option 3 (fix critical issues, add documentation)
