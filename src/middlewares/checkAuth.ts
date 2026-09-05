import { getAuth } from "@clerk/express";
import { NextFunction, Request, Response } from "express";
import { ClerkUser } from "../types/ClerkUser.js";

export async function checkAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { isAuthenticated, userId, sessionClaims } = getAuth(req);

    if (!isAuthenticated || !userId) {
      return res.status(401).json({
        error: "Unauthenticated. Login first please.",
      });
    }

    const clerkId = userId;
    const userMetadata = sessionClaims?.userMetadata as ClerkUser["userMetadata"];
    const email = sessionClaims?.email as string | undefined;
    const firstName = sessionClaims?.firstName as string | undefined;
    const lastName = sessionClaims?.lastName as string | undefined;
    const imageURL = sessionClaims?.imageURL as string | undefined;

    const user: ClerkUser = {
      clerkId,
      email,
      firstName,
      lastName,
      imageURL,
      userMetadata,
    };

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
}
