# @mustafahmed1997/learnify-backend

Shared backend utilities for Learnify microservices: Clerk-based auth/role
middlewares, error handling utilities, and the Express `Request` type
augmentation for `req.user` — all importable from the package root.

## Installation

```bash
npm install @mustafahmed1997/learnify-backend
```

### Peer dependencies

This package expects the consuming service to provide its own `express` and
`@clerk/express` installs (so there is a single shared instance of each at
runtime, and Clerk's request-scoped auth context works correctly):

```bash
npm install express @clerk/express
```

## Setup: `clerkMiddleware()` before `checkAuth`

`checkAuth` reads Clerk auth state via `getAuth(req)`, which requires
`clerkMiddleware()` from `@clerk/express` to have already run on the request:

```ts
import express from "express";
import { clerkMiddleware } from "@clerk/express";
import { checkAuth, checkRole, globalErrorHandler } from "@mustafahmed1997/learnify-backend";

const app = express();

app.use(clerkMiddleware());
```

## `checkAuth`

Verifies the request is authenticated via Clerk and attaches a typed
`req.user` (a `ClerkUser`) for downstream handlers.

```ts
import { checkAuth } from "@mustafahmed1997/learnify-backend";

app.get("/me", checkAuth, (req, res) => {
  res.json(req.user);
});
```

If the request is not authenticated, `checkAuth` responds `401` with
`{ error: "Unauthenticated. Login first please." }` and does not call `next()`.

## `checkRole`

Authorizes a request based on the role in the Clerk session claims
(`sessionClaims.userMetadata.role`). Takes an array of allowed roles.

```ts
import { checkRole } from "@mustafahmed1997/learnify-backend";

app.delete(
  "/courses/:id",
  checkRole(["ADMIN", "INSTRUCTOR"]),
  deleteCourseController,
);
```

If the caller's role is not in the allowed list, it responds `403` with
`{ message: "Unauthorized !!" }` and does not call `next()`.

### Combined route example

```ts
app.patch(
  "/users/:id/role",
  checkAuth,
  checkRole(["ADMIN"]),
  updateRoleController,
);
```

## `validRoles` and `Role`

```ts
import { validRoles } from "@mustafahmed1997/learnify-backend";
import type { Role } from "@mustafahmed1997/learnify-backend";

console.log(validRoles); // ["STUDENT", "INSTRUCTOR", "ADMIN"]

function isValidRole(value: string): value is Role {
  return (validRoles as readonly string[]).includes(value);
}
```

## `AppError`

A typed operational error carrying an HTTP status code.

```ts
import { AppError } from "@mustafahmed1997/learnify-backend";

if (!course) {
  throw new AppError("Course not found", 404);
}
```

## `globalErrorHandler`

Express error-handling middleware. Register it **last**, after all routes:

```ts
import { globalErrorHandler } from "@mustafahmed1997/learnify-backend";

app.use(globalErrorHandler);
```

- An `AppError` produces `{ error: err.message }` with `err.statusCode`.
- Any other thrown value produces `{ error: "Internal server error" }` with
  status `500`.

## `ClerkUser` and `req.user` typing

Importing anything from this package's root automatically loads the Express
`Request` augmentation, so `req.user` is typed as `ClerkUser | undefined`
wherever `express`'s `Request` type is used — no extra `express.d.ts` needed
in the consuming service.

```ts
import type { Request, Response } from "express";
import type { ClerkUser } from "@mustafahmed1997/learnify-backend";

function exampleController(req: Request, res: Response) {
  const clerkId = req.user?.clerkId;
  const role = req.user?.userMetadata.role;

  res.json({ clerkId, role });
}
```

`ClerkUser` shape:

```ts
type ClerkUser = {
  clerkId: string;
  userMetadata: {
    role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
    dbUserId: string;
  };
  email?: string;
  firstName?: string;
  lastName?: string;
  imageURL?: string;
};
```

## TypeScript usage

The package ships its own `.d.ts` declarations — no `@types` package needed.
It targets ESM (`"type": "module"`) and expects a `moduleResolution` setting
that supports package `exports` (e.g. `node16`, `nodenext`, or `bundler`).

## What this package does not do

- Does not depend on Prisma or any database.
- Does not call the Auth Service (or any other service) over HTTP.
- Does not manage Clerk session creation — that's handled by `clerkMiddleware()`.
