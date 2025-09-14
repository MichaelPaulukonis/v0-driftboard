# Firestore Data Model: Hybrid Strategy

This document details the current Firestore data model, which employs a hybrid strategy combining a `*_current` collection for live data with `history` subcollections for an immutable audit trail.

## 1. Core Entities

The application revolves around four main entities:

*   **Board**: The top-level container for organizing work.
*   **List**: A column within a board, containing cards.
*   **Card**: An individual task item within a list.
*   **Comment**: A note or discussion point attached to a card.

## 2. Hybrid Data Model Structure

Each core entity now follows a consistent hybrid structure:

### A. `*_current` Collections

*   **Purpose**: Stores the current, live state of each document. This is what the application primarily reads from and writes to.
*   **Naming Convention**: `[entityName]_current` (e.g., `boards_current`, `lists_current`, `cards_current`, `comments_current`).
*   **Fields**: In addition to the entity-specific data, each document in a `_current` collection includes:
    *   `status`: (`active | done | deleted | archived | inactive`) - Indicates the lifecycle state of the document. All active queries filter by `status: 'active'`.
    *   `createdAt`: (Firestore `Timestamp`) - When the document was initially created.
    *   `createdBy`: (string, `uid`) - The user ID of the creator.
    *   `updatedAt`: (Firestore `Timestamp`) - The last time the document was updated.
    *   `updatedBy`: (string, `uid`) - The user ID of the last updater.

### B. `history` Subcollections

*   **Purpose**: Provides an immutable audit trail of all significant changes made to the parent `_current` document.
*   **Naming Convention**: `[entityName]_current/{documentId}/history/{historyId}` (e.g., `boards_current/board123/history/autoId`).
*   **Fields**: Each document in a `history` subcollection includes:
    *   `changeType`: (`create | update | delete | done | restore`) - Describes the type of change that occurred.
    *   `createdAt`: (Firestore `Timestamp`) - When this history record was created (i.e., when the change happened).
    *   `createdBy`: (string, `uid`) - The user ID of the user who initiated the change.
    *   `snapshot`: (object) - A full copy of the parent document's state *at the time of the change*. This allows for point-in-time recovery.
    *   `summary`: (optional string) - A human-readable description of the change (not yet fully implemented).

## 3. Example Document Paths

*   **Board**: `boards_current/{boardId}`
    *   History: `boards_current/{boardId}/history/{historyId}`
*   **List**: `lists_current/{listId}`
    *   History: `lists_current/{listId}/history/{historyId}`
*   **Card**: `cards_current/{cardId}`
    *   History: `cards_current/{cardId}/history/{historyId}`
*   **Comment**: `comments_current/{commentId}`
    *   History: `comments_current/{commentId}/history/{historyId}`

## 4. User Collection

*   **Collection Name**: `users`
*   **Purpose**: Stores user profile information, linked by `uid`.
*   **Fields**: `uid`, `email`, `displayName`.
*   **Note**: The `users` collection does not currently implement the `history` subcollection pattern, as its data is typically managed separately from core application entities.

## 5. Data Flow Implications

*   **Writes**: All `create`, `update`, and `delete` operations are performed as atomic batched writes or transactions. This ensures that the `_current` document is updated simultaneously with its corresponding `history` record.
*   **Reads**: The application primarily reads from the `*_current` collections, filtering by `status: 'active'` to show only live data. History is fetched on demand from the `history` subcollections.

## 6. Security Rules

Firestore Security Rules are configured to enforce this data model:

*   Allow read/write access to `*_current` collections based on user authentication and ownership.
*   Allow `create` access to `history` subcollections (for new audit entries).
*   Allow `read` access to `history` subcollections (for viewing audit trails).
*   **Deny `update` and `delete` access to `history` subcollections** to ensure immutability.

This hybrid data model provides a robust foundation for tracking changes, enabling soft deletes, and potentially supporting features like undo/redo or activity feeds in the future.
