# Cascading Soft-Deletes

This document outlines the application's strategy for handling the deletion of parent documents (like Lists) that contain child documents (like Cards). The goal is to prevent data loss and provide a predictable user experience.

## The Problem: Orphaned Data

A simple soft-delete on a parent document (e.g., setting a List's `status` to 'deleted') can "orphan" its children. The child Cards still exist in the database but become inaccessible through the UI because their parent is no longer 'active'. Furthermore, if we indiscriminately update all child cards to 'deleted', we lose their original state (e.g., 'done' or 'archived').

## The Solution: Refined Cascading Soft-Delete

To solve this, we use a more nuanced approach when a List is deleted.

### `deleteList` Logic

When `listService.deleteList` is called:
1.  It finds all cards within that list that have a status of **'active'**.
2.  It leaves 'done' and 'archived' cards completely untouched, preserving their status.
3.  In a single atomic transaction, it performs three actions:
    a.  Changes the status of the 'active' cards it found to 'deleted'.
    b.  Records the IDs of these auto-deleted cards in a `cascadedCardIds` array within the List's deletion history document.
    c.  Changes the List's own status to 'deleted'.

This ensures active work is properly archived while preserving the state of completed work.

### `restoreList` Logic

The `restoreList` function is the "smart undo" for this process:
1.  It starts a transaction and sets the List's status back to 'active'.
2.  It finds the most recent 'delete' record in the List's history.
3.  It reads the `cascadedCardIds` array from that history record.
4.  It then changes the status of **only those specific cards** back to 'active'.

This guarantees that only the cards that were automatically soft-deleted with the list are restored, leaving any manually deleted cards untouched.

### Orphaned Card Restoration

If a user tries to restore a card (e.g., a 'done' card) whose parent List has been deleted, the UI will prompt them to choose a new, active List to restore the card to. This prevents the card from being restored into an inaccessible state.
