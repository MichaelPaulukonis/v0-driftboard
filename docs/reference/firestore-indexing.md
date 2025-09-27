# Managing Firestore Indexes as Code

This document outlines the process for managing and deploying Firestore composite indexes using the Firebase CLI, ensuring an automated and repeatable workflow.

## Overview

Instead of creating database indexes manually through the Firebase console, we define them in a `firestore.indexes.json` file. This approach (Infrastructure as Code) allows us to version control our indexes and deploy them consistently.

## Configuration Files

1.  **`firebase.json`**: The main configuration file for the Firebase CLI. It tells the CLI where to find project-specific configurations, including the index definition file.

2.  **`firestore.indexes.json`**: This is the source of truth for our database indexes. All composite indexes required by the application's queries are defined here.

## Deployment Workflow

To deploy the indexes defined in `firestore.indexes.json` to your Firebase project, follow these steps.

### 1. Prerequisites: Set up Firebase CLI

If you haven't already, install the Firebase CLI and log in to your Google account.

```sh
# Install the CLI globally
npm install -g firebase-tools

# Log in to your Google account
firebase login
```

### 2. Select Your Firebase Project

Ensure the CLI is targeting the correct project. Use the `firebase use` command with your project's ID.

```sh
# Example for this project
firebase use v0-driftboard-clone
```

### 3. Deploy the Indexes

Run the following command to deploy only the Firestore indexes:

```sh
firebase deploy --only firestore:indexes
```

The CLI will read your configuration and begin creating the necessary indexes in your Firebase project.

**Note:** After running the command, the index will begin building. This process can take several minutes. You can monitor the status in the Firebase Console under **Firestore Database > Indexes**.
