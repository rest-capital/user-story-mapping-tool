# User Story Mapping Tool

A modular monorepo for user story mapping, built with NestJS and TypeScript.

## Project Structure

```
user-story-mapping-tool/
├── apps/
│   └── backend/                    # NestJS Backend API
│       ├── src/
│       │   ├── modules/            # Feature modules
│       │   │   ├── health/        # Health check module
│       │   │   └── user-stories/  # User stories module (TODO)
│       │   ├── common/            # Common utilities
│       │   │   ├── filters/       # Exception filters
│       │   │   ├── interceptors/  # HTTP interceptors
│       │   │   ├── guards/        # Auth guards (future)
│       │   │   └── pipes/         # Validation pipes (future)
│       │   ├── shared/            # Shared code
│       │   │   ├── types/         # TypeScript types
│       │   │   └── constants/     # App constants
│       │   ├── config/            # Configuration
│       │   ├── app.module.ts      # Root module
│       │   └── main.ts            # Entry point
│       ├── test/                  # Tests
│       └── dist/                  # Compiled output
├── libs/                          # Shared libraries (future)
├── docs/                          # Documentation
│   ├── DATA_MODEL_COMPREHENSIVE.md
│   ├── DATA_MODEL_QUICK_REFERENCE.md
│   └── DATA_MODEL_VISUAL_SUMMARY.md
├── CLAUDE.md                      # Backend development guide
└── package.json                   # Root workspace config
```

## Why This Structure?

- **Feature-based modules**: Code organized by domain/feature (NestJS best practice)
- **Monorepo ready**: Easy to add new apps (worker, admin panel, frontend)
- **Multi-language support**: Can add apps in other languages (Python ML service, etc.)
- **MVP-friendly**: Start simple, scale as needed

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Build the backend

```bash
pnpm build
```

### 3. Start the server

```bash
# Production mode
pnpm start

# Development mode (with watch)
pnpm dev
```

## Available Scripts

### Root Level

- `pnpm build` - Build the backend
- `pnpm start` - Start the backend in production mode
- `pnpm dev` - Start the backend in development mode with watch
- `pnpm test` - Run all tests
- `pnpm lint` - Lint all code
- `pnpm format` - Format code with Prettier
- `pnpm clean` - Clean all build artifacts

### Backend App

Navigate to `apps/backend/` or use pnpm filters:

```bash
# Build backend
pnpm --filter @user-story-mapping/backend build

# Start backend
pnpm --filter @user-story-mapping/backend start

# Run tests
pnpm --filter @user-story-mapping/backend test
```

## API Endpoints

Once running, the API is available at:

- **Health Check**: `http://localhost:3000/api/health`
- **Swagger Docs**: `http://localhost:3000/api/docs`

Example health check response:
```json
{
  "status": "ok",
  "message": "User Story Mapping Service is running",
  "timestamp": "2025-11-18T23:15:04.705Z"
}
```

## Adding New Modules

To add a new feature module:

1. Create a new directory in `apps/backend/src/modules/`
2. Create `*.module.ts`, `*.controller.ts`, `*.service.ts`
3. Add the module to `app.module.ts`

Example:
```bash
mkdir -p apps/backend/src/modules/my-feature
# Add your module files
```

## Adding New Apps

To add a new application (e.g., worker, admin panel):

1. Create a new directory in `apps/`
2. Add a `package.json` with name `@user-story-mapping/app-name`
3. pnpm will automatically include it in the workspace

Example for a Python service:
```bash
mkdir -p apps/ml-service
# Add your Python code
```

## Environment Variables

Create a `.env` file in the root:

```env
NODE_ENV=development
PORT=3000
```

See `.env.example` for all available variables.

## Documentation

- [Backend Development Guide](./CLAUDE.md)
- [Data Model Quick Reference](./docs/DATA_MODEL_QUICK_REFERENCE.md)
- [Data Model Visual Summary](./docs/DATA_MODEL_VISUAL_SUMMARY.md)
- [Data Model Comprehensive](./docs/DATA_MODEL_COMPREHENSIVE.md)

## Tech Stack

- **Framework:** NestJS 10.x
- **Language:** TypeScript 5.x
- **Package Manager:** pnpm
- **Monorepo:** pnpm workspaces
- **API Documentation:** Swagger/OpenAPI
- **Testing:** Jest
- **Future:** PostgreSQL (Supabase) + Prisma ORM

## Contributing

This is an MVP project. Follow the module-based structure and NestJS conventions.

## License

MIT
