# Feature: Administrator-Level Permanent Deletion

**Description:**
Create a mechanism for a designated "admin" role to permanently delete (hard-delete) cards from the database. This action would be irreversible and bypass the soft-delete status.

**Requirements:**

- Requires implementation of user roles and permissions.
- Should have significant confirmation steps to prevent accidental data loss.

**Use Case:**
Necessary for data privacy compliance (e.g., GDPR 'right to be forgotten') or for permanently removing sensitive or irrelevant data from the system. This is not for regular users.
