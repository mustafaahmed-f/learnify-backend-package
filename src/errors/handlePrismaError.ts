type PrismaLikeError = {
  code?: string;
  message?: string;
  meta?: {
    target?: unknown;
    column_name?: unknown;
  };
  name?: string;
};

function isPrismaKnownRequestError(
  error: unknown,
): error is PrismaLikeError & { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    /^P\d{4}$/.test((error as { code: string }).code)
  );
}

export function handlePrismaError(error: unknown): {
  status: number;
  message: string;
} {
  if (isPrismaKnownRequestError(error)) {
    switch (error.code) {
      case "P2002":
        return {
          status: 409,
          message: `Duplicate value for ${String(
            error.meta?.target ?? "field",
          )}`,
        };

      case "P2003":
        return {
          status: 400,
          message: "Invalid foreign key reference",
        };

      case "P2025":
        return {
          status: 404,
          message: "Record not found",
        };

      case "P2014":
        return {
          status: 400,
          message: "Invalid relation reference",
        };

      case "P2000":
        return {
          status: 400,
          message: `Value too long for ${String(
            error.meta?.column_name ?? "column",
          )}`,
        };

      default:
        return {
          status: 500,
          message: `Database error: ${error.message ?? "Unknown database error"}`,
        };
    }
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "PrismaClientValidationError"
  ) {
    return {
      status: 400,
      message: `Invalid input data: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  return {
    status: 500,
    message: `Unknown server error: ${
      error instanceof Error ? error.message : String(error)
    }`,
  };
}
