import { getAuth } from "@clerk/express";
import { NextFunction, Request, Response } from "express";
import { validRoles } from "../constants/validRoles.js";
import { checkUnique } from "../utils/checkUnique.js";
import { checkValidRoles } from "../utils/checkValidRoles.js";

type Role = (typeof validRoles)[number];

const ROLE_CHECK_MODES = ["All", "Exact", "Any"] as const;

export type RoleCheckMode = (typeof ROLE_CHECK_MODES)[number];

export type CheckRoleOptions = {
  mode: RoleCheckMode;
};

/**
 * Used as a middleware to check whether the user has permission to access this endpoint
 * based on their role.
 *
 * @param allowedRoles
 * @param options
 *
 * Options :  mode : "All" | "Exact" | "Any"
 *
 * - "All" : All roles in allowedRoles are required. They must exist in the user's roles
 * even if user has more roles.
 *
 * - "Exact" : All roles in allowedRoles are required. They must exist in the user's roles
 * exactly without any other roles.
 *
 * - "Any" : At least one role in allowedRoles is required. One role in the allowedRoles
 * must exist in the user's roles regardless of other roles in user's roles array and allowed roles array.
 */
export function checkRole(
  allowedRoles: Role[],
  options: CheckRoleOptions = { mode: "Any" },
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (allowedRoles.length === 0) {
      return next(
        new Error("Allowed roles cannot be empty in checkRole middleware !!"),
      );
    }

    if (!checkUnique(allowedRoles)) {
      return next(
        new Error("Allowed roles array should have unique values !!"),
      );
    }

    const { sessionClaims } = getAuth(req);

    const userMetadata = sessionClaims?.userMetadata as
      | {
          roles?: Role[];
          dbUserId?: string;
        }
      | undefined;

    const userRoles = userMetadata?.roles;

    if (!userRoles || userRoles.length === 0) {
      return res.status(403).json({
        message: "User roles not found",
      });
    }

    if (!checkUnique(userRoles)) {
      return next(
        new Error("User roles from clerk array should have unique values !!"),
      );
    }

    if (!checkValidRoles(userRoles)) {
      return next(new Error("User roles from clerk contains invalid roles !!"));
    }

    let isAuthorized = false;

    switch (options.mode) {
      case "Any":
        isAuthorized = allowedRoles.some((role) => userRoles.includes(role));
        break;

      case "Exact":
        isAuthorized =
          allowedRoles.every((role) => userRoles.includes(role)) &&
          allowedRoles.length === userRoles.length;
        break;

      case "All":
        isAuthorized = allowedRoles.every((role) => userRoles.includes(role));
        break;

      default:
        break;
    }

    if (!isAuthorized) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    next();
  };
}
