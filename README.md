# @mustafahmed1997/learnify-backend

Shared backend building blocks for the Learnify e-learning microservices:
Clerk-based authentication and role middleware, Zod request validation, a
consistent error model with an Express error handler, Prisma error mapping,
response/message helpers, and the typed `req.user` augmentation.

Every service needs to answer the same questions: who is calling, are they
allowed to do this, is the request well-formed, and what shape should
responses and errors take. This package answers them once, so services don't
diverge.

## Contents

- [Features](#features)
- [Installation](#installation)
- [Requirements and compatibility](#requirements-and-compatibility)
- [Quick start](#quick-start)
- [API reference](#api-reference)
  - [Middleware](#middleware)
  - [Errors](#errors)
  - [Response and message helpers](#response-and-message-helpers)
  - [Role utilities and constants](#role-utilities-and-constants)
  - [Types](#types)
- [Error handling](#error-handling)
- [Testing](#testing)
- [Build and development](#build-and-development)
- [Project structure](#project-structure)
- [Contributing](#contributing)
- [Publishing](#publishing)

## Features

| Export | Kind | Use it to |
| --- | --- | --- |
| `checkAuth` | middleware | Reject unauthenticated requests (`401`) and attach `req.user` |
| `checkRole` | middleware factory | Authorize by Clerk roles with `Any` / `All` / `Exact` matching |
| `validationMiddleware` | middleware factory | Validate `body`, `params` and `query` with Zod and write parsed values back |
| `AppError` | class | Throw an operational error with an HTTP status code |
| `ValidationError` | class | Throw a `400` error with field-level details |
| `globalErrorHandler` | error middleware | Turn errors into consistent JSON responses |
| `handlePrismaError` | function | Map a Prisma error to `{ status, message }` |
| `handleCaughtError` | function | Forward any caught error to `next()` in the right shape |
| `getJsonResponse` | function | Build a response body that omits `undefined` fields |
| `getSuccessMsg`, `getErrorMsg` | functions | Build consistent success/error sentences |
| `requiredFieldMsg`, `minLengthMsg`, … | functions | Reuse standard validation messages in Zod schemas |
| `checkUnique`, `checkValidRoles` | functions | Validate role arrays outside the middleware |
| `validRoles` | constant | The canonical role list: `STUDENT`, `INSTRUCTOR`, `ADMIN` |
| `Role`, `ClerkUser`, `Location`, `ValidationErrorItem`, `JsonResponseOptions`, `CheckRoleOptions`, `RoleCheckMode` | types | Type your services against the same contracts |

Everything is exported from the package root. There are no subpath exports.

## Installation

```bash
npm install @mustafahmed1997/learnify-backend
```

`express`, `@clerk/express` and `zod` are **peer dependencies**. Install them in
the consuming service so a single instance of each is shared at runtime (Clerk's
request auth context and Zod's schema classes depend on this):

```bash
npm install express @clerk/express zod
```

| Peer dependency | Supported range |
| --- | --- |
| `express` | `^5.1.0` |
| `@clerk/express` | `^1.7.74` |
| `zod` | `^4.5.4` |

## Requirements and compatibility

- **ESM only.** The package is `"type": "module"` and its `exports` map
  provides only an `import` condition. Use `import`, not `require()`.
- **Express 5.** The middleware targets Express 5 (for example, it handles
  Express 5's read-only `req.query` getter).
- **Node.js.** The package doesn't declare an `engines` field. Its peer
  `@clerk/express` (1.7.x) requires Node.js `>= 18.17.0`.
- **TypeScript.** Declarations (`.d.ts`) are bundled; no `@types` package is
  needed. Because entry points are resolved through `exports`, the consuming
  project needs `moduleResolution` set to `node16`, `nodenext` or `bundler`.
  The package itself compiles with TypeScript 5 to an `ES2020` target.

## Quick start

```ts
import express from "express";
import { clerkMiddleware } from "@clerk/express";
import { z } from "zod";
import {
  AppError,
  checkAuth,
  checkRole,
  getJsonResponse,
  getSuccessMsg,
  globalErrorHandler,
  handleCaughtError,
  validationMiddleware,
} from "@mustafahmed1997/learnify-backend";
import { prisma } from "./prisma.js"; // your service's Prisma client

const app = express();

app.use(express.json());
app.use(clerkMiddleware()); // must run before checkAuth / checkRole

const createCourseSchema = z.object({
  title: z.string().trim().min(3),
  price: z.number().positive(),
});

app.post(
  "/courses",
  checkAuth,
  checkRole(["INSTRUCTOR", "ADMIN"]),
  validationMiddleware({ body: createCourseSchema }),
  async (req, res, next) => {
    try {
      const course = await prisma.course.create({ data: req.body });
      res.status(201).json(
        getJsonResponse({
          success: true,
          message: getSuccessMsg("Course", "has", "created"),
          data: course,
        }),
      );
    } catch (error) {
      handleCaughtError(error, next);
    }
  },
);

app.get("/courses/:id", async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
    });
    if (!course) throw new AppError("Course not found", 404);
    res.json(getJsonResponse({ success: true, data: course }));
  } catch (error) {
    handleCaughtError(error, next);
  }
});

app.use(globalErrorHandler); // register last
```

## API reference

### Middleware

#### `checkAuth(req, res, next)`

Requires a Clerk-authenticated request and attaches a typed `req.user`.
`clerkMiddleware()` from `@clerk/express` must run first, because `checkAuth`
reads the auth state with `getAuth(req)`.

```ts
app.get("/me", checkAuth, (req, res) => {
  res.json(req.user);
});
```

| Situation | Result |
| --- | --- |
| Authenticated with a `userId` | Sets `req.user`, calls `next()` |
| Not authenticated, or no `userId` | Responds `401` `{ "error": "Unauthenticated. Login first please." }`; `next()` is not called |
| `getAuth` throws (e.g. `clerkMiddleware()` missing) | Calls `next(error)` → `500` from `globalErrorHandler` |

`req.user` is built from the session token: `clerkId` comes from `userId`.
`email`, `firstName`, `lastName`, `imageURL` and `userMetadata` are read from
custom session claims of the same names. Add them to your Clerk session token
for them to be populated; missing claims become `undefined`.

#### `checkRole(allowedRoles, options?)`

Returns a middleware that authorizes the caller against the roles array at
`sessionClaims.userMetadata.roles`. Like `checkAuth`, it requires
`clerkMiddleware()` to have run.

```ts
import { checkRole } from "@mustafahmed1997/learnify-backend";

app.delete("/courses/:id", checkAuth, checkRole(["ADMIN"]), deleteCourse);
```

| Parameter | Type | Description |
| --- | --- | --- |
| `allowedRoles` | `Role[]` | Non-empty array of unique roles |
| `options.mode` | `"Any" \| "All" \| "Exact"` | Matching strategy. Default `"Any"` |

| Mode | Authorized when |
| --- | --- |
| `Any` | The user has at least one of `allowedRoles` |
| `All` | The user has every role in `allowedRoles` (extra roles allowed) |
| `Exact` | The user's roles are exactly `allowedRoles` (no missing or extra roles) |

```ts
checkRole(["ADMIN", "INSTRUCTOR"]);                    // either role
checkRole(["ADMIN", "INSTRUCTOR"], { mode: "All" });   // both roles, extras OK
checkRole(["ADMIN", "INSTRUCTOR"], { mode: "Exact" }); // exactly these two
```

| Situation | Result |
| --- | --- |
| Authorized | Calls `next()` |
| No session claims, no `roles`, or empty `roles` | `403` `{ "message": "User roles not found" }` |
| Roles don't satisfy the mode (or an unknown mode is passed) | `403` `{ "message": "Forbidden" }` |
| `allowedRoles` empty or contains duplicates | `next(Error)` → `500` (misconfiguration) |
| Clerk roles contain duplicates or values outside `validRoles` | `next(Error)` → `500` (bad upstream data) |

#### `validationMiddleware(schemas)`

Returns a middleware that validates any combination of `body`, `params` and
`query` against Zod schemas. Omitted (or `undefined`) locations are skipped.

```ts
import { z } from "zod";
import { validationMiddleware } from "@mustafahmed1997/learnify-backend";

app.get(
  "/courses/:id/lessons",
  validationMiddleware({
    params: z.object({ id: z.uuid() }),
    query: z.object({ page: z.coerce.number().int().positive().default(1) }),
  }),
  (req, res) => {
    // req.query.page is a number here, not a string
  },
);
```

- **On success** it calls `next()` and replaces `req.body`, `req.params` and
  `req.query` with each schema's parsed output. Coercions, defaults,
  transforms and stripped unknown keys are all visible to the handler.
- **On failure** it calls `next(new ValidationError("Validation failed", errors))`.
  It collects every issue from every location in one pass and never writes
  to `res` itself. Invalid locations are left untouched on `req`.
- Each error item is `{ location, field, message }`. `field` is the Zod issue
  path joined with `.` (e.g. `address.city`, `tags.1`), or `""` when the
  whole location is invalid (e.g. a missing body).

> TypeScript note: `req.body`, `req.params` and `req.query` keep their Express
> types after validation. Cast or re-parse in the handler if you need the
> schema's inferred type.

### Errors

#### `AppError`

```ts
new AppError(message: string, statusCode: number)
```

An `Error` subclass with a `statusCode`. Its prototype chain is preserved, so
`instanceof AppError` works for subclasses too.

```ts
import { AppError } from "@mustafahmed1997/learnify-backend";

throw new AppError("Course not found", 404);

class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}
```

#### `ValidationError`

```ts
new ValidationError(message: string, errors: ValidationErrorItem[])
```

An `AppError` whose `statusCode` is always `400`, carrying field-level
details in `errors`. `validationMiddleware` produces these, and you can throw
one yourself:

```ts
import { ValidationError } from "@mustafahmed1997/learnify-backend";

throw new ValidationError("Validation failed", [
  { location: "body", field: "email", message: "Email already in use" },
]);
```

#### `globalErrorHandler(err, req, res, next)`

Express error-handling middleware. Register it after all routes. See
[Error handling](#error-handling) for its response contract.

#### `handlePrismaError(error)`

```ts
handlePrismaError(error: unknown): { status: number; message: string }
```

Maps a Prisma error to an HTTP status and message. It never throws, and it
doesn't import `@prisma/client`; it inspects the error's shape:

- A **known request error** is any object whose `code` is a string matching
  `P` + four digits (e.g. `PrismaClientKnownRequestError`).
- A **validation error** is any object whose `name` is
  `"PrismaClientValidationError"`.

| Input | `status` | `message` |
| --- | --- | --- |
| `P2002` unique constraint | `409` | `Duplicate value for <meta.target>` (falls back to `field`; arrays are comma-joined) |
| `P2003` foreign key | `400` | `Invalid foreign key reference` |
| `P2014` relation violation | `400` | `Invalid relation reference` |
| `P2025` record not found | `404` | `Record not found` |
| `P2000` value too long | `400` | `Value too long for <meta.column_name>` (falls back to `column`) |
| Any other `P####` code | `500` | `Database error: <error.message>` |
| `PrismaClientValidationError` | `400` | `Invalid input data: <error.message>` |
| Anything else (incl. `null`, strings) | `500` | `Non-prisma error: <message or String(value)>` |

```ts
const { status, message } = handlePrismaError(err);
```

#### `handleCaughtError(error, next)`

```ts
handleCaughtError(error: unknown, next: NextFunction): void
```

The recommended way to forward an error from a `catch` block. It decides what
reaches `globalErrorHandler`:

| Caught error | Passed to `next()` | Client sees |
| --- | --- | --- |
| `AppError` / `ValidationError` | The same error, unchanged | Its status and message |
| Prisma error mapped to a 4xx (`P2000`, `P2002`, `P2003`, `P2014`, `P2025`, validation) | `new AppError(message, status)` | e.g. `404 Record not found` |
| Anything mapped to `500` (other Prisma codes, non-Prisma errors, non-`Error` values) | The original value | Generic `500 Internal server error` |

Server errors are forwarded untouched on purpose. Their real messages are
logged by `globalErrorHandler` and never sent to clients.

### Response and message helpers

#### `getJsonResponse(options)`

```ts
getJsonResponse<TData, TAdditionalInfo>({
  success: boolean;            // required, always included
  message?: string;
  data?: TData;
  additionalInfo?: TAdditionalInfo;
  error?: string;
})
```

Builds a response body that contains `success` plus only the optional fields
that are not `undefined`. Falsy values such as `0`, `false`, `""` and `null`
are kept.

```ts
res.json(
  getJsonResponse({
    success: true,
    data: courses,
    additionalInfo: { page: 1, total: 42 },
  }),
);
// { "success": true, "data": [...], "additionalInfo": { "page": 1, "total": 42 } }
```

#### `getSuccessMsg(resource, verb, action)` / `getErrorMsg(resource, verb, message)`

```ts
getSuccessMsg("Course", "has", "created");   // "Course has been created successfully"
getSuccessMsg("Courses", "have", "deleted"); // "Courses have been deleted successfully"
getErrorMsg("Course", "was", "not found");   // "Course was not found"
getErrorMsg("Courses", "were", "not found"); // "Courses were not found"
```

`verb` is typed as `"has" | "have"` and `"was" | "were"` respectively. The
resource is not pluralized automatically.

#### Validation message builders

| Function | Returns |
| --- | --- |
| `requiredFieldMsg(field)` | `"<field> is required"` |
| `minLengthMsg(min)` | `"Minimum length is <min>"` |
| `maxLengthMsg(max)` | `"Maximum length is <max>"` |
| `invalidSchemaFormatMsg(field, format)` | `"<field> should match format: <format>"` |
| `invalidEmailMsg()` | `"Invalid email format"` |
| `invalidPasswordMsg()` | `"Password should be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"` |
| `invalidNumberMsg(field)` | `"Invalid number format for field: <field>"` |
| `positiveNumberMsg(field)` | `"<field> should be positive"` |
| `invalidUrlMsg()` | `"Invalid URL"` |
| `invalidDateFormatMsg()` | `"Invalid date format"` |
| `futureDateRequiredMsg()` | `"Date must be in the future"` |

```ts
import { z } from "zod";
import {
  invalidEmailMsg,
  maxLengthMsg,
  minLengthMsg,
} from "@mustafahmed1997/learnify-backend";

const signUpSchema = z.object({
  email: z.email(invalidEmailMsg()),
  name: z.string().min(2, minLengthMsg(2)).max(50, maxLengthMsg(50)),
});
```

### Role utilities and constants

```ts
import {
  checkUnique,
  checkValidRoles,
  validRoles,
  type Role,
} from "@mustafahmed1997/learnify-backend";

validRoles;                             // readonly ["STUDENT", "INSTRUCTOR", "ADMIN"]
checkUnique(["ADMIN", "ADMIN"]);        // false (case-sensitive; [] → true)
checkValidRoles(["ADMIN", "STUDENT"]);  // true
checkValidRoles(["ADMIN", "admin"]);    // false (case-sensitive; [] → true)
```

`checkRole` uses these internally. They're exported for custom role checks,
for example when validating role updates.

### Types

| Type | Definition |
| --- | --- |
| `Role` | `"STUDENT" \| "INSTRUCTOR" \| "ADMIN"` |
| `Location` | `"body" \| "params" \| "query"` |
| `ValidationErrorItem` | `{ location: Location; field: string; message: string }` |
| `ClerkUser` | `{ clerkId: string; userMetadata: { role: Role; dbUserId: string }; email?; firstName?; lastName?; imageURL? }` |
| `JsonResponseOptions<TData, TAdditionalInfo>` | Options accepted by `getJsonResponse` |
| `RoleCheckMode` | `"All" \| "Exact" \| "Any"` |
| `CheckRoleOptions` | `{ mode: RoleCheckMode }` |

**`req.user` typing.** Importing anything from the package root loads a global
augmentation that types `req.user` as `ClerkUser | undefined` on Express's
`Request`. No local `express.d.ts` is needed.

> `ClerkUser.userMetadata.role` is a single role taken as-is from the session
> claims, while `checkRole` authorizes against the `userMetadata.roles` array.
> Make authorization decisions with `checkRole` rather than `req.user`.

## Error handling

There are two paths an error can take:

**1. Responses sent directly by middleware** (`next()` is not called, and
`globalErrorHandler` doesn't see them):

| Source | Status | Body |
| --- | --- | --- |
| `checkAuth` | `401` | `{ "error": "Unauthenticated. Login first please." }` |
| `checkRole` | `403` | `{ "message": "User roles not found" }` or `{ "message": "Forbidden" }` |

These bodies don't include a `success` field.

**2. Errors passed to `next()`** and rendered by `globalErrorHandler`. This
covers `ValidationError` from `validationMiddleware`, errors forwarded by
`handleCaughtError`, configuration errors from `checkRole`, errors from
`checkAuth`, and anything thrown or rejected in your handlers (Express 5
forwards rejected promises automatically).

`globalErrorHandler` logs every error with `console.error`, then responds:

| Error | Status | Body |
| --- | --- | --- |
| `ValidationError` | `400` | `{ "success": false, "error": "Validation failed", "errors": [ { "location": "body", "field": "title", "message": "..." } ] }` |
| Any other `AppError` | `err.statusCode` | `{ "success": false, "error": err.message }` |
| Anything else | `500` | `{ "success": false, "error": "Internal server error" }` |

The `500` body is fixed: messages and stack traces of unexpected errors are
never sent to clients. Only `AppError` instances get their own status, so a raw
Prisma error that reaches the handler becomes a `500`. Route `catch` blocks
through `handleCaughtError` to get `404`/`409`/`400` for Prisma errors:

```ts
try {
  await prisma.enrollment.create({ data });
} catch (error) {
  handleCaughtError(error, next); // P2002 → 409 "Duplicate value for ..."
}
```

## Testing

Tests use [Vitest](https://vitest.dev) 3 in a Node environment and live in
`tests/**/*.test.ts` (see `vitest.config.ts`). Clerk is mocked with
`vi.mock("@clerk/express")`, and Express `req`/`res`/`next` are lightweight
stubs, so no network, Clerk instance or database is needed.

```bash
npm test                                   # run the whole suite once
npm run test:watch                         # watch mode
npx vitest run tests/checkRole.test.ts     # a single file
npx vitest run -t "handleCaughtError"      # tests matching a name
```

Coverage isn't configured in this repository. To measure it locally, install
the V8 provider that matches the Vitest version, then run:

```bash
npm install --no-save @vitest/coverage-v8@3
npx vitest run --coverage --coverage.include="src/**"
```

## Build and development

| Script | Command | Purpose |
| --- | --- | --- |
| `npm run build` | `tsc -p tsconfig.build.json` | Compile `src/` to `dist/` (JS, `.d.ts`, source maps) |
| `npm run typecheck` | `tsc -p tsconfig.json` | Type-check `src/` and `tests/` without emitting |
| `npm test` | `vitest run` | Run the test suite once |
| `npm run test:watch` | `vitest` | Run tests in watch mode |

There are no lint or format scripts.

## Project structure

```text
src/
  index.ts                 # public entry point: every export lives here
  constants/validRoles.ts  # validRoles, Role
  errors/                  # AppError, ValidationError, globalErrorHandler, handlePrismaError
  middlewares/             # checkAuth, checkRole, validationMiddleware
  types/                   # ClerkUser, Location, Express Request augmentation
  utils/                   # response/message helpers, role checks, handleCaughtError
tests/                     # one *.test.ts per module, plus index.test.ts for the export list
tsconfig.json              # strict, node16 modules; includes src and tests (typecheck)
tsconfig.build.json        # extends tsconfig.json; emits src → dist
vitest.config.ts           # Node environment, tests/**/*.test.ts
```

## Contributing

1. **Add the implementation** under the matching `src/` folder. Use explicit
   `.js` extensions in relative imports (required by `node16` module
   resolution).
2. **Export it** from `src/index.ts`. Use `export type` for type-only exports.
3. **Update the export list** in `tests/index.test.ts`. That test fails if the
   public surface changes unexpectedly.
4. **Write tests** in `tests/<name>.test.ts`. Cover success, failure and edge
   cases. Mock `@clerk/express` and stub `req`/`res`/`next` as the existing
   tests do.
5. **Verify**: `npm run typecheck && npm test && npm run build`.
6. **Document it** in this README: add it to the Features table and the API
   reference.

## Publishing

- The package entry is `dist/index.js` with types at `dist/index.d.ts`,
  exposed through a single `"."` export (ESM `import` condition only).
- Only `dist/` is published (`"files": ["dist"]`). `dist/` is git-ignored.
- It's published publicly to npm (`publishConfig.access: "public"`).
- There is no `prepublishOnly` hook, so build before publishing:

```bash
npm run typecheck && npm test && npm run build
npm version <patch|minor|major>
npm publish
```

## License

ISC
