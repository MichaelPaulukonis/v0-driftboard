import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
} from "firebase/auth";
import { doc, setDoc, type Firestore } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  boardService,
  cardService,
  commentService,
  inviteService,
  listService,
} from "@/lib/firebase-service";

export type SeedRole = "owner" | "editor" | "viewer" | "outsider";

export interface SeedUserSpec {
  role: SeedRole;
  email: string;
  password: string;
  displayName: string;
}

export interface SeededUser extends SeedUserSpec {
  uid: string;
}

export const SEED_PASSWORD =
  process.env.DRIFTBOARD_SEED_PASSWORD || "pw-driftboard-seed-2026";

export const SEED_USERS: Record<SeedRole, SeedUserSpec> = {
  owner: {
    role: "owner",
    email: "owner@example.test",
    password: SEED_PASSWORD,
    displayName: "Alice Owner",
  },
  editor: {
    role: "editor",
    email: "editor@example.test",
    password: SEED_PASSWORD,
    displayName: "Bob Editor",
  },
  viewer: {
    role: "viewer",
    email: "viewer@example.test",
    password: SEED_PASSWORD,
    displayName: "Carol Viewer",
  },
  outsider: {
    role: "outsider",
    email: "outsider@example.test",
    password: SEED_PASSWORD,
    displayName: "Dave Outsider",
  },
};

export interface SeedScenario {
  users: Record<SeedRole, SeededUser>;
  ownedBoard: {
    boardId: string;
    listId: string;
    cardId: string;
  };
  sharedBoard: {
    boardId: string;
    todoListId: string;
    inProgressListId: string;
    deletedListId: string;
    activeCard1Id: string;
    activeCard2Id: string;
    inProgressCardId: string;
    doneCardId: string;
    archivedCardId: string;
    deletedCardId: string;
    doneCardInDeletedListId: string;
    ownerCommentId: string;
    editorCommentId: string;
  };
  deletedBoard: {
    boardId: string;
    listId: string;
    cardId: string;
  };
  outsiderBoard: {
    boardId: string;
    listId: string;
    cardId: string;
  };
}

const firebaseAuth = auth as Auth;
const firestoreDb = db as Firestore;

/**
 * Signs in or registers a seed user, then writes `users/{uid}` and `profiles/{uid}`
 * to match what `AuthProvider` writes on browser sign-in.
 */
export async function ensureSeedUser(spec: SeedUserSpec): Promise<SeededUser> {
  let uid: string;
  try {
    const cred = await createUserWithEmailAndPassword(
      firebaseAuth,
      spec.email,
      spec.password,
    );
    await updateProfile(cred.user, { displayName: spec.displayName });
    uid = cred.user.uid;
  } catch (error) {
    if ((error as { code?: string })?.code !== "auth/email-already-in-use") {
      throw error;
    }
    const cred = await signInWithEmailAndPassword(
      firebaseAuth,
      spec.email,
      spec.password,
    );
    uid = cred.user.uid;
  }

  await setDoc(
    doc(firestoreDb, "users", uid),
    {
      uid,
      email: spec.email,
      displayName: spec.displayName,
    },
    { merge: true },
  );
  await setDoc(
    doc(firestoreDb, "profiles", uid),
    { displayName: spec.displayName },
    { merge: true },
  );

  return { ...spec, uid };
}

export async function signInAsSeedUser(role: SeedRole): Promise<SeededUser> {
  const spec = SEED_USERS[role];
  const cred = await signInWithEmailAndPassword(
    firebaseAuth,
    spec.email,
    spec.password,
  );
  return { ...spec, uid: cred.user.uid };
}

export async function signOutSeedUser(): Promise<void> {
  await signOut(firebaseAuth);
}

/**
 * Populates a multi-user Driftboard dataset through `lib/firebase-service` as each user:
 * - owner: unshared board, shared board (active/done/archived/deleted cards, deleted list, comments), soft-deleted board
 * - editor: joins shared board via invite as editor, posts a comment
 * - viewer: joins shared board via invite as viewer
 * - outsider: owns a separate board that holds a matching search keyword
 */
export async function seedMultiUserScenario(): Promise<SeedScenario> {
  // 1. Owner setup
  const owner = await ensureSeedUser(SEED_USERS.owner);

  const ownedBoardId = await boardService.createBoard(
    owner.uid,
    "Owner Personal Board",
    "Private board for owner",
  );
  const ownedListId = await listService.createList(
    ownedBoardId,
    owner.uid,
    "Owner Todo",
    0,
  );
  const ownedCardId = await cardService.createCard(
    ownedListId,
    owner.uid,
    "Renew domain",
    "Private owner task",
    0,
  );

  // Shared board with rich list/card states
  const sharedBoardId = await boardService.createBoard(
    owner.uid,
    "Team Shared Board",
    "Shared with editor and viewer",
  );
  const inProgressListId = await listService.createList(
    sharedBoardId,
    owner.uid,
    "In Progress",
    1,
  );
  const todoListId = await listService.createList(
    sharedBoardId,
    owner.uid,
    "Todo",
    0,
  );
  const deletedListId = await listService.createList(
    sharedBoardId,
    owner.uid,
    "Obsolete List",
    2,
  );

  // Create out of order on purpose so position sorting is exercised
  const activeCard2Id = await cardService.createCard(
    todoListId,
    owner.uid,
    "Fix drag indicator",
    "Edge hitbox alignment",
    1,
  );
  const activeCard1Id = await cardService.createCard(
    todoListId,
    owner.uid,
    "Ship MCP reader",
    "Verify emulator integration",
    0,
  );
  const inProgressCardId = await cardService.createCard(
    inProgressListId,
    owner.uid,
    "Wire Firestore rules",
    "Check board_memberships",
    0,
  );

  const doneCardId = await cardService.createCard(
    todoListId,
    owner.uid,
    "Setup Vitest",
    "Completed task",
    2,
  );
  await cardService.updateCardStatus(doneCardId, owner.uid, "done");

  const archivedCardId = await cardService.createCard(
    todoListId,
    owner.uid,
    "Old Q1 roadmap",
    "Archived reference",
    3,
  );
  await cardService.updateCardStatus(archivedCardId, owner.uid, "archived");

  const deletedCardId = await cardService.createCard(
    todoListId,
    owner.uid,
    "Draft scratchpad",
    "Soft-deleted card containing Ship MCP reader",
    4,
  );
  await cardService.deleteCard(deletedCardId, owner.uid);

  // Card marked done before its list is soft-deleted (stays status='done', parent list is 'deleted')
  const doneCardInDeletedListId = await cardService.createCard(
    deletedListId,
    owner.uid,
    "Card on deleted list",
    "Parent list was deleted",
    0,
  );
  await cardService.updateCardStatus(
    doneCardInDeletedListId,
    owner.uid,
    "done",
  );
  await listService.deleteList(deletedListId, owner.uid);

  const ownerCommentId = await commentService.createComment(
    activeCard1Id,
    owner.uid,
    "Initial spec ready",
  );

  const editorInvite = await inviteService.createInvite(
    sharedBoardId,
    owner.uid,
    "editor",
  );
  const viewerInvite = await inviteService.createInvite(
    sharedBoardId,
    owner.uid,
    "viewer",
  );

  // Soft-deleted board owned by owner
  const deletedBoardId = await boardService.createBoard(
    owner.uid,
    "Deleted Board",
    "Should not appear anywhere",
  );
  const listInDeletedBoardId = await listService.createList(
    deletedBoardId,
    owner.uid,
    "Ghost List",
    0,
  );
  const cardInDeletedBoardId = await cardService.createCard(
    listInDeletedBoardId,
    owner.uid,
    "Ghost Card",
    "On a deleted board",
    0,
  );
  await boardService.deleteBoard(deletedBoardId, owner.uid);

  // 2. Editor joins shared board and comments
  const editor = await ensureSeedUser(SEED_USERS.editor);
  await inviteService.redeemInvite(editorInvite.token, editor.uid);
  const editorCommentId = await commentService.createComment(
    activeCard1Id,
    editor.uid,
    "LGTM from editor",
  );

  // 3. Viewer joins shared board
  const viewer = await ensureSeedUser(SEED_USERS.viewer);
  await inviteService.redeemInvite(viewerInvite.token, viewer.uid);

  // 4. Outsider creates their own private board (with a card matching "Ship MCP reader")
  const outsider = await ensureSeedUser(SEED_USERS.outsider);
  const outsiderBoardId = await boardService.createBoard(
    outsider.uid,
    "Outsider Secret Board",
    "No access for team",
  );
  const outsiderListId = await listService.createList(
    outsiderBoardId,
    outsider.uid,
    "Outsider List",
    0,
  );
  const outsiderCardId = await cardService.createCard(
    outsiderListId,
    outsider.uid,
    "Outsider secret card",
    "Also mentions Ship MCP reader to test search scoping",
    0,
  );

  await signOutSeedUser();

  return {
    users: { owner, editor, viewer, outsider },
    ownedBoard: {
      boardId: ownedBoardId,
      listId: ownedListId,
      cardId: ownedCardId,
    },
    sharedBoard: {
      boardId: sharedBoardId,
      todoListId,
      inProgressListId,
      deletedListId,
      activeCard1Id,
      activeCard2Id,
      inProgressCardId,
      doneCardId,
      archivedCardId,
      deletedCardId,
      doneCardInDeletedListId,
      ownerCommentId,
      editorCommentId,
    },
    deletedBoard: {
      boardId: deletedBoardId,
      listId: listInDeletedBoardId,
      cardId: cardInDeletedBoardId,
    },
    outsiderBoard: {
      boardId: outsiderBoardId,
      listId: outsiderListId,
      cardId: outsiderCardId,
    },
  };
}

// Allow running directly as a seed script (e.g. `pnpm seed:dev`)
if (import.meta.url === `file://${process.argv[1]}`) {
  seedMultiUserScenario()
    .then((scenario) => {
      console.log("Seeded Driftboard multi-user scenario:");
      console.log(
        "  Users:",
        Object.values(scenario.users)
          .map((u) => `${u.role}=${u.email} (${u.uid})`)
          .join(", "),
      );
      console.log("  Owned board:", scenario.ownedBoard.boardId);
      console.log("  Shared board:", scenario.sharedBoard.boardId);
      console.log("  Outsider board:", scenario.outsiderBoard.boardId);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
