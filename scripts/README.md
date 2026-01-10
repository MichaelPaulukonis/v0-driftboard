# Firebase SDKs for Scripts

This document briefly explains the difference between the two Firebase SDKs and why we use the Admin SDK for scripts in this directory.

## 1. Firebase Client SDK (`firebase` package)

- **Use Case**: Designed for user-facing applications (web browsers, mobile apps).
- **Permissions**: Operates with the permissions of the logged-in user. All database access is checked against your project's **Firestore Security Rules**.
- **Why it fails for scripts**: Our migration script failed with `permission-denied` errors because it was unauthenticated and had no user identity. Security rules correctly blocked it from reading or writing data.

## 2. Firebase Admin SDK (`firebase-admin` package)

- **Use Case**: Designed for trusted, privileged backend environments (like servers, cloud functions, or local one-off scripts).
- **Permissions**: It is initialized with a **Service Account**, which is a private key file you generate from your Firebase project. This grants the SDK administrative privileges.
- **Key Feature**: The Admin SDK **bypasses all Firestore Security Rules**. It has full read/write access to your entire database, making it essential for administrative tasks like data migration, backfills, or other maintenance.

---

**Conclusion**: For any script that needs to reliably read or modify data without being blocked by security rules, we must use the **Firebase Admin SDK**.
