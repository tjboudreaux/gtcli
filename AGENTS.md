# AGENTS.md - AI Agent Guidelines for gtcli

This document provides guidance for AI agents working with the gtcli codebase.

## Project Overview

gtcli is a command-line interface for Google Tasks API. It follows the same patterns and conventions as [gdcli](https://github.com/tjboudreaux/gdcli).

## Architecture

```
src/
├── cli.ts                 # CLI entry point with command parsing
├── account-storage.ts     # OAuth token and credentials storage
├── oauth-flow.ts          # OAuth2 authorization flow
├── types.ts               # TypeScript interfaces for all API types
├── index.ts               # Public API exports
└── services/
    ├── base-service.ts    # Abstract base class for all services
    ├── tasklist-service.ts # Google Tasks TaskList operations
    └── task-service.ts    # Google Tasks Task operations
```

## Key Patterns

### Service Architecture
- All services extend `BaseService` which handles OAuth2 client management
- Each service maintains a client cache (`Map<string, APIClient>`) keyed by email
- Services are stateless - all state is in AccountStorage

### Authentication Flow
- Credentials stored in `~/.gtcli/credentials.json`
- Account tokens stored in `~/.gtcli/accounts.json`
- OAuth2 flow supports both browser-based and manual (browserless) authorization

### CLI Pattern
- Uses Node.js built-in `parseArgs` (no external CLI framework)
- Commands follow: `gtcli <email> <service> <command> [options]`
- Tab-separated output for machine parsing
- `--help` flag shows usage

### Error Handling
- Services throw errors with descriptive messages
- CLI catches errors and prints to stderr with "Error:" prefix
- Exit code 1 for errors, 0 for success

## Testing Guidelines

### Test Structure
- Tests use Vitest with coverage thresholds (90% statements, 80% branches)
- Mock `googleapis` module at the top of test files
- Use temp directories for file-based tests
- Clean up with `afterEach` hooks

### Mocking Pattern
```typescript
const mockTasksInstance = {
  tasks: {
    list: vi.fn(),
    get: vi.fn(),
    // ...
  },
  tasklists: {
    list: vi.fn(),
    // ...
  },
};

vi.mock("googleapis", () => ({
  google: {
    tasks: vi.fn(() => mockTasksInstance),
  },
}));
```

### Running Tests
```bash
npm test              # Run tests with coverage
npm run test:watch    # Watch mode
npm run check         # Lint + typecheck
```

## Common Tasks

### Adding a New Command
1. Add types to `src/types.ts` if needed
2. Add method to appropriate service in `src/services/`
3. Add test cases in corresponding `.test.ts` file
4. Add CLI handler in `src/cli.ts`
5. Update README.md with usage examples

### Adding a New Service
1. Create `src/services/new-service.ts` extending `BaseService`
2. Create `src/services/new-service.test.ts` with full coverage
3. Export from `src/services/index.ts`
4. Add CLI handler section in `src/cli.ts`
5. Document in README.md

### Modifying OAuth Scopes
- Scopes are defined in `src/oauth-flow.ts` (SCOPES constant)
- Users must re-authorize after scope changes
- Update README.md setup instructions

## Code Style

- Biome for linting and formatting
- Tab indentation, double quotes
- 120 character line width
- No non-null assertions (disabled in biome config)
- Prefer template literals (disabled in biome config for flexibility)

## Dependencies

### Runtime
- `googleapis` - Google API client
- `google-auth-library` - OAuth2 authentication

### Development
- `typescript` - Type checking and compilation
- `vitest` - Testing framework
- `@biomejs/biome` - Linting and formatting
- `husky` - Git hooks

## API Reference

### Google Tasks API Used
- Tasks API v1: `https://www.googleapis.com/auth/tasks`

### Key API Concepts
- **TaskLists**: Collections of tasks (max 2000 per user)
- **Tasks**: Individual todo items with title, notes, due date, status
- **Task Status**: `needsAction` or `completed`
- **Task Hierarchy**: Tasks can have parent tasks (subtasks)

## Troubleshooting

### OAuth Issues
- Ensure Tasks API is enabled in Google Cloud Console
- Check redirect URI matches (Desktop apps use localhost)
- Verify test users are added in OAuth consent screen
- Try `--manual` flag for browserless environments

### Build Issues
- Run `npm run check` to see lint/type errors
- Ensure Node.js >= 20.0.0
- Clear `dist/` and rebuild: `rm -rf dist && npm run build`

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Run full test suite: `npm test`
4. Build: `npm run build`
5. Tag release: `git tag v<version>`
6. Push: `git push --tags`
7. Publish: `npm publish --access public`
