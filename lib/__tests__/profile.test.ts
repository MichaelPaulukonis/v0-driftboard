import { describe, it, expect } from "vitest";
import { getProfileName, MAX_PROFILE_NAME_LENGTH } from "../profile";

describe("getProfileName", () => {
  it("prefers the display name", () => {
    expect(getProfileName("Ada Lovelace", "ada@example.com")).toBe(
      "Ada Lovelace",
    );
  });

  it("falls back to the email prefix before the @", () => {
    expect(getProfileName(null, "ada.l@example.com")).toBe("ada.l");
    expect(getProfileName("  ", "ada@example.com")).toBe("ada");
  });

  it("falls back to 'User' with neither", () => {
    expect(getProfileName(undefined, undefined)).toBe("User");
    expect(getProfileName("", "@example.com")).toBe("User");
  });

  it("caps the length to what the rules allow", () => {
    expect(getProfileName("x".repeat(500)).length).toBe(
      MAX_PROFILE_NAME_LENGTH,
    );
  });
});
