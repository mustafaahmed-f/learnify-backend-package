import { describe, expect, it } from "vitest";
import { AppError } from "../src/errors/AppError.js";
import { ValidationError } from "../src/errors/validationError.js";
import type { ValidationErrorItem } from "../src/errors/validationError.js";

describe("ValidationError", () => {
  it("extends AppError", () => {
    const err = new ValidationError("Validation failed", []);
    expect(err).toBeInstanceOf(AppError);
  });

  it("is an instanceof Error", () => {
    const err = new ValidationError("Validation failed", []);
    expect(err).toBeInstanceOf(Error);
  });

  it("sets statusCode to 400", () => {
    const err = new ValidationError("Validation failed", []);
    expect(err.statusCode).toBe(400);
  });

  it("sets the message correctly", () => {
    const err = new ValidationError("Validation failed", []);
    expect(err.message).toBe("Validation failed");
  });

  it("preserves the validation errors array", () => {
    const errors: ValidationErrorItem[] = [
      { location: "body", field: "role", message: "Invalid role" },
      { location: "params", field: "userId", message: "Invalid user ID" },
    ];

    const err = new ValidationError("Validation failed", errors);

    expect(err.errors).toEqual(errors);
    expect(err.errors).toHaveLength(2);
  });

  it("preserves an empty errors array as-is", () => {
    const err = new ValidationError("Validation failed", []);
    expect(err.errors).toEqual([]);
  });

  it("keeps the expected shape for each error item (location, field, message)", () => {
    const err = new ValidationError("Validation failed", [
      { location: "query", field: "page", message: "Invalid number" },
    ]);

    expect(err.errors[0]).toEqual({
      location: "query",
      field: "page",
      message: "Invalid number",
    });
  });

  it("preserves the prototype chain across catch boundaries", () => {
    function throwIt() {
      throw new ValidationError("Validation failed", [
        { location: "body", field: "name", message: "Required" },
      ]);
    }

    try {
      throwIt();
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err).toBeInstanceOf(AppError);
      expect((err as ValidationError).errors).toHaveLength(1);
    }
  });
});
