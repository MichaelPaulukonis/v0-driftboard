---
description: AI rules derived by SpecStory from the project AI interaction history
globs: *
---

# GitHub Copilot Instructions for Driftboard

## Project Context

This is a **Personal Kanban Board Application** built with **Next.js and Firebase**. DriftBoard is designed as a cost-effective, easily deployable alternative to Trello, with a focus on modern web development practices using a serverless architecture. Although not part of this implementation, we are separately considering a move to a monorepo and further front-end/backend separations. This dashboard will be implemented as a standalone app, and while eventually intended to be deployed on Vercel, will initially be deployed locally on Docker.

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
  - `docs/plans/`: Plan files for major features or architectural changes.
  - `docs/plans/completed/`: Completed plan files.
- **`public/`**: Static assets like images and icons.
- **`admin-dashboard/` or `/infra/metabase/`**: Location for Metabase Docker setup, including `docker-compose.yml`, `.env.template`, `secrets/` (placeholder), and related scripts. Keep any validation scripts (e.g., `scripts/validate-metrics.js`) either in that folder or ``—whichever you prefer for clarity. If a custom Remix fallback is used, it may reside under `/admin-dashboard/fallback/`.

## 2. Coding Standards

1. Use ESLint and Prettier for code quality and consistent formatting.
2. **Always use TypeScript** with strict mode enabled. Define shared types in `lib/types.ts`.
3. Follow consistent naming conventions:
   - Components and Types: `PascalCase` (`BoardCard`, `FirebaseBoard`)
   - Files and folders: `kebab-case` (`board-card.tsx`, `auth-context.tsx`)
   - Variables and functions: `camelCase` (`handleCardMove`, `getUserBoards`)
4. Use `async/await` for all asynchronous operations (e.g., Firebase calls).
5. **React Component Structure**: Follow this order for consistency:

   ```tsx
   "use client";
   // 1. Imports (external libraries first, then internal)
   import { useState, useEffect } from "react";
   import { useAuth } from "@/contexts/auth-context";
   import { boardService } from "@/lib/firebase-service";
   import type { Board } from "@/lib/types";
   import { Button } from "@/components/ui/button";

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
     return <div>{/* Component JSX */}</div>;
   }
   ```

6. Always use semantic HTML and ensure WCAG 2.1 AA compliance.

### Prettier Configuration

1. **Semicolons**: Always use semicolons.
2. **Indentation**: 2 spaces.
3. **Quotes**: Single quotes for strings, double quotes for JSX attributes.
4. **Line Length**: 100 characters.
5. **Trailing Commas**: Use trailing commas in multi-line structures.

## 3. Mandatory Planning Process

**CRITICAL**: All development work must follow this planning process before any code implementation.

### Plan-File Requirement

1. **Before Any Code Changes**: ALL feature requests, architectural changes, or significant modifications must begin with creating—or reusing—an appropriate plan-file in `docs/plans/`.
2. **User Confirmation Protocol**: When a user requests changes, first inspect `docs/plans/` for a relevant file. If one exists, ask the user to update it, create a new one, or proceed without one. If none exists, ask the user to create one or proceed without one. Honor the user's choice.
3. **Plan-File Naming Convention**: `NN.semantic-name.md` (e.g., `01.user-comments.md`).
4. **Required Plan Contents**: Problem Statement, Requirements, Technical Approach, Implementation Steps, Testing Strategy, Risks & Mitigation, Dependencies.
   4.1 **Use Taskmaster MCP**: Unless directed otherwise, use taskmaster MCP server to parse the plan file (as prd) to create discrete tasks
   4.2 **Taskmaster append**: Taskmaster should append new tasks, and not delete existing tasks.
   4.3 \*_Taskmaster generate_:: Use `taskmaster generate` to generate individual task files from tasks.json
5. **Completed Plans**: When all tasks in a plan have been completed the file will be internally annotated and dated, and moved to `docs/plans/completed/`.
   5.1 Use `git mv` to preserve history.
6. **Exceptions**: This process is not required for Product Requirement Document creation, documentation updates or minor, single-line bug fixes.

## 4. Firebase Service Layer

1. **Centralized Logic**: All interactions with Firestore must be placed in `lib/firebase-service.ts`. UI components should **never** call Firestore methods directly.
2. **Clear Separation**: The service layer is organized by data model (e.g., `boardService`, `listService`, `cardService`).
3. **Type Safety**: Use `FirebaseBoard`, `FirebaseList`, etc., for data from Firestore and map them to the plain `Board`, `List` types (with `Date` objects) before returning them to the application.
4. **Error Handling**: Service functions should include robust `try...catch` blocks and log detailed errors to the console to aid in debugging.

## 5. Drag-and-Drop Implementation

Use **`@atlaskit/pragmatic-drag-and-drop`** for all DnD functionality.

- **Draggable Items**: Cards (`CardItem.tsx`) should be made draggable using the `draggable()` adapter.
- **Drop Targets**: Both cards (`CardItem.tsx`) and lists (`ListColumn.tsx`) should be configured as drop targets using `dropTargetForElements()`.
- **Reordering Logic**: Use `attachClosestEdge` and `extractClosestEdge` to determine the drop position (top/bottom) for smooth reordering.
- **Data Updates**: The `onDrop` handler in `ListColumn.tsx` should contain the logic to call the appropriate `cardService` function (`moveCard` or `reorderCards`) to persist the changes to Firestore.

## 6. Firestore Data Modeling

1. **Schema**: The data models are defined in `lib/types.ts`. Adhere to these structures when reading from or writing to Firestore.
2. **Relationships**: Data is relational but stored in a denormalized NoSQL manner. Relationships are maintained via IDs (e.g., a `Card` document has a `listId` field).
3. **Position-based Ordering**: Lists and cards use a `position` field (number) for ordering. When reordering, the service layer is responsible for calculating and updating these positions.

## 7. Authentication & Security

1. **Firebase Auth**: All authentication is handled by Firebase. Use the `useAuth` hook from `contexts/auth-context.tsx` to access the current user's state.
2. **Firestore Security Rules**: **This is critical.** All new features that involve data access must be accompanied by corresponding Firestore security rules to prevent unauthorized access. Rules should be fine-grained, ensuring users can only read/write their own data.
   ```js
   // Example Firestore security rule
   match /boards/{boardId} {
     allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
   }
   ```

## 8. Testing Strategy

Follow a **testing-first** approach when practical. Tests must be passing before committing code.

### Unit Tests

- Use **Vitest** to test pure functions, utilities, and `firebase-service.ts` logic.
- **Mock all external calls (e.g., to Firebase)** to isolate the function being tested.

```ts
import { describe, it, expect, vi } from "vitest";
import { collection, query, where, getDocs } from "firebase/firestore";
import { boardService } from "../lib/firebase-service";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  // Add other mocked functions as needed
}));

describe("boardService.getUserBoards", () => {
  it("should fetch and return user boards correctly", async () => {
    const mockDocs = [
      {
        id: "1",
        data: () => ({
          title: "Test Board",
          userId: "user1",
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      },
    ];
    (getDocs as any).mockResolvedValue({ docs: mockDocs });

    const boards = await boardService.getUserBoards("user1");

    expect(query).toHaveBeenCalled();
    expect(where).toHaveBeenCalledWith("userId", "==", "user1");
    expect(boards).toHaveLength(1);
    expect(boards[0].title).toBe("Test Board");
  });
});
```

### Component Tests

- Use **React Testing Library** to verify component behavior and interactions.
- Prefer semantic queries (`getByRole`, `getByLabelText`) over test IDs.

### End-to-End Tests

- Use **Playwright** to validate critical user flows, such as login, board creation, and CRUD operations.

## 9. Documentation Standards

1. **Component Documentation**: Use JSDoc for complex components to explain props and purpose.
2. **Architecture Documentation**: Maintain high-level architecture documents in the `/docs` directory.
3. **Plan Files**: All major changes must be documented in a plan file in `docs/plans/` as per the planning process.

## 10. Git Commits

### **Mandatory Git Commit Workflow**

When you are asked to create a commit, you **MUST** follow these steps in order:

1. **Analyze Changes:** Run `git status` and `git diff --staged` to understand the modifications.
2. **Evaluate for Changelog:** Review the changes against the criteria in `.github/changelog-management.md`.
3. **Ask About Changelog:** If the changes meet the criteria (e.g., new features, UI changes, bug fixes), you **MUST** ask the user: "Should I create a changelog entry for these changes?" You may also provide advice on whether an entry seems warranted (e.g., "This is a minor fix, so you may choose to skip it to avoid cluttering the changelog.").
4. **Create Changelog (if approved):** If the user agrees, update `CHANGELOG.md` according to the project's format guidelines.
5. **Propose Commit Message:** After handling the changelog, draft a commit message that follows the Conventional Commits specification.
6. **Commit Changes:** After the user approves the message, stage the `CHANGELOG.md` file (if modified) and run `git commit`.

### See `./changelog-management.md` for detailed instructions on pre-commit changelog rules.

### Commit Message Guidelines

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat(boards): add board archiving functionality`
- `fix(cards): resolve drag-and-drop position calculation`
- `docs(auth): update firebase authentication guide`
- `refactor(service): simplify card reordering logic`
- `test(components): add tests for BoardCard component`

## 11. Error Handling

1. **Frontend Error Boundaries**: Implement React Error Boundaries for graceful error handling in production.
2. **Service Layer Errors**: The `firebase-service.ts` functions should `try...catch` errors from Firebase and re-throw them as standardized application errors or handle them gracefully.
3. **UI Feedback**: Display user-friendly error messages (e.g., using Toasts or Alerts) when an operation fails, instead of just logging to the console.

## 12. Deployment

The project is configured for continuous deployment on **[Vercel]**. Pushes to the main branch will automatically trigger a new deployment.

---

## 13. Product Requirements Document (PRD) Guidance

When creating a new feature, especially one with significant scope, a PRD should be created to capture the requirements and vision for the project.

1.  **PRD File Naming Convention**: Follow the same naming convention as plan files: `NN.semantic-name.md` (e.g., `10.admin-dashboard.md`).
2.  **PRD Sections**: The PRD should include the following sections:
    - **Problem Statement & Vision**: Clearly define the problem being solved, the target audience, and the overall vision for the solution.
    - **Target Users & Use Cases**: Identify the primary users and their main goals, outlining key user journeys.
    - **Core Features & Requirements**: List must-have and nice-to-have features, along with any technical constraints.
    - **Success Metrics & Goals**: Define how success will be measured and identify key performance indicators.
    - **Technical Considerations**: Address platform requirements, integration needs, and scalability expectations.

### Example PRD Content (Admin Dashboard):

**Problem & Vision**

- **Problem:** Need a lightweight, reliable view of active usage, system health, and trend signals for a very small user base, with the possibility (however unlikely) of sudden growth due to public sign-up.
- **Audience:** Sole admin, with potential future extension to moderators; access should remain restricted to trusted roles.
- **Vision:** A standalone, read-only admin dashboard pulled from Firebase/Firestore that fetches fresh data on demand (manual refresh), prioritizes clarity over real-time updates, and runs locally via Docker initially (Vercel later if/when needed). Focus on simple, accurate KPIs and drill-downs without operational overhead. **The primary approach is to evaluate Metabase as a COTS solution before custom code.**

**Target Users & Use Cases**

- **Users:** Solo admin for now; no near-term need for additional roles or access boundaries.
- **Key Actions:**
  1. View aggregate KPIs (board count, comment count, etc.) across all users
  2. Track changes and trends over time
  3. Inspect board and user activity with awareness of shared-board dynamics
- **Drill-Down Journeys:**
  - Overview → Users → specific user → recent activity
  - Overview → Shared Boards → participating users
  - No exports needed; manual refresh on demand sufficient

**Core Features & Requirements**

- **MVP Metrics:** User count, board count, list count, card count, comment count (cross-user aggregates and drill-down to individual entities).
- **Layout:** Single comprehensive dashboard page (can split into tabs/sections if needed for clarity).
- **Architecture:** **The initial approach is to use Metabase.** If Metabase is not suitable, implement a lightweight Express API layer (for security & future flexibility) that reads from Firebase; no exports needed for MVP.

**Success Metrics & Goals**

- **Success Criteria:** KPIs are visible and drillable; quick-n-dirty implementation for visibility (accuracy validated by spot-checking against Firestore console).
- **Monitoring:** Purely informational; no alerting or anomaly detection.
- **Operational Readiness:** MVP = launch Docker and view stats immediately.

---

**Technical Considerations**

- **Stack & Environment:** **First, evaluate Metabase**. If Metabase is not suitable, use React for matching main Driftboard. Consider Remix if that would be appropriate, here.
- **Auth & Access:** Token-based auth in deployed env-vars. No login needed for MVP. Plan is to push to cloud at some point and we would require login at that point.
- **Scalability & Future:** "Fetch on demand" sufficient for MVP

---

**14. Admin Dashboard Specifics**

- For the admin dashboard, add a self-contained folder (e.g., `/admin-dashboard/` or `/infra/metabase/`) with `docker-compose.yml`, `.env.template`, `secrets/` placeholder, and scripts. Keep any validation scripts (e.g., `scripts/validate-metrics.js`) either in that folder or ``—whichever you prefer for clarity. If a custom Remix fallback is used, you can also keep it under `/admin-dashboard/fallback/` without a monorepo.
- When creating the Metabase Docker setup, the default port for Metabase is 3000. If this port is already in use (e.g., by the main Driftboard application), change the host port mapping in `docker-compose.yml` to another available port (e.g., 3001 or 3002). The container port should remain 3000. Update the `README.md` file to reflect the new host port.
- When setting up the Metabase Docker environment, ensure that the Firebase service account credentials are provided to the Metabase container. This can be achieved by mounting the service account JSON file as a volume in the `docker-compose.yml` file. The container should have read-only access to this file. The container should have read-only access to this file.
- The docker-compose volume mount should end with `:ro` to ensure the volume is read-only. This is a security best practice.
- The path `./secrets/firebase-service-account.json` in the `.env` file is relative to the directory where `docker-compose up` runs from—in this case `/admin-dashboard/`.
- When creating the read-only service account in Firebase, the recommended role is **"Firebase Viewer"** or **"Cloud Datastore Viewer"**.
- Storing the service account key locally is acceptable for local development, but for cloud deployment, it is recommended to store the key JSON as an encrypted environment variable or use Workload Identity Federation if supported by the cloud provider.
- When running `pnpm install` inside a subdirectory of the project and no `node_modules` folder is created, use the command `pnpm install --ignore-workspace` to force a standalone install.
- When using `ts-node-esm` and encountering issues with file extensions or module resolution, replace `ts-node-esm` with `tsx` in the `dev` script of `package.json`. You will also need to add `"tsx": "^4.7.0"` to the `devDependencies`.

_These instructions should be followed to ensure consistency, maintainability, and quality across the Driftboard codebase._

### **15. Docker Development Guidance**

To simplify local development, both the main Driftboard application and the admin dashboard can be run together using Docker Compose.

1.  **Combined Docker Compose Setup**: A root-level `docker-compose.yml` orchestrates both services. A separate `docker-compose.dev.yml` file is used for development-specific configurations.

2.  **Running Both Services Locally**:

    ```bash
    # Start both driftboard-dev and admin-dashboard
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
    ```

    This command starts both the main application and the admin dashboard, enabling coordinated local development. The main app is accessible at `http://localhost:3001`, and the admin dashboard is accessible at `http://localhost:3002`.

3.  **Running Individual Services**:

    ```bash
    # Just the production driftboard service
    docker-compose up driftboard
    ```

    ```bash
    # Just the admin dashboard
    docker-compose up admin-dashboard
    ```

    These commands allow running only the main application or the admin dashboard, respectively.

4.  **Native Local Development (No Docker)**:

    ```bash
    # Terminal 1: Main app
    pnpm dev
    ```

    ```bash
    # Terminal 2: Admin dashboard
    cd admin-dashboard/fallback && pnpm dev
    ```

    For developers preferring to work without containers, these commands start the main application and the admin dashboard in separate terminals.

5.  **Troubleshooting**:
    - **Port Already in Use**: If port conflicts arise, identify and terminate the conflicting process.

      ```bash
      lsof -i :3001
      lsof -i :3002
      kill <PID>
      ```

    - **Container Won't Start**: Inspect build errors or container logs for troubleshooting.

      ```bash
      docker-compose build --no-cache admin-dashboard
      docker-compose logs admin-dashboard
      ```

    - **Firebase Credentials Issues**:
      - Ensure `secrets/firebase-service-account.json` exists with proper permissions.
      - Verify `FIREBASE_PROJECT_ID` in `.env.local` matches the service account project.
      - Confirm the service account has the "Firebase Viewer" or "Cloud Datastore Viewer" role.

---

### **16. Taskmaster 13 Implementation Details**

This section provides guidance on implementing Taskmaster 13 ("Future-Proofing for Cloud Migration & Extensions").

1. **Monorepo Structure**: Implement the monorepo structure now, moving existing code into it:
   ```
   /driftboard-monorepo
     /apps
       /admin-dashboard
         /metabase        # Current implementation
         /fallback        # Remix fallback
     /packages
       /config            # Shared config
       /types             # Shared TypeScript types
   ```
2. **Remix Fallback Location**: Restructure the fallback dashboard now to match the future monorepo layout, placing it under `/apps/admin-dashboard/fallback`.
3. **Environment Variable Schema**: Create the `config/env.schema.ts` file in the current admin-dashboard fallback directory (`/apps/admin-dashboard/fallback/app/lib/env.schema.ts`):

   ```typescript
   import { z } from "zod";

   export const envSchema = z.object({
     // Current MVP variables
     METABASE_ADMIN_PASSWORD: z
       .string()
       .min(16, "METABASE_ADMIN_PASSWORD must be at least 16 characters"),
     FIREBASE_PROJECT_ID: z.string(),
     FIREBASE_SERVICE_ACCOUNT: z.string(),

     // Future cloud deployment variables
     NODE_ENV: z.enum(["development", "production"]).default("development"),
     AUTH_TYPE: z.enum(["token", "firebase-auth"]).default("token"),
     SESSION_SECRET: z.string().optional(),

     // Day 2 features
     ENABLE_AUTO_REFRESH: z.coerce.boolean().default(false),
     AUTO_REFRESH_INTERVAL: z.coerce.number().min(60).default(300),
     ENABLE_TIME_FILTERS: z.coerce.boolean().default(true),

     // Vercel deployment
     VERCEL_URL: z.string().optional(),
     VERCEL_GIT_COMMIT_SHA: z.string().optional(),

     // Token-based admin access for fallback
     ADMIN_TOKEN: z.string().optional(),
   });

   export type Env = z.infer<typeof envSchema>;

   export function getEnv(): Env {
     // Parse process.env with defaults and validation
     return envSchema.parse(process.env);
   }
   ```

4. **Authentication Middleware**: Create the stub for future implementation in `/apps/admin-dashboard/fallback/app/lib/auth.server.ts`:

   ```typescript
   // Authentication middleware stub for Remix fallback
   // Future: implement Firebase ID token verification when AUTH_TYPE=firebase-auth

   export async function requireAdmin(request: Request) {
     const authType = process.env.AUTH_TYPE ?? "token";

     if (authType === "token") {
       const token =
         request.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
       const expected = process.env.ADMIN_TOKEN ?? "";

       if (!expected || token !== expected) {
         throw new Response("Unauthorized", { status: 401 });
       }
     } else if (authType === "firebase-auth") {
       // TODO: Implement Firebase ID token verification
       // Example:
       // const idToken = request.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
       // const decoded = await admin.auth().verifyIdToken(idToken);\
       // if (!decoded || !decoded.email) throw new Response('Unauthorized', { status: 401 });
     }

     return true;
   }
   ```

### 17. Card UI Specifics

- To optimize card layout and reclaim valuable screen real estate, remove permanent whitespace reservation on the right side of cards by making drag and kebab menu controls overlay on mouse-hover.
- Refine text wrapping behavior in cards to prevent mid-word breaks for regular text while allowing breaks within long URLs to prevent layout overflow.
- Implement the hover control overlay by adjusting the layout in `components/card-item.tsx` to remove the reserved space and use an absolute overlay for the grip and kebab menu on hover.
- Refine card layout further by removing `pr-4` (padding right) and `break-all` (force text breaks) from `components/card-item.tsx` to fully reclaim the space.
- Update `linkifyText` in `lib/utils.ts` to add a `url-text` class to URLs.
- Add the following CSS to `app/globals.css` for intelligent word breaking:

```css
/* Intelligent Word Breaking for Card Content */
.url-text {
  overflow-wrap: anywhere;
  word-break: break-word;
}

[class*="card-content"] p,
[class*="card-content"] h4 {
  overflow-wrap: normal;
  word-break: normal;
  hyphens: auto;
}
```

- Ensure that `BoardCard` also reclaims space and uses correct theme-aware gradients for overlays. The overlay should use `from-card` instead of `from-white` for better theme compatibility.
