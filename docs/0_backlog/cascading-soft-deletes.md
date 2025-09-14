# Feature: Cascading Soft Deletes (Server-Side)

## Description

Implement a Firebase Cloud Function or similar server-side trigger that automatically updates the `status` of child documents (lists, cards, comments) when their parent document (board, list, card) is soft-deleted.

## Rationale

Ensures data consistency across the hierarchy. When a board is soft-deleted, its associated lists, cards, and comments should also be marked as deleted to prevent them from appearing in queries that don't explicitly filter by parent status.

## Implementation Notes

*   Trigger: `onUpdate` for `boards_current`, `lists_current`, `cards_current` where `status` changes to `deleted`.
*   Action: Query child collections and update their `status` to `deleted` in a batched write.
*   Consideration: This is a server-side operation to bypass security rules and ensure atomicity.
