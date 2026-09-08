import { describe, expect, it } from "vitest";
import { getSuccessMsg } from "../src/utils/getSuccessMsg.js";

describe("getSuccessMsg", () => {
  it("builds a singular message with 'has'", () => {
    expect(getSuccessMsg("User", "has", "created")).toBe(
      "User has been created successfully",
    );
  });

  it("builds a plural message with 'have'", () => {
    expect(getSuccessMsg("Users", "have", "created")).toBe(
      "Users have been created successfully",
    );
  });

  it("is generic over arbitrary resource/action combinations", () => {
    expect(getSuccessMsg("Course", "has", "published")).toBe(
      "Course has been published successfully",
    );
  });

  it("does not perform any automatic pluralization of the resource", () => {
    expect(getSuccessMsg("Category", "has", "updated")).toBe(
      "Category has been updated successfully",
    );
    expect(getSuccessMsg("Categories", "have", "updated")).toBe(
      "Categories have been updated successfully",
    );
  });

  it("accepts an arbitrary action string without any predefined action list", () => {
    expect(getSuccessMsg("Enrollment", "has", "cancelled")).toBe(
      "Enrollment has been cancelled successfully",
    );
  });
});
