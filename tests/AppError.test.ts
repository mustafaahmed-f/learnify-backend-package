import { describe, expect, it } from "vitest";
import { AppError } from "../src/errors/AppError.js";

describe("AppError", () => {
  it("sets the message correctly", () => {
    const err = new AppError("Not found", 404);
    expect(err.message).toBe("Not found");
  });

  it("sets the statusCode correctly", () => {
    const err = new AppError("Not found", 404);
    expect(err.statusCode).toBe(404);
  });

  it("is an instanceof Error", () => {
    const err = new AppError("Bad request", 400);
    expect(err instanceof Error).toBe(true);
  });

  it("is an instanceof AppError", () => {
    const err = new AppError("Bad request", 400);
    expect(err instanceof AppError).toBe(true);
  });

  it("preserves prototype chain across catch boundaries", () => {
    function throwIt() {
      throw new AppError("Forbidden", 403);
    }

    try {
      throwIt();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(403);
    }
  });
});
