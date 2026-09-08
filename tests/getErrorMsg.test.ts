import { describe, expect, it } from "vitest";
import { getErrorMsg } from "../src/utils/getErrorMsg.js";

describe("getErrorMsg", () => {
  it("builds a singular message with 'was'", () => {
    expect(getErrorMsg("User", "was", "not found")).toBe(
      "User was not found",
    );
  });

  it("builds a plural message with 'were'", () => {
    expect(getErrorMsg("Users", "were", "not found")).toBe(
      "Users were not found",
    );
  });

  it("is generic over arbitrary resource/verb/message combinations", () => {
    expect(getErrorMsg("Course", "was", "not created")).toBe(
      "Course was not created",
    );
  });

  it("does not perform any automatic pluralization of the resource", () => {
    expect(getErrorMsg("Category", "was", "invalid")).toBe(
      "Category was invalid",
    );
    expect(getErrorMsg("Categories", "were", "invalid")).toBe(
      "Categories were invalid",
    );
  });

  it("passes the caller-supplied message through verbatim", () => {
    expect(getErrorMsg("Token", "was", "expired 5 minutes ago")).toBe(
      "Token was expired 5 minutes ago",
    );
  });
});
