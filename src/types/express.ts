// types/express.ts
//
// Augments the global Express namespace so `req.user` is typed everywhere.
// This must be a real module (imported for its side effect from index.ts,
// not merely referenced) so the augmentation survives declaration emission
// and is automatically loaded by any consumer importing from the package root.

import type { ClerkUser } from "./ClerkUser.js";

declare global {
  namespace Express {
    interface Request {
      user?: ClerkUser;
      validationErrorArr?: { field: string; message: string }[];
    }
  }
}

export {};
