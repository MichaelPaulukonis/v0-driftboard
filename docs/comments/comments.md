# How Comments are Correlated with Users

This document explains the process of how comments are associated with users in the application. The process involves three main steps: creating a comment, retrieving it with the author's information, and displaying it.

## 1. Creating a Comment

When a logged-in user submits a comment, the following happens:

1.  **`CommentForm.tsx`**: The form gets the current user's data (including their unique `uid`) from the `useAuth()` hook.
2.  **`firebase-service.ts` (`createComment`)**: The form then calls the `createComment` function, passing the `cardId`, the user's `uid`, and the comment content. This function creates a new document in the `comments` collection. Crucially, it stores the user's `uid` in a `userId` field within that comment document. This `userId` field is the link between the comment and the user who created it.

## 2. Retrieving a Comment with User Data

When the application needs to display comments for a card, it does more than just fetch the comments themselves:

1.  **`firebase-service.ts` (`getCardComments`)**: This function is called to get the comments for a specific card.
2.  **Querying `comments`**: First, it queries the `comments` collection for all documents where the `cardId` matches.
3.  **Querying `users`**: Then, for each comment it finds, it uses the `userId` field to fetch the corresponding user's document from the `users` collection. This is the key step where the comment is correlated with the user's data (like their name and email).
4.  **Combining Data**: Finally, it combines the data from the comment and the user document into a single `CommentWithUser` object, which is then sent to the UI.

## 3. Displaying the Comment

1.  **`CommentItem.tsx`**: This component receives the `CommentWithUser` object. It then accesses the `user` property of this object to display the author's name. If the user data couldn't be fetched in the previous step, it defaults to "Unknown User".

## Potential Points of Failure

Based on this process, the "Unknown User" issue is likely happening at one of these points:

*   **User Creation**: When a new user signs up, a corresponding document might not be getting created in the `users` collection. Without this document, there's no user information to retrieve.
*   **Data Retrieval**: The `getCardComments` function might be failing to fetch the user document from the `users` collection, even if it exists.
*   **Incomplete User Data**: The user documents in the `users` collection might be missing the `displayName` or `email` fields.

The most likely culprit is the first point: the `users` collection is not being populated with user information when a new user is created.
