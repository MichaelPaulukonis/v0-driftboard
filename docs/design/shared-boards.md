# Shared Boards Design Document

## Overview

Shared boards allow users to collaborate on the same board. Users can be invited via email and assigned roles (Viewer, Editor, Owner).

## Data Model

### Board

The `Board` interface has been updated to include:

- `userRole`: The role of the current user on this board.
- `isShared`: A boolean indicating if the board has other members.
- `visibility`: (Future) `private` or `public`.

### Board Memberships

A separate collection `board_memberships` stores the relationship between users and boards.

- Document ID: `${boardId}_${userId}` (Composite key for uniqueness)
- Fields:
  - `boardId`: string
  - `userId`: string
  - `role`: "owner" | "editor" | "viewer"
  - `addedAt`: Timestamp

## Security Model

### Authorization

- **Client-Side:** UI components check `userRole` using `canPerformAction` (from `lib/permissions.ts`) to hide/show elements (e.g., "Invite" button, "Access List").
- **Firestore Rules:**
  - `boards_current`: Read/Write restricted to owners and members.
  - `board_memberships`:
    - **Current State:** `allow read: if isAuthenticated();` (Temporary mitigation for client-side refactor).
    - **Future State:** Read restricted to board members only. This is tracked in Task #1 (Security).

### Client-Side Refactor

To avoid server-side dependency issues during the build process, the sharing logic was moved to the client side.

- `boardService.getBoardSharingData(boardId)` queries `board_memberships` directly.
- **Implication:** The `board_memberships` collection is currently readable by any authenticated user. This is a known trade-off that will be addressed by tightening Firestore rules in a follow-up task.

## API Contracts

### `boardService.getBoardSharingData(boardId: string)`

Returns sharing details for a board.

- **Returns:**
  ```typescript
  Promise<{
    isShared: boolean;
    members: Array<{
      userId: string;
      displayName: string;
      email?: string;
      photoURL: string | null;
      role: string;
    }>;
  }>;
  ```

## Future Compatibility

- **Public Boards:** The `visibility` field in the `Board` model prepares for public boards.
- **Roles:** The `BoardRole` type supports `viewer` which is currently unused but ready for implementation.
