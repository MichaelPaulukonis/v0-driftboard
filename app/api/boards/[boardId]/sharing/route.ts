import { type NextRequest, NextResponse } from "next/server";
import { db, auth } from "@/lib/firebase-admin";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ boardId: string }> },
) {
  const params = await props.params;
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];

    // Check if token is present
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized - No token" },
        { status: 401 },
      );
    }

    let userId: string;
    try {
      const decodedToken = await auth.verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (e) {
      console.error("Token verification failed", e);
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 },
      );
    }

    const boardId = params.boardId;

    // Check board existence
    const boardDoc = await db.collection("boards_current").doc(boardId).get();
    if (!boardDoc.exists) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const boardData = boardDoc.data();

    // Check access: Owner or Member
    // Membership ID format: boardId_userId
    const membershipDoc = await db
      .collection("board_memberships")
      .doc(`${boardId}_${userId}`)
      .get();
    const isOwner =
      boardData?.ownerId === userId || boardData?.userId === userId;
    const isMember = membershipDoc.exists;

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all memberships for the board
    const membershipsSnapshot = await db
      .collection("board_memberships")
      .where("boardId", "==", boardId)
      .get();

    const members = await Promise.all(
      membershipsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const userDoc = await db.collection("users").doc(data.userId).get();
        const userData = userDoc.data();

        return {
          userId: data.userId,
          role: data.role,
          addedAt: data.addedAt?.toDate().toISOString(),
          displayName:
            userData?.displayName ||
            userData?.email?.split("@")[0] ||
            "Unknown",
          email: userData?.email,
          photoURL: userData?.photoURL || null,
        };
      }),
    );

    // Add owner if not in memberships (legacy or implicit owner)
    const ownerId = boardData?.ownerId || boardData?.userId;
    // Check if owner is already in members list
    const ownerInMembers = members.find((m) => m.userId === ownerId);

    if (!ownerInMembers && ownerId) {
      const ownerUserDoc = await db.collection("users").doc(ownerId).get();
      const ownerUserData = ownerUserDoc.data();
      members.push({
        userId: ownerId,
        role: "owner",
        addedAt: boardData?.createdAt?.toDate().toISOString(),
        displayName:
          ownerUserData?.displayName ||
          ownerUserData?.email?.split("@")[0] ||
          "Owner",
        email: ownerUserData?.email,
        photoURL: ownerUserData?.photoURL || null,
      });
    }

    return NextResponse.json({
      isShared: members.length > 1,
      members,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
