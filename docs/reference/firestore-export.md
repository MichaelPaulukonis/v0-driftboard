# Command-Line Firestore Backups (Exports)

This document outlines how to perform database backups (exports) from the command line using the Google Cloud SDK (`gcloud`). This is the recommended approach for creating scriptable, repeatable backups.

## Overview

The process works by exporting a point-in-time snapshot of your entire Firestore database into a Google Cloud Storage (GCS) bucket.

## Backup Workflow

### Prerequisites

Ensure you have the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and authenticated:

```sh
# Log in to your Google Account
gcloud auth login

# Set your project configuration
gcloud config set project v0-driftboard-clone
```

### Step 1: Create a Google Cloud Storage Bucket

If you don't already have one, you need to create a storage bucket to store your backup files. Bucket names must be globally unique.

```sh
# Replace [BUCKET_NAME] with a unique name (e.g., v0-driftboard-backups)
gcloud storage buckets create gs://[BUCKET_NAME] --project=v0-driftboard-clone
```

### Step 2: Export Your Firestore Database

Run the `gcloud firestore export` command, pointing it at the bucket you just created. The command will create a new folder in the bucket named with the timestamp of the export.

```sh
# Replace [BUCKET_NAME] with your actual bucket name
gcloud firestore export gs://[BUCKET_NAME] --project=v0-driftboard-clone
```

## Restoring from a Backup

To restore data from an export, you can use the `gcloud firestore import` command, pointing it to a specific backup folder created by a previous export.

```sh
# Example, replacing [BUCKET_NAME] and [TIMESTAMP_FOLDER]
gcloud firestore import gs://[BUCKET_NAME]/[TIMESTAMP_FOLDER]/ --project=v0-driftboard-clone
```

## Future Automation

For fully automated daily or weekly backups, this process can be run on a schedule using a combination of **Google Cloud Scheduler** and **Cloud Functions**. The scheduler triggers the function, and the function executes the export logic.
