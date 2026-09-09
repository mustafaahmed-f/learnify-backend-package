import { getAuth } from "@clerk/express";
import { NextFunction, Request, Response } from "express";
import { validRoles } from "../constants/validRoles.js";

type Role = (typeof validRoles)[number];

export function checkRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
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

    const isAuthorized = allowedRoles.some((role) => userRoles.includes(role));

    if (!isAuthorized) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    next();
  };
}
