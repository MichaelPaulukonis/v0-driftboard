# Feature: Improve Deployment Documentation

**Description:**
Update and consolidate the project's documentation to include clear instructions on how to deploy Firestore rules and indexes. This information should be easily accessible to new developers.

**Context:**
Existing documentation related to Firebase setup and indexing can be found at:

- `docs/reference/firebase-setup.md`
- `docs/reference/firestore-indexing.md`

These files should be reviewed, and their content should be consolidated or referenced in the new, more centralized documentation.

**Tasks:**

1.  Create a new, primary deployment document in `docs/deployment/` that explains the end-to-end deployment process, including Firestore.
2.  Consolidate or reference the information from the existing `firebase-setup.md` and `firestore-indexing.md` files into the new deployment document to avoid duplication.
3.  Update the main `README.md` to link to the new, centralized deployment guide.
4.  Ensure the documentation clearly explains when and why to run `firebase deploy --only firestore:rules,firestore:indexes`.
