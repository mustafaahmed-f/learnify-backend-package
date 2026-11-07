import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

vi.mock("@clerk/express", () => ({
  getAuth: vi.fn(),
  clerkClient: { users: { getUser: vi.fn() } },
}));

import { clerkClient, getAuth } from "@clerk/express";
import { AppError } from "../src/errors/AppError.js";
import { checkAuth } from "../src/middlewares/checkAuth.js";
import { clearBanStatusCache } from "../src/utils/isUserBanned.js";

function createRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function mockAuthenticated(userId = "user_123") {
  vi.mocked(getAuth).mockReturnValue({
    isAuthenticated: true,
    userId,
    sessionClaims: { userMetadata: { role: "STUDENT", dbUserId: "db_1" } },
  } as any);
}

function mockBanStatus(banned: boolean) {
  vi.mocked(clerkClient.users.getUser).mockResolvedValue({ banned } as any);
}

describe("checkAuth", () => {
  beforeEach(() => {
    vi.mocked(getAuth).mockReset();
    vi.mocked(clerkClient.users.getUser).mockReset();
    mockBanStatus(false);
    clearBanStatusCache();
  });

  describe("blocked users", () => {
    it("returns 403 for a banned user and does not reach the route handler", async () => {
      mockAuthenticated();
      mockBanStatus(true);

      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      await checkAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Your account has been blocked.",
      });
      expect(next).not.toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it("looks up the authenticated user's id", async () => {
      mockAuthenticated("user_789");

      await checkAuth({} as Request, createRes(), vi.fn() as NextFunction);

      expect(clerkClient.users.getUser).toHaveBeenCalledWith("user_789");
    });

    it("does not call Clerk for unauthenticated requests", async () => {
      vi.mocked(getAuth).mockReturnValue({
        isAuthenticated: false,
        userId: null,
        sessionClaims: undefined,
      } as any);

      await checkAuth({} as Request, createRes(), vi.fn() as NextFunction);

      expect(clerkClient.users.getUser).not.toHaveBeenCalled();
    });

    it("fails closed with a generic 503 when the Clerk lookup fails", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockAuthenticated();
      vi.mocked(clerkClient.users.getUser).mockRejectedValue(
        new Error("clerk internal: secret key sk_test_x rejected"),
      );

      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      await checkAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = vi.mocked(next).mock.calls[0][0] as unknown as AppError;
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(503);
      expect(error.message).not.toContain("clerk internal");
      expect(req.user).toBeUndefined();
      expect(res.status).not.toHaveBeenCalled();

      consoleError.mockRestore();
    });

    it("does not cache a failed lookup", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockAuthenticated();
      vi.mocked(clerkClient.users.getUser).mockRejectedValueOnce(
        new Error("clerk down"),
      );

      await checkAuth({} as Request, createRes(), vi.fn() as NextFunction);

      const next = vi.fn() as NextFunction;
      await checkAuth({} as Request, createRes(), next);

      expect(clerkClient.users.getUser).toHaveBeenCalledTimes(2);
      expect(next).toHaveBeenCalledWith();

      consoleError.mockRestore();
    });
  });

  describe("ban status caching", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("reuses the result for repeated requests inside the TTL", async () => {
      mockAuthenticated();

      await checkAuth({} as Request, createRes(), vi.fn() as NextFunction);
      vi.advanceTimersByTime(14_000);
      await checkAuth({} as Request, createRes(), vi.fn() as NextFunction);

      expect(clerkClient.users.getUser).toHaveBeenCalledTimes(1);
    });

    it("shares one Clerk call between concurrent requests", async () => {
      mockAuthenticated();

      await Promise.all([
        checkAuth({} as Request, createRes(), vi.fn() as NextFunction),
        checkAuth({} as Request, createRes(), vi.fn() as NextFunction),
        checkAuth({} as Request, createRes(), vi.fn() as NextFunction),
      ]);

      expect(clerkClient.users.getUser).toHaveBeenCalledTimes(1);
    });

    it("keeps a separate entry per user", async () => {
      mockAuthenticated("user_a");
      await checkAuth({} as Request, createRes(), vi.fn() as NextFunction);

      mockAuthenticated("user_b");
      await checkAuth({} as Request, createRes(), vi.fn() as NextFunction);

      expect(clerkClient.users.getUser).toHaveBeenCalledTimes(2);
    });

    it("picks up a ban once the cached result expires", async () => {
      mockAuthenticated();
      await checkAuth({} as Request, createRes(), vi.fn() as NextFunction);

      mockBanStatus(true);
      vi.advanceTimersByTime(15_000);

      const res = createRes();
      const next = vi.fn() as NextFunction;
      await checkAuth({} as Request, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("picks up an unban once the cached result expires", async () => {
      mockAuthenticated();
      mockBanStatus(true);
      await checkAuth({} as Request, createRes(), vi.fn() as NextFunction);

      mockBanStatus(false);
      vi.advanceTimersByTime(15_000);

      const next = vi.fn() as NextFunction;
      await checkAuth({} as Request, createRes(), next);

      expect(next).toHaveBeenCalledWith();
    });
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

  it("returns the same 401 for an invalid or expired token, which Clerk reports as signed out", async () => {
    vi.mocked(getAuth).mockReturnValue({
      isAuthenticated: false,
      userId: null,
      sessionClaims: null,
      tokenType: "session_token",
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
    expect(clerkClient.users.getUser).not.toHaveBeenCalled();
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
