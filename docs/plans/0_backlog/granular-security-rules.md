# Feature: More Granular Security Rules (Ownership)

## Description

Refine Firestore Security Rules for `lists_current` and `cards_current` to enforce ownership based on the parent board's `userId`.

## Rationale

Enhances security by ensuring that only the owner of a board (or authorized collaborators) can modify its associated lists and cards, preventing unauthorized access or manipulation.

## Implementation Notes

- Modify `firestore.rules`.
- For `lists_current` and `cards_current`, update `allow update, delete` rules to include a check like `if get(/databases/$(database)/documents/boards_current/$(resource.data.boardId)).data.userId == request.auth.uid;`.
- Consider performance implications of `get()` operations in rules for frequently accessed paths.
