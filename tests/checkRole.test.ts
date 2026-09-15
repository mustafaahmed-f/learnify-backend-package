import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

vi.mock("@clerk/express", () => ({
  getAuth: vi.fn(),
}));

import { getAuth } from "@clerk/express";
import { checkRole } from "../src/middlewares/checkRole.js";

function createRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function mockUserRoles(roles: string[] | undefined) {
  vi.mocked(getAuth).mockReturnValue({
    sessionClaims: roles
      ? { userMetadata: { roles, dbUserId: "db_1" } }
      : undefined,
  } as any);
}

describe("checkRole", () => {
  beforeEach(() => {
    vi.mocked(getAuth).mockReset();
  });

  describe("mode: Any (default)", () => {
    it("authorizes when the user has one of the allowed roles", () => {
      mockUserRoles(["ADMIN"]);
      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      checkRole(["ADMIN"])(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("forbids when the user has none of the allowed roles", () => {
      mockUserRoles(["STUDENT"]);
      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      checkRole(["ADMIN"])(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
      expect(next).not.toHaveBeenCalled();
    });

    it("authorizes when one of multiple allowed roles matches", () => {
      mockUserRoles(["INSTRUCTOR"]);
      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      checkRole(["ADMIN", "INSTRUCTOR"], { mode: "Any" })(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it("authorizes when the user has extra roles beyond the match", () => {
      mockUserRoles(["STUDENT", "INSTRUCTOR"]);
      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      checkRole(["INSTRUCTOR"], { mode: "Any" })(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("mode: All", () => {
    it("authorizes when the user has all required roles", () => {
      mockUserRoles(["ADMIN", "INSTRUCTOR"]);
      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      checkRole(["ADMIN", "INSTRUCTOR"], { mode: "All" })(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("forbids when one required role is missing", () => {
      mockUserRoles(["ADMIN"]);
      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      checkRole(["ADMIN", "INSTRUCTOR"], { mode: "All" })(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
      expect(next).not.toHaveBeenCalled();
    });

    it("authorizes when the user has extra roles beyond the required set", () => {
      mockUserRoles(["ADMIN", "INSTRUCTOR", "STUDENT"]);
      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      checkRole(["ADMIN", "INSTRUCTOR"], { mode: "All" })(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("mode: Exact", () => {
    it("authorizes when the user's roles exactly match the allowed roles", () => {
      mockUserRoles(["ADMIN", "INSTRUCTOR"]);
      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      checkRole(["ADMIN", "INSTRUCTOR"], { mode: "Exact" })(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("forbids when a required role is missing", () => {
      mockUserRoles(["ADMIN"]);
      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      checkRole(["ADMIN", "INSTRUCTOR"], { mode: "Exact" })(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("forbids when the user has an additional role beyond the allowed set", () => {
      mockUserRoles(["ADMIN", "INSTRUCTOR", "STUDENT"]);
      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      checkRole(["ADMIN", "INSTRUCTOR"], { mode: "Exact" })(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("forbids when the roles are completely different", () => {
      mockUserRoles(["STUDENT"]);
      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      checkRole(["ADMIN"], { mode: "Exact" })(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("input validation", () => {
    it("passes an error to next() when allowedRoles is empty", () => {
      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      checkRole([])(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(vi.mocked(next).mock.calls[0][0]).toBeInstanceOf(Error);
      expect(res.status).not.toHaveBeenCalled();
      expect(getAuth).not.toHaveBeenCalled();
    });

    it("passes an error to next() when allowedRoles has duplicate values", () => {
      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      checkRole(["ADMIN", "ADMIN"])(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(vi.mocked(next).mock.calls[0][0]).toBeInstanceOf(Error);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("returns 403 when sessionClaims is missing entirely", () => {
      mockUserRoles(undefined);
      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      checkRole(["ADMIN"])(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "User roles not found",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 403 when userMetadata has no roles field", () => {
      vi.mocked(getAuth).mockReturnValue({
        sessionClaims: { userMetadata: { dbUserId: "db_1" } },
      } as any);
      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      checkRole(["ADMIN"])(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "User roles not found",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 403 when the user's roles array is empty", () => {
      mockUserRoles([]);
      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      checkRole(["ADMIN"])(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "User roles not found",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("passes an error to next() when the user's roles from Clerk have duplicates", () => {
      mockUserRoles(["ADMIN", "ADMIN"]);
      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      checkRole(["ADMIN"])(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(vi.mocked(next).mock.calls[0][0]).toBeInstanceOf(Error);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("passes an error to next() when the user's roles from Clerk contain an invalid role", () => {
      mockUserRoles(["ADMIN", "SUPERADMIN"]);
      const req = {} as Request;
      const res = createRes();
      const next = vi.fn() as NextFunction;

      checkRole(["ADMIN"])(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(vi.mocked(next).mock.calls[0][0]).toBeInstanceOf(Error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  it("does not send a double response on success", () => {
    mockUserRoles(["ADMIN"]);
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    checkRole(["ADMIN"])(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
