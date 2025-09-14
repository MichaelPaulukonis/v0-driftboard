# Improvement: Optimize N+1 Query for Comment User Data

## Description

Refactor the `getCardComments` function in `firebase-service.ts` to avoid the N+1 query problem when fetching user display names for comments.

## Rationale

Improves application performance and reduces Firestore read costs, especially for cards with a large number of comments.

## Implementation Notes

*   **Option 1 (Batch Reads)**: Collect all unique `userId`s from the comments, then fetch all user documents in a single batched `get` operation (or a few if the number of unique users exceeds the batch limit).
*   **Option 2 (Denormalization)**: When a comment is created or updated, store the `user.displayName` directly on the comment document. This makes reads faster but requires updating the comment document if the user's display name changes.
*   **Consideration**: Option 2 is generally preferred for read-heavy scenarios like displaying comments, but requires careful handling of user profile updates.
