# User Story Mapping Tool

A monorepo-based user story mapping tool built with NestJS and TypeScript.

## Project Structure

```
.
├── CLAUDE.md                          # Backend development guide
├── docs/                              # Documentation
│   ├── DATA_MODEL_QUICK_REFERENCE.md
│   ├── DATA_MODEL_VISUAL_SUMMARY.md
│   └── DATA_MODEL_COMPREHENSIVE.md
├── packages/
│   ├── common/                        # Shared utilities and types
│   │   ├── src/
│   │   │   ├── config/               # Configuration utilities
│   │   │   ├── decorators/           # Custom decorators
│   │   │   ├── filters/              # Exception filters
│   │   │   ├── guards/               # Guards
│   │   │   ├── interceptors/         # Interceptors
│   │   │   ├── pipes/                # Pipes
│   │   │   ├── types/                # Shared types and interfaces
│   │   │   └── utils/                # Utility functions
│   │   └── package.json
│   └── user-story/                    # User story mapping service
│       ├── src/
│       │   ├── modules/              # Feature modules
│       │   ├── shared/               # Shared service code
│       │   ├── app.module.ts
│       │   ├── app.controller.ts
│       │   ├── app.service.ts
│       │   └── main.ts
│       ├── test/                     # E2E tests
│       └── package.json
└── apps/                             # Future applications (if needed)
```

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## Getting Started

### 1. Install pnpm (if not already installed)

```bash
npm install -g pnpm
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Build all packages

```bash
pnpm build
```

### 4. Start development

```bash
# Start all packages in development mode
pnpm dev

# Or start a specific package
cd packages/user-story
pnpm dev
```

## Available Scripts

### Root Level

- `pnpm install` - Install all dependencies
- `pnpm build` - Build all packages
- `pnpm dev` - Start all packages in development mode
- `pnpm test` - Run tests in all packages
- `pnpm lint` - Lint all packages
- `pnpm format` - Format code with Prettier
- `pnpm clean` - Clean all build artifacts

### Package Level

Navigate to any package directory (`packages/common` or `packages/user-story`) and run:

- `pnpm build` - Build the package
- `pnpm dev` - Start in development mode
- `pnpm test` - Run tests
- `pnpm lint` - Lint the package

## Packages

### @user-story-mapping/common

Shared utilities, types, and common functionality used across all services.

**Key exports:**
- Base types and interfaces
- Exception filters
- Interceptors
- Configuration utilities
- Logger

### @user-story-mapping/user-story

Main user story mapping service built with NestJS.

**Features:**
- RESTful API
- Swagger documentation at `/api/docs`
- Health check endpoint
- Global validation
- Exception handling

## Development

### Running the User Story Service

```bash
cd packages/user-story
pnpm dev
```

The service will be available at:
- API: http://localhost:3000/api
- Swagger Docs: http://localhost:3000/api/docs

### Adding a New Package

1. Create a new directory under `packages/`
2. Add a `package.json` with the name `@user-story-mapping/[package-name]`
3. The package will be automatically picked up by the workspace configuration

### Environment Variables

Create a `.env` file in the root or package directory:

```env
NODE_ENV=development
PORT=3000
API_PREFIX=api
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
cd packages/user-story
pnpm test:watch

# Run e2e tests
cd packages/user-story
pnpm test:e2e
```

## Documentation

- [Backend Development Guide](./CLAUDE.md)
- [Data Model Quick Reference](./docs/DATA_MODEL_QUICK_REFERENCE.md)
- [Data Model Visual Summary](./docs/DATA_MODEL_VISUAL_SUMMARY.md)
- [Data Model Comprehensive](./docs/DATA_MODEL_COMPREHENSIVE.md)

## Tech Stack

- **Framework:** NestJS
- **Language:** TypeScript
- **Package Manager:** pnpm
- **Monorepo Tool:** pnpm workspaces
- **Documentation:** Swagger/OpenAPI
- **Testing:** Jest

## License

MIT
