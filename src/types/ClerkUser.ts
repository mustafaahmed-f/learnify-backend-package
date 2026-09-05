import { validRoles } from "../constants/validRoles.js";

export type ClerkUser = {
  clerkId: string;

  userMetadata: {
    role: (typeof validRoles)[number];
    dbUserId: string;
  };

  email?: string;
  firstName?: string;
  lastName?: string;
  imageURL?: string;
};
