```markdown
# JYRY-Command-Center Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the key development patterns, coding conventions, and workflows used in the JYRY-Command-Center repository. The codebase is a React application written in TypeScript, following a consistent style for file naming, imports, and exports. This guide helps contributors quickly align with the project's standards and practices.

## Coding Conventions

### File Naming
- Use **kebab-case** for all file names.
  - Example:  
    ```
    user-profile.tsx
    command-center-utils.ts
    ```

### Import Style
- Use **relative imports** for internal modules.
  - Example:
    ```typescript
    import { UserProfile } from './user-profile';
    import { fetchData } from '../utils/fetch-data';
    ```

### Export Style
- Use **named exports** instead of default exports.
  - Example:
    ```typescript
    // In user-profile.tsx
    export const UserProfile = () => { ... };

    // In another file
    export { UserProfile } from './user-profile';
    ```

### Commit Messages
- Commit messages are freeform, sometimes with prefixes, and average around 40 characters.
  - Example:
    ```
    Add new dashboard widget for analytics
    Fix: resolve issue with command execution
    ```

## Workflows

_No explicit workflows detected in the repository._

## Testing Patterns

- **Testing Framework:** Unknown (not detected)
- **Test File Pattern:** All test files follow the `*.test.*` pattern.
  - Example:
    ```
    user-profile.test.tsx
    utils.test.ts
    ```
- **Location:** Test files are typically placed alongside the files they test or in a dedicated test directory.

## Commands

| Command | Purpose |
|---------|---------|
| /test   | Run all test files matching `*.test.*` |
| /lint   | Lint the codebase according to project standards |
| /build  | Build the project for production |
| /start  | Start the development server |

```