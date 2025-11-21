# Hack Scripts

**Developer automation scripts following the Kubernetes "hack" convention.**

## What is "hack"?

The `hack/` directory is a convention popularized by [Kubernetes](https://github.com/kubernetes/kubernetes/tree/master/hack) for storing **developer-facing scripts** that support the development workflow but aren't part of the main application.

> "The hack directory contains many scripts that ensure continuous development of Kubernetes, enhance the robustness of the code, improve development efficiency, etc."
> — Kubernetes Documentation

## Purpose

This directory contains **bash shell scripts** for:
- Git worktree operations (create, setup, list, refresh)
- API specification metadata generation
- Development tooling and automation

## Why Bash in `hack/`?

- **Native git integration** - Shell scripts integrate naturally with git commands
- **Unix tooling** - Direct access to system utilities
- **Convention** - Follows industry-standard pattern (Kubernetes, kOps, etc.)

## Contents

| Script | Purpose | Usage |
|--------|---------|-------|
| `create_worktree.sh` | Create new git worktree with environment setup | `pnpm worktree:create` |
| `setup_bare_repository.sh` | Convert repository to bare for worktrees | `pnpm worktree:setup` |
| `worktree-list.sh` | List all worktrees with details | `pnpm worktree:list` |
| `worktree-refresh.sh` | Refresh worktree environment | `pnpm worktree:refresh` |
| `spec_metadata.sh` | Generate project metadata for documentation | `bash hack/spec_metadata.sh` |

## Usage

**Run from repository root:**
```bash
bash hack/<script-name>.sh [arguments]
```

**Or via package.json scripts:**
```bash
pnpm worktree:create TICKET-123 feature/my-feature
pnpm worktree:list
pnpm worktree:refresh
```

## Related

- **`scripts/`** - Node.js automation scripts (setup, Docker, local dev, worktree cleanup)
- See `scripts/README.md` for Node.js-based automation

## Convention Resources

- [Kubernetes hack/ directory](https://github.com/kubernetes/kubernetes/tree/master/hack)
- [kOps hack/ documentation](https://kops.sigs.k8s.io/contributing/hack/)
