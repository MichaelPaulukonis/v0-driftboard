# Backup & User Management Script

This document provides an overview of the standalone TypeScript script located at `scripts/backup.ts`.

## Overview

This script is an internal administrative tool for managing Driftboard data. It provides two primary functions:

1.  **Data Backup:** Creates a complete JSON backup of a single user's data, including all their boards, lists, cards, and comments.
2.  **User Listing:** Lists all registered users from Firebase Authentication to easily find their UID, email, and display name.

## Prerequisites

To run the script, you must have a Firebase Admin SDK service account key. The script expects a file named `serviceAccountKey.json` to be present in the `scripts/` directory.

## Usage

The script is run from the command line using `ts-node`.

### To List All Users

This command fetches and prints a list of all users in the Firebase project.

```sh
npx ts-node scripts/backup.ts --list-users
# or
npx ts-node scripts/backup.ts -l
```

**Example Output:**
```
Found Users:
- UID: 4BWFff6yt3WgdNo7XbE5ymcJoV03, Email: user1@example.com, Name: N/A
- UID: zML2LxUdkH3TudT9CRXr1qj7Q711, Email: user2@example.com, Name: N/A
```

### To Back Up a Single User's Data

This command fetches all data for the specified user and saves it to a timestamped JSON file in the `/exports` directory (which is created automatically if it doesn't exist).

```sh
npx ts-node scripts/backup.ts --user <USER_ID>
# or
npx ts-node scripts/backup.ts -u <USER_ID>
```

**Example Output:**
```
Starting backup for user: zML2LxUdkH3TudT9CRXr1qj7Q711
...
Backup complete! File saved to: /path/to/project/exports/backup.zML2LxUdkH3TudT9CRXr1qj7Q711.2025-10-13T19-48-19-480Z.json
```
