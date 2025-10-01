# Feature: "Restore" / "Undo Delete" Functionality

DONE: no action to be taken - handled as part of 05.fix-cascading-soft-deletes.md

## Description

Implement a user interface and corresponding service logic to allow users to restore soft-deleted items (boards, lists, cards, comments) by changing their `status` from `deleted` back to `active`.

## Rationale

Completes the soft-delete lifecycle, providing users with the ability to recover accidentally deleted items, enhancing user experience and data safety.

## Implementation Notes

*   UI: Add a "Restore" button or option, likely in a dedicated "Trash" or "Archived" view.
*   Service: Create a new service function (e.g., `restoreItem(collectionName, itemId, userId)`) that updates the item's `status` to `active`.
*   History: Ensure a `changeType: 'restore'` entry is added to the item's `history` subcollection upon restoration.
