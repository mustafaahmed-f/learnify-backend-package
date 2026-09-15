# @mustafahmed1997/learnify-backend

Shared backend utilities for Learnify microservices: Clerk-based auth/role
middlewares, Zod-based request validation, error handling utilities, response
shaping helpers, and the Express `Request` type augmentation for `req.user` —
all importable from the package root.

## What this package solves

Every Learnify microservice needs the same handful of cross-cutting pieces:
who is the caller (Clerk auth), are they allowed to do this (role checks),
is their request well-formed (Zod validation), and what shape should errors
and responses take. This package centralizes all of that so each service
doesn't reimplement or subtly diverge on it.

## Installation

```bash
npm install @mustafahmed1997/learnify-backend
```

### Peer dependencies

This package expects the consuming service to provide its own `express`,
`@clerk/express`, and `zod` installs (so there is a single shared instance of
each at runtime, and Clerk's request-scoped auth context works correctly):

```bash
npm install express @clerk/express zod
```

## Setup: `clerkMiddleware()` before `checkAuth` / `checkRole`

Both `checkAuth` and `checkRole` read Clerk auth state via `getAuth(req)`,
which requires `clerkMiddleware()` from `@clerk/express` to have already run
on the request:

```ts
import express from "express";
import { clerkMiddleware } from "@clerk/express";
import {
  checkAuth,
  checkRole,
  validationMiddleware,
  globalErrorHandler,
} from "@mustafahmed1997/learnify-backend";

const app = express();

app.use(express.json());
app.use(clerkMiddleware());
```

## Public exports

| Export | Kind | Purpose |
| --- | --- | --- |
| `checkAuth` | middleware | Requires Clerk authentication, attaches `req.user` |
| `checkRole` | middleware factory | Role-based authorization (`Any` / `All` / `Exact`) |
| `validationMiddleware` | middleware factory | Validates `body` / `params` / `query` against Zod schemas |
| `validRoles`, `Role` | const / type | The canonical list of roles and their type |
| `AppError` | class | Base operational error carrying an HTTP status code |
| `ValidationError` | class | `AppError` subclass carrying structured field errors |
| `ValidationErrorItem` | type | Shape of one entry in `ValidationError.errors` |
| `globalErrorHandler` | middleware | Express error handler; register last |
| `handlePrismaError` | function | Maps a Prisma error to `{ status, message }` |
| `getErrorMsg`, `getSuccessMsg` | function | Consistent error/success message builders |
| `getJsonResponse`, `JsonResponseOptions` | function / type | Builds a sparse, consistent response body |
| `checkUnique` | function | Checks an array has no duplicate values |
| `checkValidRoles` | function | Checks every value in an array is a valid `Role` |
| `requiredFieldMsg`, `minLengthMsg`, `maxLengthMsg`, `invalidSchemaFormatMsg`, `invalidEmailMsg`, `invalidPasswordMsg`, `invalidDateFormatMsg`, `futureDateRequiredMsg`, `invalidNumberMsg`, `positiveNumberMsg`, `invalidUrlMsg` | function | Reusable validation error message builders (pair well with custom Zod `.refine()`/`.check()` messages) |
| `ClerkUser` | type | Shape of `req.user` |
| `Location` | type | `"body" \| "params" \| "query"` |
| `CheckRoleOptions`, `RoleCheckMode` | type | Options accepted by `checkRole` |

Importing anything from the package root also loads the Express `Request`
type augmentation (`req.user?: ClerkUser`), so no extra `express.d.ts` is
needed in the consuming service.

## `checkAuth`

Verifies the request is authenticated via Clerk and attaches a typed
`req.user` (a `ClerkUser`) for downstream handlers.

```ts
import { checkAuth } from "@mustafahmed1997/learnify-backend";

app.get("/me", checkAuth, (req, res) => {
  res.json(req.user);
});
```

If the request is not authenticated, `checkAuth` responds `401` with:

```json
{ "error": "Unauthenticated. Login first please." }
```

and does not call `next()`. If reading the Clerk auth context throws, the
error is passed to `next(error)` for `globalErrorHandler` to handle.

## `checkRole`

Authorizes a request based on the caller's roles in the Clerk session claims
(`sessionClaims.userMetadata.roles`, an array). Takes an array of allowed
roles and an optional `{ mode }`.

```ts
import { checkRole } from "@mustafahmed1997/learnify-backend";

app.delete(
  "/courses/:id",
  checkRole(["ADMIN", "INSTRUCTOR"]),
  deleteCourseController,
);
```

### Modes

`mode` defaults to `"Any"` when omitted.

- **`Any`** — the caller needs at least one of `allowedRoles`. Extra roles on
  either side are ignored.

  ```ts
  // Passes if the caller has ADMIN or INSTRUCTOR (or both)
  checkRole(["ADMIN", "INSTRUCTOR"], { mode: "Any" });
  ```

- **`All`** — the caller must have every role in `allowedRoles`, but may have
  additional roles beyond that.

  ```ts
  // Passes only if the caller has both ADMIN and INSTRUCTOR (extra roles OK)
  checkRole(["ADMIN", "INSTRUCTOR"], { mode: "All" });
  ```

- **`Exact`** — the caller's role set must match `allowedRoles` exactly, with
  no missing or extra roles.

  ```ts
  // Passes only if the caller's roles are exactly {ADMIN, INSTRUCTOR}
  checkRole(["ADMIN", "INSTRUCTOR"], { mode: "Exact" });
  ```

### Responses

- Empty or duplicate `allowedRoles`, or duplicate/invalid roles coming back
  from Clerk's session claims, are treated as misconfiguration/upstream data
  problems: the middleware calls `next(error)` with a plain `Error`, which
  `globalErrorHandler` turns into a `500`.
- No `sessionClaims`, no `userMetadata.roles`, or an empty roles array
  responds `403` with `{ "message": "User roles not found" }` and does not
  call `next()`.
- A caller whose roles don't satisfy the selected mode responds `403` with
  `{ "message": "Forbidden" }` and does not call `next()`.
- An authorized caller calls `next()` with no arguments.

### Combined route example

```ts
app.patch(
  "/users/:id/role",
  checkAuth,
  checkRole(["ADMIN"]),
  updateRoleController,
);
```

## `validationMiddleware`

Validates `req.body`, `req.params`, and/or `req.query` against Zod schemas.
Any subset of the three locations may be supplied — omitted locations are
skipped.

```ts
import { z } from "zod";
import { validationMiddleware } from "@mustafahmed1997/learnify-backend";

const createCourseSchema = z.object({
  title: z.string().min(3),
  price: z.number().positive(),
});

const courseIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
});

app.post(
  "/courses",
  validationMiddleware({ body: createCourseSchema }),
  createCourseController,
);

app.get(
  "/courses/:id",
  validationMiddleware({ params: courseIdParamsSchema }),
  getCourseController,
);

app.get(
  "/courses",
  validationMiddleware({ query: paginationQuerySchema }),
  listCoursesController,
);

// All three at once:
app.patch(
  "/courses/:id",
  validationMiddleware({
    params: courseIdParamsSchema,
    body: createCourseSchema.partial(),
    query: paginationQuerySchema,
  }),
  updateCourseController,
);
```

- On success, `validationMiddleware` calls `next()` with no arguments **and**
  writes each schema's parsed/transformed output back onto `req.body`,
  `req.params`, and/or `req.query`. This means transforms like
  `z.coerce.number()` or `.default(...)` are reflected in what the
  controller sees — e.g. `req.query.page` above is a `number`, not the raw
  query string.
- On failure, it calls `next(validationError)` with a `ValidationError`
  (never touches `res` directly) collecting **every** failing field across
  **all** provided locations in one pass — it does not stop at the first
  invalid location.
- Register `globalErrorHandler` after your routes to turn that
  `ValidationError` into the `400` response documented below.

## Error classes

### `AppError`

A typed operational error carrying an HTTP status code.

```ts
import { AppError } from "@mustafahmed1997/learnify-backend";

if (!course) {
  throw new AppError("Course not found", 404);
}
```

### `ValidationError`

An `AppError` subclass (status code always `400`) that also carries the list
of field-level failures. This is what `validationMiddleware` throws, but you
can also construct and throw it directly for manual validation:

```ts
import { ValidationError } from "@mustafahmed1997/learnify-backend";
import type { ValidationErrorItem } from "@mustafahmed1997/learnify-backend";

const errors: ValidationErrorItem[] = [
  { location: "body", field: "role", message: "Invalid role" },
];

throw new ValidationError("Validation failed", errors);
```

`ValidationErrorItem` shape:

```ts
type ValidationErrorItem = {
  location: "body" | "params" | "query";
  field: string;
  message: string;
};
```

## `globalErrorHandler`

Express error-handling middleware. Register it **last**, after all routes:

```ts
import { globalErrorHandler } from "@mustafahmed1997/learnify-backend";

app.use(globalErrorHandler);
```

Behavior, checked in this order:

1. **`ValidationError`** (including whatever `validationMiddleware` throws)
   → `400` with the field-level errors:

   ```json
   {
     "error": "Validation failed",
     "errors": [
       { "location": "body", "field": "role", "message": "Invalid role" },
       { "location": "params", "field": "userId", "message": "Invalid user ID" }
     ]
   }
   ```

2. Any other **`AppError`** → its own `statusCode` with `{ "error": err.message }`.
3. Anything else (an unexpected `Error`, a rejected promise with a non-Error
   value, etc.) → `500` with a fixed, generic body that never leaks the
   underlying error's message or stack:

   ```json
   { "error": "Internal server error" }
   ```

   The original error is still logged via `console.error` for observability
   — it just isn't sent to the client.

## `handlePrismaError`

Maps a Prisma error (by `error.code` / `error.name`) to a plain
`{ status, message }` pair, for services that want to translate Prisma
failures into an `AppError` themselves:

```ts
import { handlePrismaError, AppError } from "@mustafahmed1997/learnify-backend";

try {
  await prisma.course.create({ data });
} catch (err) {
  const { status, message } = handlePrismaError(err);
  throw new AppError(message, status);
}
```

Handles `P2002` (unique constraint), `P2003` (invalid foreign key), `P2025`
(record not found), `P2014` (invalid relation), `P2000` (value too long),
`PrismaClientValidationError`, and falls back to a generic `500` message for
anything else — including `null`/`undefined`/non-object inputs.

## `validRoles` and `Role`

```ts
import { validRoles } from "@mustafahmed1997/learnify-backend";
import type { Role } from "@mustafahmed1997/learnify-backend";

console.log(validRoles); // ["STUDENT", "INSTRUCTOR", "ADMIN"]

function isValidRole(value: string): value is Role {
  return (validRoles as readonly string[]).includes(value);
}
```

## Role-checking utilities

Low-level building blocks used internally by `checkRole`, exported for
services that need custom role-array validation outside of the middleware:

```ts
import { checkUnique, checkValidRoles } from "@mustafahmed1997/learnify-backend";

checkUnique(["ADMIN", "ADMIN"]); // false
checkUnique(["ADMIN", "STUDENT"]); // true

checkValidRoles(["ADMIN", "STUDENT"]); // true
checkValidRoles(["ADMIN", "SUPERADMIN"]); // false — not in validRoles
```

## Response utilities

### `getJsonResponse`

Builds a response body containing only the fields you actually pass —
`undefined` fields are omitted rather than serialized:

```ts
import { getJsonResponse } from "@mustafahmed1997/learnify-backend";

res.status(200).json(
  getJsonResponse({
    message: "Course created",
    data: course,
  }),
);
// { "message": "Course created", "data": { ... } }
```

### `getErrorMsg` / `getSuccessMsg`

Small helpers for consistent, grammatically-correct singular/plural messages:

```ts
import { getErrorMsg, getSuccessMsg } from "@mustafahmed1997/learnify-backend";

getErrorMsg("Course", "was", "not found"); // "Course was not found"
getErrorMsg("Courses", "were", "not found"); // "Courses were not found"

getSuccessMsg("Course", "has", "created"); // "Course has been created successfully"
getSuccessMsg("Courses", "have", "created"); // "Courses have been created successfully"
```

## Validation error message utilities

Reusable message builders for custom Zod validators (e.g. inside
`.refine()`), so wording stays consistent across services:

```ts
import { z } from "zod";
import {
  requiredFieldMsg,
  minLengthMsg,
  invalidEmailMsg,
} from "@mustafahmed1997/learnify-backend";

const schema = z.object({
  email: z.string().email(invalidEmailMsg()),
  password: z.string().min(8, minLengthMsg(8)),
});
```

Available: `requiredFieldMsg(field)`, `minLengthMsg(min)`,
`maxLengthMsg(max)`, `invalidSchemaFormatMsg(field, format)`,
`invalidEmailMsg()`, `invalidPasswordMsg()`, `invalidDateFormatMsg()`,
`futureDateRequiredMsg()`, `invalidNumberMsg(field)`,
`positiveNumberMsg(field)`, `invalidUrlMsg()`.

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

> Note: `checkAuth` attaches `req.user` from `sessionClaims.userMetadata`
> as-is (singular `role`). `checkRole` performs its own authorization check
> directly against `sessionClaims.userMetadata.roles` (plural, an array) —
> it does not read `req.user`. If your Clerk session claims only populate
> `roles`, use `checkRole` for authorization decisions rather than
> `req.user.userMetadata.role`.

## TypeScript usage

The package ships its own `.d.ts` declarations — no `@types` package needed.
It targets ESM (`"type": "module"`) and expects a `moduleResolution` setting
that supports package `exports` (e.g. `node16`, `nodenext`, or `bundler`).

## Using this package in the Learnify microservices

A typical service wires the pieces together in this order:

```ts
import express from "express";
import { clerkMiddleware } from "@clerk/express";
import {
  checkAuth,
  checkRole,
  validationMiddleware,
  globalErrorHandler,
} from "@mustafahmed1997/learnify-backend";

const app = express();

app.use(express.json());
app.use(clerkMiddleware()); // must run before checkAuth/checkRole

app.post(
  "/courses",
  checkAuth,
  checkRole(["INSTRUCTOR", "ADMIN"]),
  validationMiddleware({ body: createCourseSchema }),
  createCourseController,
);

// ...all other routes...

app.use(globalErrorHandler); // must be registered last
```

Controllers can then `throw new AppError(...)` / `throw new ValidationError(...)`
(or pass them to `next(...)`) and rely on `globalErrorHandler` to produce a
consistent response shape across every microservice.

## Running tests

```bash
npm test        # runs the full suite once (vitest run)
npm run test:watch
```

## Type checking

```bash
npm run typecheck
```

## Building

```bash
npm run build
```

Compiles `src/` to `dist/` (via `tsconfig.build.json`), producing the ESM
output and `.d.ts` declarations referenced by `main`/`types` in
`package.json`.

## What this package does not do

- Does not depend on Prisma or any database (`handlePrismaError` only maps
  error shapes — it never imports `@prisma/client`).
- Does not call the Auth Service (or any other service) over HTTP.
- Does not manage Clerk session creation — that's handled by `clerkMiddleware()`.
