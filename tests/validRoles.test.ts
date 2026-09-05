import { describe, expect, it } from "vitest";
import { validRoles } from "../src/constants/validRoles.js";
import type { Role } from "../src/constants/validRoles.js";

describe("validRoles", () => {
  it("contains exactly the expected roles", () => {
    expect(validRoles).toEqual(["STUDENT", "INSTRUCTOR", "ADMIN"]);
  });

  it("does not contain any unexpected role", () => {
    expect(validRoles.length).toBe(3);
    expect(validRoles).not.toContain("SUPERADMIN");
  });

  it("Role type accepts a valid role value", () => {
    const role: Role = "ADMIN";
    expect(validRoles).toContain(role);
  });
});
