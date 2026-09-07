import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationMiddleware } from "../src/middlewares/validationMiddleware.js";

function createRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

describe("validationMiddleware", () => {
  it("calls next() with no error when the body is valid", () => {
    const req = { body: { name: "Ada", age: 30 } } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    validationMiddleware(schema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(req.validationErrorArr).toBeUndefined();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("calls next(error) and attaches formatted validationErrorArr when the body is invalid", () => {
    const req = { body: { name: 123, age: "not a number" } } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    validationMiddleware(schema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const calledWith = vi.mocked(next).mock.calls[0][0];
    expect(calledWith).toBeInstanceOf(Error);

    expect(req.validationErrorArr).toBeDefined();
    expect(req.validationErrorArr).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "name" }),
        expect.objectContaining({ field: "age" }),
      ]),
    );
    req.validationErrorArr!.forEach((entry) => {
      expect(entry).toHaveProperty("field");
      expect(entry).toHaveProperty("message");
    });
  });

  it("does not call next() with zero arguments when validation fails", () => {
    const req = { body: {} } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    validationMiddleware(schema)(req, res, next);

    expect(next).not.toHaveBeenCalledWith();
  });

  it("treats a missing body as invalid against a required-field schema", () => {
    const req = { body: undefined } as unknown as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    validationMiddleware(schema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(vi.mocked(next).mock.calls[0][0]).toBeInstanceOf(Error);
    expect(req.validationErrorArr).toBeDefined();
    expect(req.validationErrorArr!.length).toBeGreaterThan(0);
  });

  it("does not call res.status/res.json directly (delegates to next)", () => {
    const req = { body: {} } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    validationMiddleware(schema)(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("forwards a raw ZodError via next(error.issues) if safeParse itself throws a ZodError", () => {
    const zodError = new z.ZodError([
      {
        code: "custom",
        path: ["name"],
        message: "custom failure",
      },
    ]);
    const throwingSchema = {
      safeParse: () => {
        throw zodError;
      },
    } as unknown as z.ZodType;

    const req = { body: {} } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    validationMiddleware(throwingSchema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(zodError.issues);
    expect(req.validationErrorArr).toBe(zodError.issues as any);
  });

  it("forwards a non-Zod error via next(error) if safeParse throws unexpectedly", () => {
    const boom = new Error("boom");
    const throwingSchema = {
      safeParse: () => {
        throw boom;
      },
    } as unknown as z.ZodType;

    const req = { body: {} } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    validationMiddleware(throwingSchema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(boom);
  });
});
