import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationMiddleware } from "../src/middlewares/validationMiddleware.js";
import { ValidationError } from "../src/errors/validationError.js";

function createRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

const bodySchema = z.object({
  name: z.string(),
  age: z.number(),
});

const paramsSchema = z.object({
  id: z.string(),
});

const querySchema = z.object({
  page: z.coerce.number(),
});

describe("validationMiddleware", () => {
  describe("body validation", () => {
    it("calls next() with no error when the body is valid", () => {
      const req = { body: { name: "Ada", age: 30 } } as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      validationMiddleware({ body: bodySchema })(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("calls next(ValidationError) when the body is invalid", () => {
      const req = { body: { name: 123, age: "not a number" } } as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      validationMiddleware({ body: bodySchema })(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = vi.mocked(next).mock.calls[0][0];
      expect(err).toBeInstanceOf(ValidationError);
    });

    it("treats a missing body as invalid against a required-field schema", () => {
      const req = { body: undefined } as unknown as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      validationMiddleware({ body: bodySchema })(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(vi.mocked(next).mock.calls[0][0]).toBeInstanceOf(ValidationError);
    });
  });

  describe("params validation", () => {
    it("calls next() with no error when params are valid", () => {
      const req = { params: { id: "abc" } } as unknown as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      validationMiddleware({ params: paramsSchema })(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it("calls next(ValidationError) when params are invalid", () => {
      const req = { params: { id: 123 } } as unknown as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      validationMiddleware({ params: paramsSchema })(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = vi.mocked(next).mock.calls[0][0] as unknown as ValidationError;
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.errors[0].location).toBe("params");
    });
  });

  describe("query validation", () => {
    it("calls next() with no error when query is valid", () => {
      const req = { query: { page: "2" } } as unknown as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      validationMiddleware({ query: querySchema })(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it("calls next(ValidationError) when query is invalid", () => {
      const req = { query: { page: "not-a-number" } } as unknown as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      validationMiddleware({ query: querySchema })(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = vi.mocked(next).mock.calls[0][0] as unknown as ValidationError;
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.errors[0].location).toBe("query");
    });

    it("writes the coerced value back to req.query so controllers see the parsed value", () => {
      const req = { query: { page: "2" } } as unknown as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      validationMiddleware({ query: querySchema })(req, res, next);

      expect(req.query).toEqual({ page: 2 });
    });
  });

  describe("combined locations", () => {
    it("calls next() when body, params, and query are all valid", () => {
      const req = {
        body: { name: "Ada", age: 30 },
        params: { id: "abc" },
        query: { page: "1" },
      } as unknown as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      validationMiddleware({
        body: bodySchema,
        params: paramsSchema,
        query: querySchema,
      })(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it("collects errors from multiple invalid locations in a single ValidationError", () => {
      const req = {
        body: { name: 123, age: "nope" },
        params: { id: 123 },
        query: { page: "1" },
      } as unknown as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      validationMiddleware({
        body: bodySchema,
        params: paramsSchema,
        query: querySchema,
      })(req, res, next);

      const err = vi.mocked(next).mock.calls[0][0] as unknown as ValidationError;
      expect(err).toBeInstanceOf(ValidationError);

      const locations = err.errors.map((e) => e.location);
      expect(locations).toContain("body");
      expect(locations).toContain("params");
    });

    it("collects multiple errors within the same location", () => {
      const req = { body: { name: 123, age: "nope" } } as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      validationMiddleware({ body: bodySchema })(req, res, next);

      const err = vi.mocked(next).mock.calls[0][0] as unknown as ValidationError;
      expect(err.errors.length).toBeGreaterThanOrEqual(2);
      expect(err.errors.every((e) => e.location === "body")).toBe(true);
    });

    it("reports correct field paths for nested fields", () => {
      const nestedSchema = z.object({
        address: z.object({
          city: z.string(),
        }),
      });
      const req = { body: { address: { city: 123 } } } as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      validationMiddleware({ body: nestedSchema })(req, res, next);

      const err = vi.mocked(next).mock.calls[0][0] as unknown as ValidationError;
      expect(err.errors[0].field).toBe("address.city");
    });
  });

  describe("optional/no schemas", () => {
    it("calls next() when no schemas are provided at all", () => {
      const req = { body: { anything: true } } as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      validationMiddleware({})(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it("skips a location whose schema is omitted, even with bad data present", () => {
      const req = {
        body: { name: "Ada", age: 30 },
        query: { page: "not-a-number" },
      } as unknown as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      validationMiddleware({ body: bodySchema })(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });
  });

  it("does not call res.status/res.json directly (delegates to next)", () => {
    const req = { body: {} } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    validationMiddleware({ body: bodySchema })(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("produces a ValidationError with a 400 status code and a validation-failed message", () => {
    const req = { body: {} } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    validationMiddleware({ body: bodySchema })(req, res, next);

    const err = vi.mocked(next).mock.calls[0][0] as unknown as ValidationError;
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Validation failed");
  });
});
