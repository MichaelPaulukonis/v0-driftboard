# Repository Snapshot: v0-driftboard

**Date:** December 23, 2025
**Version:** 1.0.0
**Status:** Active Development

---

## 1. Project Overview

**Driftboard** is a modern, web-based personal project management tool inspired by Kanban principles. It allows users to organize tasks into Boards, Lists, and Cards with drag-and-drop capabilities. Originally scaffolded with v0.app, it has evolved into a full-featured application with real-time collaboration.

### Technology Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5
- **UI Library:** React 19
- **Styling:** Tailwind CSS v4, shadcn/ui (Radix Primitives)
- **Backend/Database:** Firebase (Firestore, Authentication)
- **Drag & Drop:** `@atlaskit/pragmatic-drag-and-drop`
- **Testing:** Vitest
- **Containerization:** Docker

### Project Type

- **Type:** Full-stack Web Application (Serverless/BaaS architecture)
- **Target Audience:** Individuals and small teams needing lightweight project management.

---

## 2. Architecture Summary

### High-Level Design

The application follows a **Serverless/Client-Heavy** architecture. Next.js handles the routing and initial rendering (SSR/ISR), while Firebase provides the backend services (Auth, Database) directly to the client.

### Key Components

- **Frontend Application (`app/`):** Next.js App Router handling pages and layouts.
- **UI Components (`components/`):** Reusable UI elements, many based on shadcn/ui.
- **Firebase Service (`lib/firebase-service.ts`):** Abstraction layer for Firestore interactions.
- **State Management:** React Context API (`contexts/`) for global state like Auth and Board data.

### Data Flow

1. **User Interaction:** User drags a card or updates text.
2. **Optimistic UI:** UI updates immediately via React state.
3. **Service Layer:** `firebase-service.ts` calls Firestore methods.
4. **Persistence:** Data is saved to Firestore.
5. **Real-time Sync:** Firestore listeners (snapshots) update connected clients.

### Design Patterns

- **Container/Presentational:** Separation of logic (in Contexts/Page) and UI (Components).
- **Observer Pattern:** Used via Firebase real-time listeners.
- **Context Pattern:** For dependency injection of Auth and Board state.

---

## 3. Repository Structure Analysis

### Directory Organization

```text
/
├── app/                  # Next.js App Router (Routes & Pages)
├── components/           # React Components
│   ├── ui/               # Generic UI primitives (Buttons, Dialogs)
│   └── [feature].tsx     # Feature-specific components (board-card.tsx)
├── contexts/             # React Context Providers (Auth, Board)
├── docs/                 # Documentation
│   └── reference/        # Technical reference docs
├── lib/                  # Utilities and Services
│   ├── firebase.ts       # Firebase initialization
│   ├── types.ts          # TypeScript interfaces (Domain Model)
│   └── utils.ts          # Helper functions
├── scripts/              # Maintenance and migration scripts
├── .taskmaster/          # Task management & PRDs
└── public/               # Static assets
```

### Key Configuration Files

- **`next.config.mjs`**: Next.js configuration.
- **`firebase.json` & `firestore.rules`**: Backend configuration.
- **`vitest.config.ts`**: Testing configuration.
- **`docker-compose.yml`**: Local container orchestration.

---

## 4. Feature Analysis

### Core Features

- **Board Management:** Create, edit, delete, and share boards.
- **Kanban Workflow:** Drag-and-drop lists and cards (vertical and horizontal).
- **Rich Card Details:** Descriptions, comments, and status tracking.
- **Activity Logging:** Tracks history of actions on the board.
- **Authentication:** Email/Password auth via Firebase.

### User Workflows

1. **Onboarding:** Sign up -> Create first Board.
2. **Planning:** Create Lists (To Do, In Progress) -> Add Cards.
3. **Execution:** Move cards between lists -> Add comments -> Mark as done.
4. **Administration:** Archive boards, manage permissions (Owner/Editor/Viewer).

### Database Schema (Firestore)

- **`boards`** (Collection)
- **`lists`** (Collection)
- **`cards`** (Collection)
- **`comments`** (Collection)
- **`activity_logs`** (Collection)
  _Note: The schema is relational-like but stored in document collections, linked by IDs._

---

## 5. Development Setup

### Prerequisites

- Node.js >= 18
- pnpm
- Docker (optional)
- Firebase Project (API keys)

### Quick Start

1. **Clone & Install:**

   ```bash
   git clone <repo>
   pnpm install
   ```

2. **Configure:**
   Copy `.env.example` to `.env.local` and add Firebase credentials.
3. **Run:**

   ```bash
   pnpm dev
   ```

### Code Quality & Testing

- **Linting:** ESLint + Prettier.
- **Testing:** `vitest` for unit/integration tests. Coverage reports available.
- **Type Safety:** Strict TypeScript configuration.

---

## 6. Documentation Assessment

### Current Status

- **README:** Excellent. Covers overview, quick start, and stack.
- **Reference Docs (`docs/reference/`):** Strong coverage of:
  - Data Model (`data-model.md`)
  - Docker Setup (`docker-setup.md`)
  - Firebase Setup (`firebase-setup.md`)
- **PRDs:** Located in `.taskmaster/docs/` (non-standard location for general consumption).

### Gaps

- **Architecture Decision Records (ADRs):** No formal history of architectural choices.
- **Contributing Guidelines:** No `CONTRIBUTING.md` (though `copilot-instructions.md` exists).
- **Security Policy:** No `SECURITY.md`.

---

## 7. Recommendations & Next Steps

### 1. Documentation Structure

- **Move PRDs:** Consolidate `.taskmaster/docs/*.txt` into `docs/requirements/` for better visibility.
- **Create `CONTRIBUTING.md`:** Standardize contribution guidelines for human developers.
- **Create `SECURITY.md`:** Define reporting process for vulnerabilities.

### 2. Code Organization

- **Component Grouping:** The `components/` directory is flat and growing large. Consider grouping by feature:
  - `components/board/` (BoardCard, BoardColumn, etc.)
  - `components/common/` (ActivityLog, etc.)

### 3. Technical Improvements

- **Security:** Ensure `firestore.rules` are strictly typed and tested alongside application logic.
- **Performance:** Monitor bundle size with large dependencies like `@atlaskit/pragmatic-drag-and-drop`.
- **Testing:** Expand `__tests__` coverage for complex interactions (drag-and-drop logic).

---

## 8. Technical Debt Assessment

- **Complexity:** Low to Medium. The architecture is clean, but state management complexity will grow with more features.
- **Maintainability:** High. Strong typing and linting usage.
- **Legacy:** Some "v0" generated code patterns may need refactoring to match team standards over time.

---

## 9. Key Contact Points

- **Project Owner:** Michael Paulukonis (Inferred from paths)
- **Issues:** GitHub Issues
