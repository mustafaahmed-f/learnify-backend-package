import { describe, expect, it } from "vitest";
import { checkUnique } from "../src/utils/checkUnique.js";

describe("checkUnique", () => {
  it("returns true for an array of unique values", () => {
    expect(checkUnique(["ADMIN", "INSTRUCTOR", "STUDENT"])).toBe(true);
  });

  it("returns false when the array contains a duplicate", () => {
    expect(checkUnique(["ADMIN", "ADMIN"])).toBe(false);
  });

  it("returns false when the array contains multiple duplicates", () => {
    expect(checkUnique(["ADMIN", "STUDENT", "ADMIN", "STUDENT"])).toBe(false);
  });

  it("returns true for an empty array", () => {
    expect(checkUnique([])).toBe(true);
  });

  it("returns true for a single-element array", () => {
    expect(checkUnique(["ADMIN"])).toBe(true);
  });

  it("is case-sensitive", () => {
    expect(checkUnique(["admin", "ADMIN"])).toBe(true);
  });
});
