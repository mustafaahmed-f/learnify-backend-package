import { describe, expect, it } from "vitest";
import { handlePrismaError } from "../src/errors/handlePrismaError.js";

describe("handlePrismaError", () => {
  it("maps P2002 to 409 with a duplicate value message", () => {
    const result = handlePrismaError({
      code: "P2002",
      message: "Unique constraint failed",
      meta: { target: "email" },
    });

    expect(result.status).toBe(409);
    expect(result.message).toBe("Duplicate value for email");
  });

  it("falls back to a generic field name for P2002 when meta.target is missing", () => {
    const result = handlePrismaError({ code: "P2002" });

    expect(result.status).toBe(409);
    expect(result.message).toBe("Duplicate value for field");
  });

  it("maps P2003 to 400 with an invalid foreign key message", () => {
    const result = handlePrismaError({ code: "P2003" });

    expect(result.status).toBe(400);
    expect(result.message).toBe("Invalid foreign key reference");
  });

  it("maps P2025 to 404 with a record not found message", () => {
    const result = handlePrismaError({ code: "P2025" });

    expect(result.status).toBe(404);
    expect(result.message).toBe("Record not found");
  });

  it("maps P2014 to 400 with an invalid relation message", () => {
    const result = handlePrismaError({ code: "P2014" });

    expect(result.status).toBe(400);
    expect(result.message).toBe("Invalid relation reference");
  });

  it("maps P2000 to 400 with a value-too-long message", () => {
    const result = handlePrismaError({
      code: "P2000",
      meta: { column_name: "title" },
    });

    expect(result.status).toBe(400);
    expect(result.message).toBe("Value too long for title");
  });

  it("falls back to a generic column name for P2000 when meta.column_name is missing", () => {
    const result = handlePrismaError({ code: "P2000" });

    expect(result.status).toBe(400);
    expect(result.message).toBe("Value too long for column");
  });

  it("maps an unrecognized Prisma error code to 500", () => {
    const result = handlePrismaError({
      code: "P9999",
      message: "Something else went wrong",
    });

    expect(result.status).toBe(500);
    expect(result.message).toBe(
      "Database error: Something else went wrong",
    );
  });

  it("maps an unrecognized Prisma error code with no message to 500 with a fallback message", () => {
    const result = handlePrismaError({ code: "P9999" });

    expect(result.status).toBe(500);
    expect(result.message).toBe("Database error: Unknown database error");
  });

  it("maps a Prisma validation error (by name) to 400", () => {
    const err = new Error("Expected string, got number");
    err.name = "PrismaClientValidationError";

    const result = handlePrismaError(err);

    expect(result.status).toBe(400);
    expect(result.message).toBe(
      "Invalid input data: Expected string, got number",
    );
  });

  it("maps a Prisma validation error (plain object, no code) to 400", () => {
    const result = handlePrismaError({
      name: "PrismaClientValidationError",
    });

    expect(result.status).toBe(400);
    expect(result.message).toBe("Invalid input data: [object Object]");
  });

  it("maps a completely unknown Error to 500", () => {
    const result = handlePrismaError(new Error("boom"));

    expect(result.status).toBe(500);
    expect(result.message).toBe("Unknown server error: boom");
  });

  it("does not misidentify a Prisma-shaped error whose code fails the P#### pattern", () => {
    const result = handlePrismaError({ code: "NOT_A_PRISMA_CODE" });

    expect(result.status).toBe(500);
  });

  it("handles null input safely", () => {
    const result = handlePrismaError(null);

    expect(result.status).toBe(500);
    expect(result.message).toBe("Unknown server error: null");
  });

  it("handles undefined input safely", () => {
    const result = handlePrismaError(undefined);

    expect(result.status).toBe(500);
    expect(result.message).toBe("Unknown server error: undefined");
  });

  it("handles a non-object primitive input safely", () => {
    const result = handlePrismaError("just a string");

    expect(result.status).toBe(500);
    expect(result.message).toBe("Unknown server error: just a string");
  });
});
