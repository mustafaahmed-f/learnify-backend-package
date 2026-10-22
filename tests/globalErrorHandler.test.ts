import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../src/errors/AppError.js";
import { ValidationError } from "../src/errors/validationError.js";
import { globalErrorHandler } from "../src/errors/globalErrorHandler.js";

function createRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("globalErrorHandler", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("produces the AppError's status code", () => {
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;
    const err = new AppError("Not found", 404);

    globalErrorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.status).toHaveBeenCalledTimes(1);
  });

  it("produces the AppError's message in the response body", () => {
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;
    const err = new AppError("Not found", 404);

    globalErrorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Not found",
    });
    expect(res.json).toHaveBeenCalledTimes(1);
  });

  it("returns 400 with the validation errors for a ValidationError", () => {
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;
    const err = new ValidationError("Validation failed", [
      { location: "body", field: "role", message: "Invalid role" },
      { location: "params", field: "userId", message: "Invalid user ID" },
    ]);

    globalErrorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Validation failed",
      errors: [
        { location: "body", field: "role", message: "Invalid role" },
        { location: "params", field: "userId", message: "Invalid user ID" },
      ],
    });
    expect(res.json).toHaveBeenCalledTimes(1);
  });

  it("returns an empty errors array for a ValidationError with no items", () => {
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;
    const err = new ValidationError("Validation failed", []);

    globalErrorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Validation failed",
      errors: [],
    });
  });

  it("treats a ValidationError as a ValidationError rather than a generic AppError", () => {
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;
    const err = new ValidationError("Validation failed", [
      { location: "query", field: "page", message: "Invalid number" },
    ]);

    globalErrorHandler(err, req, res, next);

    const jsonArg = vi.mocked(res.json).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(jsonArg).toHaveProperty("errors");
  });

  it("falls back to 500 for a standard Error", () => {
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;
    const err = new Error("unexpected");

    globalErrorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Internal server error",
    });
  });

  it("falls back to 500 for an unknown thrown value", () => {
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    globalErrorHandler("some string error", req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Internal server error",
    });
  });

  it("does not leak the underlying error's message in a 500 response", () => {
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;
    const err = new Error("db connection string: postgres://secret@host/db");

    globalErrorHandler(err, req, res, next);

    const jsonArg = vi.mocked(res.json).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(JSON.stringify(jsonArg)).not.toContain("postgres://secret");
    expect(jsonArg).toEqual({
      success: false,
      error: "Internal server error",
    });
  });

  it("does not leak the error's stack trace in a 500 response", () => {
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;
    const err = new Error("boom");

    globalErrorHandler(err, req, res, next);

    const jsonArg = vi.mocked(res.json).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(jsonArg).not.toHaveProperty("stack");
  });

  it("does not send a double response", () => {
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;
    const err = new AppError("Forbidden", 403);

    globalErrorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledTimes(1);
  });

  it("logs the original error with console.error", () => {
    const err = new Error("db down");

    globalErrorHandler(
      err,
      {} as Request,
      createRes(),
      vi.fn() as NextFunction,
    );

    expect(console.error).toHaveBeenCalledWith(err);
  });

  it("does not call next(), since it always ends the response", () => {
    const next = vi.fn() as NextFunction;

    globalErrorHandler(
      new AppError("Conflict", 409),
      {} as Request,
      createRes(),
      next,
    );
    globalErrorHandler(new Error("boom"), {} as Request, createRes(), next);

    expect(next).not.toHaveBeenCalled();
  });

  it("uses the status code of a custom AppError subclass", () => {
    class ConflictError extends AppError {
      constructor(message: string) {
        super(message, 409);
      }
    }
    const res = createRes();

    globalErrorHandler(
      new ConflictError("Email already used"),
      {} as Request,
      res,
      vi.fn() as NextFunction,
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Email already used",
    });
  });

  it("treats a plain { status, message } object as an unknown error (500)", () => {
    const res = createRes();

    globalErrorHandler(
      { status: 404, message: "Record not found" },
      {} as Request,
      res,
      vi.fn() as NextFunction,
    );

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
