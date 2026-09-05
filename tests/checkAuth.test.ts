import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

vi.mock("@clerk/express", () => ({
  getAuth: vi.fn(),
}));

import { getAuth } from "@clerk/express";
import { checkAuth } from "../src/middlewares/checkAuth.js";

function createRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("checkAuth", () => {
  beforeEach(() => {
    vi.mocked(getAuth).mockReset();
  });

  it("attaches req.user and calls next() when authenticated", async () => {
    vi.mocked(getAuth).mockReturnValue({
      isAuthenticated: true,
      userId: "user_123",
      sessionClaims: {
        userMetadata: { role: "STUDENT", dbUserId: "db_1" },
        email: "test@example.com",
        firstName: "Jane",
        lastName: "Doe",
        imageURL: "https://example.com/img.png",
      },
    } as any);

    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    await checkAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({
      clerkId: "user_123",
      email: "test@example.com",
      firstName: "Jane",
      lastName: "Doe",
      imageURL: "https://example.com/img.png",
      userMetadata: { role: "STUDENT", dbUserId: "db_1" },
    });
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 401 and does not call next() when not authenticated", async () => {
    vi.mocked(getAuth).mockReturnValue({
      isAuthenticated: false,
      userId: null,
      sessionClaims: undefined,
    } as any);

    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    await checkAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Unauthenticated. Login first please.",
    });
    expect(next).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it("returns 401 when isAuthenticated is true but userId is missing", async () => {
    vi.mocked(getAuth).mockReturnValue({
      isAuthenticated: true,
      userId: null,
      sessionClaims: undefined,
    } as any);

    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    await checkAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("still attaches req.user with undefined optional fields when sessionClaims is missing", async () => {
    vi.mocked(getAuth).mockReturnValue({
      isAuthenticated: true,
      userId: "user_456",
      sessionClaims: undefined,
    } as any);

    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    await checkAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({
      clerkId: "user_456",
      email: undefined,
      firstName: undefined,
      lastName: undefined,
      imageURL: undefined,
      userMetadata: undefined,
    });
  });

  it("calls next(error) and does not throw when getAuth throws", async () => {
    vi.mocked(getAuth).mockImplementation(() => {
      throw new Error("boom");
    });

    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    await checkAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});
