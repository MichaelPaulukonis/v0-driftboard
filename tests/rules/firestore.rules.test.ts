import { readFileSync } from "node:fs";
import path from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

// Run with `pnpm test:rules` (needs Java + Firebase CLI; starts the Firestore emulator).

let env: RulesTestEnvironment;

const ALICE = "alice"; // board owner
const BOB = "bob"; // editor
const CAROL = "carol"; // viewer
const DAVE = "dave"; // stranger, no membership
const MALLORY = "mallory"; // owns a different board (bA), attacker in escalation tests

const db = (uid: string) => env.authenticatedContext(uid).firestore();

const createFields = (uid: string) => ({
  status: "active",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  createdBy: uid,
  updatedBy: uid,
});

const updateFields = (uid: string) => ({
  status: "active",
  updatedAt: serverTimestamp(),
  updatedBy: uid,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-driftboard",
    firestore: {
      rules: readFileSync(
        path.resolve(__dirname, "../../firestore.rules"),
        "utf8",
      ),
    },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const admin = ctx.firestore();
    const base = { status: "active" };

    await setDoc(doc(admin, "boards_current/b1"), {
      ...base,
      userId: ALICE,
      ownerId: ALICE,
      name: "B1",
    });
    await setDoc(doc(admin, "boards_current/bA"), {
      ...base,
      userId: MALLORY,
      ownerId: MALLORY,
      name: "BA",
    });

    await setDoc(doc(admin, `board_memberships/b1_${ALICE}`), {
      boardId: "b1",
      userId: ALICE,
      role: "owner",
    });
    await setDoc(doc(admin, `board_memberships/b1_${BOB}`), {
      boardId: "b1",
      userId: BOB,
      role: "editor",
    });
    await setDoc(doc(admin, `board_memberships/b1_${CAROL}`), {
      boardId: "b1",
      userId: CAROL,
      role: "viewer",
    });

    await setDoc(doc(admin, "lists_current/l1"), {
      ...base,
      boardId: "b1",
      createdBy: ALICE,
      title: "L1",
    });
    await setDoc(doc(admin, "cards_current/c1"), {
      ...base,
      listId: "l1",
      createdBy: ALICE,
      title: "C1",
    });
    await setDoc(doc(admin, "comments_current/m1"), {
      ...base,
      cardId: "c1",
      userId: ALICE,
      createdBy: ALICE,
      text: "hi",
    });

    // A second board (bA, owned by MALLORY) where BOB is also an editor: lets us test cross-board moves.
    await setDoc(doc(admin, `board_memberships/bA_${MALLORY}`), {
      boardId: "bA",
      userId: MALLORY,
      role: "owner",
    });
    await setDoc(doc(admin, `board_memberships/bA_${BOB}`), {
      boardId: "bA",
      userId: BOB,
      role: "editor",
    });
    await setDoc(doc(admin, "lists_current/lA"), {
      ...base,
      boardId: "bA",
      createdBy: MALLORY,
      title: "LA",
    });

    await setDoc(doc(admin, `users/${ALICE}`), {
      uid: ALICE,
      email: "alice@example.com",
      displayName: "Alice",
    });
    await setDoc(doc(admin, `users/${BOB}`), {
      uid: BOB,
      email: "bob@example.com",
      displayName: "Bob",
    });

    await setDoc(doc(admin, "boards_current/b1/history/h1"), {
      changeType: "create",
    });
    await setDoc(doc(admin, "lists_current/l1/history/h1"), {
      changeType: "create",
    });
    await setDoc(doc(admin, "cards_current/c1/history/h1"), {
      changeType: "create",
    });
    await setDoc(doc(admin, "comments_current/m1/history/h1"), {
      changeType: "create",
    });
  });
});

describe("unauthenticated", () => {
  it("cannot read anything", async () => {
    const anon = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, "boards_current/b1")));
    await assertFails(getDoc(doc(anon, "lists_current/l1")));
    await assertFails(getDoc(doc(anon, "cards_current/c1")));
    await assertFails(getDoc(doc(anon, `board_memberships/b1_${ALICE}`)));
  });
});

describe("board_memberships", () => {
  it("member can read own membership", async () => {
    await assertSucceeds(getDoc(doc(db(BOB), `board_memberships/b1_${BOB}`)));
  });

  it("owner can read other members' memberships", async () => {
    await assertSucceeds(getDoc(doc(db(ALICE), `board_memberships/b1_${BOB}`)));
  });

  it("stranger cannot read another board's memberships", async () => {
    await assertFails(getDoc(doc(db(DAVE), `board_memberships/b1_${BOB}`)));
  });

  it("stranger cannot create a membership on a board they do not own", async () => {
    await assertFails(
      setDoc(doc(db(DAVE), `board_memberships/b1_${DAVE}`), {
        boardId: "b1",
        userId: DAVE,
        role: "editor",
      }),
    );
  });

  it("owner can add a member", async () => {
    await assertSucceeds(
      setDoc(doc(db(ALICE), `board_memberships/b1_${DAVE}`), {
        boardId: "b1",
        userId: DAVE,
        role: "viewer",
      }),
    );
  });

  it("editor cannot change roles", async () => {
    await assertFails(
      updateDoc(doc(db(BOB), `board_memberships/b1_${CAROL}`), {
        role: "editor",
      }),
    );
  });

  it("owner can change roles", async () => {
    await assertSucceeds(
      updateDoc(doc(db(ALICE), `board_memberships/b1_${CAROL}`), {
        role: "editor",
      }),
    );
  });

  it("owner can remove a member", async () => {
    await assertSucceeds(
      deleteDoc(doc(db(ALICE), `board_memberships/b1_${CAROL}`)),
    );
  });

  it("editor cannot remove a member", async () => {
    await assertFails(deleteDoc(doc(db(BOB), `board_memberships/b1_${CAROL}`)));
  });

  it("owner of another board cannot forge a membership via mismatched doc id / boardId", async () => {
    await assertFails(
      setDoc(doc(db(MALLORY), `board_memberships/b1_${MALLORY}`), {
        boardId: "bA",
        userId: MALLORY,
        role: "editor",
      }),
    );
  });

  it("owner of another board cannot update a foreign membership by re-pointing boardId", async () => {
    await assertFails(
      updateDoc(doc(db(MALLORY), `board_memberships/b1_${CAROL}`), {
        boardId: "bA",
        role: "owner",
      }),
    );
  });
});

describe("boards_current", () => {
  it("owner can read", async () => {
    await assertSucceeds(getDoc(doc(db(ALICE), "boards_current/b1")));
  });

  it("member can read", async () => {
    await assertSucceeds(getDoc(doc(db(CAROL), "boards_current/b1")));
  });

  it("stranger cannot read", async () => {
    await assertFails(getDoc(doc(db(DAVE), "boards_current/b1")));
  });

  it("owner can update", async () => {
    await assertSucceeds(
      updateDoc(doc(db(ALICE), "boards_current/b1"), {
        name: "renamed",
        ...updateFields(ALICE),
      }),
    );
  });

  it("editor can update", async () => {
    await assertSucceeds(
      updateDoc(doc(db(BOB), "boards_current/b1"), {
        name: "renamed",
        ...updateFields(BOB),
      }),
    );
  });

  it("viewer cannot update", async () => {
    await assertFails(
      updateDoc(doc(db(CAROL), "boards_current/b1"), {
        name: "renamed",
        ...updateFields(CAROL),
      }),
    );
  });

  it("stranger cannot update", async () => {
    await assertFails(
      updateDoc(doc(db(DAVE), "boards_current/b1"), {
        name: "renamed",
        ...updateFields(DAVE),
      }),
    );
  });

  it("nobody can hard-delete", async () => {
    await assertFails(deleteDoc(doc(db(ALICE), "boards_current/b1")));
  });

  it("user can create a board as themselves", async () => {
    await assertSucceeds(
      setDoc(doc(db(DAVE), "boards_current/b2"), {
        userId: DAVE,
        name: "mine",
        ...createFields(DAVE),
      }),
    );
  });

  it("user cannot create a board attributed to someone else", async () => {
    await assertFails(
      setDoc(doc(db(DAVE), "boards_current/b3"), {
        userId: ALICE,
        name: "x",
        ...createFields(ALICE),
      }),
    );
  });
});

describe("lists_current", () => {
  it("owner, editor and viewer can read", async () => {
    await assertSucceeds(getDoc(doc(db(ALICE), "lists_current/l1")));
    await assertSucceeds(getDoc(doc(db(BOB), "lists_current/l1")));
    await assertSucceeds(getDoc(doc(db(CAROL), "lists_current/l1")));
  });

  it("stranger cannot read", async () => {
    await assertFails(getDoc(doc(db(DAVE), "lists_current/l1")));
  });

  it("owner and editor can create; stranger cannot", async () => {
    await assertSucceeds(
      setDoc(doc(db(ALICE), "lists_current/l2"), {
        boardId: "b1",
        title: "a",
        ...createFields(ALICE),
      }),
    );
    await assertSucceeds(
      setDoc(doc(db(BOB), "lists_current/l3"), {
        boardId: "b1",
        title: "b",
        ...createFields(BOB),
      }),
    );
    await assertFails(
      setDoc(doc(db(DAVE), "lists_current/l5"), {
        boardId: "b1",
        title: "d",
        ...createFields(DAVE),
      }),
    );
  });

  it("viewer cannot create (role-checked)", async () => {
    await assertFails(
      setDoc(doc(db(CAROL), "lists_current/l6"), {
        boardId: "b1",
        title: "c",
        ...createFields(CAROL),
      }),
    );
  });

  it("owner and editor can update; viewer and stranger cannot", async () => {
    await assertSucceeds(
      updateDoc(doc(db(ALICE), "lists_current/l1"), {
        title: "x",
        ...updateFields(ALICE),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(db(BOB), "lists_current/l1"), {
        title: "y",
        ...updateFields(BOB),
      }),
    );
    await assertFails(
      updateDoc(doc(db(CAROL), "lists_current/l1"), {
        title: "z",
        ...updateFields(CAROL),
      }),
    );
    await assertFails(
      updateDoc(doc(db(DAVE), "lists_current/l1"), {
        title: "w",
        ...updateFields(DAVE),
      }),
    );
  });

  it("nobody can hard-delete", async () => {
    await assertFails(deleteDoc(doc(db(ALICE), "lists_current/l1")));
  });
});

describe("cards_current", () => {
  it("owner, editor and viewer can read; stranger cannot", async () => {
    await assertSucceeds(getDoc(doc(db(ALICE), "cards_current/c1")));
    await assertSucceeds(getDoc(doc(db(BOB), "cards_current/c1")));
    await assertSucceeds(getDoc(doc(db(CAROL), "cards_current/c1")));
    await assertFails(getDoc(doc(db(DAVE), "cards_current/c1")));
  });

  it("owner and editor can create; stranger cannot", async () => {
    await assertSucceeds(
      setDoc(doc(db(ALICE), "cards_current/c2"), {
        listId: "l1",
        title: "a",
        ...createFields(ALICE),
      }),
    );
    await assertSucceeds(
      setDoc(doc(db(BOB), "cards_current/c3"), {
        listId: "l1",
        title: "b",
        ...createFields(BOB),
      }),
    );
    await assertFails(
      setDoc(doc(db(DAVE), "cards_current/c4"), {
        listId: "l1",
        title: "d",
        ...createFields(DAVE),
      }),
    );
  });

  it("viewer cannot create (role-checked)", async () => {
    await assertFails(
      setDoc(doc(db(CAROL), "cards_current/c5"), {
        listId: "l1",
        title: "c",
        ...createFields(CAROL),
      }),
    );
  });

  it("owner and editor can update; viewer and stranger cannot", async () => {
    await assertSucceeds(
      updateDoc(doc(db(ALICE), "cards_current/c1"), {
        title: "x",
        ...updateFields(ALICE),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(db(BOB), "cards_current/c1"), {
        title: "y",
        ...updateFields(BOB),
      }),
    );
    await assertFails(
      updateDoc(doc(db(CAROL), "cards_current/c1"), {
        title: "z",
        ...updateFields(CAROL),
      }),
    );
    await assertFails(
      updateDoc(doc(db(DAVE), "cards_current/c1"), {
        title: "w",
        ...updateFields(DAVE),
      }),
    );
  });

  it("nobody can hard-delete", async () => {
    await assertFails(deleteDoc(doc(db(ALICE), "cards_current/c1")));
  });
});

describe("cards_current: moves stay within a board", () => {
  it("moving a card to a list on another board is denied, even for a user who edits both", async () => {
    // BOB is an editor on b1 and bA
    await assertFails(
      updateDoc(doc(db(BOB), "cards_current/c1"), {
        listId: "lA",
        position: 1,
        ...updateFields(BOB),
      }),
    );
  });

  it("moving a card to another list on the same board is allowed", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "lists_current/l2"), {
        status: "active",
        boardId: "b1",
        createdBy: ALICE,
      });
    });
    await assertSucceeds(
      updateDoc(doc(db(BOB), "cards_current/c1"), {
        listId: "l2",
        position: 1,
        ...updateFields(BOB),
      }),
    );
  });

  it("creating a card in a list of a board the user cannot edit is denied", async () => {
    await assertFails(
      setDoc(doc(db(MALLORY), "cards_current/cz"), {
        listId: "l1",
        title: "z",
        ...createFields(MALLORY),
      }),
    );
  });
});

describe("comments_current: create and update", () => {
  const comment = (uid: string) => ({
    cardId: "c1",
    userId: uid,
    content: "x",
    ...createFields(uid),
  });

  it("owner and editor can comment", async () => {
    await assertSucceeds(
      setDoc(doc(db(ALICE), "comments_current/n1"), comment(ALICE)),
    );
    await assertSucceeds(
      setDoc(doc(db(BOB), "comments_current/n2"), comment(BOB)),
    );
  });

  it("viewer, stranger and owner of an unrelated board cannot comment", async () => {
    await assertFails(
      setDoc(doc(db(CAROL), "comments_current/n3"), comment(CAROL)),
    );
    await assertFails(
      setDoc(doc(db(DAVE), "comments_current/n4"), comment(DAVE)),
    );
    await assertFails(
      setDoc(doc(db(MALLORY), "comments_current/n5"), comment(MALLORY)),
    );
  });

  it("a comment cannot be re-pointed at another card", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "cards_current/c2"), {
        status: "active",
        listId: "lA",
        createdBy: MALLORY,
      });
    });
    await assertFails(
      updateDoc(doc(db(ALICE), "comments_current/m1"), {
        cardId: "c2",
        ...updateFields(ALICE),
      }),
    );
  });
});

describe("comments_current", () => {
  it("author can update own comment", async () => {
    await assertSucceeds(
      updateDoc(doc(db(ALICE), "comments_current/m1"), {
        text: "edit",
        ...updateFields(ALICE),
      }),
    );
  });

  it("other user cannot update someone's comment", async () => {
    await assertFails(
      updateDoc(doc(db(BOB), "comments_current/m1"), {
        text: "edit",
        ...updateFields(BOB),
      }),
    );
  });

  it("nobody can hard-delete", async () => {
    await assertFails(deleteDoc(doc(db(ALICE), "comments_current/m1")));
  });

  it("stranger cannot read comments on a board they are not in", async () => {
    await assertFails(getDoc(doc(db(DAVE), "comments_current/m1")));
  });
});

describe("history subcollections are immutable", () => {
  const paths = [
    "boards_current/b1/history/h1",
    "lists_current/l1/history/h1",
    "cards_current/c1/history/h1",
    "comments_current/m1/history/h1",
  ];

  for (const p of paths) {
    it(`${p}: update and delete denied for everyone`, async () => {
      await assertFails(
        updateDoc(doc(db(ALICE), p), { changeType: "tampered" }),
      );
      await assertFails(deleteDoc(doc(db(ALICE), p)));
    });
  }
});

// Rules are not filters: these mirror the exact queries in lib/firebase-service.ts and must stay
// provably readable under the read rules, or the app breaks even though single-doc reads pass.
describe("app queries under read rules", () => {
  it("getUserBoards: own memberships query", async () => {
    await assertSucceeds(
      getDocs(
        query(
          collection(db(BOB), "board_memberships"),
          where("userId", "==", BOB),
        ),
      ),
    );
  });

  it("getUserBoards: legacy owner query on boards_current", async () => {
    await assertSucceeds(
      getDocs(
        query(
          collection(db(ALICE), "boards_current"),
          where("userId", "==", ALICE),
          where("status", "==", "active"),
        ),
      ),
    );
  });

  it("getUserBoards: member fetches boards by id chunk", async () => {
    await assertSucceeds(
      getDocs(
        query(
          collection(db(BOB), "boards_current"),
          where("__name__", "in", ["b1"]),
          where("status", "==", "active"),
        ),
      ),
    );
  });

  it("getBoardMembers: member lists memberships for a board", async () => {
    await assertSucceeds(
      getDocs(
        query(
          collection(db(CAROL), "board_memberships"),
          where("boardId", "==", "b1"),
        ),
      ),
    );
  });

  it("getBoardMembers: stranger cannot list memberships for a board", async () => {
    await assertFails(
      getDocs(
        query(
          collection(db(DAVE), "board_memberships"),
          where("boardId", "==", "b1"),
        ),
      ),
    );
  });

  it("getCardComments: member lists comments for a card", async () => {
    await assertSucceeds(
      getDocs(
        query(
          collection(db(CAROL), "comments_current"),
          where("cardId", "==", "c1"),
          where("status", "==", "active"),
          orderBy("createdAt", "asc"),
        ),
      ),
    );
  });

  it("getListCards: member lists cards for a list", async () => {
    await assertSucceeds(
      getDocs(
        query(
          collection(db(CAROL), "cards_current"),
          where("listId", "==", "l1"),
          where("status", "==", "active"),
          orderBy("position", "asc"),
        ),
      ),
    );
  });

  it("getCardComments: stranger cannot list comments for a card", async () => {
    await assertFails(
      getDocs(
        query(
          collection(db(DAVE), "comments_current"),
          where("cardId", "==", "c1"),
          where("status", "==", "active"),
        ),
      ),
    );
  });
});

describe("users: own document only", () => {
  it("can read and update own doc", async () => {
    await assertSucceeds(getDoc(doc(db(ALICE), `users/${ALICE}`)));
    await assertSucceeds(
      updateDoc(doc(db(ALICE), `users/${ALICE}`), { displayName: "A" }),
    );
  });

  it("can create own doc (login upsert)", async () => {
    await assertSucceeds(
      setDoc(
        doc(db(DAVE), `users/${DAVE}`),
        { uid: DAVE, email: "d@example.com" },
        { merge: true },
      ),
    );
  });

  it("cannot read another user's doc, even a co-member", async () => {
    await assertFails(getDoc(doc(db(ALICE), `users/${BOB}`)));
    await assertFails(getDoc(doc(db(DAVE), `users/${ALICE}`)));
  });

  it("cannot list users or search by email", async () => {
    await assertFails(getDocs(collection(db(DAVE), "users")));
    await assertFails(
      getDocs(
        query(
          collection(db(DAVE), "users"),
          where("email", "==", "alice@example.com"),
        ),
      ),
    );
  });

  it("cannot create or update another user's doc", async () => {
    await assertFails(
      setDoc(doc(db(DAVE), "users/someone"), {
        uid: "someone",
        email: "x@example.com",
      }),
    );
    await assertFails(
      updateDoc(doc(db(DAVE), `users/${ALICE}`), { displayName: "pwned" }),
    );
  });

  it("unauthenticated cannot read", async () => {
    await assertFails(
      getDoc(doc(env.unauthenticatedContext().firestore(), `users/${ALICE}`)),
    );
  });
});
