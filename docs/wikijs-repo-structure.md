# Driftboard Repository Structure

A comprehensive guide to the Driftboard project architecture, file organization, and development patterns.

## Project Overview

**Driftboard** is a modern, web-based Kanban board application built with Next.js and Firebase. It provides a clean, intuitive interface for managing projects and tasks with drag-and-drop functionality, real-time collaboration, and comprehensive task management features.

### Technology Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript (strict mode)
- **UI Library**: React 19+ with functional components and hooks
- **Backend & Database**: Google Firebase (Firestore + Auth)
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React Context + hooks
- **Drag & Drop**: @atlaskit/pragmatic-drag-and-drop
- **Testing**: Vitest + React Testing Library + Playwright
- **Deployment**: Vercel

## Repository Structure

```
v0-driftboard/
├── 📁 app/                     # Next.js App Router pages and layouts
│   ├── 📄 globals.css          # Global styles and Tailwind imports
│   ├── 📄 layout.tsx           # Root layout with providers
│   ├── 📄 page.tsx             # Landing/dashboard page
│   └── 📁 board/
│       └── 📁 [id]/
│           └── 📄 page.tsx     # Individual board view
│
├── 📁 components/              # Reusable React components
│   ├── 📁 ui/                  # Base shadcn/ui components
│   │   ├── 📄 button.tsx       # Button component
│   │   ├── 📄 card.tsx         # Card wrapper component
│   │   ├── 📄 dialog.tsx       # Modal/dialog component
│   │   ├── 📄 input.tsx        # Form input component
│   │   └── 📄 ...              # Other UI primitives
│   │
│   ├── 📄 auth-form.tsx        # Authentication forms
│   ├── 📄 board-card.tsx       # Board preview card
│   ├── 📄 card-item.tsx        # Draggable card component
│   ├── 📄 dashboard.tsx        # Main dashboard view
│   ├── 📄 list-column.tsx      # Kanban list column
│   └── 📄 ...                  # Application components
│
├── 📁 contexts/                # React Context providers
│   ├── 📄 auth-context.tsx     # Firebase authentication state
│   ├── 📄 board-context.tsx    # Board-specific state
│   └── 📄 column-context.tsx   # Column state management
│
├── 📁 lib/                     # Core logic and utilities
│   ├── 📄 firebase.ts          # Firebase app initialization
│   ├── 📄 firebase-service.ts  # Firestore CRUD operations
│   ├── 📄 types.ts             # TypeScript type definitions
│   └── 📄 utils.ts             # Utility functions
│
├── 📁 docs/                    # Project documentation
│   ├── 📁 plans/               # Feature planning documents
│   ├── 📁 deployment/          # Deployment guides
│   ├── 📁 reference/           # Technical references
│   └── 📁 templates/           # Document templates
│
├── 📁 scripts/                 # Database migration scripts
│   ├── 📄 migrate-status.ts    # Status field migration
│   └── 📄 cleanup-old-collections.ts # Database cleanup
│
├── 📁 public/                  # Static assets
│   └── 📄 placeholder-*.png    # UI placeholder images
│
├── 📄 package.json             # Dependencies and scripts
├── 📄 firebase.json            # Firebase configuration
├── 📄 firestore.rules          # Database security rules
├── 📄 next.config.mjs          # Next.js configuration
├── 📄 tailwind.config.js       # Tailwind CSS configuration
├── 📄 vitest.config.ts         # Testing configuration
└── 📄 docker-compose.yml       # Docker development setup
```

## Core Architecture

### 🏗️ Application Structure

#### Next.js App Router
- **`app/layout.tsx`**: Root layout with authentication providers and global styles
- **`app/page.tsx`**: Main dashboard showing user's boards
- **`app/board/[id]/page.tsx`**: Individual board view with lists and cards

#### Component Hierarchy
```
App
├── AuthProvider (contexts/auth-context.tsx)
├── Dashboard (components/dashboard.tsx)
│   ├── CreateBoardDialog
│   └── BoardCard[]
└── BoardView (app/board/[id]/page.tsx)
    ├── BoardProvider (contexts/board-context.tsx)
    ├── CreateListDialog
    └── ListColumn[]
        ├── CreateCardDialog
        └── CardItem[]
            └── CardDetailDialog
```

### 🔥 Firebase Integration

#### Data Models (`lib/types.ts`)
```typescript
interface Board {
  id: string
  title: string
  description?: string
  userId: string
  status: 'active' | 'deleted' | 'done' | 'archived' | 'inactive'
  createdAt: Date
  updatedAt: Date
}

interface List {
  id: string
  title: string
  boardId: string
  position: number
  status: 'active' | 'deleted' | 'done' | 'archived' | 'inactive'
  createdAt: Date
  updatedAt: Date
}

interface Card {
  id: string
  title: string
  description?: string
  listId: string
  position: number
  status: 'active' | 'deleted' | 'done' | 'archived' | 'inactive'
  createdAt: Date
  updatedAt: Date
}
```

#### Service Layer (`lib/firebase-service.ts`)
Centralized Firebase operations organized by entity:
- **`boardService`**: Board CRUD operations
- **`listService`**: List management and reordering
- **`cardService`**: Card operations and drag-and-drop logic
- **`commentService`**: Comment management
- **`userService`**: User profile management

#### Firestore Collections
```
firestore/
├── boards_current/           # Active board documents
├── lists_current/            # Active list documents
├── cards_current/            # Active card documents
├── comments_current/         # Active comment documents
├── users/                    # User profile documents
└── document_history/         # Historical versions (audit trail)
```

### 🎨 UI/UX Architecture

#### Design System
- **Base Components**: shadcn/ui primitives in `components/ui/`
- **Application Components**: Feature-specific components
- **Styling**: Tailwind CSS with custom design tokens
- **Icons**: Lucide React icons

#### Responsive Design
- Mobile-first approach
- Responsive grid layouts
- Touch-friendly drag & drop
- Adaptive component sizing

### 🔄 State Management

#### Context Providers
1. **AuthContext**: User authentication state
2. **BoardContext**: Board-specific data and operations
3. **ColumnContext**: List column state management

#### State Flow
```
User Action → Component → Context → Service Layer → Firebase → State Update → UI Re-render
```

## Development Patterns

### 📁 File Organization

#### Component Structure
```typescript
"use client"
// 1. External imports
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'

// 2. Internal imports
import { boardService } from '@/lib/firebase-service'
import type { Board } from '@/lib/types'

// 3. UI imports
import { Button } from '@/components/ui/button'

// 4. Types and interfaces
interface ComponentProps {
  // props definition
}

// 5. Component definition
export function Component({ ...props }: ComponentProps) {
  // 6. Hooks and state
  // 7. Effects
  // 8. Event handlers
  // 9. Render logic
  // 10. JSX return
}
```

#### Naming Conventions
- **Components**: PascalCase (`BoardCard`, `ListColumn`)
- **Files**: kebab-case (`board-card.tsx`, `auth-context.tsx`)
- **Functions**: camelCase (`handleCardMove`, `getUserBoards`)
- **Types**: PascalCase (`Board`, `FirebaseCard`)

### 🧪 Testing Strategy

#### Test Organization
```
components/
├── __tests__/
│   ├── board-card.integration.test.tsx
│   ├── dashboard.integration.test.tsx
│   └── card-item-url-linking.test.tsx
├── component.tsx
└── ...

lib/
├── __tests__/
│   ├── firebase-service.test.ts
│   └── utils.test.ts
├── __mocks__/
│   └── firebase.ts
└── ...
```

#### Testing Approach
- **Unit Tests**: Pure functions and utilities (Vitest)
- **Integration Tests**: Component behavior (React Testing Library)
- **E2E Tests**: User workflows (Playwright)
- **Firebase Mocking**: Isolated service layer testing

### 🔧 Configuration Files

#### Essential Configurations
- **`next.config.mjs`**: Next.js build and runtime settings
- **`tailwind.config.js`**: Tailwind CSS customization
- **`firebase.json`**: Firebase project configuration
- **`firestore.rules`**: Database security rules
- **`vitest.config.ts`**: Testing environment setup

## Development Workflow

### 🚀 Getting Started

#### Docker Development (Recommended)
```bash
# Quick start with Docker
./docker.sh dev
```

#### Traditional Development
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test
```

### 📋 Planning Process

All major features follow a mandatory planning process:

1. **Plan Files**: Created in `docs/plans/` with format `NN.feature-name.md`
2. **Required Sections**:
   - Problem Statement
   - Requirements
   - Technical Approach
   - Implementation Steps
   - Testing Strategy
   - Risks & Mitigation

3. **Task Management**: Plans are parsed into discrete tasks using Taskmaster MCP
4. **Completion**: Implemented plans move to `docs/plans/completed/`

### 🔄 Git Workflow

#### Commit Standards
Following Conventional Commits specification:
```
feat(boards): add board archiving functionality
fix(cards): resolve drag-and-drop position calculation
docs(auth): update firebase authentication guide
refactor(service): simplify card reordering logic
test(components): add tests for BoardCard component
```

#### Pre-commit Process
1. Analyze changes with `git status` and `git diff`
2. Evaluate changelog requirements
3. Update `CHANGELOG.md` if needed
4. Create conventional commit message
5. Commit with proper staging

## Security & Authentication

### 🔐 Firebase Security

#### Authentication
- Firebase Auth integration
- User session management
- Protected routes and components

#### Firestore Security Rules
```javascript
// Example security rule
match /boards/{boardId} {
  allow read, write: if request.auth != null && 
    request.auth.uid == resource.data.userId;
}
```

#### Data Access Patterns
- User-scoped data access
- Role-based permissions
- Audit trail maintenance

## Deployment & Infrastructure

### 🌐 Production Deployment

#### Vercel Integration
- Automatic deployment from `main` branch
- Environment variable management
- Edge function optimization

#### Docker Support
- Multi-stage builds
- Development and production containers
- Container orchestration ready

### 📊 Monitoring & Analytics

#### Error Handling
- React Error Boundaries
- Service layer error management
- User-friendly error messages

#### Performance Monitoring
- Next.js analytics integration
- Firebase performance monitoring
- Custom metrics tracking

## Extension Points

### 🔌 Adding New Features

#### Component Development
1. Create component in appropriate directory
2. Add TypeScript types to `lib/types.ts`
3. Implement service layer functions
4. Add comprehensive tests
5. Update documentation

#### Database Schema Changes
1. Update TypeScript interfaces
2. Create migration scripts in `scripts/`
3. Update Firestore security rules
4. Test with existing data

### 🎯 Integration Patterns

#### Third-party Services
- API integration patterns
- Authentication providers
- External data sources

#### Custom Hooks
- State management patterns
- Effect management
- Reusable logic extraction

## Troubleshooting

### 🐛 Common Issues

#### Development Environment
- Firebase configuration errors
- Authentication setup issues
- Build and deployment problems

#### Production Issues
- Performance optimization
- Security rule debugging
- Data migration challenges

### 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

---

*This documentation serves as a comprehensive guide to the Driftboard repository structure and development patterns. Keep it updated as the project evolves.*