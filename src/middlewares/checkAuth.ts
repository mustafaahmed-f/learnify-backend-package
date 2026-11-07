import { getAuth } from "@clerk/express";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { ClerkUser } from "../types/ClerkUser.js";
import { getJsonResponse } from "../utils/getJsonResponse.js";
import { isUserBanned } from "../utils/isUserBanned.js";

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

    // Fail closed: a user whose ban status is unknown must not get through.
    let banned: boolean;
    try {
      banned = await isUserBanned(clerkId);
    } catch (error) {
      console.error("checkAuth : failed to verify ban status : ", error);
      return next(
        new AppError(
          "Unable to verify your account status. Please try again later.",
          503,
        ),
      );
    }

    if (banned) {
      return res.status(403).json(
        getJsonResponse({
          success: false,
          error: "Your account has been blocked.",
        }),
      );
    }

    const userMetadata =
      sessionClaims?.userMetadata as ClerkUser["userMetadata"];
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
