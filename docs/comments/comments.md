# How Comments are Correlated with Users

This document explains the robust process of how comments are associated with users in the application, ensuring every comment is correctly attributed to its author. The process involves three main stages: user creation, comment creation, and comment retrieval.

## 1. User Document Creation

The foundation of the system is ensuring a user record exists in the database.

-   **`contexts/auth-context.tsx`**: When a new user signs up or logs in for the first time, the authentication context automatically creates a corresponding user document in the `users` collection in Firestore.
-   **User Document**: This document is stored with the user's `uid` as the document ID and contains essential information like the user's `uid`, `email`, and `displayName`. This step is critical for linking comments back to a user profile.

## 2. Creating a Comment

When a logged-in user submits a comment, the following happens:

1.  **`CommentForm.tsx`**: The form gets the current user's unique `uid` from the `useAuth()` hook.
2.  **`firebase-service.ts` (`createComment`)**: The form calls the `createComment` function, passing the `cardId`, the user's `uid`, and the comment content. This function creates a new document in the `comments_current` collection with `status: 'active'`, `createdBy`, and `updatedBy` fields. Crucially, it also creates an initial `create` entry in the `history` subcollection for that comment, ensuring an audit trail from its inception.

## 3. Retrieving and Displaying a Comment

When the application needs to display comments for a card, it performs the following steps to join comment and user data:

1.  **`firebase-service.ts` (`getCardComments`)**: This function is called to get all comments for a specific card.
2.  **Querying `comments_current`**: It first queries the `comments_current` collection for all documents matching the `cardId` and `status: 'active'`.
3.  **Querying `users`**: For each comment found, it uses the `userId` field to fetch the corresponding user's document from the `users` collection.
4.  **Combining Data**: It then combines the data from the comment and the user document into a single `CommentWithUser` object.
5.  **`CommentItem.tsx`**: This component receives the `CommentWithUser` object and accesses its `user` property to display the author's name, ensuring correct attribution.

This two-step process of creating a user document on sign-up and then linking it via `userId` in each comment ensures that all comments are correctly and reliably associated with their authors.
