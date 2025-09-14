# Firebase Project Setup Guide

This document provides a step-by-step guide to setting up your Firebase project and configuring it for use with the Driftboard application.

## 1. Create a Firebase Project

If you don't already have one, create a new Firebase project:

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Click "Add project" or "Create a project".
3.  Follow the on-screen instructions to set up your project. You can enable Google Analytics if you wish.

## 2. Enable Firebase Services

For Driftboard to function, you need to enable two core Firebase services:

### A. Authentication

1.  In your Firebase project, navigate to **Build > Authentication**.
2.  Click "Get started".
3.  Go to the "Sign-in method" tab.
4.  Enable the **"Email/Password"** provider. This is the primary authentication method used by Driftboard.

### B. Firestore Database

1.  In your Firebase project, navigate to **Build > Firestore Database**.
2.  Click "Create database".
3.  Choose "Start in production mode" (we will set up security rules later).
4.  Select a Firestore location. Choose a region close to your users for optimal performance.

## 3. Register Your Web App

To connect your Next.js application to Firebase, you need to register it as a web app:

1.  In your Firebase project overview, click the "Web" icon (</>) to "Add app to get started".
2.  Register your app. You can give it a nickname (e.g., "Driftboard Web"). Hosting is not required for this step.
3.  After registration, you will be presented with your Firebase configuration object. It will look something like this:

    ```javascript
    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID"
    };
    ```

    **Keep this configuration handy.** You will need these values for your environment variables.

## 4. Configure Environment Variables

Driftboard uses environment variables to connect to your Firebase project. Create a `.env.local` file in the root of your project and add the following variables, replacing the placeholders with your actual Firebase configuration values:

```
NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
```

## 5. Set Up Service Account Key (for Admin Scripts)

For administrative scripts (like data migrations or cleanup), you need a Firebase Service Account key. This grants the script administrative privileges to your Firestore database.

1.  In your Firebase project, navigate to **Project settings** (gear icon ⚙️).
2.  Go to the **"Service accounts"** tab.
3.  Click **"Generate new private key"**. A JSON file will be downloaded.
4.  Rename this file to `serviceAccountKey.json` and place it in the `scripts/` directory of your project.
5.  **IMPORTANT**: Ensure `scripts/serviceAccountKey.json` is added to your `.gitignore` file to prevent committing private credentials.

## 6. Deploy Security Rules and Indexes

Driftboard uses Firestore Security Rules and composite indexes defined as code. You need to deploy these to your Firebase project.

1.  Ensure you have the Firebase CLI installed (`npm install -g firebase-tools`).
2.  Log in to the Firebase CLI (`firebase login`).
3.  Set your active Firebase project (`firebase use YOUR_PROJECT_ID`).
4.  Deploy the rules and indexes:

    ```sh
    firebase deploy --only firestore:rules,firestore:indexes
    ```

Your Firebase project is now fully set up and configured for the Driftboard application!
