# Feature: UI for Viewing Deleted/Archived Items

## Description

Create a user interface (e.g., a "Trash" or "Archive" section/toggle) that allows users to view items that have been soft-deleted (`status: 'deleted'`) or archived (`status: 'archived'`).

## Rationale

Provides users with a complete overview of their data, including items they've chosen to hide from the main view. This is a prerequisite for implementing a "Restore" feature.

## Implementation Notes

*   UI: Add a toggle or a separate view/page to filter queries by `status: 'deleted'` or `status: 'archived'`.
*   Queries: Update relevant `get` service functions to accept a `status` filter (e.g., `getBoardLists(boardId, statusFilter)`).
*   Consideration: How to display the hierarchy of deleted items (e.g., a deleted board with its deleted lists/cards).
