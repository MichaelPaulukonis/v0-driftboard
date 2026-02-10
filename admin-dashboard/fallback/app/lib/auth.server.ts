// Authentication middleware stub for Remix fallback
// Future: implement Firebase ID token verification when AUTH_TYPE=firebase-auth

export async function requireAdmin(request: Request) {
  const authType = process.env.AUTH_TYPE ?? "token";

  if (authType === "token") {
    const token =
      request.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const expected = process.env.ADMIN_TOKEN ?? "";

    if (!expected || token !== expected) {
      throw new Response("Unauthorized", { status: 401 });
    }
  } else if (authType === "firebase-auth") {
    // TODO: Implement Firebase ID token verification
    // Example:
    // const idToken = request.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    // const decoded = await admin.auth().verifyIdToken(idToken);
    // if (!decoded || !decoded.email) throw new Response('Unauthorized', { status: 401 });
  }

  return true;
}
