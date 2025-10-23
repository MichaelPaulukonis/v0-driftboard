import { Command } from 'commander';
import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin/app';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { Board, List, Card, Comment } from '../lib/types';

// Assuming service account key is in the same directory and gitignored
import serviceAccount from './serviceAccountKey.json';

interface BackupData {
  boards: Board[];
  lists: List[];
  cards: Card[];
  comments: Comment[];
  backedUpAt: string;
}

async function listAllUsers() {
  console.log('Fetching all users from Firebase Auth...');
  // listUsers() fetches users in batches of 1000.
  // For more than 1000 users, you would need to implement pagination with pageTokens.
  const userRecords = await admin.auth().listUsers();

  console.log('Found Users:');
  userRecords.users.forEach(user => {
    console.log(`- UID: ${user.uid}, Email: ${user.email}, Name: ${user.displayName || 'N/A'}`);
  });
}

async function backupUserData(userId: string) {
  console.log(`Starting backup for user: ${userId}`);
  const db = admin.firestore();

  const backupData: BackupData = {
    boards: [],
    lists: [],
    cards: [],
    comments: [],
    backedUpAt: new Date().toISOString(),
  };

  // 1. Fetch boards for the user
  console.log('Fetching boards_current...');
  const boardsSnapshot = await db.collection('boards_current').where('userId', '==', userId).get();
  const boards = boardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Board[];
  backupData.boards = boards;
  console.log(`Found ${boards.length} documents in boards_current.`);

  // 2. Fetch lists using the retrieved board IDs
  const boardIds = boards.map(b => b.id);
  const allLists: List[] = [];
  if (boardIds.length > 0) {
    console.log('Fetching lists_current for retrieved boards...');
    for (let i = 0; i < boardIds.length; i += 10) {
      const batchIds = boardIds.slice(i, i + 10);
      const listsQuery = db.collection('lists_current').where('boardId', 'in', batchIds);
      const listsSnapshot = await listsQuery.get();
      const batchLists = listsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as List[];
      allLists.push(...batchLists);
    }
  }
  backupData.lists = allLists;
  console.log(`Found ${allLists.length} documents in lists_current.`);

  // 3. Fetch cards using the retrieved list IDs
  const listIds = allLists.map(l => l.id);
  const allCards: Card[] = [];
  if (listIds.length > 0) {
    console.log('Fetching cards_current for retrieved lists...');
    for (let i = 0; i < listIds.length; i += 10) {
      const batchIds = listIds.slice(i, i + 10);
      const cardsQuery = db.collection('cards_current').where('listId', 'in', batchIds);
      const cardsSnapshot = await cardsQuery.get();
      const batchCards = cardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Card[];
      allCards.push(...batchCards);
    }
  }
  backupData.cards = allCards;
  console.log(`Found ${allCards.length} documents in cards_current.`);

  // 4. Fetch comments directly by user ID
  console.log('Fetching comments_current...');
  const commentsSnapshot = await db.collection('comments_current').where('userId', '==', userId).get();
  const comments = commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Comment[];
  backupData.comments = comments;
  console.log(`Found ${comments.length} documents in comments_current.`);

  // 5. Write data to file
  console.log('Structuring and writing data to file...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup.${userId}.${timestamp}.json`;
  const exportsDir = path.join(__dirname, '..', 'exports');
  const filePath = path.join(exportsDir, filename);

  await mkdir(exportsDir, { recursive: true });

  await writeFile(filePath, JSON.stringify(backupData, null, 2));

  console.log(`Backup complete! File saved to: ${filePath}`);
}

async function main() {
  const program = new Command();

  program
    .version('1.0.0')
    .description('A tool to backup user data or list all users.')
    .option('-u, --user <uid>', 'The Firebase UID of the user to backup.')
    .option('-l, --list-users', 'List all users from Firebase Auth.')
    .parse(process.argv);

  const options = program.opts();

  try {
    console.log('Connecting to database...');
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as ServiceAccount),
      });
    }
    console.log('Database connection successful.');

    if (options.listUsers) {
      await listAllUsers();
    } else if (options.user) {
      await backupUserData(options.user);
    } else {
      console.error('Error: Please provide either --user <uid> for a backup or --list-users to list users.');
      program.help();
      process.exit(1);
    }

  } catch (error) {
    console.error('An error occurred during the process:', error);
    process.exit(1);
  }
}

main();
