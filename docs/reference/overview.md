# Repository Snapshot: Driftboard

## 1. Project Overview

- **Project Name**: Driftboard (derived from `package.json` name "kanban-board")
- **Purpose**: A personal, web-based Kanban board application designed as a project management tool, similar to Trello. It allows users to organize their work into boards, lists, and cards.
- **Technology Stack**:
  - **Frontend**: Next.js (v15), React (v19), TypeScript
  - **Backend**: Firebase (Authentication and Firestore)
  - **Styling**: Tailwind CSS, shadcn/ui, lucide-react icons
  - **Drag & Drop**: `@atlaskit/pragmatic-drag-and-drop`
- **Project Type**: Web Application (Single Page Application)
- **Target Audience**: Individuals or small teams needing a simple, visual tool for task and project management.
- **Current Status**: The project is a functional prototype with core features implemented and a robust data model supporting history tracking and soft deletes.

## 2. Architecture Summary

- **Overall Architecture**: The application uses a modern serverless architecture with a Next.js frontend and a Firebase Backend-as-a-Service (BaaS). The client-side is built with a component-based approach using React.
- **Key Components**:
  - `AuthForm`: Handles user sign-in and sign-up.
  - `Dashboard`: Displays all user-owned boards.
  - `BoardPage`: The main workspace for a single board, containing lists and cards.
  - `ListColumn`: Represents a vertical list (e.g., "To Do") and contains cards.
  - `CardItem`: Represents an individual task card with smart URL linking capabilities.
  - `CommentItem`: Displays individual comments with automatic URL detection and linking.
  - `DocumentHistoryViewer`: Displays the audit trail for a document.
  - `firebase-service.ts`: A dedicated service layer that encapsulates all Firestore CRUD operations.
  - `linkifyText` utility: Converts URLs in text content to clickable links with comprehensive pattern recognition.
- **Data Flow**: Data is managed in Firestore using a hybrid model. Application components interact with `firebase-service.ts`, which performs batched writes to `*_current` collections (e.g., `boards_current`) and creates immutable `history` subcollection documents for every change. Reads are performed from the `*_current` collections.
- **External Dependencies**: The primary external dependency is **Google Firebase** for user authentication and database storage (Firestore).
- **Design Patterns**:
  - **Service Layer**: `firebase-service.ts` abstracts data logic from the UI.
  - **Provider Pattern**: `AuthContext` provides global authentication state.
  - **Component-Based Architecture**: The UI is broken down into reusable React components.

## 3. Repository Structure Analysis

- **Directory Organization**: The project follows the standard Next.js App Router structure.
  - `app/`: Contains the application's pages and routing structure.
  - `components/`: Holds reusable React components. `components/ui` contains base components from shadcn/ui.
  - `contexts/`: Manages shared state using React Context (e.g., `auth-context.tsx`).
  - `lib/`: Core application logic, including Firebase services (`firebase-service.ts`), type definitions (`types.ts`), and utility functions.
  - `public/`: Stores static assets like images and SVGs.
  - `scripts/`: Contains one-off administrative scripts (e.g., data migrations, cleanup).
- **Key Files and Directories**:
  - `lib/firebase-service.ts`: The heart of the backend logic.
  - `lib/types.ts`: Defines the core data models (`Board`, `List`, `Card`, `Comment`).
  - `app/page.tsx`: The main landing page, which shows either the `AuthForm` or the `Dashboard`.
  - `app/board/[id]/page.tsx`: The dynamic page for displaying a specific Kanban board.
  - `firestore.rules`: Defines Firebase security rules.
  - `firestore.indexes.json`: Defines Firestore composite indexes as code.
- **Configuration Files**: `next.config.mjs`, `tsconfig.json`, `tailwind.config.js`, `components.json`, `firebase.json`.
- **Entry Points**: `app/layout.tsx` is the root layout for the entire application.
- **Build and Deploy**: The project is built using `pnpm build` (`next build`) and is set up for deployment on Vercel, as indicated by the `README.md`.

## 4. Feature Analysis

- **Core Features**:
  - User Authentication (Sign-up, Sign-in, Password Reset).
  - Board Management (Create, Read, Update, Soft Delete).
  - List Management (Create, Read, Update, Soft Delete).
  - Card Management (Create, Read, Update, Soft Delete).
  - Comment Management (Create, Read, Update, Soft Delete).
  - Smart URL Linking (Automatic URL detection and conversion to clickable links in cards and comments).
  - Drag-and-drop reordering of cards within and between lists.
  - **Document History Tracking**: Provides an audit trail of changes for core data models.
- **User Workflows**:
  1.  A new user signs up for an account.
  2.  Upon login, they are presented with a dashboard.
  3.  They can create a new board for a project.
  4.  Clicking a board takes them to the board view, where they can create lists (e.g., "To Do", "Done").
  5.  Within lists, they can create, edit, and soft-delete cards.
  6.  They can drag cards to change their order or move them to different lists.
  7.  They can click a card to open a detailed view, add comments, and view the history of changes for that card.
- **Database Schema**: The schema is defined in `lib/types.ts` and uses a hybrid model with `*_current` collections (e.g., `boards_current`) for live data and `history` subcollections for audit trails. Documents include a `status` field (`active | deleted`) and `createdBy`/`updatedBy` metadata.
- **Authentication**: Handled by Firebase Authentication. The `auth-context.tsx` provider makes the current user's state available throughout the app.

## 5. Development Setup

- **Prerequisites**:
  - Node.js
  - `pnpm` package manager
  - A Firebase project with Authentication and Firestore enabled.
- **Installation Process**:
  1.  Clone the repository.
  2.  Create a `.env.local` file and populate it with your `NEXT_PUBLIC_FIREBASE_*` environment variables.
  3.  Run `pnpm install` to install dependencies.
  4.  Run `pnpm dev` to start the local development server.
- **Development Workflow**: Standard Next.js workflow. Developers can edit components and pages, and the browser will hot-reload with changes.
- **Testing Strategy**: Unit tests are implemented for `lib/firebase-service.ts` covering CRUD operations and the new hybrid data model. Integration tests cover key component interactions.
- **Code Quality**: The code uses TypeScript for type safety and ESLint for linting. The overall structure is clean and well-organized.

## 6. Documentation Assessment

- **README Quality**: The `README.md` is a generic template from v0.app and contains no project-specific information. It is not useful for onboarding.
- **Code Documentation**: Minimal. Some functions have comments, but there is no consistent JSDoc or inline documentation explaining the logic.
- **Architecture Documentation**: High-level overview in this document. Detailed plan in `docs/plans/03.Hybrid Firestore Data Strategy — Imple.md`.
- **User Documentation**: None exists.
- **New Documentation Files**:
  - `docs/firestore-export.md`: Command-line Firestore backups.
  - `docs/firestore-indexing.md`: Managing Firestore indexes as code.
  - `scripts/README.md`: Firebase SDKs for scripts.

## 7. Missing Documentation Suggestions

The project would greatly benefit from the following documentation:

- **Product Requirements Document (PRD)**: A document outlining the project's goals, features, and user stories.
  - *Suggestion*: Create `docs/requirements/PRD.md`.
- **Architecture Decision Records (ADRs)**: To document key architectural choices (e.g., why Firebase was chosen).
  - *Suggestion*: Create a `/docs/decisions/` directory.
- **Deployment Guide**: Instructions for deploying the application.
  - *Suggestion*: Add a deployment section to the `README.md` or create `docs/deployment/DEPLOYMENT.md`.
- **Contributing Guidelines**: A `CONTRIBUTING.md` file explaining how to contribute to the project, including code style and pull request processes.
- **Changelog**: A `CHANGELOG.md` to track changes across versions.
- **Security Policy**: A `SECURITY.md` file outlining how to report security vulnerabilities.
- **Data Model Definition**: A dedicated document detailing the full Firestore data model, including the `*_current` collections, `history` subcollections, and the `status` enum.
  - *Suggestion*: Create `docs/data-model.md`.
- **Firebase Setup Guide**: A comprehensive guide on setting up Firebase for the project, including environment variables, service account keys, and initial deployment steps.
  - *Suggestion*: Create `docs/firebase-setup.md`.

## 8. Technical Debt and Improvements

- **Code Quality Issues**:
  - **State Management**: Components like `BoardPage.tsx` and `ListColumn.tsx` manage a lot of state and data-fetching logic. This could be extracted into custom hooks (e.g., `useBoardData`, `useListCards`) to improve separation of concerns.
  - **Inefficient Re-fetching**: Some actions trigger a full data reload of the entire board (`loadBoardData`), which is inefficient. A more granular state update strategy (e.g., updating only the affected list) would improve performance.
  - **Error Handling**: Error handling is mostly limited to `console.error`. A more user-friendly error reporting system (e.g., toasts or alerts) should be implemented.
- **Performance Concerns**:
  - The `getCardComments` function in `firebase-service.ts` fetches user data for each comment individually, which can lead to a classic N+1 query problem as the number of comments grows. This could be optimized by batching user data requests.
- **Security Considerations**:
  - **Critical**: Firebase Security Rules have been implemented to prevent unauthorized access to `*_current` collections and ensure `history` immutability.
- **Dependency Management**:
  - The `package.json` uses `"latest"` for some dependencies (e.g., `firebase`). It is best practice to pin to specific versions to ensure stable, repeatable builds.

## 9. Project Health Metrics

- **Code Complexity**: **Medium**. The logic is generally straightforward, but the concentration of logic in a few components increases complexity.
- **Test Coverage**: Unit tests for `lib/firebase-service.ts` are comprehensive. Integration tests cover key component interactions.
- **Documentation Coverage**: **Improved**. Several new documentation files have been added.
- **Maintainability Score**: **Medium**. The clean structure and new documentation are positives, but areas for refactoring and optimization remain.
- **Technical Debt Level**: **Medium**. The project is functional but has clear areas for refactoring, optimization, and further security hardening.

## 10. Recommendations and Next Steps

- **Critical Issues**:
  1.  **Optimize Comment Loading**: Refactor `getCardComments` to avoid the N+1 query problem.
- **Documentation Improvements**:
  1.  **Rewrite the README.md**: Create a comprehensive README with a project description, feature list, tech stack, and a quick start guide.
  2.  **Add `CONTRIBUTING.md`**: To define contribution standards.
  3.  **Document Architecture**: Create a high-level architecture diagram and explanation in `/docs/architecture/`.
- **Code Quality**:
  1.  **Refactor Components**: Break down `BoardPage.tsx` and `ListColumn.tsx` using custom hooks.
  2.  **Optimize Data Fetching**: Implement more granular state updates instead of full reloads.
- **Infrastructure**:
  - Set up a CI/CD pipeline (e.g., using GitHub Actions) that runs linting and tests on every pull request.

---

## Quick Start Guide

1.  **Setup Environment**: Clone the repository, `pnpm install` dependencies, and create a `.env.local` file with your Firebase project credentials.
2.  **Run Development Server**: Execute `pnpm dev` to start the application on `http://localhost:3000`.
3.  **Interact**: Create an account and start building your Kanban boards.