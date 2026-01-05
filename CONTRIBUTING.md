# Contributing to BISMAN ERP

Thank you for contributing to BISMAN ERP! Please read this guide carefully before submitting code.

## 🔒 Critical: User Model Lock

**Before modifying any user-related code, read [docs/USER_MODEL_LOCK.md](docs/USER_MODEL_LOCK.md).**

The user model is LOCKED. All user operations MUST go through the canonical `UserService`:

```javascript
// ✅ CORRECT
const UserService = require('../services/userService');
await UserService.createUser({ ... }, { ... });
await UserService.updateUser(userId, { ... }, { ... });
await UserService.deleteUser(userId, { ... });

// ❌ FORBIDDEN - WILL FAIL CI
await prisma.user.create({ ... });
await prisma.user.update({ ... });
```

### Forbidden Patterns
| Pattern | Reason | Use Instead |
|---------|--------|-------------|
| `prisma.user.create()` | Bypasses validation | `UserService.createUser()` |
| `prisma.user.update()` | Bypasses validation | `UserService.updateUser()` |
| `manager_id` | Deprecated field | `reports_to` |
| `reporting_manager_id` | Deprecated field | `reports_to` |
| `role_id` writes | Deprecated | `rbac_user_roles` junction |

### Required Fields for User Creation
- `username` (unique)
- `email` (unique)
- `password` (min 12 chars, uppercase, lowercase, number, special char)
- `role` (string: USER, ADMIN, etc.)
- `business_level` (1-10, enforces hierarchy)
- `reports_to` (UUID of manager, optional)

## Development Setup

```bash
# Install dependencies
npm install

# Start backend + frontend
npm run dev
```

## Code Standards

### TypeScript/JavaScript
- Use TypeScript in frontend (`my-frontend/`)
- Use ES6+ features
- Follow existing patterns in codebase

### Testing
- All new features must have tests
- Run tests: `npm test`
- Run specific test: `npx jest tests/<testfile>.js`

### Pre-commit Checks
Before committing, ensure:
1. Tests pass: `npm test`
2. Type-check passes: `npm run type-check` (frontend)
3. No lint errors: `npm run lint`
4. User model lock is respected: `bash scripts/ci/user-model-guard.sh`

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Write/update tests
4. Update documentation if needed
5. Ensure CI passes
6. Request review

## Security

- Never commit secrets or credentials
- Use environment variables for sensitive data
- Follow the security guidelines in [SECURITY_RUNBOOK.md](SECURITY_RUNBOOK.md)

## Questions?

If you have questions about the user model lock or architecture, consult:
- [docs/USER_MODEL_LOCK.md](docs/USER_MODEL_LOCK.md)
- [docs/ERP_STRUCTURE.md](docs/ERP_STRUCTURE.md)
- [docs/MULTI_BUSINESS_ARCHITECTURE.md](docs/MULTI_BUSINESS_ARCHITECTURE.md)
