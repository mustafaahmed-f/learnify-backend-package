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

function mockRole(role: string | undefined) {
  vi.mocked(getAuth).mockReturnValue({
    sessionClaims: role
      ? { userMetadata: { role, dbUserId: "db_1" } }
      : undefined,
  } as any);
}

describe("checkRole", () => {
  beforeEach(() => {
    vi.mocked(getAuth).mockReset();
  });

  it("allows ADMIN when ADMIN is permitted", async () => {
    mockRole("ADMIN");
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    await checkRole(["ADMIN"])(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("allows INSTRUCTOR when INSTRUCTOR is permitted", async () => {
    mockRole("INSTRUCTOR");
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    await checkRole(["INSTRUCTOR"])(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("allows STUDENT when STUDENT is permitted", async () => {
    mockRole("STUDENT");
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    await checkRole(["STUDENT"])(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("allows a role when multiple allowed roles are supplied", async () => {
    mockRole("INSTRUCTOR");
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    await checkRole(["ADMIN", "INSTRUCTOR"])(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns 403 and does not call next() for a forbidden role", async () => {
    mockRole("STUDENT");
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    await checkRole(["ADMIN"])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized !!" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 for a role outside the allowed list", async () => {
    mockRole("STUDENT");
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    await checkRole(["ADMIN", "INSTRUCTOR"])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 safely when there is no session/role information", async () => {
    mockRole(undefined);
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    await checkRole(["ADMIN"])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
