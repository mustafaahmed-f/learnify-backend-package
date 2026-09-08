import { describe, expect, it } from "vitest";
import {
  requiredFieldMsg,
  minLengthMsg,
  maxLengthMsg,
  invalidSchemaFormatMsg,
  invalidEmailMsg,
  invalidPasswordMsg,
  invalidNumberMsg,
  positiveNumberMsg,
  invalidUrlMsg,
  invalidDateFormatMsg,
  futureDateRequiredMsg,
} from "../src/utils/validationErrorMessages.js";

describe("validationErrorMessages", () => {
  it("requiredFieldMsg", () => {
    expect(requiredFieldMsg("Email")).toBe("Email is required");
  });

  it("minLengthMsg", () => {
    expect(minLengthMsg(8)).toBe("Minimum length is 8");
  });

  it("maxLengthMsg", () => {
    expect(maxLengthMsg(50)).toBe("Maximum length is 50");
  });

  it("invalidSchemaFormatMsg", () => {
    expect(invalidSchemaFormatMsg("Username", "letters only")).toBe(
      "Username should match format: letters only",
    );
  });

  it("invalidEmailMsg", () => {
    expect(invalidEmailMsg()).toBe("Invalid email format");
  });

  it("invalidPasswordMsg", () => {
    expect(invalidPasswordMsg()).toBe(
      "Password should be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    );
  });

  it("invalidDateFormatMsg", () => {
    expect(invalidDateFormatMsg()).toBe("Invalid date format");
  });

  it("futureDateRequiredMsg", () => {
    expect(futureDateRequiredMsg()).toBe("Date must be in the future");
  });

  it("invalidNumberMsg", () => {
    expect(invalidNumberMsg("price")).toBe(
      "Invalid number format for field: price",
    );
  });

  it("positiveNumberMsg", () => {
    expect(positiveNumberMsg("price")).toBe("price should be positive");
  });

  it("invalidUrlMsg", () => {
    expect(invalidUrlMsg()).toBe("Invalid URL");
  });
});
