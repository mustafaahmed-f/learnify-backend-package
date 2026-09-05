import { getAuth } from "@clerk/express";
import { NextFunction, Request, Response } from "express";
import { validRoles } from "../constants/validRoles.js";

export function checkRole(roles: (typeof validRoles)[number][]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { sessionClaims } = getAuth(req);
    const userMetaData = sessionClaims?.userMetadata as {
      role: string;
      dbUserId: string;
    };
    const role = userMetaData?.role as (typeof validRoles)[number];

    if (!roles.includes(role))
      return res.status(403).json({ message: "Unauthorized !!" });

    next();
  };
}
