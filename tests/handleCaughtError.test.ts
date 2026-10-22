import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../src/errors/AppError.js";
import { ValidationError } from "../src/errors/validationError.js";
import { globalErrorHandler } from "../src/errors/globalErrorHandler.js";
import { handleCaughtError } from "../src/utils/handleCaughtError.js";

function createRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function prismaError(code: string, meta?: Record<string, unknown>) {
  return Object.assign(new Error(`Prisma error ${code}`), { code, meta });
}

function forwardedError(next: NextFunction) {
  return vi.mocked(next).mock.calls[0][0] as unknown;
}

describe("handleCaughtError", () => {
  describe("AppError passthrough", () => {
    it("forwards an AppError to next() unchanged", () => {
      const next = vi.fn() as NextFunction;
      const err = new AppError("Course not found", 404);

      handleCaughtError(err, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(forwardedError(next)).toBe(err);
    });

    it("forwards a ValidationError unchanged, keeping its field errors", () => {
      const next = vi.fn() as NextFunction;
      const err = new ValidationError("Validation failed", [
        { location: "body", field: "title", message: "Required" },
      ]);

      handleCaughtError(err, next);

      expect(forwardedError(next)).toBe(err);
    });

    it("forwards an AppError even if it also carries a Prisma-like code", () => {
      const next = vi.fn() as NextFunction;
      const err = Object.assign(new AppError("Custom", 418), { code: "P2025" });

      handleCaughtError(err, next);

      expect(forwardedError(next)).toBe(err);
    });
  });

  describe("Prisma client errors", () => {
    it.each([
      ["P2002", { target: ["email"] }, 409, "Duplicate value for email"],
      ["P2003", undefined, 400, "Invalid foreign key reference"],
      ["P2014", undefined, 400, "Invalid relation reference"],
      ["P2025", undefined, 404, "Record not found"],
      ["P2000", { column_name: "title" }, 400, "Value too long for title"],
    ])(
      "converts %s into an AppError with the mapped status",
      (code, meta, status, message) => {
        const next = vi.fn() as NextFunction;

        handleCaughtError(prismaError(code, meta), next);

        expect(next).toHaveBeenCalledTimes(1);
        const err = forwardedError(next) as AppError;
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(status);
        expect(err.message).toBe(message);
      },
    );

    it("converts a PrismaClientValidationError into a 400 AppError", () => {
      const next = vi.fn() as NextFunction;
      const raw = new Error("Argument `title` is missing.");
      raw.name = "PrismaClientValidationError";

      handleCaughtError(raw, next);

      const err = forwardedError(next) as AppError;
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe(
        "Invalid input data: Argument `title` is missing.",
      );
    });
  });

  describe("server errors", () => {
    it("forwards an unmapped Prisma code as the original error", () => {
      const next = vi.fn() as NextFunction;
      const raw = prismaError("P1001");

      handleCaughtError(raw, next);

      expect(forwardedError(next)).toBe(raw);
      expect(forwardedError(next)).not.toBeInstanceOf(AppError);
    });

    it("forwards a non-Prisma Error as the original error", () => {
      const next = vi.fn() as NextFunction;
      const raw = new TypeError("Cannot read properties of undefined");

      handleCaughtError(raw, next);

      expect(forwardedError(next)).toBe(raw);
    });

    it.each([null, undefined, "boom", 42])(
      "forwards a non-error thrown value (%s) as-is",
      (value) => {
        const next = vi.fn() as NextFunction;

        handleCaughtError(value, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(forwardedError(next)).toBe(value);
      },
    );
  });

  describe("with globalErrorHandler", () => {
    beforeEach(() => {
      vi.spyOn(console, "error").mockImplementation(() => {});
    });

    function respond(error: unknown) {
      const res = createRes();
      handleCaughtError(error, (forwarded?: unknown) =>
        globalErrorHandler(
          forwarded,
          {} as Request,
          res,
          vi.fn() as NextFunction,
        ),
      );
      return res;
    }

    it("responds 404 for a Prisma record-not-found error", () => {
      const res = respond(prismaError("P2025"));

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Record not found",
      });
    });

    it("responds 409 for a Prisma unique-constraint error", () => {
      const res = respond(prismaError("P2002", { target: ["email"] }));

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Duplicate value for email",
      });
    });

    it("responds with a generic 500 that does not leak internal messages", () => {
      const res = respond(new Error("connect ECONNREFUSED 10.0.0.5:5432"));

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Internal server error",
      });
    });
  });
});
