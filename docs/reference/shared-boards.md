# Shared Boards Feature

## Overview

The Shared Boards feature enables multi-user collaboration on Kanban boards. Board owners can invite other users as **Editors**, allowing them to contribute to the board while maintaining control over board settings and access.

## Data Model

### Board Memberships

A new collection `board_memberships` tracks the relationship between users and boards.

- **Document ID**: `${boardId}_${userId}` (for efficient lookups and security rules)
- **Fields**:
  - `id`: string
  - `boardId`: string
  - `userId`: string
  - `role`: `'owner' | 'editor' | 'viewer'`
  - `addedAt`: Timestamp
  - `updatedAt`: Timestamp

### Board Updates

The `boards_current` collection now includes:

- `ownerId`: The UID of the original creator.
- `status`: Standardized status field.

### Activities

A centralized `activities` collection tracks collaborative events across all boards.

- **Fields**:
  - `id`: string
  - `boardId`: string
  - `userId`: string (actor)
  - `targetUserId`: string (optional, for invites)
  - `action`: `'CREATE_BOARD' | 'INVITE_USER' | 'CREATE_LIST' | ...`
  - `details`: Object (action-specific metadata)
  - `createdAt`: Timestamp

## Permissions (RBAC)

We use a Role-Based Access Control system enforced both in Firestore Security Rules and the Frontend UI.

| Action                 | Owner | Editor | Viewer |
| ---------------------- | ----- | ------ | ------ |
| View Board             | ✅    | ✅     | ✅     |
| Edit Board Metadata    | ✅    | ✅     | ❌     |
| Delete Board           | ✅    | ❌     | ❌     |
| Invite Users           | ✅    | ❌     | ❌     |
| Create/Edit/Move Lists | ✅    | ✅     | ❌     |
| Create/Edit/Move Cards | ✅    | ✅     | ❌     |
| Add Comments           | ✅    | ✅     | ❌     |

### Security Rules

Rules in `firestore.rules` verify the user's role by checking the `board_memberships` collection before allowing operations on boards, lists, and cards.

## User Guide

### Inviting Collaborators

1. Open a board you own.
2. Click the **Share** button in the header.
3. Enter the email address of the user you wish to invite.
4. Click **Invite User**.
5. The user will now see the board in their "Your Boards" list with a **Shared** badge.

### Working on a Shared Board

- Collaborators (Editors) can perform almost all tasks: creating cards, moving them, adding comments, etc.
- Only the Owner can delete the board or invite more people.
- All actions are logged in the **Activity** section found in the Card Details dialog.

## Technical Implementation Details

### Service Layer

The `boardService` in `lib/firebase-service.ts` handles the complex logic of checking memberships and logging activities.

- `getUserBoards(userId)`: Fetches both owned and shared boards by joining memberships.
- `inviteUser(boardId, inviterId, email)`: Resolves user by email and creates a membership record.

### Frontend Context

The `BoardContext` provides a `can(action)` helper function that components use to conditionally render UI elements based on the current user's role.

```typescript
const { can } = useBoardContext();
{can('inviteUsers') && <ShareBoardDialog />}
```
