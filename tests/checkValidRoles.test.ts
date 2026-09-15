import { describe, expect, it } from "vitest";
import { checkValidRoles } from "../src/utils/checkValidRoles.js";

describe("checkValidRoles", () => {
  it("returns true when all roles are valid", () => {
    expect(checkValidRoles(["ADMIN", "INSTRUCTOR", "STUDENT"])).toBe(true);
  });

  it("returns true for a single valid role", () => {
    expect(checkValidRoles(["ADMIN"])).toBe(true);
  });

  it("returns false when one role is invalid", () => {
    expect(checkValidRoles(["ADMIN", "SUPERADMIN"])).toBe(false);
  });

  it("returns false when all roles are invalid", () => {
    expect(checkValidRoles(["SUPERADMIN", "GUEST"])).toBe(false);
  });

  it("returns true for an empty array", () => {
    expect(checkValidRoles([])).toBe(true);
  });

  it("is case-sensitive", () => {
    expect(checkValidRoles(["admin"])).toBe(false);
  });

  it("returns true even when the array has duplicate valid roles", () => {
    expect(checkValidRoles(["ADMIN", "ADMIN"])).toBe(true);
  });
});
