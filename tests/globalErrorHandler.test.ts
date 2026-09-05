import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../src/errors/AppError.js";
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

    expect(res.json).toHaveBeenCalledWith({ error: "Not found" });
    expect(res.json).toHaveBeenCalledTimes(1);
  });

  it("falls back to 500 for a standard Error", () => {
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;
    const err = new Error("unexpected");

    globalErrorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });

  it("falls back to 500 for an unknown thrown value", () => {
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    globalErrorHandler("some string error", req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
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
});
