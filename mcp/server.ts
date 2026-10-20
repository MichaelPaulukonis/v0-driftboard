import { execFileSync } from "node:child_process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { signInWithEmailAndPassword, type Auth } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createFirebaseReader } from "./firebase-reader";
import { registerTools } from "./tools";

// stdout carries the MCP protocol - log to stderr only.
const log = (...args: unknown[]) => console.error("[driftboard-mcp]", ...args);

const KEYCHAIN_SERVICE = "driftboard-mcp";

function getPassword(email: string): string {
  if (process.env.DRIFTBOARD_PASSWORD) return process.env.DRIFTBOARD_PASSWORD;
  try {
    return execFileSync(
      "security",
      ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-a", email, "-w"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
  } catch {
    throw new Error(
      `No password: set DRIFTBOARD_PASSWORD, or add one to the Keychain with\n` +
        `  security add-generic-password -s ${KEYCHAIN_SERVICE} -a ${email} -w`,
    );
  }
}

async function main() {
  const email = process.env.DRIFTBOARD_EMAIL;
  if (!email) throw new Error("DRIFTBOARD_EMAIL is not set");

  // lib/firebase's export is a union with its NODE_ENV=test mock; this never runs under test.
  const { user } = await signInWithEmailAndPassword(
    auth as Auth,
    email,
    getPassword(email),
  );
  log(`signed in as ${user.email}`);

  const server = new McpServer({ name: "driftboard", version: "0.1.0" });
  registerTools(server, createFirebaseReader(user.uid));
  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  log(error instanceof Error ? error.message : error);
  process.exit(1);
});
