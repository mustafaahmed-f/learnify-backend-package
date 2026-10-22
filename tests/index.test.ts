import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/express", () => ({
  getAuth: vi.fn(),
}));

import * as pkg from "../src/index.js";

describe("package entry point", () => {
  it("exposes exactly the documented runtime exports", () => {
    expect(Object.keys(pkg).sort()).toEqual(
      [
        "AppError",
        "ValidationError",
        "checkAuth",
        "checkRole",
        "checkUnique",
        "checkValidRoles",
        "futureDateRequiredMsg",
        "getErrorMsg",
        "getJsonResponse",
        "getSuccessMsg",
        "globalErrorHandler",
        "handleCaughtError",
        "handlePrismaError",
        "invalidDateFormatMsg",
        "invalidEmailMsg",
        "invalidNumberMsg",
        "invalidPasswordMsg",
        "invalidSchemaFormatMsg",
        "invalidUrlMsg",
        "maxLengthMsg",
        "minLengthMsg",
        "positiveNumberMsg",
        "requiredFieldMsg",
        "validRoles",
        "validationMiddleware",
      ].sort(),
    );
  });

  it("re-exports the same implementations as the source modules", async () => {
    const { AppError } = await import("../src/errors/AppError.js");
    const { handleCaughtError } = await import(
      "../src/utils/handleCaughtError.js"
    );

    expect(pkg.AppError).toBe(AppError);
    expect(pkg.handleCaughtError).toBe(handleCaughtError);
    expect(new pkg.ValidationError("x", [])).toBeInstanceOf(pkg.AppError);
  });
});
