# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Driftboard** is a personal Kanban board application built with Next.js 15, React 19, and Firebase. It's designed as a cost-effective, serverless alternative to Trello for personal project management.

**Key Technologies:**
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Backend**: Firebase (Authentication + Firestore)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Drag & Drop**: @atlaskit/pragmatic-drag-and-drop
- **Testing**: Vitest with React Testing Library
- **Package Manager**: pnpm (enforced via preinstall script)

## Essential Commands

### Development
```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint
```

### Testing
```bash
# Run all tests with coverage
pnpm test

# Run tests in debug mode
pnpm test:debug

# Run specific test file
pnpm vitest path/to/test/file.test.ts

# Run tests in watch mode
pnpm vitest --watch
```

### Database Operations
```bash
# Check migration status
pnpm migrate:status

# Run hybrid model migration
pnpm migrate:hybrid

# Cleanup old collections
pnpm cleanup:old-collections
```

### Firebase
```bash
# Deploy Firestore rules and indexes
firebase deploy --only firestore:rules,firestore:indexes

# View Firestore logs
firebase functions:log
```

## Architecture Overview

### Core Architecture Pattern
The application uses a **hybrid Firestore data model** that maintains current state in `*_current` collections while preserving an immutable audit trail in `history` subcollections. This enables:
- Soft deletes via `status` field (`active | deleted | archived`)
- Complete change history for all entities
- Point-in-time recovery capabilities

### Data Flow
```
UI Components → firebase-service.ts → Firestore (*_current + history subcollections)
```

**Critical Rule**: UI components NEVER call Firestore directly. All database operations must go through the service layer in `lib/firebase-service.ts`.

### Key Service Patterns
- `boardService`: Board CRUD operations
- `listService`: List management within boards
- `cardService`: Card operations including drag-and-drop positioning
- `commentService`: Comment CRUD with user data joining

### Component Architecture
```
app/
├── page.tsx                 # Landing/Dashboard (auth-gated)
├── board/[id]/page.tsx      # Board detail view
└── layout.tsx               # Root layout with providers

components/
├── ui/                      # shadcn/ui base components
├── dashboard.tsx            # Board listing and creation
├── list-column.tsx          # Kanban list with drag-drop
├── card-item.tsx            # Individual cards
├── auth-form.tsx            # Sign-in/sign-up
└── document-history-viewer.tsx  # Audit trail display
```

### Data Models
All data models are defined in `lib/types.ts`:
- **Board**: Top-level project container
- **List**: Columns within boards
- **Card**: Individual tasks with position-based ordering
- **Comment**: Card discussions with user metadata
- **User**: Profile information

## Development Guidelines

### Mandatory Planning Process
**CRITICAL**: Before implementing any significant features or architectural changes:
1. Check `docs/plans/` for existing relevant documentation
2. Create a new plan file following format: `NN.semantic-name.md`
3. Include: Problem Statement, Requirements, Technical Approach, Implementation Steps, Testing Strategy

### Code Standards
- **TypeScript**: Strict mode enabled, all types defined in `lib/types.ts`
- **React Components**: Use functional components with hooks only
- **State Management**: React Context for global state, `useState`/`useReducer` for local
- **File Naming**: `kebab-case` for files, `PascalCase` for components
- **Async Operations**: Always use `async/await` for Firebase calls

### Component Structure Order
1. Imports (external libraries first, then internal)
2. Types and interfaces
3. Component definition with props
4. Hooks and state
5. Effects
6. Event handlers
7. Render logic and early returns
8. Main JSX return

### Database Service Layer Rules
1. All Firestore operations centralized in `lib/firebase-service.ts`
2. Use Firebase types (`FirebaseBoard`, etc.) internally, convert to app types before returning
3. Always include `try/catch` blocks with detailed error logging
4. Use batched writes for operations affecting multiple documents
5. Filter by `status: 'active'` for all live data queries

### Drag & Drop Implementation
- Use `@atlaskit/pragmatic-drag-and-drop` exclusively
- Cards are draggable via `draggable()` adapter
- Lists and cards are drop targets via `dropTargetForElements()`
- Position calculations handled in service layer (`moveCard`, `reorderCards`)
- Use `attachClosestEdge`/`extractClosestEdge` for drop positioning

### Security Requirements
- **Firestore Rules**: All new data access patterns require corresponding security rules
- Users can only access their own data via `userId` field validation
- History subcollections are immutable (create/read only, no update/delete)
- Environment variables for Firebase config must use `NEXT_PUBLIC_` prefix

### Testing Requirements
- Unit tests for all service layer functions (mock Firebase calls)
- Component tests using React Testing Library
- Focus on semantic queries (`getByRole`, `getByLabelText`) over test IDs
- Tests must pass before committing

## Environment Setup

### Required Environment Variables
Create `.env.local` with Firebase configuration:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Service Account (for scripts)
Place `serviceAccountKey.json` in `scripts/` directory for administrative operations. Never commit this file.

## Common Development Tasks

### Adding New Data Models
1. Define TypeScript types in `lib/types.ts`
2. Create corresponding Firebase types with `Timestamp` fields
3. Add service functions following existing patterns
4. Update Firestore security rules
5. Add unit tests for service functions

### Implementing New Components
1. Use shadcn/ui components as base when possible
2. Follow component structure order
3. Add TypeScript prop interfaces
4. Include error boundaries for complex components
5. Write component tests focusing on user interactions

### Handling Drag & Drop
1. Use existing `CardItem` and `ListColumn` patterns
2. Position updates must go through service layer
3. Test drag operations across different scenarios
4. Handle edge cases (empty lists, single items)

## Important Files and Directories

### Core Application Files
- `lib/firebase-service.ts` - **Central data access layer**
- `lib/types.ts` - **All TypeScript definitions**
- `lib/firebase.ts` - Firebase app initialization
- `contexts/auth-context.tsx` - Global authentication state
- `firestore.rules` - Database security rules
- `firestore.indexes.json` - Composite indexes as code

### Documentation
- `docs/firebase-setup.md` - Complete Firebase project setup
- `docs/data-model.md` - Hybrid Firestore architecture details
- `docs/overview.md` - Comprehensive project analysis
- `.github/copilot-instructions.md` - Detailed coding standards

### Configuration
- `vitest.config.ts` - Test configuration with jsdom environment
- `components.json` - shadcn/ui configuration
- `package.json` - Enforces pnpm usage via preinstall script

This Kanban application emphasizes data integrity, user experience, and maintainable architecture through its service layer pattern and hybrid data model.