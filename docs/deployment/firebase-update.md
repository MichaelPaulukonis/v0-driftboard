# Firebase Update & Deployment Guide

This guide covers the procedures for updating Firebase configurations, security rules, and data structures as the Driftboard application evolves. It focuses on _updates_ to an existing environment, not initial setup.

## 1. Firestore Security Rules

**File:** `firestore.rules`

### When to Update

- **Schema Changes:** Adding new collections or documents that require specific validation.
- **Permission Changes:** modifying who can read/write specific data (e.g., adding "viewer" roles).
- **Logic Enhancements:** adding complex validation functions (e.g., `hasRequiredCreateFields`).

### Deployment

To deploy _only_ the security rules without affecting other parts of your project:

```bash
firebase deploy --only firestore:rules
```

**⚠️ Important:** improperly configured rules can break the application or expose data. Always verify rules in a non-production environment or using the Firebase Emulator before deploying to production.

## 2. Firestore Indexes

**File:** `firestore.indexes.json`

### When to Update

- **New Queries:** Adding features that require sorting or filtering by multiple fields (e.g., "Sort tasks by date AND priority").
- **Performance:** If a query is slow or returns an error "The query requires an index".

### Workflow

1. Often, the easiest way to generate the correct index JSON is to run the query in the app.
2. Check the browser console for a Firebase error link.
3. Click the link to create the index in the Firebase Console.
4. Once created, run `firebase firestore:indexes > firestore.indexes.json` to save the new definition to your codebase.
5. Commit the updated file.

### Deployment

If you have manually edited the file or want to sync your codebase to Firebase:

```bash
firebase deploy --only firestore:indexes
```

## 3. Data Migrations & Maintenance

**Directory:** `scripts/`

As the application schema evolves, you may need to backfill data or migrate existing documents to a new format. We use the **Firebase Admin SDK** for these tasks to bypass security rules.

### Prerequisites

- **Service Account Key:** You must have a `serviceAccountKey.json` file in the `scripts/` directory. (See `docs/reference/firebase-setup.md` step 5).
- **Dependencies:** Ensure project dependencies are installed (`pnpm install`).

### Available Scripts

- **`migrate-to-hybrid-model.ts`**: Example script for migrating data structures.
- **`cleanup-old-collections.ts`**: Removes deprecated collections.
- **`backup.ts`**: Creates a backup of specific collections.

### How to Run a Script

Scripts are written in TypeScript and can be executed using `ts-node` (via `npm` scripts defined in `package.json` if available) or directly.

**Example (using defined scripts):**

```bash
# Check package.json for available aliases
pnpm run migrate:status
pnpm run cleanup:old-collections
```

**Example (direct execution):**

```bash
# Using ts-node directly
npx ts-node scripts/your-script-name.ts
```

## 4. Environment Variables

**File:** `.env.local` (local) / Vercel Project Settings (production)

### When to Update

- **New Firebase Features:** Enabling features that require new config keys (e.g., Measurement ID).
- **Key Rotation:** If API keys are rotated for security.

### Deployment

- **Local:** Update your `.env.local` file and restart the dev server.

* **Production (Vercel):** Update the Environment Variables in the Vercel Project Settings and redeploy the application.

## 5. Deployment Checklist

Before merging a PR that affects the database:

1. [ ] **Rules:** Have `firestore.rules` been updated to allow/validate new data?
2. [ ] **Indexes:** Does the `firestore.indexes.json` file include any new composite indexes required by new queries?
3. [ ] **Migrations:** Is a migration script required to update existing data? If so, has it been tested against a staging DB?
4. [ ] **Secrets:** If new secrets are needed (e.g., Service Account updates), are they securely distributed?

## 6. Full Deployment Command

To deploy rules and indexes together:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```
