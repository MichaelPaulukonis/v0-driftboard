# GitHub Copilot Instructions for Driftboard

## Project Context

This is a **Personal Kanban Board Application** built with **Next.js and Firebase**. DriftBoard is designed as a cost-effective, easily deployable alternative to Trello, with a focus on modern web development practices using a serverless architecture.

## Technology Stack

When suggesting code, please adhere to the following technologies:

- **Framework**: **Next.js 15+** (App Router)
- **Language**: **TypeScript** (in strict mode)
- **UI Library**: **React 19+** with functional components and hooks
- **Backend & Database**: **Google Firebase** (Firestore for database, Firebase Auth for authentication)
- **Styling**: **Tailwind CSS** with **shadcn/ui** components
- **State Management**: React Context (`useContext`) for shared state (like auth) and `useState`/`useReducer` for local component state.
- **Drag & Drop**: **@atlaskit/pragmatic-drag-and-drop**

## 1. Project Structure

Follow the existing Next.js App Router structure:

- **`app/`**: Contains all routes and pages.
  - `app/page.tsx`: The main landing/dashboard page.
  - `app/board/[id]/page.tsx`: The detailed view for a single Kanban board.
  - `app/layout.tsx`: The root layout of the application.
- **`components/`**: Reusable React components.
  - `ui/`: Base UI components from shadcn/ui (Button, Card, etc.).
  - Application-specific components (`dashboard.tsx`, `list-column.tsx`, `card-item.tsx`, `auth-form.tsx`).
- **`contexts/`**: React Context providers for managing global state (e.g., `auth-context.tsx`).
- **`lib/`**: Core logic, services, and utilities.
  - `firebase.ts`: Firebase app initialization and configuration.
  - `firebase-service.ts`: The data access layer containing all Firestore CRUD operations for boards, lists, cards, and comments.
  - `types.ts`: TypeScript type definitions for all data models (Board, List, Card, etc.).
  - `utils.ts`: General utility functions (e.g., `cn` for classnames).
- **`docs/`**: Project documentation, including overviews and plans.
- **`public/`**: Static assets like images and icons.

## 2. Coding Standards

1.  Use ESLint and Prettier for code quality and consistent formatting.
2.  **Always use TypeScript** with strict mode enabled. Define shared types in `lib/types.ts`.
3.  Follow consistent naming conventions:
    -   Components and Types: `PascalCase` (`BoardCard`, `FirebaseBoard`)
    -   Files and folders: `kebab-case` (`board-card.tsx`, `auth-context.tsx`)
    -   Variables and functions: `camelCase` (`handleCardMove`, `getUserBoards`)
4.  Use `async/await` for all asynchronous operations (e.g., Firebase calls).
5.  **React Component Structure**: Follow this order for consistency:
    ```tsx
    "use client"
    // 1. Imports (external libraries first, then internal)
    import { useState, useEffect } from 'react';
    import { useAuth } from '@/contexts/auth-context';
    import { boardService } from '@/lib/firebase-service';
    import type { Board } from '@/lib/types';
    import { Button } from '@/components/ui/button';

    // 2. Types and interfaces
    interface DashboardProps {
      // component props
    }

    // 3. Component definition
    export function Dashboard({ ...props }: DashboardProps) {
      // 4. Hooks and state
      const { user } = useAuth();
      const [boards, setBoards] = useState<Board[]>([]);
      const [loading, setLoading] = useState(true);

      // 5. Effects
      useEffect(() => {
        // data fetching or side effects
      }, [user]);

      // 6. Event handlers
      const handleCreateBoard = () => {
        // handler logic
      };

      // 7. Render logic
      if (loading) {
        return <p>Loading...</p>;
      }

      // 8. Render
      return (
        <div>
          {/* Component JSX */}
        </div>
      );
    };
    ```
6.  Always use semantic HTML and ensure WCAG 2.1 AA compliance.

### Prettier Configuration

1.  **Semicolons**: Always use semicolons.
2.  **Indentation**: 2 spaces.
3.  **Quotes**: Single quotes for strings, double quotes for JSX attributes.
4.  **Line Length**: 100 characters.
5.  **Trailing Commas**: Use trailing commas in multi-line structures.

## 3. Mandatory Planning Process

**CRITICAL**: All development work must follow this planning process before any code implementation.

### Plan-File Requirement

1.  **Before Any Code Changes**: ALL feature requests, architectural changes, or significant modifications must begin with creating—or reusing—an appropriate plan-file in `docs/plans/`.
2.  **User Confirmation Protocol**: When a user requests changes, first inspect `docs/plans/` for a relevant file. If one exists, ask the user to update it, create a new one, or proceed without one. If none exists, ask the user to create one or proceed without one. Honor the user's choice.
3.  **Plan-File Naming Convention**: `NN.semantic-name.md` (e.g., `01.user-comments.md`).
4.  **Required Plan Contents**: Problem Statement, Requirements, Technical Approach, Implementation Steps, Testing Strategy, Risks & Mitigation, Dependencies.
5.  **Exceptions**: This process is not required for documentation updates or minor, single-line bug fixes.

## 4. Firebase Service Layer

1.  **Centralized Logic**: All interactions with Firestore must be placed in `lib/firebase-service.ts`. UI components should **never** call Firestore methods directly.
2.  **Clear Separation**: The service layer is organized by data model (e.g., `boardService`, `listService`, `cardService`).
3.  **Type Safety**: Use `FirebaseBoard`, `FirebaseList`, etc., for data from Firestore and map them to the plain `Board`, `List` types (with `Date` objects) before returning them to the application.
4.  **Error Handling**: Service functions should include robust `try...catch` blocks and log detailed errors to the console to aid in debugging.

## 5. Drag-and-Drop Implementation

Use **`@atlaskit/pragmatic-drag-and-drop`** for all DnD functionality.

-   **Draggable Items**: Cards (`CardItem.tsx`) should be made draggable using the `draggable()` adapter.
-   **Drop Targets**: Both cards (`CardItem.tsx`) and lists (`ListColumn.tsx`) should be configured as drop targets using `dropTargetForElements()`.
-   **Reordering Logic**: Use `attachClosestEdge` and `extractClosestEdge` to determine the drop position (top/bottom) for smooth reordering.
-   **Data Updates**: The `onDrop` handler in `ListColumn.tsx` should contain the logic to call the appropriate `cardService` function (`moveCard` or `reorderCards`) to persist the changes to Firestore.

## 6. Firestore Data Modeling

1.  **Schema**: The data models are defined in `lib/types.ts`. Adhere to these structures when reading from or writing to Firestore.
2.  **Relationships**: Data is relational but stored in a denormalized NoSQL manner. Relationships are maintained via IDs (e.g., a `Card` document has a `listId` field).
3.  **Position-based Ordering**: Lists and cards use a `position` field (number) for ordering. When reordering, the service layer is responsible for calculating and updating these positions.

## 7. Authentication & Security

1.  **Firebase Auth**: All authentication is handled by Firebase. Use the `useAuth` hook from `contexts/auth-context.tsx` to access the current user's state.
2.  **Firestore Security Rules**: **This is critical.** All new features that involve data access must be accompanied by corresponding Firestore security rules to prevent unauthorized access. Rules should be fine-grained, ensuring users can only read/write their own data.
    ```js
    // Example Firestore security rule
    match /boards/{boardId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    ```

## 8. Testing Strategy

Follow a **testing-first** approach when practical. Tests must be passing before committing code.

### Unit Tests

-   Use **Vitest** to test pure functions, utilities, and `firebase-service.ts` logic.
-   **Mock all external calls (e.g., to Firebase)** to isolate the function being tested.

```ts
import { describe, it, expect, vi } from 'vitest';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { boardService } from '../lib/firebase-service';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  // Add other mocked functions as needed
}));

describe('boardService.getUserBoards', () => {
  it('should fetch and return user boards correctly', async () => {
    const mockDocs = [{ id: '1', data: () => ({ title: 'Test Board', userId: 'user1', createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() } }) }];
    (getDocs as any).mockResolvedValue({ docs: mockDocs });

    const boards = await boardService.getUserBoards('user1');

    expect(query).toHaveBeenCalled();
    expect(where).toHaveBeenCalledWith('userId', '==', 'user1');
    expect(boards).toHaveLength(1);
    expect(boards[0].title).toBe('Test Board');
  });
});
```

### Component Tests

-   Use **React Testing Library** to verify component behavior and interactions.
-   Prefer semantic queries (`getByRole`, `getByLabelText`) over test IDs.

### End-to-End Tests

-   Use **Playwright** to validate critical user flows, such as login, board creation, and CRUD operations.

## 9. Documentation Standards

1.  **Component Documentation**: Use JSDoc for complex components to explain props and purpose.
2.  **Architecture Documentation**: Maintain high-level architecture documents in the `/docs` directory.
3.  **Plan Files**: All major changes must be documented in a plan file in `docs/plans/` as per the planning process.

## 10. Commit Message Guidelines

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

-   `feat(boards): add board archiving functionality`
-   `fix(cards): resolve drag-and-drop position calculation`
-   `docs(auth): update firebase authentication guide`
-   `refactor(service): simplify card reordering logic`
-   `test(components): add tests for BoardCard component`

## 11. Error Handling

1.  **Frontend Error Boundaries**: Implement React Error Boundaries for graceful error handling in production.
2.  **Service Layer Errors**: The `firebase-service.ts` functions should `try...catch` errors from Firebase and re-throw them as standardized application errors or handle them gracefully.
3.  **UI Feedback**: Display user-friendly error messages (e.g., using Toasts or Alerts) when an operation fails, instead of just logging to the console.

## 12. Deployment

The project is configured for continuous deployment on **Vercel**. Pushes to the main branch will automatically trigger a new deployment.

---
*These instructions should be followed to ensure consistency, maintainability, and quality across the Driftboard codebase.*
